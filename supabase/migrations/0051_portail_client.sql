-- =============================================================================
-- 0051_portail_client.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--
-- =============================================================================
-- PORTAIL CLIENT — accès par code, sans compte.
--
-- C'est la surface la plus exposée de Dashprod : le rôle `anon` va pouvoir
-- appeler des fonctions. Trois principes tiennent la sécurité.
--
--   1. AUCUN accès direct aux tables pour `anon`. Il n'obtient EXECUTE que sur
--      les fonctions cmd_portail_*, jamais SELECT sur clients ou affaires.
--      Une erreur de policy ne peut donc pas exposer une table entière.
--
--   2. Le code n'est JAMAIS stocké en clair. La table ne garde qu'une empreinte
--      SHA-256 salée. Une fuite de la table ne donne aucun code utilisable.
--
--   3. Chaque fonction renvoie une charge ÉTROITE, champ par champ. Jamais de
--      `select *` : une colonne ajoutée demain ne doit pas fuiter toute seule.
--
-- Le verrouillage après 8 essais est ce qui rend l'entropie utile : sans lui,
-- un script énumère tranquillement.
-- =============================================================================

-- ── Table d'accès ──────────────────────────────────────────────────────────
create table if not exists public.acces_client (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations(id),
  affaire_id    uuid not null references public.affaires(id),
  empreinte     text not null,
  sel           text not null,
  indice        text,
  expire_le     timestamptz,
  revoque_le    timestamptz,
  essais_rates  integer not null default 0,
  dernier_acces timestamptz,
  cree_le       timestamptz not null default now(),
  cree_par      uuid references public.utilisateurs(id),
  unique (empreinte)
);

comment on table public.acces_client is
  'Accès client au portail, par code. Le code n''est jamais stocké en clair : '
  'seule son empreinte SHA-256 salée figure ici.';
comment on column public.acces_client.indice is
  'Quatre derniers caractères du code, pour que le déménageur puisse dire au '
  'client de quel code il parle sans jamais le relire en entier.';

create index if not exists idx_acces_client_affaire
  on public.acces_client (affaire_id) where revoque_le is null;

alter table public.acces_client enable row level security;

-- Le déménageur gère les accès de SON organisation. `anon` n'a rien ici.
drop policy if exists acces_client_tenant on public.acces_client;
create policy acces_client_tenant on public.acces_client
  for all to authenticated
  using      (org_id = jwt_org() and acteur_a_capacite('creer_affaire'))
  with check (org_id = jwt_org() and acteur_a_capacite('creer_affaire'));

-- ── Annuaire réseau : opt-in explicite ─────────────────────────────────────
-- Une entreprise n'apparaît dans l'annuaire public QUE si elle le demande.
-- Le défaut est « non listée » : on n'expose personne par inadvertance.
alter table public.organisations
  add column if not exists visible_reseau boolean not null default false,
  add column if not exists presentation   text;

comment on column public.organisations.visible_reseau is
  'true = l''entreprise accepte de figurer dans l''annuaire public des '
  'déménageurs. Défaut false : aucune exposition sans décision explicite.';

-- ── Empreinte ──────────────────────────────────────────────────────────────
-- sha256() est une fonction native de PostgreSQL : pas de dépendance à une
-- extension, donc rien à activer.
create or replace function public.empreinte_code(p_code text, p_sel text)
returns text language sql immutable set search_path to 'public' as $$
  select encode(sha256((upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'))
                        || coalesce(p_sel,''))::bytea), 'hex');
$$;

revoke all on function public.empreinte_code(text, text) from public, anon, authenticated;

-- ── Création d'un accès (côté déménageur) ──────────────────────────────────
create or replace function public.cmd_creer_acces_client(
  p_affaire uuid, p_code text, p_jours integer default 90)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_sel text; v_id uuid; v_propre text;
