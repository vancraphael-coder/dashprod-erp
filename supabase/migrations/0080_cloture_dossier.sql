-- =============================================================================
-- 0080 — CLÔTURE DU DOSSIER, DE BOUT EN BOUT
--
-- Jusqu'ici « clos » était un état atteignable et jamais atteint : aucun écran
-- ne l'appelait, aucune condition ne le gardait, rien ne se figeait après.
-- Un dossier restait modifiable indéfiniment — donc la comptabilité aussi.
--
-- Ce que la clôture devient :
--   1. une check-list vérifiable AVANT (cmd_exigences_cloture) ;
--   2. un geste qui refuse tant qu'un point bloquant manque, sauf dérogation
--      écrite et journalisée (cmd_cloturer_dossier) ;
--   3. un bilan figé au moment du geste — il ne se recalcule plus jamais ;
--   4. un dossier réellement immuable après : la table, ses missions, ses
--      factures, ses rapports. Plus rien ne bouge ;
--   5. une réouverture possible, mais nommée, motivée et tracée
--      (cmd_rouvrir_dossier). Jamais un retour en arrière silencieux.
--
-- Ce que le bilan ne contient PAS, volontairement : aucun coût salarial (il
-- vivrait alors dans `affaires`, lisible par toute l'organisation, alors que la
-- paie est derrière `voir_paie`), aucune donnée personnelle du client (elle
-- vivrait en double et échapperait à l'anonymisation RGPD).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Les colonnes de clôture.
-- -----------------------------------------------------------------------------
alter table public.affaires
  add column if not exists cloture_le          timestamptz,
  add column if not exists cloture_par         uuid references public.utilisateurs(id),
  add column if not exists cloture_motif       text,
  add column if not exists cloture_bilan       jsonb,
  add column if not exists cloture_historique  jsonb not null default '[]'::jsonb;

comment on column public.affaires.cloture_bilan is
  'Photographie figée au moment de la clôture : chiffre d''affaires, encaissé, '
  'heures, constats, chiffrage retenu. Ne se recalcule jamais. Aucun coût '
  'salarial, aucune donnée personnelle.';
comment on column public.affaires.cloture_historique is
  'Empilement des clôtures précédentes si le dossier a été rouvert. On empile, '
  'on ne réécrit pas.';

-- -----------------------------------------------------------------------------
-- 2. La capacité nommée, et la réparation d'un trou pour les NOUVELLES sociétés.
--
-- provisionner_roles_standard() n'accordait ni `pointer_chantier` ni
-- `cloturer_chantier` : dans une société créée aujourd'hui, l'équipe terrain ne
-- peut pas pointer ses heures ni clôturer son chantier. Roovers ne le voyait
-- pas — ses rôles avaient été rattrapés à la main par 0067/0068.
-- -----------------------------------------------------------------------------
insert into public.capacites (cle, libelle)
values ('cloturer_dossier', 'Clôturer un dossier')
on conflict (cle) do nothing;

create or replace function public.provisionner_roles_standard(p_org uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_toutes text[] := array(select cle from capacites);
  v_role uuid;
  r record;
begin
  for r in select * from (values
    ('direction',   v_toutes),
    ('coordination', array['voir_prix','creer_affaire','valider_intake','faire_signer',
                            'gerer_planning','emettre_facture','signaler_materiel',
                            'demander_conge','approuver_conge','cloturer_dossier',
                            'pointer_chantier','cloturer_chantier']),
    ('commercial',  array['voir_prix','creer_affaire','faire_signer',
                           'signaler_materiel','demander_conge']),
    ('chef_equipe', array['signaler_materiel','demander_conge',
                           'pointer_chantier','cloturer_chantier']),
    ('demenageur',  array['signaler_materiel','demander_conge','pointer_chantier'])
  ) as t(cle, caps)
  loop
    insert into roles (org_id, cle, libelle)
      values (p_org, r.cle, initcap(replace(r.cle, '_', ' ')))
      on conflict (org_id, cle) do nothing
      returning id into v_role;

    if v_role is null then
      select id into v_role from roles where org_id = p_org and cle = r.cle;
    end if;

    insert into role_capacites (role_id, capacite_cle)
      select v_role, unnest(r.caps)
      on conflict do nothing;

    v_role := null;
  end loop;
end; $function$;

-- Rattrapage des sociétés déjà créées : même règle, appliquée à l'existant.
insert into public.role_capacites (role_id, capacite_cle)
select r.id, 'cloturer_dossier' from public.roles r
 where r.cle in ('direction', 'coordination')
on conflict do nothing;
insert into public.role_capacites (role_id, capacite_cle)
select r.id, c.cle from public.roles r
  cross join (values ('pointer_chantier'), ('cloturer_chantier')) as c(cle)
 where r.cle in ('direction', 'coordination', 'chef_equipe')
on conflict do nothing;
insert into public.role_capacites (role_id, capacite_cle)
select r.id, 'pointer_chantier' from public.roles r where r.cle = 'demenageur'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 3. La réouverture doit être une transition permise.
-- -----------------------------------------------------------------------------
create or replace function public.transition_permise(p_source etat_affaire, p_cible etat_affaire)
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select (p_source, p_cible) in (
    ('brouillon','devis'), ('brouillon','annule'),
    ('devis','envoye'), ('devis','annule'),
    ('envoye','confirme'), ('envoye','reporte'), ('envoye','annule'),
    ('confirme','planifie'), ('confirme','reporte'), ('confirme','annule'),
    ('planifie','en_cours'), ('planifie','reporte'), ('planifie','annule'),
    ('en_cours','effectue'), ('en_cours','annule'),
    ('effectue','clos'), ('effectue','annule'),
    ('clos','effectue'),
    ('reporte','planifie'), ('reporte','annule'),
    ('annule','devis'), ('annule','envoye'), ('annule','confirme'),
    ('annule','planifie')
  );
$function$;

-- -----------------------------------------------------------------------------
-- 4. LA CHECK-LIST — cmd_exigences_cloture()
--
-- Elle répond avant qu'on appuie. Chaque point porte son verdict et dit s'il
-- bloque. Un point « sans objet » n'est pas un point réussi : il est nommé.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_exigences_cloture(p_affaire uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org();
  v_etat etat_affaire;
  v_points jsonb := '[]'::jsonb;
  v_n integer; v_m integer;
  v_fact jsonb;
  v_bloquants integer := 0;
begin
  select etat into v_etat from affaires where id = p_affaire and org_id = v_org;
  if v_etat is null then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;

  -- a. l'état lui-même
  v_points := v_points || jsonb_build_object(
    'cle', 'etat', 'libelle', 'Le chantier est terminé',
    'statut', case when v_etat = 'effectue' then 'ok'
                   when v_etat = 'clos' then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_etat in ('effectue','clos') then null
                   else 'Le dossier est en « ' || v_etat || ' ». Terminez les chantiers d''abord.' end);

  -- b. aucune mission en attente
  select count(*) into v_n from missions
   where affaire_id = p_affaire and org_id = v_org and etat in ('planifiee','en_cours');
  v_points := v_points || jsonb_build_object(
    'cle', 'missions', 'libelle', 'Toutes les missions sont terminées ou annulées',
    'statut', case when v_n = 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_n = 0 then null else v_n || ' mission(s) encore ouverte(s)' end);

  -- c. aucun pointage resté ouvert (sinon les heures ne sont pas comptées)
  select count(*) into v_n from chrono_sessions cs
    join missions m on m.id = cs.mission_id
   where m.affaire_id = p_affaire and cs.org_id = v_org and cs.fin is null;
  v_points := v_points || jsonb_build_object(
    'cle', 'pointages', 'libelle', 'Aucun pointage resté ouvert',
    'statut', case when v_n = 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_n = 0 then null else v_n || ' chrono(s) sans heure de fin' end);

  -- d. un rapport de chantier par mission effectuée
  select count(*) into v_n from missions m
   where m.affaire_id = p_affaire and m.org_id = v_org and m.etat = 'effectuee';
  select count(*) into v_m from missions m
    join rapports_chantier r on r.mission_id = m.id
   where m.affaire_id = p_affaire and m.org_id = v_org and m.etat = 'effectuee'
     and coalesce(btrim(r.deroule), '') <> '';
  v_points := v_points || jsonb_build_object(
    'cle', 'rapports', 'libelle', 'Chaque chantier a son rapport',
    'statut', case when v_n = 0 then 'sans_objet'
                   when v_m >= v_n then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_n = 0 then 'Aucun chantier effectué'
                   when v_m >= v_n then null
                   else (v_n - v_m) || ' rapport(s) manquant(s)' end);

  -- e. aucun constat en attente d'arbitrage
  select count(*) into v_n from constats_chantier c
    join rapports_chantier r on r.id = c.rapport_id
   where r.affaire_id = p_affaire and c.org_id = v_org and c.etat = 'declare';
  v_points := v_points || jsonb_build_object(
    'cle', 'constats', 'libelle', 'Tous les écarts sont tranchés',
    'statut', case when v_n = 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_n = 0 then null else v_n || ' constat(s) en attente du bureau' end);

  -- f. l'offre signée — un dossier peut légitimement ne pas en avoir
  select count(*) into v_n from documents_instances
   where affaire_id = p_affaire and org_id = v_org and statut = 'signe';
  v_points := v_points || jsonb_build_object(
    'cle', 'signature', 'libelle', 'Une offre signée au dossier',
    'statut', case when v_n > 0 then 'ok' else 'manquant' end,
    'bloquant', false,
    'detail', case when v_n > 0 then null else 'Aucun document signé — clôture possible avec motif' end);

  -- g. la facturation
  v_fact := etat_facturation(p_affaire);
  v_points := v_points || jsonb_build_object(
    'cle', 'facture', 'libelle', 'La facture est émise',
    'statut', case when (v_fact->>'factures')::int > 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when (v_fact->>'factures')::int > 0 then null else 'Aucune facture émise' end);

  v_points := v_points || jsonb_build_object(
    'cle', 'solde', 'libelle', 'Le solde est à zéro',
    'statut', case when (v_fact->>'solde_centimes')::bigint = 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when (v_fact->>'solde_centimes')::bigint = 0 then null
                   else 'Reste dû : ' ||
                        to_char((v_fact->>'solde_centimes')::bigint / 100.0, 'FM999G999D00') || ' €' end);

  select count(*) into v_bloquants from jsonb_array_elements(v_points) e
   where (e->>'bloquant')::boolean and e->>'statut' = 'manquant';

  return jsonb_build_object(
    'affaire', p_affaire,
    'etat', v_etat,
    'points', v_points,
    'bloquants', v_bloquants,
    'peut_cloturer', v_bloquants = 0 and v_etat = 'effectue',
    'peut_cloturer_avec_motif', v_etat = 'effectue',
    'facturation', v_fact);
end $function$;

-- -----------------------------------------------------------------------------
-- 5. LE GESTE — cmd_cloturer_dossier()
-- -----------------------------------------------------------------------------
create or replace function public.cmd_cloturer_dossier(p_affaire uuid, p_motif text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
  v_etat etat_affaire;
  v_exig jsonb;
  v_bilan jsonb;
  v_fact jsonb;
  v_minutes bigint;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
begin
  if not acteur_a_capacite('cloturer_dossier') then
    raise exception 'Refusé : la clôture d''un dossier demande la capacité « Clôturer un dossier »'
      using errcode = '42501';
  end if;

  select etat into v_etat from affaires where id = p_affaire and org_id = v_org;
  if v_etat is null then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if v_etat = 'clos' then
    raise exception 'Ce dossier est déjà clôturé' using errcode = '22023';
  end if;
  if v_etat <> 'effectue' then
    raise exception 'Clôture impossible : le dossier est en « % », le chantier doit être terminé', v_etat
      using errcode = '22023';
  end if;

  v_exig := cmd_exigences_cloture(p_affaire);
  if (v_exig->>'bloquants')::int > 0 and v_motif is null then
    raise exception 'Clôture refusée : % point(s) bloquant(s). Levez-les, ou clôturez avec un motif écrit.',
      (v_exig->>'bloquants')
      using errcode = '22023';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  v_fact := etat_facturation(p_affaire);

  select coalesce(sum(extract(epoch from (cs.fin - cs.debut)) / 60), 0)::bigint
    into v_minutes
    from chrono_sessions cs join missions m on m.id = cs.mission_id
   where m.affaire_id = p_affaire and cs.org_id = v_org
     and cs.fin is not null and coalesce(cs.type, 'travail') <> 'pause';

  v_bilan := jsonb_build_object(
    'fige_le', now(),
    'facturation', v_fact,
    'missions', (select jsonb_build_object(
        'effectuees', count(*) filter (where etat = 'effectuee'),
        'annulees',   count(*) filter (where etat = 'annulee'),
        'premiere',   min(date), 'derniere', max(date))
      from missions where affaire_id = p_affaire and org_id = v_org),
    'heures_chantier', round(v_minutes / 60.0, 2),
    'constats', (select jsonb_build_object(
        'valides', count(*) filter (where c.etat = 'valide'),
        'ajustes', count(*) filter (where c.etat = 'ajuste'),
        'refuses', count(*) filter (where c.etat = 'refuse'),
        'minutes_cumulees', coalesce(sum(c.minutes) filter (where c.etat in ('valide','ajuste')), 0),
        'volume_cumule_m3', coalesce(sum(c.volume_m3) filter (where c.etat in ('valide','ajuste')), 0))
      from constats_chantier c join rapports_chantier r on r.id = c.rapport_id
      where r.affaire_id = p_affaire and c.org_id = v_org),
    'chiffrage_retenu', (select s.resultats from scenarios s
      where s.affaire_id = p_affaire and s.org_id = v_org and s.retenu = true limit 1),
    'documents_signes', (select count(*) from documents_instances
      where affaire_id = p_affaire and org_id = v_org and statut = 'signe'),
    'exigences', v_exig->'points',
    'derogation', case when (v_exig->>'bloquants')::int > 0
                       then jsonb_build_object('bloquants', (v_exig->>'bloquants')::int, 'motif', v_motif)
                       else null end);

  perform set_config('app.cloture_ok', 'true', true);

  -- Les documents du dossier deviennent définitifs.
  update documents_instances set gele = true
   where affaire_id = p_affaire and org_id = v_org and coalesce(gele, false) = false;

  perform set_config('app.transition_ok', 'true', true);
  update affaires
     set etat = 'clos', cloture_le = now(), cloture_par = v_acteur,
         cloture_motif = v_motif, cloture_bilan = v_bilan
   where id = p_affaire and org_id = v_org;
  perform set_config('app.transition_ok', 'false', true);
  perform set_config('app.cloture_ok', 'false', true);

  perform emettre_evenement(v_org, 'Affaire.Cloturee', 'affaire', p_affaire, v_acteur,
    jsonb_build_object('bilan', v_bilan, 'motif', v_motif));

  return jsonb_build_object('statut', 'CLOTURE', 'bilan', v_bilan);
end $function$;

-- -----------------------------------------------------------------------------
-- 6. LA RÉOUVERTURE — nommée, motivée, tracée.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_rouvrir_dossier(p_affaire uuid, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
  v_etat etat_affaire;
  v_bilan jsonb;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
begin
  if not acteur_a_capacite('cloturer_dossier') then
    raise exception 'Refusé : rouvrir un dossier demande la capacité « Clôturer un dossier »'
      using errcode = '42501';
  end if;
  if v_motif is null then
    raise exception 'Un motif écrit est obligatoire pour rouvrir un dossier clôturé'
      using errcode = '22023';
  end if;

  select etat, cloture_bilan into v_etat, v_bilan
    from affaires where id = p_affaire and org_id = v_org;
  if v_etat is null then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if v_etat <> 'clos' then
    raise exception 'Ce dossier n''est pas clôturé' using errcode = '22023';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;

  perform set_config('app.cloture_ok', 'true', true);
  perform set_config('app.transition_ok', 'true', true);
  update affaires
     set etat = 'effectue',
         cloture_historique = cloture_historique || jsonb_build_array(
           jsonb_build_object('bilan', v_bilan, 'cloture_le', cloture_le,
                              'cloture_par', cloture_par, 'cloture_motif', cloture_motif,
                              'rouverte_le', now(), 'rouverte_par', v_acteur,
                              'rouverture_motif', v_motif)),
         cloture_le = null, cloture_par = null, cloture_motif = null, cloture_bilan = null
   where id = p_affaire and org_id = v_org;
  perform set_config('app.transition_ok', 'false', true);
  perform set_config('app.cloture_ok', 'false', true);

  perform emettre_evenement(v_org, 'Affaire.Rouverte', 'affaire', p_affaire, v_acteur,
    jsonb_build_object('motif', v_motif));

  return jsonb_build_object('statut', 'ROUVERT');
end $function$;

-- -----------------------------------------------------------------------------
-- 7. L'IMMUABILITÉ — un dossier clôturé ne bouge plus.
--
-- Sans ce verrou, « clos » ne serait qu'une étiquette : les factures, les
-- heures et les rapports resteraient modifiables et la comptabilité mentirait.
-- -----------------------------------------------------------------------------
create or replace function public.figer_si_dossier_clos()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mode text := tg_argv[0];
  v_ligne jsonb;
  v_aff uuid;
  v_etat etat_affaire;
begin
  if coalesce(current_setting('app.cloture_ok', true), 'false') = 'true' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_ligne := to_jsonb(case when tg_op = 'INSERT' then new else old end);

  v_aff := case v_mode
    when '@self'     then nullif(v_ligne ->> 'id', '')::uuid
    when '@direct'   then nullif(v_ligne ->> 'affaire_id', '')::uuid
    when '@mission'  then (select affaire_id from missions
                            where id = nullif(v_ligne ->> 'mission_id', '')::uuid)
    when '@facture'  then (select affaire_id from factures
                            where id = nullif(v_ligne ->> 'facture_id', '')::uuid)
    when '@rapport'  then (select affaire_id from rapports_chantier
                            where id = nullif(v_ligne ->> 'rapport_id', '')::uuid)
    when '@instance' then (select affaire_id from documents_instances
                            where id = nullif(v_ligne ->> 'instance_id', '')::uuid)
    else null end;

  if v_aff is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select etat into v_etat from affaires where id = v_aff;
  if v_etat = 'clos' then
    raise exception
      'Dossier clôturé : plus aucune modification. Rouvrez-le d''abord, avec un motif.'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end $function$;

revoke execute on function public.figer_si_dossier_clos() from public, anon, authenticated;

do $$
declare r record;
begin
  for r in select * from (values
    ('affaires',            '@self'),
    ('missions',            '@direct'),
    ('factures',            '@direct'),
    ('scenarios',           '@direct'),
    ('documents_instances', '@direct'),
    ('affaire_adresses',    '@direct'),
    ('rapports_chantier',   '@direct'),
    ('facture_lignes',      '@facture'),
    ('paiements',           '@facture'),
    ('chrono_sessions',     '@mission'),
    ('mission_affectations','@mission'),
    ('mission_vehicules',   '@mission'),
    ('constats_chantier',   '@rapport'),
    ('signatures',          '@instance')
  ) as t(tbl, mode)
  loop
    if to_regclass('public.' || r.tbl) is null then continue; end if;
    execute format('drop trigger if exists trg_dossier_clos on public.%I', r.tbl);
    execute format(
      'create trigger trg_dossier_clos before insert or update or delete on public.%I
         for each row execute function public.figer_si_dossier_clos(%L)', r.tbl, r.mode);
  end loop;
end $$;

comment on function public.cmd_cloturer_dossier(uuid, text) is
  'Clôture un dossier après vérification de la check-list. Fige un bilan qui ne '
  'se recalcule plus et rend le dossier immuable. Dérogation possible, jamais '
  'silencieuse : un motif écrit, journalisé dans l''événement Affaire.Cloturee.';
