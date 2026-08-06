-- =============================================================================
-- 0081 — LE MEMBRE : CLIENT DE SA SOCIÉTÉ, LIBRE DE SES MOUVEMENTS
--
-- Trois exigences, un seul sujet : la personne.
--
--   1. Un membre peut devenir client de sa propre société et signer son
--      déménagement comme n'importe qui (clients.utilisateur_id).
--   2. Un membre peut être retiré sans effacer sa paie : la comptabilité doit
--      rester cohérente des années après son départ. Ce qui s'arrête, c'est
--      l'ACCÈS — pas l'historique.
--   3. Une même personne peut travailler pour plusieurs sociétés Dashprod,
--      successivement ou en même temps, ou créer la sienne.
--
-- LE DANGER, et comment il est écarté.
-- Jusqu'ici `utilisateurs.auth_id` était UNIQUE sur toute la base : un compte
-- Google = une société, point. Lever cette contrainte sans rien d'autre aurait
-- rendu `hook_ajouter_claims` non déterministe (`select ... into` sur deux
-- lignes prend la première venue, sans erreur) — c'est-à-dire un jeton qui
-- désigne une société AU HASARD. C'est exactement la fuite qui tue le projet.
--
-- La règle posée ici : le jeton ne devine JAMAIS.
--   — une seule appartenance active  → c'est elle ;
--   — un choix explicite enregistré  → c'est lui ;
--   — plusieurs, sans choix          → AUCUNE société dans le jeton. L'appli
--                                      montre le sélecteur, l'utilisateur
--                                      tranche, le jeton se rafraîchit.
-- Une société à la fois, toujours nommée. Jamais deux.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Un membre peut être client de sa propre société.
-- -----------------------------------------------------------------------------
alter table public.clients
  add column if not exists utilisateur_id uuid references public.utilisateurs(id);
create index if not exists idx_clients_utilisateur on public.clients(utilisateur_id);

drop trigger if exists trg_cloison_org on public.clients;
create trigger trg_cloison_org before insert or update on public.clients
  for each row execute function public.exiger_meme_org('utilisateur_id', 'utilisateurs');

-- -----------------------------------------------------------------------------
-- 2. Le retrait d'un membre.
-- -----------------------------------------------------------------------------
alter table public.utilisateurs
  add column if not exists retire_le         timestamptz,
  add column if not exists retire_par        uuid references public.utilisateurs(id),
  add column if not exists retire_motif      text,
  add column if not exists auth_id_precedent uuid;

comment on column public.utilisateurs.auth_id_precedent is
  'Compte de connexion détaché au retrait. Conservé pour la traçabilité ; ne '
  'donne plus aucun accès et n''empêche pas la personne de rejoindre une autre société.';

-- -----------------------------------------------------------------------------
-- 3. Multi-appartenance : l''unicité devient locale à la société.
-- -----------------------------------------------------------------------------
alter table public.utilisateurs drop constraint if exists utilisateurs_auth_id_key;
create unique index if not exists utilisateurs_org_auth_key
  on public.utilisateurs (org_id, auth_id) where auth_id is not null;

create table if not exists public.appartenance_active (
  auth_id   uuid primary key,
  org_id    uuid not null references public.organisations(id),
  choisi_le timestamptz not null default now()
);
alter table public.appartenance_active enable row level security;
revoke all on public.appartenance_active from anon, authenticated;
comment on table public.appartenance_active is
  'Société active d''un compte multi-appartenance. Aucune policy : seules les '
  'commandes y touchent. Elle rend le choix explicite plutôt que deviné.';

-- Le reste de cette migration (hook_ajouter_claims, acteur_a_capacite,
-- mon_profil, cmd_mes_societes, cmd_choisir_societe, cmd_reclamer_invitation,
-- cmd_creer_ma_societe, cmd_inviter_membre, cmd_inviter_utilisateur,
-- cmd_retirer_membre, cmd_archiver_utilisateur, cmd_membre_devenir_client)
-- est appliqué en base et repris intégralement ci-dessous.

-- -----------------------------------------------------------------------------
-- 4. Le jeton ne devine jamais : une société, ou aucune.
-- -----------------------------------------------------------------------------
create or replace function public.hook_ajouter_claims(event jsonb)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid := (event->>'user_id')::uuid;
  v_uid uuid; v_org uuid; v_n integer; v_roles text[]; v_claims jsonb;