begin
  select org_id into v_org from affaires where id = p_affaire;
  if v_org is null or v_org <> jwt_org() then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  v_propre := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_propre) < 12 then
    raise exception 'Code trop court : 12 caractères minimum' using errcode = '22023';
  end if;

  -- Un seul accès vivant par dossier : créer le nouveau révoque l'ancien.
  update acces_client set revoque_le = now()
   where affaire_id = p_affaire and revoque_le is null;

  v_sel := encode(gen_random_bytes(16), 'hex');
  insert into acces_client (org_id, affaire_id, empreinte, sel, indice,
                            expire_le, cree_par)
  values (v_org, p_affaire, empreinte_code(v_propre, v_sel), v_sel,
          right(v_propre, 4),
          now() + make_interval(days => greatest(1, coalesce(p_jours, 90))),
          (select id from utilisateurs where auth_id = auth.uid() limit 1))
  returning id into v_id;

  perform emettre_evenement(v_org, 'AccesClient.Cree', 'affaire', p_affaire,
                            null, jsonb_build_object('indice', right(v_propre, 4)));
  return jsonb_build_object('acces_id', v_id, 'indice', right(v_propre, 4));
end $$;

revoke all on function public.cmd_creer_acces_client(uuid, text, integer)
  from public, anon;
grant execute on function public.cmd_creer_acces_client(uuid, text, integer)
  to authenticated;

-- ── Résolution d'un code (interne) ─────────────────────────────────────────
-- Renvoie l'accès si le code ouvre, et incrémente le compteur d'échecs sinon.
create or replace function public.resoudre_acces(p_code text)
returns public.acces_client language plpgsql security definer
set search_path to 'public' as $$
declare a public.acces_client; v_propre text;
begin
  v_propre := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_propre) <> 12 then return null; end if;

  -- On cherche par empreinte : le sel étant par ligne, on doit comparer
  -- ligne à ligne. Le volume reste faible (un accès vivant par dossier).
  select * into a from acces_client
   where revoque_le is null
     and empreinte = empreinte_code(v_propre, sel)
   limit 1;

  if a.id is null then return null; end if;

  if a.essais_rates >= 8
     or (a.expire_le is not null and a.expire_le < now()) then
    return null;
  end if;

  update acces_client set dernier_acces = now(), essais_rates = 0
   where id = a.id;
  return a;
end $$;

revoke all on function public.resoudre_acces(text) from public, anon, authenticated;

-- ── Ouverture du portail (appelable par anon) ──────────────────────────────
create or replace function public.cmd_portail_ouvrir(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; v_nom text; v_ref text;
begin
  a := resoudre_acces(p_code);
  if a.id is null then
    -- Échec : on incrémente le compteur de TOUS les accès dont l'indice
    -- correspond, ce qui ralentit l'énumération sans révéler lequel existe.
    update acces_client
       set essais_rates = essais_rates + 1
     where revoque_le is null
       and indice = right(upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g')), 4);
    return jsonb_build_object('ouvert', false,
      'message', 'Code invalide, expiré ou bloqué.');
  end if;

  select c.nom, af.reference into v_nom, v_ref
    from affaires af left join clients c on c.id = af.client_id
   where af.id = a.affaire_id;

  return jsonb_build_object(
    'ouvert', true,
    'affaire_id', a.affaire_id,
    'reference', v_ref,
    'client', v_nom,
    'expire_le', a.expire_le);
end $$;

grant execute on function public.cmd_portail_ouvrir(text) to anon, authenticated;

-- ── Dossier : données personnelles UNIQUEMENT ──────────────────────────────
create or replace function public.cmd_portail_dossier(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; r jsonb;
begin
  a := resoudre_acces(p_code);
  if a.id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;

  -- Champs listés un par un. Aucune note commerciale, aucun montant de marge,
  -- aucune équipe, aucun coût : le client voit SES données.
  select jsonb_build_object(
    'reference', af.reference,
    'etat', af.etat,
    'date_souhaitee', af.date_souhaitee,
    'date_visite', af.date_visite,
    'client', jsonb_build_object('nom', c.nom, 'email', c.email, 'tel', c.tel),
    'entreprise', jsonb_build_object('nom', o.nom, 'tel', o.tel, 'email', o.email),
    'adresses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', ad.role, 'adresse', ad.adresse,
        'code_postal', ad.code_postal, 'ville', ad.ville, 'etage', ad.etage))
        from adresses ad where ad.affaire_id = af.id), '[]'::jsonb))
    into r
    from affaires af
    left join clients c on c.id = af.client_id
    left join organisations o on o.id = af.org_id
   where af.id = a.affaire_id;

  return coalesce(r, '{}'::jsonb);
