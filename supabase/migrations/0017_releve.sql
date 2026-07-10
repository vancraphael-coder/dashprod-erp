-- =============================================================================
-- Migration 0017 — Relevé volumétrique
-- Source : Réf. 2 (relevé volumétrique) et modèle validé roovers-mobile.jsx.
-- L'inventaire est attaché à l'affaire en jsonb : liste de {id, nom, piece,
-- quantite, vol?}. Le volume total et la suggestion de composition sont
-- CALCULÉS côté domaine (volumetrie.js), jamais stockés en dur — cohérent avec
-- le principe « une donnée existe une seule fois ».
-- =============================================================================

alter table affaires add column if not exists releve jsonb not null default '[]'::jsonb;
comment on column affaires.releve is
  'Inventaire volumétrique (liste jsonb). Volume et composition calculés (domaine).';
