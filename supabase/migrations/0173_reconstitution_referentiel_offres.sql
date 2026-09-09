-- 0173 — Reconstitution de l'écart base ↔ dépôt.
--
-- Les lots 01 à 03 (verrou d'offre en RLS, référentiel `offres` versionné,
-- `releves_abonnement`, membre supplémentaire toutes offres) ont été appliqués
-- en production par exécution directe : ils n'ont laissé ni fichier dans
-- `supabase/migrations`, ni ligne dans `supabase_migrations.schema_migrations`.
-- Conséquence : le dépôt ne permettait plus de reconstruire la base.
--
-- Ce fichier rétablit cette propriété. Il est écrit pour être un NO-OP exact
-- sur la production (tout est `if not exists` / `create or replace` / `on
-- conflict do nothing`) et pour rebâtir l'ensemble sur une base neuve.
-- Les politiques sont volontairement recréées (drop + create) : sur une base
-- reconstruite depuis 0001..0172 elles existent sous le même nom mais SANS le
-- verrou d'offre ; un `if not exists` les aurait laissées trouées.

-- =============================================================================
-- 1. Référentiel `offres` — donnée versionnée, jamais modifiée, republiée.
-- =============================================================================

create table if not exists public.offres (
  code                          text        not null,
  publie_le                     timestamptz not null default now(),
  libelle                       text        not null,
  rang                          integer     not null,
  souscriptible                 boolean     not null default true,
  prix_base_htva_mensuel        numeric,
  prix_base_htva_annuel         numeric,
  membres_limite                integer,
  membres_inclus                integer     not null,
  prix_membre_supp_htva         numeric,
  centres_limite                integer,
  centres_inclus                integer     not null,
  prix_centre_supp_htva         numeric,
  modules                       text[]      not null,
  prix_membre_supp_htva_annuel  numeric,
  prix_centre_supp_htva_annuel  numeric,
  remise_annuelle_pct           numeric,
  constraint offres_pkey primary key (code, publie_le)
);

-- Un dépassement sans prix publié n'est pas facturable : la contrainte impose
-- soit un plafond dur, soit un prix.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offres_prix_membre_requis') then
    alter table public.offres add constraint offres_prix_membre_requis
      check (membres_limite is not null or prix_membre_supp_htva is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'offres_prix_centre_requis') then
    alter table public.offres add constraint offres_prix_centre_requis
      check (centres_limite is not null or prix_centre_supp_htva is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'offres_seuil_coherent') then
    alter table public.offres add constraint offres_seuil_coherent
      check (membres_limite is null or membres_inclus <= membres_limite);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'offres_seuil_centres_coherent') then
    alter table public.offres add constraint offres_seuil_centres_coherent
      check (centres_limite is null or centres_inclus <= centres_limite);
  end if;
end $$;

alter table public.offres enable row level security;
drop policy if exists offres_lecture on public.offres;
create policy offres_lecture on public.offres for select using (true);

-- -----------------------------------------------------------------------------
-- 1b. Les trois versions publiées, dans l'ordre. Aucune n'est modifiée : une
--     correction de barème se publie, elle ne se réécrit pas.
-- -----------------------------------------------------------------------------

insert into public.offres (
  code, publie_le, libelle, rang, souscriptible,
  prix_base_htva_mensuel, prix_base_htva_annuel,
  membres_limite, membres_inclus, prix_membre_supp_htva,
  centres_limite, centres_inclus, prix_centre_supp_htva,
  modules, prix_membre_supp_htva_annuel, prix_centre_supp_htva_annuel,
  remise_annuelle_pct)
values
  -- v1 — 20/08 : plafonds durs, aucun membre supplémentaire hors pro.
  ('starter', '2026-08-20 00:00:00+00', 'Basique', 1, true, null, null,
   2, 2, null, 0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client'],
   null, null, null),
  ('regular', '2026-08-20 00:00:00+00', 'Regular', 2, true, null, null,
   5, 5, null, 0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international'],
   null, null, null),
  ('pro', '2026-08-20 00:00:00+00', 'Pro', 3, true, null, null,
   null, 30, 13, null, 1, 50,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international','multi_depots','gestionnaire_depot','stockage_3d'],
   null, null, null),

  -- v2 — 20/08 (lot 03) : membre supplémentaire ouvert à toutes les offres,
  -- plus aucun plafond dur sur les membres.
  ('starter', '2026-08-20 05:28:39.300904+00', 'Basique', 1, true, null, null,
   null, 2, 13, 0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client'],
   null, null, null),
  ('regular', '2026-08-20 05:28:39.300904+00', 'Regular', 2, true, null, null,
   null, 5, 13, 0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international'],
   null, null, null),
  ('pro', '2026-08-20 05:28:39.300904+00', 'Pro', 3, true, null, null,
   null, 30, 13, null, 1, 50,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international','multi_depots','gestionnaire_depot','stockage_3d'],
   null, null, null),

  -- v3 — 22/08 : prix de base publiés, remise annuelle 5 %.
  ('starter', '2026-08-22 19:30:21.499869+00', 'Basique', 1, true, 180, 2052,
   null, 2, 13, 0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client'],
   148.2, null, 5),
  ('regular', '2026-08-22 19:30:21.499869+00', 'Regular', 2, true, 360, 4104,
   null, 5, 13, 0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international'],
   148.2, null, 5),
  ('pro', '2026-08-22 19:30:21.499869+00', 'Pro', 3, true, 720, 8208,
   null, 30, 13, null, 1, 50,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international','multi_depots','gestionnaire_depot','stockage_3d'],
   148.2, 570, 5)
