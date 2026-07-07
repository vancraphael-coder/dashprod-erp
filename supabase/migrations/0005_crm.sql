-- =============================================================================
-- Migration 0005 — CRM : clients, affaires, adresses
-- Source : Réf. 3 (T2 : clients, affaires, adresses) et Réf. 2 (C-01, C-04, S4).
-- Le client existe enfin en propre (C-01) ; l'affaire porte l'état S4 et son
-- exécution est séparée (missions, module Opérations à venir — C-04).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CLIENTS — la personne/société existe une seule fois (C-01, source unique).
-- Colonnes normalisées calculées pour le dédoublonnage (miroir SQL de
-- normaliserTel/normaliserNom côté domaine), indexées pour une reconnaissance
-- déterministe à la création d'affaire (cascade S10-1).
-- -----------------------------------------------------------------------------
create table clients (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  nom               text not null,
  tel               text,
  email             citext,
  societe           text,
  tva_num           text,
  -- adresse de facturation, structurée et neutre (I-5)
  fact_lignes       text,
  fact_cp           text,
  fact_ville        text,
  fact_pays         char(2),
  origine           text,                                   -- d'où vient le client
  notes             text,                                   -- notes commerciales durables
  -- clé de dédoublonnage : téléphone réduit aux chiffres avec +32 (approché en SQL)
  tel_norm          text generated always as (
                       nullif(regexp_replace(coalesce(tel,''), '[^0-9+]', '', 'g'), '')
                     ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_clients_org      on clients(org_id);
create index idx_clients_tel_norm on clients(org_id, tel_norm);
comment on table clients is
  'Client en entité propre (C-01). tel_norm : clé de dédoublonnage indexée.';

-- -----------------------------------------------------------------------------
-- AFFAIRES — l'objet central côté vente. L'état suit la machine S4 : il n'est
-- JAMAIS modifié par UPDATE direct, seulement par cmd_transition_affaire
-- (migration 0006), qui vérifie la garde et émet l'événement.
-- -----------------------------------------------------------------------------
create type etat_affaire as enum (
  'brouillon','devis','envoye','confirme','planifie',
  'en_cours','effectue','facture','paye','clos','reporte','annule'
);

create table affaires (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  client_id         uuid not null references clients(id),
  etat              etat_affaire not null default 'brouillon',
  formule           text,                                   -- tarifaire|emballage|forfait
  origine           text not null default 'bureau',         -- bureau|terrain
  cree_par          uuid references utilisateurs(id),
  valide_par        uuid references utilisateurs(id),       -- levée du « à valider »
  valide_le         timestamptz,
  mode_contact      text,                                   -- visite|telephone
  date_visite       date,
  notes_commerciales text,                                  -- « remarques » typées (C-11)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_affaires_org    on affaires(org_id);
create index idx_affaires_client on affaires(client_id);
create index idx_affaires_etat   on affaires(org_id, etat);
comment on table affaires is
  'Affaire (vente). État = machine S4, muté seulement par cmd_transition_affaire.';

-- -----------------------------------------------------------------------------
-- ADRESSES — chargement/déchargement, structurées, ordonnées, avec accès.
-- -----------------------------------------------------------------------------
create table affaire_adresses (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  affaire_id        uuid not null references affaires(id) on delete cascade,
  sens              text not null,                          -- chargement|dechargement
  ordre             integer not null default 1,
  adresse           text,
  type_lieu         text,                                   -- maison|appart|bureau|garde-meuble
  etage             text,
  ascenseur         boolean not null default false,
  monte_meubles     boolean not null default false,
  escalier          boolean not null default false
);
create index idx_adresses_affaire on affaire_adresses(affaire_id);

-- updated_at automatique.
create trigger touch_clients before update on clients
  for each row execute function touch_updated_at();
create trigger touch_affaires before update on affaires
  for each row execute function touch_updated_at();
