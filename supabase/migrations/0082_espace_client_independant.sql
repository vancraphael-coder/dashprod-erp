-- =============================================================================
-- 0082 — L'ESPACE CLIENT SE DÉTACHE STRUCTURELLEMENT DE L'ESPACE ENTREPRISE
--
-- LE PROBLÈME, tel qu'il existait. `espace_client_email()` renvoyait tout
-- simplement l'adresse du jeton. Conséquence : UN SEUL compte Google pouvait
-- être, dans la même session, salarié de la société A et client de la société B.
-- Le jeton portait `org_id = A` pour le RLS, pendant que les commandes
-- `cmd_client_*` lisaient chez B sur la seule foi de l'adresse. Deux réseaux
-- d'identifiants qui se touchent — exactement ce qu'il ne faut pas.
--
-- LA RÈGLE POSÉE : une adresse ouvre UN espace, jamais les deux.
--   — un jeton qui porte une organisation n'ouvre JAMAIS l'espace client ;
--   — une adresse qui est l'accès d'un membre actif n'ouvre JAMAIS l'espace
--     client, même sur un jeton sans organisation ;
--   — aucune clé étrangère ne relie `clients` à `utilisateurs`. La colonne
--     `clients.utilisateur_id`, introduite en 0081, est SUPPRIMÉE : elle
--     recréait le pont qu'on veut couper.
--
-- Un membre reste libre de devenir client de sa propre société — mais avec une
-- adresse personnelle. C'est une contrainte assumée : c'est elle qui garantit
-- qu'aucun chemin ne relie sa fiche client à son accès entreprise.
-- =============================================================================

alter table public.clients drop column if exists utilisateur_id;
alter table public.clients
  add column if not exists client_interne boolean not null default false,
  add column if not exists client_interne_note text;

comment on column public.clients.client_interne is
  'Fait commercial : ce client est aussi une personne de la maison. Aucun effet '
  'sur les accès — les deux espaces n''ont aucune clé étrangère en commun.';

drop trigger if exists trg_cloison_org on public.clients;
create trigger trg_cloison_org before insert or update on public.clients
  for each row execute function public.exiger_meme_org();

create or replace function public.espace_client_email()
returns text language sql stable set search_path to 'public'
as $function$
  select case
    when jwt_org() is not null then null
    when exists (
      select 1 from utilisateurs u
       where lower(u.email) = lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''))
         and coalesce(u.actif, true) = true) then null
    else lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''))
  end;
$function$;

comment on function public.espace_client_email() is
  'Adresse ouvrant l''espace client — et rien d''autre. NULL si le jeton porte une '
  'organisation, ou si l''adresse est celle d''un membre actif.';

create or replace function public.cmd_membre_devenir_client(
  p_membre uuid, p_email_client text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_acteur uuid; v_u record; v_client uuid;
  v_mail text := lower(btrim(coalesce(p_email_client, '')));
begin
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  if v_acteur is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if v_acteur <> p_membre and not acteur_a_capacite('creer_affaire') then
    raise exception 'Refusé : seul le membre lui-même ou le bureau peut ouvrir cette fiche client'
      using errcode = '42501';
  end if;

  select * into v_u from utilisateurs
   where id = p_membre and org_id = v_org and coalesce(actif, true) = true;
  if not found then raise exception 'Membre introuvable' using errcode = '42501'; end if;

  if v_mail = '' then
    raise exception 'Une adresse e-mail PERSONNELLE est obligatoire : l''espace client est séparé de l''accès entreprise.'
      using errcode = '22023';
  end if;
  if exists (select 1 from utilisateurs u
              where lower(u.email) = v_mail and coalesce(u.actif, true) = true) then
    raise exception 'Cette adresse est déjà un accès entreprise. Utilisez une adresse personnelle distincte.'
      using errcode = '23505';
  end if;

  select id into v_client from clients where org_id = v_org and lower(email) = v_mail;
  if v_client is null then
    insert into clients (org_id, nom, email, tel, origine, client_interne, client_interne_note)
      values (v_org, v_u.nom, v_mail, v_u.tel, 'membre', true,
              'Personne de la maison — fiche client ouverte le ' || to_char(now(), 'DD/MM/YYYY'))
      returning id into v_client;
  else
    update clients set client_interne = true where id = v_client;
  end if;

  perform emettre_evenement(v_org, 'Membre.DevenuClient', 'client', v_client, v_acteur,
    jsonb_build_object('membre', p_membre, 'email_client', v_mail));
  return jsonb_build_object('client_id', v_client, 'email', v_mail);
end $function$;

-- Le profil d'entreprise ne dit plus rien de l'espace client : il n'en sait rien.
create or replace function public.mon_profil()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'utilisateur_id', u.id, 'org_id', u.org_id, 'nom', u.nom, 'email', u.email,
    'actif', coalesce(u.actif, true),
    'capacites', coalesce((
      select array_agg(distinct c) from (
        select rc.capacite_cle as c from utilisateur_roles ur
          join role_capacites rc on rc.role_id = ur.role_id
         where ur.utilisateur_id = u.id and (ur.expire_le is null or ur.expire_le > now())
        union
        select uc.capacite_cle from utilisateur_capacites uc where uc.utilisateur_id = u.id
      ) t), '{}'))
  from utilisateurs u
  where u.auth_id = auth.uid() and u.org_id = jwt_org();
$function$;

-- L'auditeur de la séparation : à relancer après toute migration.
create or replace function public.cmd_audit_espaces()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_m jsonb := '[]'::jsonb; v_n integer;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;

  select count(*) into v_n from pg_constraint
   where conrelid = 'public.clients'::regclass and confrelid = 'public.utilisateurs'::regclass;
  if v_n > 0 then
    v_m := v_m || jsonb_build_object('gravite','critique',
      'regle','clé étrangère entre l''espace client et l''espace entreprise',
      'objet','clients → utilisateurs');
  end if;

  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname='public' and p.proname='espace_client_email'
                    and pg_get_functiondef(p.oid) ~ 'jwt_org\(\)') then
    v_m := v_m || jsonb_build_object('gravite','critique',
      'regle','espace_client_email n''écarte plus les sessions d''entreprise',
      'objet','espace_client_email');
  end if;

  select count(*) into v_n from clients c
   where exists (select 1 from utilisateurs u
                  where lower(u.email) = lower(c.email) and coalesce(u.actif, true) = true);
  if v_n > 0 then
    v_m := v_m || jsonb_build_object('gravite','majeur',
      'regle','adresse partagée entre une fiche client et un accès entreprise',
      'objet', v_n || ' fiche(s) client');
  end if;

  return jsonb_build_object(
    'verdict', case when jsonb_array_length(v_m) = 0 then 'ESPACES SÉPARÉS' else 'MANQUEMENTS' end,
    'manquements', v_m, 'controle_le', now());
end $function$;
