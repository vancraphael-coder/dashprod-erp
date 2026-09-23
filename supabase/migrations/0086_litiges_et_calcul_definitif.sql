-- =============================================================================
-- 0086 — LITIGES (impayé, dégâts/assurance, contestation…) + verrou de clôture
--
-- ⚠ RESTAURÉE LE 2026-09-19 depuis le registre de migrations de la base de
--   production (`supabase_migrations.schema_migrations`). Appliquée en
--   production le 2026-08-07, jamais commitée. Contenu repris tel quel.
--
-- Un dossier « effectué » n'est pas toujours fini : une facture reste impayée,
-- un client réclame pour un meuble abîmé, l'assurance traîne. Ces situations
-- ont chacune leur circuit. Tant qu'un litige est ouvert, le dossier ne peut
-- pas être clôturé (sauf dérogation écrite, déjà prévue en 0080).
--
-- « Litige en cours » n'est PAS un état stocké de plus : c'est un fait dérivé
-- (le dossier est « effectué » ET a au moins un litige ouvert), affiché comme
-- tel — exactement comme le cycle de facturation. On ne touche donc pas à la
-- machine à états.
-- =============================================================================

create table if not exists public.litiges (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations(id),
  affaire_id    uuid not null references public.affaires(id),
  type          text not null,            -- impaye | degat | contestation | autre
  statut        text not null default 'ouvert',  -- ouvert | resolu | abandonne
  etape         text,                     -- étape courante du circuit (voir domaine)
  titre         text,
  description   text,
  montant_centimes bigint,                -- enjeu financier (créance, dégât estimé…)
  reference     text,                     -- n° sinistre assureur, n° dossier recouvrement…
  ouvert_le     timestamptz not null default now(),
  ouvert_par    uuid references public.utilisateurs(id),
  resolu_le     timestamptz,
  resolu_par    uuid references public.utilisateurs(id),
  resolution    text,                     -- comment ça s'est terminé
  journal       jsonb not null default '[]'::jsonb,  -- historique des étapes
  updated_at    timestamptz not null default now()
);

alter table public.litiges enable row level security;

drop policy if exists litiges_meme_org on public.litiges;
create policy litiges_meme_org on public.litiges
  for all to authenticated
  using (org_id = jwt_org())
  with check (org_id = jwt_org());

-- Cloison : un litige ne pointe que vers un dossier de sa société.
drop trigger if exists trg_cloison_org on public.litiges;
create trigger trg_cloison_org before insert or update on public.litiges
  for each row execute function public.exiger_meme_org('affaire_id', 'affaires');

-- Immuabilité : figé quand le dossier est clos (sauf pendant les commandes).
drop trigger if exists trg_dossier_clos on public.litiges;
create trigger trg_dossier_clos before insert or update or delete on public.litiges
  for each row execute function public.figer_si_dossier_clos('@direct');

create index if not exists idx_litiges_affaire on public.litiges(affaire_id);
create index if not exists idx_litiges_ouverts on public.litiges(org_id, statut) where statut = 'ouvert';