begin
  select org_id into v_org from appartenance_active where auth_id = v_user_id;

  if v_org is null or not exists (
       select 1 from utilisateurs
        where auth_id = v_user_id and org_id = v_org and coalesce(actif, true) = true) then
    select count(*) into v_n from utilisateurs
     where auth_id = v_user_id and coalesce(actif, true) = true;
    if v_n = 1 then
      select org_id into v_org from utilisateurs
       where auth_id = v_user_id and coalesce(actif, true) = true limit 1;
    else
      v_org := null;   -- plusieurs sociétés sans choix : le sélecteur tranchera
    end if;
  end if;

  if v_org is null then return event; end if;

  select id into v_uid from utilisateurs
   where auth_id = v_user_id and org_id = v_org and coalesce(actif, true) = true;

  select coalesce(array_agg(distinct r.cle), '{}') into v_roles
    from utilisateur_roles ur join roles r on r.id = ur.role_id
   where ur.utilisateur_id = v_uid and (ur.expire_le is null or ur.expire_le > now());

  v_claims := coalesce(event->'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{org_id}', to_jsonb(v_org::text));
  v_claims := jsonb_set(v_claims, '{roles}', to_jsonb(v_roles));
  return jsonb_set(event, '{claims}', v_claims);
end; $function$;

grant execute on function public.hook_ajouter_claims(jsonb) to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- 5. Un membre retiré n'a plus aucun droit, même si son jeton court encore.
-- -----------------------------------------------------------------------------
create or replace function public.acteur_a_capacite(p_capacite text)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from utilisateurs u
      join utilisateur_roles ur on ur.utilisateur_id = u.id
      join role_capacites rc on rc.role_id = ur.role_id
     where u.org_id = jwt_org() and u.auth_id = auth.uid()
       and coalesce(u.actif, true) = true
       and (ur.expire_le is null or ur.expire_le > now())
       and rc.capacite_cle = p_capacite
  ) or exists (
    select 1 from utilisateurs u
      join utilisateur_capacites uc on uc.utilisateur_id = u.id
     where u.org_id = jwt_org() and u.auth_id = auth.uid()
       and coalesce(u.actif, true) = true
       and uc.capacite_cle = p_capacite
  );
$function$;

-- -----------------------------------------------------------------------------
-- 6. Le profil se lit dans LA société du jeton — jamais dans une autre.
--    (Avant : `where auth_id = auth.uid()` seul, qui renvoyait une ligne au
--     hasard dès qu'une personne appartenait à deux sociétés.)
-- -----------------------------------------------------------------------------
create or replace function public.mon_profil()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'utilisateur_id', u.id, 'org_id', u.org_id, 'nom', u.nom, 'email', u.email,
    'actif', coalesce(u.actif, true),
    'est_client', exists (select 1 from clients c where c.utilisateur_id = u.id),
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

-- -----------------------------------------------------------------------------
-- 7. Mes sociétés, et le choix explicite.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_mes_societes()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'org_id', o.id,
    'nom', coalesce(nullif(o.nom_commercial, ''), o.nom),
    'role_principal', (select r.cle from utilisateur_roles ur join roles r on r.id = ur.role_id
                        where ur.utilisateur_id = u.id order by r.cle limit 1),
    'active', o.id = (select org_id from appartenance_active where auth_id = auth.uid())
  ) order by o.nom), '[]'::jsonb)
  from utilisateurs u join organisations o on o.id = u.org_id
  where u.auth_id = auth.uid() and coalesce(u.actif, true) = true;
$function$;

