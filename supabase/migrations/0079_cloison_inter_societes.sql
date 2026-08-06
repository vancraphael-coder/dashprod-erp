-- =============================================================================
-- 0079 — CLOISON INTER-SOCIÉTÉS
--
-- Principe : deux sociétés ne se touchent jamais. Aucune donnée, aucun compteur,
-- aucun message d'erreur ne traverse. Trois verrous, et un auditeur permanent.
--
--   Verrou 1 — les fonctions internes ne sont plus appelables depuis le
--              navigateur. Seules les commandes `cmd_*` forment l'API publique.
--   Verrou 2 — cohérence d'organisation sur les liens : une mission ne peut pas
--              pointer vers le dossier d'une autre société, même en base.
--   Verrou 3 — les rares fonctions publiques hors `cmd_*` vérifient
--              l'appartenance avant de répondre.
--
-- Auditeur : cmd_audit_cloison() rejoue ces règles sur le schéma vivant. Toute
-- dérive future (nouvelle table sans org_id, nouvelle fonction ouverte) est
-- signalée au lieu d'être découverte par un client.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VERROU 3 — etat_facturation : ne répond que sur un dossier qui vous concerne.
-- Le bureau, par son org. Le client, par son adresse e-mail. Personne d'autre.
-- Le message d'erreur est identique dans les deux cas de refus : un dossier
-- d'une autre société doit être indiscernable d'un dossier inexistant.
-- -----------------------------------------------------------------------------
create or replace function public.etat_facturation(p_affaire uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_du bigint := 0;
  v_paye bigint := 0;
  v_nb integer := 0;
  v_etat text;
  v_org uuid;
  v_client uuid;
begin
  select org_id, client_id into v_org, v_client from affaires where id = p_affaire;
  if v_org is null then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;

  if jwt_org() is distinct from v_org then
    if not exists (
      select 1 from clients c
       where c.id = v_client
         and lower(c.email) = espace_client_email()
         and espace_client_email() is not null
    ) then
      raise exception 'Dossier introuvable' using errcode = '42501';
    end if;
  end if;

  select coalesce(sum(case when f.type = 'avoir' then -f.tvac_centimes
                           else f.tvac_centimes end), 0),
         count(*)
    into v_du, v_nb
    from factures f where f.affaire_id = p_affaire and f.emise = true;

  select coalesce(sum(p.montant_centimes), 0) into v_paye
    from paiements p
    join factures f on f.id = p.facture_id
   where f.affaire_id = p_affaire and f.emise = true;

  v_etat := case
    when v_nb = 0 then 'non_facture'
    when v_paye <= 0 then 'facture'
    when v_paye < v_du then 'partiellement_paye'
    else 'paye'
  end;

  return jsonb_build_object(
    'etat', v_etat,
    'factures', v_nb,
    'du_centimes', v_du,
    'paye_centimes', v_paye,
    'solde_centimes', v_du - v_paye);
end $function$;

-- -----------------------------------------------------------------------------
-- VERROU 1 — refermer la plomberie interne.
--
-- Ces fonctions sont SECURITY DEFINER : elles franchissent le RLS par
-- construction. Elles étaient appelables depuis n'importe quel jeton
-- authentifié, avec un identifiant de dossier en paramètre. Elles restent
-- appelables DEPUIS les commandes `cmd_*` (qui s'exécutent avec les droits du
-- propriétaire), mais plus depuis le navigateur.
--
-- transition_exigee était la plus grave : elle changeait l'état d'un dossier
-- sans vérifier l'organisation, et son message d'erreur révélait l'état
-- courant d'un dossier étranger.
-- -----------------------------------------------------------------------------
do $$
declare
  v_fn text;
  v_liste text[] := array[
    'transition_exigee', 'evenement_affaire', 'evenement_sujet',
    'version_modele_active', 'plan_effectif', 'est_affecte_mission',
    'exiger_module', 'org_a_module',
    'creer_donnees_paie_membre', 'journaliser_mouvement',
    'sync_visite_vers_mission'
  ];
begin
  foreach v_fn in array v_liste loop
    execute coalesce((
      select string_agg(
        format('revoke execute on function public.%I(%s) from public, anon, authenticated;',
               p.proname, pg_get_function_identity_arguments(p.oid)), ' ')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_fn
    ), 'select 1');
  end loop;
end $$;

-- Le hook d'authentification et la clé de service gardent leurs droits.
grant execute on function public.hook_ajouter_claims(jsonb) to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- VERROU 2 — cohérence d'organisation sur les liens.
--
-- Le RLS contrôle la colonne org_id de la ligne écrite. Il ne contrôle PAS la
-- ligne visée par une clé étrangère. Rien n'empêchait, jusqu'ici, d'insérer une
-- mission portant mon org_id mais pointant vers le dossier d'une autre société.
-- La ligne serait restée invisible côté lecture — mais les commandes
-- SECURITY DEFINER, elles, suivent le lien.
--
-- Ce déclencheur refuse le lien croisé à l'écriture. Générique : on lui passe
-- des paires (colonne, table visée).
-- -----------------------------------------------------------------------------
create or replace function public.exiger_meme_org()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  i int := 0;
  v_col text;
  v_table text;
  v_val uuid;
  v_org uuid;
  v_ligne jsonb := to_jsonb(new);
begin
  if (v_ligne ->> 'org_id') is null then
    raise exception 'Cloison : org_id obligatoire sur %', tg_table_name
      using errcode = '23502';
  end if;

  while i < tg_nargs loop
    v_col := tg_argv[i];
    v_table := tg_argv[i + 1];
    i := i + 2;
    v_val := nullif(v_ligne ->> v_col, '')::uuid;
    if v_val is not null then
      execute format('select org_id from public.%I where id = $1', v_table)
        into v_org using v_val;
      if v_org is null or v_org <> (v_ligne ->> 'org_id')::uuid then
        raise exception
          'Cloison : %.% désigne une ligne d''une autre société', tg_table_name, v_col
          using errcode = '42501';
      end if;
    end if;
  end loop;
  return new;
end $function$;

revoke execute on function public.exiger_meme_org() from public, anon, authenticated;

do $$
declare
  r record;
  v_paires text;
begin
  for r in
    select * from (values
      ('affaires',              array['client_id','clients']),
      ('missions',              array['affaire_id','affaires']),
      ('mission_affectations',  array['mission_id','missions','utilisateur_id','utilisateurs']),
      ('mission_vehicules',     array['mission_id','missions','vehicule_id','vehicules']),
      ('chrono_sessions',       array['mission_id','missions']),
      ('factures',              array['affaire_id','affaires']),
      ('facture_lignes',        array['facture_id','factures']),
      ('paiements',             array['facture_id','factures']),
      ('transmissions',         array['facture_id','factures']),
      ('scenarios',             array['affaire_id','affaires']),
      ('documents_instances',   array['affaire_id','affaires']),
      ('signatures',            array['instance_id','documents_instances']),
      ('acces_client',          array['affaire_id','affaires']),
      ('affaire_adresses',      array['affaire_id','affaires']),
      ('rapports_chantier',     array['mission_id','missions','affaire_id','affaires']),
      ('constats_chantier',     array['rapport_id','rapports_chantier']),
      ('stock_mouvements',      array['mission_id','missions','article_id','stock_articles']),
      ('donnees_paie',          array['utilisateur_id','utilisateurs']),
      ('conges',                array['utilisateur_id','utilisateurs']),
      ('documents_rh',          array['utilisateur_id','utilisateurs']),
      ('equipements_rh',        array['utilisateur_id','utilisateurs']),
      ('utilisateur_capacites', array['utilisateur_id','utilisateurs']),
      ('vehicule_signalements', array['vehicule_id','vehicules','utilisateur_id','utilisateurs']),
      ('consentements',         array['client_id','clients','utilisateur_id','utilisateurs']),
      ('demandes_rgpd',         array['client_id','clients','utilisateur_id','utilisateurs'])
    ) as t(tbl, paires)
  loop
    if to_regclass('public.' || r.tbl) is null then continue; end if;
    execute format('drop trigger if exists trg_cloison_org on public.%I', r.tbl);
    v_paires := (select string_agg(quote_literal(x), ', ') from unnest(r.paires) as x);
    execute format(
      'create trigger trg_cloison_org before insert or update on public.%I
         for each row execute function public.exiger_meme_org(%s)',
      r.tbl, v_paires);
  end loop;
end $$;

-- utilisateur_roles n'a pas de colonne org_id : les deux côtés du lien portent
-- l'organisation, on les compare entre eux.
create or replace function public.exiger_meme_org_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org_u uuid; v_org_r uuid;
begin
  select org_id into v_org_u from utilisateurs where id = new.utilisateur_id;
  select org_id into v_org_r from roles where id = new.role_id;
  if v_org_u is null or v_org_r is null or v_org_u <> v_org_r then
    raise exception 'Cloison : rôle et membre appartiennent à deux sociétés'
      using errcode = '42501';
  end if;
  return new;
end $function$;

revoke execute on function public.exiger_meme_org_role() from public, anon, authenticated;
drop trigger if exists trg_cloison_role on public.utilisateur_roles;
create trigger trg_cloison_role before insert or update on public.utilisateur_roles
  for each row execute function public.exiger_meme_org_role();

-- -----------------------------------------------------------------------------
-- Les deux tables sans org_id qui restent lisibles par tous, et pourquoi.
-- Ce ne sont pas des données de société : ce sont les référentiels de
-- l'éditeur, publiés une fois, jamais écrits par un client.
-- -----------------------------------------------------------------------------
comment on table public.capacites is
  'Référentiel éditeur : catalogue des droits nommés. Aucune donnée de société. '
  'Lecture ouverte, écriture impossible (aucune policy d''écriture).';
comment on table public.sous_traitants is
  'Référentiel éditeur : sous-traitants du responsable de traitement (annexe DPA). '
  'Aucune donnée de société. Lecture ouverte, écriture impossible.';

revoke insert, update, delete on public.capacites from anon, authenticated;
revoke insert, update, delete on public.sous_traitants from anon, authenticated;
revoke insert, update, delete on public.role_capacites from anon, authenticated;
revoke insert, update, delete on public.utilisateur_roles from anon, authenticated;
revoke insert, update, delete on public.roles from anon, authenticated;

-- -----------------------------------------------------------------------------
-- L'AUDITEUR — cmd_audit_cloison()
--
-- Rejoue les règles sur le schéma vivant. Une règle qu'on ne peut pas rejouer
-- est une règle qui se périme. Sept contrôles, retour lisible.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_audit_cloison()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_manquements jsonb := '[]'::jsonb;
  v_tolerees text[] := array['capacites', 'sous_traitants', 'organisations',
                             'utilisateur_roles', 'role_capacites'];
  v_fn_ouvertes text[] := array['etat_facturation', 'mon_profil',
                                'jwt_org', 'acteur_a_capacite'];
  r record;
  v_n integer;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;

  -- 1. une table sans RLS est une table publique.
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'RLS désactivé', 'objet', r.relname);
  end loop;

  -- 2. une table de données sans org_id ne peut pas être cloisonnée.
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not (c.relname = any(v_tolerees))
       and not exists (select 1 from information_schema.columns col
                        where col.table_schema = 'public' and col.table_name = c.relname
                          and col.column_name = 'org_id')
  loop
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'table sans org_id', 'objet', r.relname);
  end loop;

  -- 3. une policy qui ne nomme pas l'organisation ne filtre pas.
  for r in
    select c.relname, p.polname from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and not (c.relname = any(v_tolerees))
       and coalesce(pg_get_expr(p.polqual, p.polrelid), '') !~ 'org_id'
  loop
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'policy sans filtre d''organisation',
      'objet', r.relname || ' / ' || r.polname);
  end loop;

  -- 4. toute table doit avoir au moins une policy, sinon elle est muette
  --    pour tous — ou ouverte si le RLS venait à tomber.
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  loop
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'majeur', 'regle', 'aucune policy', 'objet', r.relname);
  end loop;

  -- 5. hors `cmd_*`, aucune fonction SECURITY DEFINER ne doit être appelable
  --    depuis un jeton client : elle franchit le RLS par construction.
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and p.proname not like 'cmd\_%'
       and not (p.proname = any(v_fn_ouvertes))
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       and (has_function_privilege('authenticated', p.oid, 'execute')
            or has_function_privilege('anon', p.oid, 'execute'))
  loop
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'fonction interne appelable par un client',
      'objet', r.proname);
  end loop;

  -- 6. les liens inter-tables doivent porter le déclencheur de cohérence.
  for r in
    select unnest(array['affaires','missions','mission_affectations','factures',
                        'facture_lignes','paiements','scenarios','documents_instances',
                        'acces_client','rapports_chantier','constats_chantier',
                        'donnees_paie','chrono_sessions']) as tbl
  loop
    if to_regclass('public.' || r.tbl) is not null
       and not exists (select 1 from pg_trigger t
                        where t.tgrelid = ('public.' || r.tbl)::regclass
                          and t.tgname = 'trg_cloison_org') then
      v_manquements := v_manquements || jsonb_build_object(
        'gravite', 'majeur', 'regle', 'déclencheur de cohérence absent', 'objet', r.tbl);
    end if;
  end loop;

  -- 7. contrôle sur les données elles-mêmes : un lien déjà croisé en base.
  select count(*) into v_n from missions m
    join affaires a on a.id = m.affaire_id where a.org_id <> m.org_id;
  if v_n > 0 then
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'lien croisé existant',
      'objet', 'missions → affaires (' || v_n || ')');
  end if;
  select count(*) into v_n from factures f
    join affaires a on a.id = f.affaire_id where a.org_id <> f.org_id;
  if v_n > 0 then
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'lien croisé existant',
      'objet', 'factures → affaires (' || v_n || ')');
  end if;
  select count(*) into v_n from affaires a
    join clients c on c.id = a.client_id where c.org_id <> a.org_id;
  if v_n > 0 then
    v_manquements := v_manquements || jsonb_build_object(
      'gravite', 'critique', 'regle', 'lien croisé existant',
      'objet', 'affaires → clients (' || v_n || ')');
  end if;

  return jsonb_build_object(
    'verdict', case when jsonb_array_length(v_manquements) = 0
                    then 'CLOISON INTACTE' else 'MANQUEMENTS' end,
    'manquements', v_manquements,
    'controle_le', now());
end $function$;

comment on function public.cmd_audit_cloison() is
  'Rejoue les sept règles de cloisonnement sur le schéma vivant. À lancer après '
  'toute migration : une règle qu''on ne peut pas rejouer est une règle qui se périme.';
