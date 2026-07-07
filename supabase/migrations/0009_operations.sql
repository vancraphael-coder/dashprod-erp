-- =============================================================================
-- Migration 0009 — Opérations
-- Source : Réf. 2 (C-04 : mission séparée de l'affaire ; C-13 : affectation =
-- source unique de l'effectif ; agenda ; chrono) et Réf. 3 (T2).
-- Contenu : missions (une affaire → n missions), affectations, véhicules de
-- mission, sessions de chrono. La création de mission découle de la
-- confirmation d'affaire (cascade S10-2).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MISSIONS — l'exécution, séparée de la vente (C-04). Une affaire confirmée
-- porte une ou plusieurs missions (déménagement, emballage), chacune datée.
-- -----------------------------------------------------------------------------
create type etat_mission as enum ('planifiee','en_cours','effectuee','annulee');

create table missions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  affaire_id        uuid not null references affaires(id) on delete cascade,
  type              text not null default 'demenagement',   -- demenagement|emballage
  date              date,
  heure             time,
  etat              etat_mission not null default 'planifiee',
  consignes         text,                                    -- « infos déménagement » (C-11)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_missions_org     on missions(org_id);
create index idx_missions_affaire on missions(affaire_id);
create index idx_missions_date    on missions(org_id, date);
comment on table missions is
  'Exécution séparée de la vente (C-04). Planning multi-événements par date.';

-- -----------------------------------------------------------------------------
-- MISSION_AFFECTATIONS — qui travaille sur quelle mission. C'est la SOURCE
-- UNIQUE de l'effectif (C-13) : le « prévu » et le coût s'en dérivent, l'écart
-- devient une alerte au lieu d'une incohérence.
-- -----------------------------------------------------------------------------
create table mission_affectations (
  mission_id        uuid not null references missions(id) on delete cascade,
  utilisateur_id    uuid not null references utilisateurs(id),
  org_id            uuid not null references organisations(id),
  role_mission      text,                                    -- chef|demenageur|emballeur
  affecte_le        timestamptz not null default now(),
  primary key (mission_id, utilisateur_id)
);
create index idx_affectations_user on mission_affectations(utilisateur_id);

-- MISSION_VEHICULES — véhicules affectés (jointure). La table vehicules est
-- introduite par le module Flotte ; la FK y sera ajoutée alors.
create table mission_vehicules (
  mission_id        uuid not null references missions(id) on delete cascade,
  vehicule_id       uuid not null,
  org_id            uuid not null references organisations(id),
  primary key (mission_id, vehicule_id)
);

-- -----------------------------------------------------------------------------
-- CHRONO_SESSIONS — chaque période démarrage→arrêt (Réf. 2 ch.17). Le temps
-- réel de la mission est la somme des sessions ; les pauses sont les intervalles
-- entre sessions. Le calcul vit dans le domaine (chrono.js).
-- -----------------------------------------------------------------------------
create table chrono_sessions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  mission_id        uuid not null references missions(id) on delete cascade,
  debut             timestamptz not null default now(),
  fin               timestamptz                              -- null = session en cours
);
create index idx_chrono_mission on chrono_sessions(mission_id);

create trigger touch_missions before update on missions
  for each row execute function touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — isolation de tenant (T3, famille 1).
-- -----------------------------------------------------------------------------
alter table missions             enable row level security;
alter table mission_affectations enable row level security;
alter table mission_vehicules    enable row level security;
alter table chrono_sessions      enable row level security;

create policy missions_tenant on missions
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy affectations_tenant on mission_affectations
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy mvehicules_tenant on mission_vehicules
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy chrono_tenant on chrono_sessions
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
