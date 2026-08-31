-- 0164 — APPLIQUÉE ET VÉRIFIÉE le 31/08/2026.
-- FONDATIONS POUR ENCAISSER LES FOURNITURES (vague 2, lot E).
-- 1. stock_articles.tva_pct (défaut 21, check 0-100) : sans taux, le moteur TVA
--    refuse de facturer. 2. stock_mouvements.mission_id nullable : vente au
--    comptoir sans chantier. Tables vides → sans risque.

alter table public.stock_articles
  add column if not exists tva_pct numeric not null default 21
  check (tva_pct >= 0 and tva_pct <= 100);

alter table public.stock_mouvements
  alter column mission_id drop not null;
