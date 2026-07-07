-- =============================================================================
-- Migration 0011 — RH · Flotte · Stocks
-- Source : Réf. 2 (C-08 : trois modules distincts ; C-09/C-18 : consommables ;
-- C-15 : signalements flotte ; C-25 : workflow congés) et Réf. 3 (T2).
-- Sépare RH (personnel, congés, paie cloisonnée), Flotte (véhicules) et Stocks
-- (consommables E/U/R). La paie vit dans une table isolée (résout problème n°2).
-- =============================================================================

-- ===================== RH =====================

-- CONGES — workflow demande → approbation (C-25). Un congé approuvé alimente
-- les conflits d'affectation (module Opérations).
create type etat_conge as enum ('demande','approuve','refuse','annule');

create table conges (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  utilisateur_id    uuid not null references utilisateurs(id),
  debut             date not null,
  fin               date not null,
  etat              etat_conge not null default 'demande',
  motif             text,
  decide_par        uuid references utilisateurs(id),
  decide_le         timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_conges_user on conges(utilisateur_id);
create index idx_conges_org  on conges(org_id, etat);
comment on table conges is 'Workflow congés (C-25). Approuvé → conflits Opérations.';

-- DONNEES_PAIE — isolée, sous RLS renforcée (résout problème connu n°2 : la
-- donnée salariale n'habite jamais un objet partagé). Le coût d'équipe est
-- calculé par fonction serveur, jamais exposé en clair aux rôles sans droit.
create table donnees_paie (
  utilisateur_id    uuid primary key references utilisateurs(id),
  org_id            uuid not null references organisations(id),
  taux_horaire      numeric(8,2) not null default 0,
  type_contrat      text,                                    -- CDI|CDD|Interim|Sous-traitant|Etudiant
  updated_at        timestamptz not null default now()
);
comment on table donnees_paie is
  'Paie isolée sous RLS renforcée (capacité voir_paie). Résout problème connu n°2.';

-- EQUIPEMENTS_RH et DOCUMENTS_RH — état de dotation et échéances (file « À
-- traiter » via qualifierEcheance côté domaine).
create table equipements_rh (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  utilisateur_id    uuid not null references utilisateurs(id),
  categorie         text not null,                           -- vetement|outil
  article           text not null,
  etat              text not null default 'bon',             -- neuf|bon|use|a_remplacer
  a_remplacer       boolean not null default false
);
create index idx_equip_user on equipements_rh(utilisateur_id);

create table documents_rh (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  utilisateur_id    uuid not null references utilisateurs(id),
  type              text not null,                           -- ci|permis|contrat|visite_medicale
  scanne            boolean not null default false,
  echeance          date
);
create index idx_docrh_user on documents_rh(utilisateur_id);

-- ===================== FLOTTE =====================

-- VEHICULES — la flotte (C-15). Complète la FK laissée en attente par le
-- module Opérations (mission_vehicules).
create table vehicules (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  nom               text not null,
  type              text,                                    -- fourgon|porteur|hayon…
  volume_m3         numeric(6,2),
  immatriculation   text,
  ct_echeance       date,
  assurance_echeance date,
  assurance_scannee boolean not null default false,
  etat_mecanique    text not null default 'ok',              -- ok|surveiller|urgent
  meca_note         text,
  meca_constat_le   date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_vehicules_org on vehicules(org_id);
comment on table vehicules is 'Flotte (C-15). volume_m3 alimente la jauge du relevé.';

-- La FK de mission_vehicules vers vehicules peut maintenant être posée.
alter table mission_vehicules
  add constraint fk_mvehicules_vehicule
  foreign key (vehicule_id) references vehicules(id);

-- ===================== STOCKS =====================

-- STOCK_ARTICLES — le catalogue des consommables (les 9 d'emballage, la
-- manutention), distinct de l'outillage (C-09). Extensible.
create table stock_articles (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  nom               text not null,
  categorie         text not null default 'emballage',       -- emballage|manutention
  prix_unitaire     numeric(8,2) not null default 0,         -- pour valorisation (C-18)
  actif             boolean not null default true
);
create index idx_articles_org on stock_articles(org_id);

-- STOCK_MOUVEMENTS — chaque mouvement typé enlevé/utilisé/repris rattaché à une
-- mission (C-18). Le solde est calculé (vue/ domaine), pas stocké.
create table stock_mouvements (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  mission_id        uuid not null references missions(id) on delete cascade,
  article_id        uuid not null references stock_articles(id),
  type              text not null,                           -- enleve|utilise|repris
  quantite          integer not null default 0
);
create index idx_mouvements_mission on stock_mouvements(mission_id);
comment on table stock_mouvements is
  'Mouvements E/U/R par mission (C-18). Solde et valorisation calculés (domaine).';

-- Entretien.
create trigger touch_vehicules before update on vehicules
  for each row execute function touch_updated_at();
create trigger touch_paie before update on donnees_paie
  for each row execute function touch_updated_at();

-- ===================== RLS =====================
alter table conges          enable row level security;
alter table donnees_paie    enable row level security;
alter table equipements_rh  enable row level security;
alter table documents_rh    enable row level security;
alter table vehicules       enable row level security;
alter table stock_articles  enable row level security;
alter table stock_mouvements enable row level security;

-- Tenant standard pour la plupart des tables.
create policy conges_tenant on conges
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy equip_tenant on equipements_rh
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy docrh_tenant on documents_rh
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy vehicules_tenant on vehicules
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy articles_tenant on stock_articles
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy mouvements_tenant on stock_mouvements
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

-- PAIE : RLS RENFORCÉE — tenant ET capacité voir_paie (résout problème n°2).
-- Un rôle sans la capacité ne reçoit tout simplement pas la ligne.
create policy paie_capacite on donnees_paie
  for select using (org_id = jwt_org() and acteur_a_capacite('voir_paie'));
create policy paie_ecriture on donnees_paie
  for all using (org_id = jwt_org() and acteur_a_capacite('voir_paie'))
  with check (org_id = jwt_org() and acteur_a_capacite('voir_paie'));