on conflict (code, publie_le) do nothing;

-- =============================================================================
-- 2. Lecture du barème — toujours la version en vigueur à une date donnée.
-- =============================================================================

create or replace function public.offre_en_vigueur(
  p_code text, p_a_la_date timestamptz default now())
returns public.offres language sql stable security definer set search_path to 'public'
as $function$
  select o.* from offres o
   where o.code = coalesce(p_code, 'starter')
     and o.publie_le <= p_a_la_date
   order by o.publie_le desc
   limit 1;
$function$;

create or replace function public.limite_utilisateurs(p_plan text)
returns integer language sql stable security definer set search_path to 'public'
as $function$
  select o.membres_limite from offres o
   where o.code = coalesce(p_plan,'starter') and o.publie_le <= now()
   order by o.publie_le desc limit 1;
$function$;

create or replace function public.modules_du_plan(p_plan text)
returns text[] language sql stable security definer set search_path to 'public'
as $function$
  select coalesce(
    (select o.modules from offres o
      where o.code = coalesce(p_plan,'starter') and o.publie_le <= now()
      order by o.publie_le desc limit 1),
    (select o.modules from offres o
      where o.code = 'starter' and o.publie_le <= now()
      order by o.publie_le desc limit 1));
$function$;

create or replace function public.org_a_module(p_module text)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select p_module = any(modules_du_plan(plan_effectif()));
$function$;

-- Lot 01b : une politique RLS référençant une fonction se crée sans erreur même
-- sans droit d'exécution. Le défaut n'apparaît qu'à la première requête.
grant execute on function public.offre_en_vigueur(text, timestamptz) to anon, authenticated, service_role;
grant execute on function public.limite_utilisateurs(text)           to anon, authenticated, service_role;
grant execute on function public.modules_du_plan(text)               to anon, authenticated, service_role;
grant execute on function public.org_a_module(text)                  to anon, authenticated, service_role;

-- =============================================================================
-- 3. Verrou d'offre en RLS — 12 politiques (lot 01).
--    Le module conditionne l'accès à la donnée, en plus du cloisonnement par
--    organisation et de la capacité du rôle. Trois conditions, pas deux.
-- =============================================================================

drop policy if exists centres_org on public.centres_logistiques;
create policy centres_org on public.centres_logistiques for select
  using (org_id = jwt_org() and peut_voir_centre(id) and org_a_module('multi_depots'));

drop policy if exists paie_capacite on public.donnees_paie;
create policy paie_capacite on public.donnees_paie for select
  using (org_id = jwt_org() and acteur_a_capacite('voir_paie') and org_a_module('paie'));

drop policy if exists paie_ecriture on public.donnees_paie;
create policy paie_ecriture on public.donnees_paie for all
  using (org_id = jwt_org() and acteur_a_capacite('voir_paie') and org_a_module('paie'))
  with check (org_id = jwt_org() and acteur_a_capacite('voir_paie') and org_a_module('paie'));

drop policy if exists paie_periodes_lecture on public.paie_periodes;
create policy paie_periodes_lecture on public.paie_periodes for select
  using (org_id = jwt_org() and acteur_a_capacite('voir_paie') and org_a_module('paie'));

drop policy if exists paie_periodes_ecriture on public.paie_periodes;
create policy paie_periodes_ecriture on public.paie_periodes for all
  using (org_id = jwt_org() and acteur_a_capacite('voir_paie') and org_a_module('paie'))
  with check (org_id = jwt_org() and acteur_a_capacite('voir_paie') and org_a_module('paie'));

drop policy if exists stock_boxes_org on public.stock_boxes;
create policy stock_boxes_org on public.stock_boxes for select
  using (org_id = jwt_org() and peut_voir_centre(centre_id) and org_a_module('stockage_3d'));

