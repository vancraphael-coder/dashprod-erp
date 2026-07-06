-- =============================================================================
-- Migration 0001 — Noyau
-- Source : Référence 3, chapitres T2 (modèle de données) et T3 (RLS).
-- Contenu : organisations, utilisateurs, rôles & capacités, référentiels
--           versionnés, séquences légales, journal d'événements immuable.
-- Invariants appliqués : I-1 (org_id partout), I-2 (montants devisés — préparé),
--                        I-4 (référentiels par juridiction), I-9 (UTC).
-- =============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- emails insensibles à la casse

-- -----------------------------------------------------------------------------
-- ORGANISATIONS — la racine de tout (I-1). Chaque donnée métier lui appartient.
-- Le multi-sociétés futur (S8) est l'ajout de lignes ici, pas une refonte.
-- -----------------------------------------------------------------------------
create table organisations (
  id                uuid primary key default gen_random_uuid(),
  nom               text not null,
  tva               text,
  pays              char(2) not null default 'BE',          -- I-4 : juridiction
  devise_defaut     char(3) not null default 'EUR',         -- I-2
  adresse_lignes    text,
  adresse_cp        text,
  adresse_ville     text,
  adresse_subdiv    text,                                    -- I-5 : neutre
  adresse_pays      char(2),
  actif             boolean not null default true,
  created_at        timestamptz not null default now(),     -- I-9 : UTC
  updated_at        timestamptz not null default now()
);
comment on table organisations is
  'Racine multi-tenant (I-1). Toute donnée métier référence une organisation.';

-- -----------------------------------------------------------------------------
-- UTILISATEURS — le compte humain, lié à l'identité d'auth (Supabase Auth).
-- Le rôle n'est PAS ici : un utilisateur peut cumuler des rôles (S3), résolus
-- côté serveur à la connexion. auth_id n'est jamais exposé au client.
-- -----------------------------------------------------------------------------
create table utilisateurs (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  auth_id           uuid unique,                             -- lien Supabase Auth
  email             citext not null,
  nom               text not null default '',
  tel               text,
  actif             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, email)
);
create index idx_utilisateurs_org on utilisateurs(org_id);
comment on table utilisateurs is
  'Compte humain. Rôle absent par design : cumul possible, résolu serveur (S3).';

-- -----------------------------------------------------------------------------
-- CAPACITES — référentiel global des permissions atomiques (S3).
-- Une permission est une donnée, jamais un "if" dans le code (I-7).
-- -----------------------------------------------------------------------------
create table capacites (
  cle               text primary key,                        -- ex. 'voir_prix'
  libelle           text not null,
  description       text
);
comment on table capacites is
  'Permissions atomiques (I-7). Référentiel système, non lié à une organisation.';

-- -----------------------------------------------------------------------------
-- ROLES — paquets de capacités, par organisation (S3).
-- -----------------------------------------------------------------------------
create table roles (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  cle               text not null,                           -- ex. 'coordination'
  libelle           text not null,
  created_at        timestamptz not null default now(),
  unique (org_id, cle)
);
create index idx_roles_org on roles(org_id);

-- ROLE_CAPACITES — quelles capacités porte un rôle (jointure).
create table role_capacites (
  role_id           uuid not null references roles(id) on delete cascade,
  capacite_cle      text not null references capacites(cle),
  primary key (role_id, capacite_cle)
);

-- UTILISATEUR_ROLES — quels rôles porte un utilisateur (jointure, cumul).
-- La date d'affectation prépare délégations et permissions temporaires (T3),
-- accueillies sans refonte (I-7).
create table utilisateur_roles (
  utilisateur_id    uuid not null references utilisateurs(id) on delete cascade,
  role_id           uuid not null references roles(id) on delete cascade,
  affecte_le        timestamptz not null default now(),
  expire_le         timestamptz,                             -- null = permanent
  primary key (utilisateur_id, role_id)
);

-- -----------------------------------------------------------------------------
-- REFERENTIELS — règles administrables et VERSIONNÉES (résout C-07 ; I-4).
-- On ne modifie jamais une version : on en publie une nouvelle. Toute offre
-- mémorisera l'id de la version de barème qui l'a produite (T2 · scenarios).
-- -----------------------------------------------------------------------------
create table referentiels (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organisations(id),        -- null = système
  type              text not null,                            -- ex. 'bareme_horaire'
  cle               text not null,
  valeur            jsonb not null,                           -- contenu de la version
  version           integer not null default 1,
  juridiction       char(2) not null default 'BE',            -- I-4
  publie_le         timestamptz not null default now(),
  publie_par        uuid references utilisateurs(id),
  actif             boolean not null default true
);
create index idx_referentiels_lookup on referentiels(org_id, type, cle, actif);
comment on table referentiels is
  'Barèmes, TVA, mentions — versionnés (C-07, I-4). Jamais modifiés : republiés.';

-- -----------------------------------------------------------------------------
-- SEQUENCES — numérotation légale continue (résout C-03).
-- Incrément transactionnel : aucun trou, aucun doublon, par construction.
-- -----------------------------------------------------------------------------
create table sequences (
  org_id            uuid not null references organisations(id),
  type              text not null,                            -- ex. 'facture'
  annee             integer not null,
  prochain          integer not null default 1,
  primary key (org_id, type, annee)
);
comment on table sequences is
  'Numérotation légale (C-03). Voir fonction sequence_suivante().';

-- -----------------------------------------------------------------------------
-- EVENEMENTS — le journal. Cœur de l'architecture (S10). APPEND-ONLY = l'audit
-- (résout C-05). Aucune mise à jour ni suppression : garanti par trigger.
-- -----------------------------------------------------------------------------
create table evenements (
  id                bigint generated always as identity primary key,
  org_id            uuid not null references organisations(id),
  type              text not null,                            -- 'Offre.Signee'…
  entite_type       text not null,
  entite_id         uuid,
  acteur_id         uuid references utilisateurs(id),         -- null = système
  payload           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index idx_evenements_org_date  on evenements(org_id, created_at);
create index idx_evenements_org_type  on evenements(org_id, type);
create index idx_evenements_entite    on evenements(entite_type, entite_id);
comment on table evenements is
  'Journal append-only = audit (C-05). Immuabilité forcée par trigger.';

-- Immuabilité : le journal (et plus tard les instances signées) ne se corrige
-- pas — on émet un événement correctif. La base refuse UPDATE et DELETE.
create or replace function refuser_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'Table % en insertion seule : ni UPDATE ni DELETE', tg_table_name;
end; $$;

create trigger evenements_append_only
  before update or delete on evenements
  for each row execute function refuser_mutation();

-- Entretien : updated_at automatique sur les tables mutables.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger touch_organisations before update on organisations
  for each row execute function touch_updated_at();
create trigger touch_utilisateurs before update on utilisateurs
  for each row execute function touch_updated_at();