create or replace function public.cmd_choisir_societe(p_org uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if not exists (select 1 from utilisateurs
                  where auth_id = auth.uid() and org_id = p_org
                    and coalesce(actif, true) = true) then
    raise exception 'Vous n''appartenez pas à cette société' using errcode = '42501';
  end if;
  insert into appartenance_active (auth_id, org_id) values (auth.uid(), p_org)
    on conflict (auth_id) do update set org_id = excluded.org_id, choisi_le = now();
  return jsonb_build_object('org_id', p_org, 'rafraichir_jeton', true);
end $function$;

-- -----------------------------------------------------------------------------
-- 8. Réclamer TOUTES ses invitations, pas seulement la première.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_reclamer_invitation()
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_n integer := 0; v_org uuid; v_total integer; v_moi uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'Email absent du jeton d''authentification' using errcode = '22023';
  end if;

  with reclamees as (
    update utilisateurs set auth_id = auth.uid()
     where lower(email) = v_email and auth_id is null
       and coalesce(actif, true) = true
       and org_id not in (select org_id from utilisateurs where auth_id = auth.uid())
    returning id, org_id)
  select count(*), (select org_id from reclamees limit 1) into v_n, v_org from reclamees;

  select count(*) into v_total from utilisateurs
   where auth_id = auth.uid() and coalesce(actif, true) = true;

  if v_total = 0 then
    raise exception 'Aucune invitation trouvée pour %. Contactez votre administrateur.', v_email
      using errcode = '42501';
  end if;

  if v_n > 0 and v_org is not null then
    select id into v_moi from utilisateurs where auth_id = auth.uid() and org_id = v_org;
    perform emettre_evenement(v_org, 'Utilisateur.InvitationReclamee', 'utilisateur',
      v_moi, v_moi, jsonb_build_object('email', v_email));
  end if;

  if not exists (select 1 from appartenance_active a
                  join utilisateurs u on u.auth_id = a.auth_id and u.org_id = a.org_id
                 where a.auth_id = auth.uid() and coalesce(u.actif, true) = true) then
    insert into appartenance_active (auth_id, org_id)
      select auth.uid(), org_id from utilisateurs
       where auth_id = auth.uid() and coalesce(actif, true) = true
       order by created_at limit 1
      on conflict (auth_id) do update set org_id = excluded.org_id, choisi_le = now();
  end if;

  return jsonb_build_object('statut', case when v_n > 0 then 'lie' else 'deja_lie' end,
                            'nouvelles', v_n, 'societes', v_total,
                            'org_id', (select org_id from appartenance_active where auth_id = auth.uid()));
end; $function$;

-- -----------------------------------------------------------------------------
-- 9. Créer sa société reste possible même quand on est salarié ailleurs.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_creer_ma_societe(
  p_nom text, p_bce text default null, p_tva text default null,
  p_tel text default null, p_email text default null, p_nom_admin text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_uid uuid := auth.uid(); v_res jsonb; v_org uuid; v_admin uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if p_nom is null or btrim(p_nom) = '' then
    raise exception 'Le nom de la société est obligatoire' using errcode = '22023';
  end if;
  if exists (select 1 from utilisateurs u join organisations o on o.id = u.org_id
              where u.auth_id = v_uid and lower(o.nom) = lower(btrim(p_nom))) then
    raise exception 'Vous avez déjà une société portant ce nom' using errcode = '23505';
  end if;

  v_res := creer_organisation(btrim(p_nom), v_email,
                              coalesce(nullif(btrim(p_nom_admin), ''), v_email),
                              p_bce, p_tva, null, null, null, p_tel,
                              nullif(btrim(coalesce(p_email, '')), ''), null);
  v_org := (v_res->>'org_id')::uuid; v_admin := (v_res->>'admin_id')::uuid;
  update utilisateurs set auth_id = v_uid where id = v_admin;

  insert into appartenance_active (auth_id, org_id) values (v_uid, v_org)
    on conflict (auth_id) do update set org_id = excluded.org_id, choisi_le = now();

  perform emettre_evenement(v_org, 'Organisation.Inscription', 'organisation',
                            v_org, v_admin,
                            jsonb_build_object('nom', btrim(p_nom), 'email', v_email));
  return jsonb_build_object('org_id', v_org, 'admin_id', v_admin,
                            'statut', 'PRET_A_CONFIGURER', 'rafraichir_jeton', true);
end $function$;

-- -----------------------------------------------------------------------------
-- 10. Inviter : unicité PAR SOCIÉTÉ, et un ancien membre se reprend.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_inviter_membre(p_email text, p_nom text, p_role_cle text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_plan text; v_max integer; v_actuel integer;
  v_id uuid; v_role uuid; v_acteur uuid; v_mail text := lower(btrim(coalesce(p_email, '')));
  v_repris boolean := false;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;
  if v_mail = '' then raise exception 'E-mail requis' using errcode = '22023'; end if;

  select plan into v_plan from organisations where id = v_org;
  v_max := limite_utilisateurs(v_plan);
  if v_max is not null then
    select count(*) into v_actuel from utilisateurs
     where org_id = v_org and coalesce(actif, true) = true;
    if v_actuel >= v_max then
      raise exception 'Votre offre % comprend % utilisateur(s). Passez à l''offre supérieure pour agrandir votre équipe.',
        initcap(coalesce(v_plan, 'regular')), v_max using errcode = '42501';
    end if;
  end if;

  select id into v_id from utilisateurs where org_id = v_org and email = v_mail;
  if v_id is not null then
    if exists (select 1 from utilisateurs where id = v_id and coalesce(actif, true) = true) then
      raise exception 'Cette personne fait déjà partie de votre équipe' using errcode = '23505';
    end if;
    update utilisateurs
       set actif = true, auth_id = null, retire_le = null, retire_par = null,
           retire_motif = null, nom = coalesce(nullif(btrim(p_nom), ''), nom)
     where id = v_id;
    v_repris := true;
  else
    insert into utilisateurs (org_id, email, nom)
      values (v_org, v_mail, coalesce(nullif(btrim(p_nom), ''), v_mail))
      returning id into v_id;
  end if;

  select id into v_role from roles
   where org_id = v_org and cle = coalesce(nullif(btrim(p_role_cle), ''), 'demenageur') limit 1;
  if v_role is not null then
    insert into utilisateur_roles (utilisateur_id, role_id)
    values (v_id, v_role) on conflict do nothing;
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Utilisateur.Invite', 'utilisateur', v_id, v_acteur,
    jsonb_build_object('email', v_mail, 'role', p_role_cle, 'repris', v_repris));
  return jsonb_build_object('utilisateur_id', v_id, 'role', p_role_cle, 'repris', v_repris);
end $function$;

create or replace function public.cmd_inviter_utilisateur(p_email text, p_nom text)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
begin
  return (cmd_inviter_membre(p_email, p_nom, 'demenageur') ->> 'utilisateur_id')::uuid;
end $function$;

-- -----------------------------------------------------------------------------
-- 11. Retirer un membre : l'accès s'arrête, la paie reste, la personne est libre.
--
-- Ce qui disparaît : le rattachement du compte de connexion, les rôles, les
-- capacités individuelles, la société active. Ce qui reste, intégralement :
-- donnees_paie, chrono_sessions, mission_affectations, congés, documents RH,
-- équipements, et tout l'historique d'événements. La comptabilité d'un exercice
-- clos ne doit jamais dépendre de la présence d'un salarié.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_retirer_membre(p_membre uuid, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_acteur uuid; v_auth uuid; v_reste integer;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  if v_acteur = p_membre then
    raise exception 'Vous ne pouvez pas vous retirer vous-même' using errcode = '42501';
  end if;
  select auth_id into v_auth from utilisateurs
   where id = p_membre and org_id = v_org and coalesce(actif, true) = true;
  if not found then
    raise exception 'Membre introuvable ou déjà retiré' using errcode = '42501';
  end if;

  select count(*) into v_reste
    from utilisateurs u
    join utilisateur_roles ur on ur.utilisateur_id = u.id
    join role_capacites rc on rc.role_id = ur.role_id
   where u.org_id = v_org and coalesce(u.actif, true) = true and u.id <> p_membre
     and rc.capacite_cle = 'gerer_referentiels';
  if v_reste = 0 then
    raise exception 'Impossible : ce membre est le dernier à pouvoir administrer la société'
      using errcode = '42501';
  end if;

  update utilisateurs
     set actif = false, auth_id = null, auth_id_precedent = coalesce(auth_id, auth_id_precedent),
         retire_le = now(), retire_par = v_acteur,
         retire_motif = nullif(btrim(coalesce(p_motif, '')), '')
   where id = p_membre and org_id = v_org;

  delete from utilisateur_roles where utilisateur_id = p_membre;
  delete from utilisateur_capacites where utilisateur_id = p_membre and org_id = v_org;
  delete from appartenance_active where auth_id = v_auth and org_id = v_org;

  perform emettre_evenement(v_org, 'Membre.Retire', 'utilisateur', p_membre, v_acteur,
    jsonb_build_object('motif', p_motif,
      'conserve', 'paie, heures, affectations et historique conservés pour la comptabilité'));

  return jsonb_build_object('statut', 'RETIRE', 'donnees_paie_conservees', true);
end $function$;

create or replace function public.cmd_archiver_utilisateur(p_utilisateur uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform cmd_retirer_membre(p_utilisateur, 'Archivage depuis la fiche membre');
end $function$;

-- -----------------------------------------------------------------------------
-- 12. Un membre devient client de sa propre société.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_membre_devenir_client(p_membre uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_acteur uuid; v_u record; v_client uuid;
begin
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  if v_acteur is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if v_acteur <> p_membre and not acteur_a_capacite('creer_affaire') then
    raise exception 'Refusé : seul le membre lui-même ou le bureau peut créer cette fiche client'
      using errcode = '42501';
  end if;

  select * into v_u from utilisateurs
   where id = p_membre and org_id = v_org and coalesce(actif, true) = true;
  if not found then raise exception 'Membre introuvable' using errcode = '42501'; end if;

  select id into v_client from clients where org_id = v_org and utilisateur_id = p_membre;
  if v_client is not null then
    return jsonb_build_object('client_id', v_client, 'cree', false);
  end if;

  select id into v_client from clients
   where org_id = v_org and lower(email) = lower(v_u.email) and utilisateur_id is null limit 1;
  if v_client is not null then
    update clients set utilisateur_id = p_membre where id = v_client;
  else
    insert into clients (org_id, nom, email, tel, utilisateur_id, origine)
      values (v_org, v_u.nom, v_u.email, v_u.tel, p_membre, 'membre')
      returning id into v_client;
  end if;

  perform emettre_evenement(v_org, 'Membre.DevenuClient', 'client', v_client, v_acteur,
    jsonb_build_object('membre', p_membre));
  return jsonb_build_object('client_id', v_client, 'cree', true);
end $function$;
