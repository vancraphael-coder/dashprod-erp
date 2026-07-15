-- =============================================================================
-- Migration 0024 — Matériel d'emballage par dossier (P1, alignement page 06)
--
-- Choix v1 assumé : jsonb sur l'affaire ({std:{e,u,r}, livre:{…}}). Zéro
-- migration lourde, rendu immédiat sur l'offre, saisie possible dès aujourd'hui
-- par le terrain comme par le bureau.
--
-- V2 (documentée, non faite) : bascule vers de vrais stock_mouvements
-- (table du Module 8, déjà en base) rattachés à la mission, pour l'inventaire
-- du dépôt et la valorisation. Le MÊME domaine de contrôle (controleSolde)
-- servira les deux — c'est le stockage qui change, pas la règle.
-- =============================================================================

alter table affaires add column if not exists emballage jsonb not null default '{}'::jsonb;
comment on column affaires.emballage is
  'Matériel d''emballage par article : {cle: {e: enlevé, u: utilisé, r: repris}}. Contrôle d''équilibre : domaine Stocks.';