-- -----------------------------------------------------------------------------
-- Ouvrir un litige.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_ouvrir_litige(
  p_affaire uuid, p_type text, p_titre text default null,
  p_montant_centimes bigint default null, p_description text default null,
  p_reference text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_acteur uuid; v_id uuid; v_etape text;
begin
  if not acteur_a_capacite('creer_affaire') and not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé : gérer les litiges demande une capacité bureau' using errcode = '42501';
  end if;
  if not exists (select 1 from affaires where id = p_affaire and org_id = v_org) then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if p_type not in ('impaye', 'degat', 'contestation', 'autre') then
    raise exception 'Type de litige inconnu : %', p_type using errcode = '22023';
  end if;

  v_etape := case p_type
    when 'impaye' then 'a_relancer'
    when 'degat' then 'a_declarer'
    when 'contestation' then 'recue'
    else 'ouvert' end;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  insert into litiges (org_id, affaire_id, type, etape, titre, montant_centimes,
                       description, reference, ouvert_par, journal)
    values (v_org, p_affaire, p_type, v_etape,
            coalesce(nullif(btrim(p_titre), ''), initcap(p_type)),
            p_montant_centimes, p_description, p_reference, v_acteur,
            jsonb_build_array(jsonb_build_object(
              'etape', v_etape, 'le', now(), 'par', v_acteur, 'note', 'Ouverture')))
    returning id into v_id;

  perform emettre_evenement(v_org, 'Litige.Ouvert', 'litige', v_id, v_acteur,
    jsonb_build_object('affaire', p_affaire, 'type', p_type, 'montant', p_montant_centimes));
  return jsonb_build_object('litige_id', v_id, 'etape', v_etape);
end $function$;

-- -----------------------------------------------------------------------------
-- Avancer un litige d'une étape (l'étape valide est vérifiée côté domaine ;
-- la base journalise et refuse d'avancer un litige déjà résolu).
-- -----------------------------------------------------------------------------
create or replace function public.cmd_avancer_litige(
  p_litige uuid, p_etape text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org(); v_acteur uuid; v_statut text;
begin
  if not acteur_a_capacite('creer_affaire') and not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé' using errcode = '42501';
  end if;
  select statut into v_statut from litiges where id = p_litige and org_id = v_org;
  if not found then raise exception 'Litige introuvable' using errcode = '42501'; end if;
  if v_statut <> 'ouvert' then
    raise exception 'Ce litige est déjà clôturé' using errcode = '22023';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  update litiges
     set etape = p_etape, updated_at = now(),
         journal = journal || jsonb_build_array(jsonb_build_object(
           'etape', p_etape, 'le', now(), 'par', v_acteur,
           'note', nullif(btrim(coalesce(p_note, '')), '')))
   where id = p_litige and org_id = v_org;

  perform emettre_evenement(v_org, 'Litige.Avance', 'litige', p_litige, v_acteur,
    jsonb_build_object('etape', p_etape));
  return jsonb_build_object('litige_id', p_litige, 'etape', p_etape);
end $function$;

-- -----------------------------------------------------------------------------
-- Résoudre (ou abandonner) un litige.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_resoudre_litige(
  p_litige uuid, p_issue text, p_resolution text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org(); v_acteur uuid;
begin
  if not acteur_a_capacite('creer_affaire') and not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé' using errcode = '42501';
  end if;
  if p_issue not in ('resolu', 'abandonne') then
    raise exception 'Issue inconnue : %', p_issue using errcode = '22023';
  end if;
  if not exists (select 1 from litiges where id = p_litige and org_id = v_org and statut = 'ouvert') then
    raise exception 'Litige introuvable ou déjà clôturé' using errcode = '42501';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  update litiges
     set statut = p_issue, resolu_le = now(), resolu_par = v_acteur,
         resolution = nullif(btrim(coalesce(p_resolution, '')), ''), updated_at = now(),
         journal = journal || jsonb_build_array(jsonb_build_object(
           'etape', p_issue, 'le', now(), 'par', v_acteur, 'note', p_resolution))
   where id = p_litige and org_id = v_org;

  perform emettre_evenement(v_org, 'Litige.Resolu', 'litige', p_litige, v_acteur,
    jsonb_build_object('issue', p_issue));
  return jsonb_build_object('litige_id', p_litige, 'statut', p_issue);
end $function$;

-- -----------------------------------------------------------------------------
-- Lire les litiges d'un dossier + un résumé.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_litiges_affaire(p_affaire uuid)
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'ouverts', (select count(*) from litiges where affaire_id = p_affaire
                 and org_id = jwt_org() and statut = 'ouvert'),
    'enjeu_ouvert_centimes', (select coalesce(sum(montant_centimes), 0) from litiges
                 where affaire_id = p_affaire and org_id = jwt_org() and statut = 'ouvert'),
    'liste', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'type', type, 'statut', statut, 'etape', etape, 'titre', titre,
        'montant_centimes', montant_centimes, 'reference', reference,
        'description', description, 'ouvert_le', ouvert_le, 'resolu_le', resolu_le,
        'resolution', resolution, 'journal', journal)
      order by (statut = 'ouvert') desc, ouvert_le desc)
      from litiges where affaire_id = p_affaire and org_id = jwt_org()), '[]'::jsonb));
$function$;

