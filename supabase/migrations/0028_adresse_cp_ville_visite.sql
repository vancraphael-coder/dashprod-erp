-- =============================================================================
-- Migration 0028 — Code postal + ville sur les adresses, date de visite
-- Source : demandes fondateur (Dossier).
--
-- Les adresses n'avaient que la rue (champ libre). On sépare code postal et
-- ville pour un itinéraire fiable et une facture propre. `escalier` existait
-- déjà en base (0005) — il ne manquait que l'exposer à l'écran.
--
-- Date de visite : le commercial planifie souvent une visite préalable ; on la
-- note sur l'affaire (distincte de la date de déménagement).
-- =============================================================================

alter table affaire_adresses add column if not exists code_postal text;
alter table affaire_adresses add column if not exists ville       text;

alter table affaires add column if not exists date_visite  date;
alter table affaires add column if not exists heure_visite time;
comment on column affaires.date_visite is
  'Date de visite préalable du chantier (distincte du déménagement).';
