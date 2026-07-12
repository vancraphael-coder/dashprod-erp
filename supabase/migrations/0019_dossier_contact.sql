-- =============================================================================
-- Migration 0019 — Dossier : date souhaitée
-- Source : modèle validé roovers-mobile.jsx (dateDem/heureDem sur le dossier).
-- La date SOUHAITÉE est commerciale et vit sur l'affaire ; la date d'EXÉCUTION
-- vit sur la mission (C-04, séparation vente/exécution). À la confirmation,
-- la mission est créée avec cette date comme point de départ.
-- Les adresses (étage, ascenseur, monte-meubles) existent depuis 0005
-- (affaire_adresses) — aucun changement nécessaire, l'écran arrive.
-- =============================================================================

alter table affaires add column if not exists date_souhaitee  date;
alter table affaires add column if not exists heure_souhaitee time default '08:00';
comment on column affaires.date_souhaitee is
  'Date commerciale souhaitée. La date d''exécution vit sur la mission (C-04).';