-- -----------------------------------------------------------------------------
-- La clôture apprend à voir les litiges : un litige ouvert BLOQUE.
-- On étend cmd_exigences_cloture en insérant le point « litiges ».
-- -----------------------------------------------------------------------------
create or replace function public.cmd_exigences_cloture(p_affaire uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_etat etat_affaire; v_points jsonb := '[]'::jsonb;
  v_n integer; v_m integer; v_fact jsonb; v_bloquants integer := 0; v_litiges integer;
begin
  select etat into v_etat from affaires where id = p_affaire and org_id = v_org;
  if v_etat is null then raise exception 'Dossier introuvable' using errcode = '42501'; end if;

  v_points := v_points || jsonb_build_object(
    'cle','etat','libelle','Le chantier est terminé',
    'statut', case when v_etat in ('effectue','clos') then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_etat in ('effectue','clos') then null
                   else 'Le dossier est en « ' || v_etat || ' ». Terminez les chantiers d''abord.' end);

  select count(*) into v_n from missions
   where affaire_id = p_affaire and org_id = v_org and etat in ('planifiee','en_cours');
  v_points := v_points || jsonb_build_object(
    'cle','missions','libelle','Toutes les missions sont terminées ou annulées',
    'statut', case when v_n = 0 then 'ok' else 'manquant' end, 'bloquant', true,
    'detail', case when v_n = 0 then null else v_n || ' mission(s) encore ouverte(s)' end);

  select count(*) into v_n from chrono_sessions cs join missions m on m.id = cs.mission_id
   where m.affaire_id = p_affaire and cs.org_id = v_org and cs.fin is null;
  v_points := v_points || jsonb_build_object(
    'cle','pointages','libelle','Aucun pointage resté ouvert',
    'statut', case when v_n = 0 then 'ok' else 'manquant' end, 'bloquant', true,
    'detail', case when v_n = 0 then null else v_n || ' chrono(s) sans heure de fin' end);

  select count(*) into v_n from missions m
   where m.affaire_id = p_affaire and m.org_id = v_org and m.etat = 'effectuee';
  select count(*) into v_m from missions m join rapports_chantier r on r.mission_id = m.id
   where m.affaire_id = p_affaire and m.org_id = v_org and m.etat = 'effectuee'
     and coalesce(btrim(r.deroule), '') <> '';
  v_points := v_points || jsonb_build_object(
    'cle','rapports','libelle','Chaque chantier a son rapport',
    'statut', case when v_n = 0 then 'sans_objet' when v_m >= v_n then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when v_n = 0 then 'Aucun chantier effectué'
                   when v_m >= v_n then null else (v_n - v_m) || ' rapport(s) manquant(s)' end);

  select count(*) into v_n from constats_chantier c join rapports_chantier r on r.id = c.rapport_id
   where r.affaire_id = p_affaire and c.org_id = v_org and c.etat = 'declare';
  v_points := v_points || jsonb_build_object(
    'cle','constats','libelle','Tous les écarts sont tranchés',
    'statut', case when v_n = 0 then 'ok' else 'manquant' end, 'bloquant', true,
    'detail', case when v_n = 0 then null else v_n || ' constat(s) en attente du bureau' end);

  -- NOUVEAU : aucun litige ouvert.
  select count(*) into v_litiges from litiges
   where affaire_id = p_affaire and org_id = v_org and statut = 'ouvert';
  v_points := v_points || jsonb_build_object(
    'cle','litiges','libelle','Aucun litige en cours',
    'statut', case when v_litiges = 0 then 'ok' else 'manquant' end, 'bloquant', true,
    'detail', case when v_litiges = 0 then null
                   else v_litiges || ' litige(s) ouvert(s) — à résoudre ou clôturer avec motif' end);

  select count(*) into v_n from documents_instances
   where affaire_id = p_affaire and org_id = v_org and statut = 'signe';
  v_points := v_points || jsonb_build_object(
    'cle','signature','libelle','Une offre signée au dossier',
    'statut', case when v_n > 0 then 'ok' else 'manquant' end, 'bloquant', false,
    'detail', case when v_n > 0 then null else 'Aucun document signé — clôture possible avec motif' end);

  v_fact := etat_facturation(p_affaire);
  v_points := v_points || jsonb_build_object(
    'cle','facture','libelle','La facture est émise',
    'statut', case when (v_fact->>'factures')::int > 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when (v_fact->>'factures')::int > 0 then null else 'Aucune facture émise' end);

  v_points := v_points || jsonb_build_object(
    'cle','solde','libelle','Le solde est à zéro',
    'statut', case when (v_fact->>'solde_centimes')::bigint = 0 then 'ok' else 'manquant' end,
    'bloquant', true,
    'detail', case when (v_fact->>'solde_centimes')::bigint = 0 then null
                   else 'Reste dû : ' || to_char((v_fact->>'solde_centimes')::bigint / 100.0, 'FM999G999D00') || ' €' end);

  select count(*) into v_bloquants from jsonb_array_elements(v_points) e
   where (e->>'bloquant')::boolean and e->>'statut' = 'manquant';

  return jsonb_build_object('affaire', p_affaire, 'etat', v_etat, 'points', v_points,
    'bloquants', v_bloquants,
    'litiges_ouverts', v_litiges,
    'peut_cloturer', v_bloquants = 0 and v_etat = 'effectue',
    'peut_cloturer_avec_motif', v_etat = 'effectue', 'facturation', v_fact);
end $function$;