drop policy if exists stock_zones_org on public.stock_zones;
create policy stock_zones_org on public.stock_zones for select
  using (org_id = jwt_org() and peut_voir_centre(centre_id) and org_a_module('stockage_3d'));

drop policy if exists stock_contrats_org on public.stock_contrats;
create policy stock_contrats_org on public.stock_contrats for select
  using (org_id = jwt_org() and peut_voir_centre(centre_id) and org_a_module('stockage_3d'));

drop policy if exists stock_lignes_org on public.stock_contrat_lignes;
create policy stock_lignes_org on public.stock_contrat_lignes for select
  using (exists (select 1 from stock_contrats c
                  where c.id = stock_contrat_lignes.contrat_id
                    and c.org_id = jwt_org()
                    and peut_voir_centre(c.centre_id))
         and org_a_module('stockage_3d'));

drop policy if exists stock_echeances_tenant on public.stock_echeances;
create policy stock_echeances_tenant on public.stock_echeances for all
  using (org_id = jwt_org() and org_a_module('stockage_3d'))
  with check (org_id = jwt_org() and org_a_module('stockage_3d'));

drop policy if exists transmissions_lecture on public.transmissions;
create policy transmissions_lecture on public.transmissions for select
  using (org_id = jwt_org() and org_a_module('peppol'));

drop policy if exists transmissions_ecriture on public.transmissions;
create policy transmissions_ecriture on public.transmissions for all
  using (org_id = jwt_org() and acteur_a_capacite('emettre_facture') and org_a_module('peppol'))
  with check (org_id = jwt_org() and acteur_a_capacite('emettre_facture') and org_a_module('peppol'));

-- =============================================================================
-- 4. Mesure des compteurs et calcul des suppléments — étage pur.
-- =============================================================================

-- Membre désactivé ou retiré : ne se facture pas, ne consomme aucun seuil.
create or replace function public.compter_membres_factures(p_org uuid default null)
returns integer language sql stable security definer set search_path to 'public'
as $function$
  select count(*)::integer from utilisateurs u
   where u.org_id = coalesce(p_org, jwt_org())
     and coalesce(u.actif, true) = true
     and u.retire_le is null;
$function$;

-- Centre archivé : ne se facture pas.
create or replace function public.compter_centres_factures(p_org uuid default null)
returns integer language sql stable security definer set search_path to 'public'
as $function$
  select count(*)::integer from centres_logistiques c
   where c.org_id = coalesce(p_org, jwt_org())
     and coalesce(c.actif, true) = true
     and c.archive_le is null;
$function$;

create or replace function public.calculer_supplements(
  p_membres integer, p_membres_inclus integer, p_prix_membre numeric,
  p_centres integer, p_centres_inclus integer, p_prix_centre numeric)
returns jsonb language sql immutable set search_path to 'public'
as $function$
  with s as (
    select greatest(coalesce(p_membres,0) - coalesce(p_membres_inclus,0), 0) as m_supp,
           greatest(coalesce(p_centres,0) - coalesce(p_centres_inclus,0), 0) as c_supp
  )
  select case
    -- Un depassement sans prix publie n'est pas facturable : on refuse plutot
    -- que d'emettre une facture qu'on ne saurait pas justifier.
    when s.m_supp > 0 and p_prix_membre is null then
      jsonb_build_object('ok', false,
        'motif', format('%s membre(s) au-dela du seuil mais aucun prix publie pour cette offre', s.m_supp))
    when s.c_supp > 0 and p_prix_centre is null then
      jsonb_build_object('ok', false,
        'motif', format('%s centre(s) au-dela du seuil mais aucun prix publie pour cette offre', s.c_supp))
    else jsonb_build_object(
      'ok', true,
      'motif', case when s.m_supp = 0 and s.c_supp = 0
                    then 'aucun depassement' else 'depassement facture' end,
      'membres_supp', s.m_supp,
      'centres_supp', s.c_supp,
      'montant_membres_htva', round(s.m_supp * coalesce(p_prix_membre,0), 2),
      'montant_centres_htva', round(s.c_supp * coalesce(p_prix_centre,0), 2),
      'montant_total_htva',
        round(s.m_supp * coalesce(p_prix_membre,0) + s.c_supp * coalesce(p_prix_centre,0), 2))
  end from s;
$function$;

grant execute on function public.compter_membres_factures(uuid) to anon, authenticated, service_role;
grant execute on function public.compter_centres_factures(uuid) to anon, authenticated, service_role;
grant execute on function public.calculer_supplements(integer,integer,numeric,integer,integer,numeric)
  to anon, authenticated, service_role;