end $$;

grant execute on function public.cmd_portail_dossier(text) to anon, authenticated;

-- ── Offres reçues, toutes entreprises confondues ───────────────────────────
-- Le rapprochement se fait sur l'e-mail du client : ce sont SES offres, quelle
-- que soit l'entreprise qui les a émises. Un e-mail vide ne rapproche rien.
create or replace function public.cmd_portail_offres(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; v_email text;
begin
  a := resoudre_acces(p_code);
  if a.id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;

  select lower(c.email) into v_email
    from affaires af join clients c on c.id = af.client_id
   where af.id = a.affaire_id;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id,
      'reference', af.reference,
      'entreprise', o.nom,
      'entreprise_tel', o.tel,
      'etat', af.etat,
      'date_souhaitee', af.date_souhaitee,
      'montant_tvac_centimes', af.tvac_centimes,
      'signee', exists (select 1 from documents_instances di
                         where di.affaire_id = af.id and di.statut = 'signee'))
      order by af.created_at desc)
    from affaires af
    join organisations o on o.id = af.org_id
    join clients c on c.id = af.client_id
   where af.archive_le is null
     and af.etat <> 'annule'
     and v_email is not null and v_email <> ''
     and lower(c.email) = v_email), '[]'::jsonb);
end $$;

grant execute on function public.cmd_portail_offres(text) to anon, authenticated;

-- ── Factures ───────────────────────────────────────────────────────────────
create or replace function public.cmd_portail_factures(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; v_email text;
begin
  a := resoudre_acces(p_code);
  if a.id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;

  select lower(c.email) into v_email
    from affaires af join clients c on c.id = af.client_id
   where af.id = a.affaire_id;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'numero', f.numero,
      'entreprise', o.nom,
      'date_emission', f.date_emission,
      'echeance', f.echeance,
      'total_tvac_centimes', f.tvac_centimes,
      'communication', f.communication,
      'devise', f.devise) order by f.date_emission desc)
    from factures f
    join affaires af on af.id = f.affaire_id
    join organisations o on o.id = f.org_id
    join clients c on c.id = af.client_id
   where f.emise = true
     and v_email is not null and v_email <> ''
     and lower(c.email) = v_email), '[]'::jsonb);
end $$;

grant execute on function public.cmd_portail_factures(text) to anon, authenticated;

-- ── Inventaire / relevé ────────────────────────────────────────────────────
create or replace function public.cmd_portail_inventaire(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client;
begin
  a := resoudre_acces(p_code);
  if a.id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'piece', r.piece, 'designation', r.designation,
      'quantite', r.quantite, 'volume_m3', r.volume_m3,
      'demont', r.demont, 'remarque', r.remarque)
      order by r.piece, r.designation)
    from releve r where r.affaire_id = a.affaire_id), '[]'::jsonb);
end $$;

grant execute on function public.cmd_portail_inventaire(text) to anon, authenticated;

-- ── Annuaire public des déménageurs ────────────────────────────────────────
-- Aucun code requis : c'est un annuaire. Ne sortent que les entreprises qui
-- ont explicitement demandé à y figurer.
create or replace function public.cmd_reseau_demenageurs()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'nom', coalesce(nullif(o.nom_commercial, ''), o.nom),
    'ville', o.ville, 'cp', o.cp,
    'tel', o.tel, 'email', o.email, 'site_web', o.site_web,
    'presentation', o.presentation) order by o.ville, o.nom), '[]'::jsonb)
  from organisations o
  where o.visible_reseau = true and coalesce(o.actif, true) = true;
$$;

grant execute on function public.cmd_reseau_demenageurs() to anon, authenticated;

-- Vérification après application :
--   select proname, has_function_privilege('anon', oid, 'EXECUTE') as ouverte_anon
--     from pg_proc where proname like 'cmd_portail%' or proname = 'cmd_reseau_demenageurs';
--   -- doit renvoyer true pour ces 6 fonctions, et RIEN d'autre :
--   select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
--      and p.proname not like 'cmd_portail%' and p.proname <> 'cmd_reseau_demenageurs';
--   -- doit renvoyer 0
