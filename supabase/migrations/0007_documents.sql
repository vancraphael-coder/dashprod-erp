-- =============================================================================
-- Migration 0007 — Documents & Signature
-- Source : Réf. 2 (C-02, C-26, S6) et Réf. 3 (T2 : documents_*, signatures ;
-- T5 : moteur documentaire).
-- Contenu : modèles versionnés (dont C.B.D.), instances immuables, signatures
-- avec dossier de preuve. Immuabilité forcée par trigger : une instance
-- envoyée/signée et une signature ne se modifient JAMAIS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DOCUMENTS_MODELE_VERSIONS — modèles versionnés par langue et juridiction (I-6).
-- Les trois offres validées, la facture, le décompte d'annulation, et la C.B.D.
-- (type 'cbd') dont les versions sont des fichiers déposés tels quels, jamais
-- générés (S6 : la C.B.D. est transportée, pas éditée).
-- -----------------------------------------------------------------------------
create table documents_modele_versions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organisations(id),        -- null = modèle système
  type              text not null,                            -- offre_tarifaire|...|facture|cbd
  version           integer not null default 1,
  langue            char(2) not null default 'fr',            -- I-6
  juridiction       char(2) not null default 'BE',            -- I-6
  -- contenu du modèle : gabarit (pour les documents générés) OU référence de
  -- fichier déposé (pour la C.B.D., transportée telle quelle).
  gabarit           jsonb,
  fichier_ref       text,                                     -- stockage (C.B.D., PDF source)
  actif             boolean not null default true,
  publie_le         timestamptz not null default now(),
  publie_par        uuid references utilisateurs(id),
  unique (org_id, type, version, langue, juridiction)
);
create index idx_modeles_lookup
  on documents_modele_versions(org_id, type, actif, langue, juridiction);
comment on table documents_modele_versions is
  'Modèles versionnés par langue/juridiction (I-6). type=cbd : fichier transporté (S6).';

-- -----------------------------------------------------------------------------
-- DOCUMENTS_INSTANCES — le document figé (résout C-02). Une fois envoyée ou
-- signée, l'instance est immuable : contenu gelé, empreinte, versions mémorisées.
-- -----------------------------------------------------------------------------
create table documents_instances (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  affaire_id        uuid not null references affaires(id),
  modele_version_id uuid not null references documents_modele_versions(id),
  cbd_version_id    uuid references documents_modele_versions(id),  -- offres : C.B.D. jointe
  scenario_id       uuid,                                     -- chiffrage d'origine (FK ajoutée avec le module)
  contenu           jsonb not null,                           -- données figées
  empreinte_sha256  text not null,                            -- intégrité prouvable
  fichier_ref       text,                                     -- PDF gelé (stockage)
  statut            text not null default 'generee',          -- generee|envoyee|signee|expiree
  genere_le         timestamptz not null default now(),
  envoye_le         timestamptz,
  ouvert_le         timestamptz,
  gele              boolean not null default false             -- true dès envoi/signature
);
create index idx_instances_affaire on documents_instances(affaire_id);
create index idx_instances_org      on documents_instances(org_id);
comment on table documents_instances is
  'Document figé (C-02). Immuable dès gele=true (trigger). Empreinte = intégrité.';

-- -----------------------------------------------------------------------------
-- SIGNATURES — le dossier de preuve (résout C-26). Écriture seule : une
-- signature ne se modifie ni ne se supprime, jamais.
-- -----------------------------------------------------------------------------
create table signatures (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  instance_id       uuid not null unique references documents_instances(id),
  signataire_nom    text not null,
  canal             text not null default 'ecran',            -- ecran|distance
  image_trait       text,                                     -- data URL du tracé
  empreinte_doc     text not null,                            -- empreinte de l'instance à l'instant T
  horodatage        timestamptz not null default now(),
  recueilli_par     uuid references utilisateurs(id)
);
create index idx_signatures_org on signatures(org_id);
comment on table signatures is
  'Dossier de preuve (C-26) : identité, canal, empreinte du doc signé, horodatage. Écriture seule.';

-- -----------------------------------------------------------------------------
-- Immuabilité forcée (S6, famille 3 de la RLS de T3).
-- Une instance gelée refuse toute modification ; une signature refuse
-- UPDATE et DELETE (réutilise refuser_mutation de la migration 0001).
-- -----------------------------------------------------------------------------
create or replace function bloquer_instance_gelee() returns trigger
language plpgsql as $$
begin
  if old.gele = true then
    raise exception 'Instance figée : modification interdite (C-02)';
  end if;
  return new;
end; $$;

create trigger instances_immuables
  before update on documents_instances
  for each row execute function bloquer_instance_gelee();

create trigger signatures_append_only
  before update or delete on signatures
  for each row execute function refuser_mutation();

-- -----------------------------------------------------------------------------
-- RLS — isolation de tenant (T3, famille 1).
-- -----------------------------------------------------------------------------
alter table documents_modele_versions enable row level security;
alter table documents_instances       enable row level security;
alter table signatures                enable row level security;

create policy modeles_lecture on documents_modele_versions
  for select using (org_id = jwt_org() or org_id is null);
create policy instances_tenant on documents_instances
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy signatures_tenant on signatures
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