-- =============================================================================
-- 5. `releves_abonnement` — la mesure est figée à l'émission.
-- =============================================================================

create table if not exists public.releves_abonnement (
  id                 uuid        not null default gen_random_uuid(),
  -- `default jwt_org()` : invariant du dépôt (test ecriture-org). La production
  -- ne le portait pas — l'écriture ne passant que par la commande
  -- `security definer` ci-dessous, le défaut manquant ne s'était jamais vu.
  -- Rétabli en base par 0175.
  org_id             uuid        not null default jwt_org() references public.organisations(id),
  emis_le            timestamptz not null default now(),
  emis_par           uuid        references public.utilisateurs(id),
  offre_code         text        not null,
  offre_publie_le    timestamptz not null,
  periodicite        text        not null,
  membres_factures   integer     not null,
  membres_inclus     integer     not null,
  centres_factures   integer     not null,
  centres_inclus     integer     not null,
  supplements        jsonb       not null,
  montant_supp_htva  numeric     not null,
  gele               boolean     not null default true,
  constraint releves_abonnement_pkey primary key (id),
  constraint releves_abonnement_offre_code_offre_publie_le_fkey
    foreign key (offre_code, offre_publie_le) references public.offres(code, publie_le)
);

create index if not exists releves_abonnement_org_date
  on public.releves_abonnement using btree (org_id, emis_le desc);

alter table public.releves_abonnement enable row level security;
drop policy if exists releves_lecture on public.releves_abonnement;
create policy releves_lecture on public.releves_abonnement for select
  using (org_id = jwt_org());

create or replace function public.releve_abonnement_immuable()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un releve d''abonnement ne se supprime pas' using errcode = '42501';
  end if;
  if old.gele then
    raise exception 'Releve d''abonnement gele : emettre un nouveau releve' using errcode = '42501';
  end if;
  return new;
end $function$;

drop trigger if exists trg_releve_abonnement_immuable on public.releves_abonnement;
create trigger trg_releve_abonnement_immuable
  before delete or update on public.releves_abonnement
  for each row execute function public.releve_abonnement_immuable();

-- -----------------------------------------------------------------------------
-- 5b. Émission d'un relevé — à la demande. La table ne présume d'aucun cycle
--     de facturation : aucun ordonnanceur n'est posé ici (question P3).
--     Assiette : `organisations.plan`, jamais `plan_effectif()`, qui rend
--     `regular` pendant un essai.
--     Reproduit ici à l'identique de la production ; le garde-fou
--     d'autorisation est ajouté en 0174.
-- -----------------------------------------------------------------------------

create or replace function public.cmd_emettre_releve_abonnement(p_org uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := coalesce(p_org, jwt_org());
  v_offre offres%rowtype;
  v_plan text; v_periodicite text;
  v_membres integer; v_centres integer;
  v_calc jsonb; v_id uuid; v_acteur uuid;
begin
  if v_org is null then
    return jsonb_build_object('ok', false, 'motif', 'organisation introuvable');
  end if;

  select o.plan, o.periodicite into v_plan, v_periodicite
    from organisations o where o.id = v_org;
  if not found then
    return jsonb_build_object('ok', false, 'motif', 'organisation introuvable');
  end if;

  select * into v_offre from offre_en_vigueur(v_plan, now());
  if v_offre.code is null then
    return jsonb_build_object('ok', false,
      'motif', format('aucun bareme publie pour l''offre %s', v_plan));
  end if;

  v_membres := compter_membres_factures(v_org);
  v_centres := compter_centres_factures(v_org);

  v_calc := calculer_supplements(
    v_membres, v_offre.membres_inclus, v_offre.prix_membre_supp_htva,
    v_centres, v_offre.centres_inclus, v_offre.prix_centre_supp_htva);

  if not (v_calc->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'motif', v_calc->>'motif');
  end if;

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into releves_abonnement (
    org_id, emis_par, offre_code, offre_publie_le, periodicite,
    membres_factures, membres_inclus, centres_factures, centres_inclus,
    supplements, montant_supp_htva)
  values (
    v_org, v_acteur, v_offre.code, v_offre.publie_le, v_periodicite,
    v_membres, v_offre.membres_inclus, v_centres, v_offre.centres_inclus,
    v_calc, (v_calc->>'montant_total_htva')::numeric)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true, 'motif', 'releve emis',
    'releve_id', v_id, 'offre', v_offre.code, 'periodicite', v_periodicite,
    'membres_factures', v_membres, 'centres_factures', v_centres,
    'montant_supp_htva', (v_calc->>'montant_total_htva')::numeric);
end $function$;
