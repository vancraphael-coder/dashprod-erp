-- =============================================================================
-- Migration 0025 — Coût de trajet & horaire d'emballage sur le dossier (P1)
-- Source : alignement pages 02 §3 (trajet) et 02 §4 (emballage).
--
-- Trajet : le versant PRIX du kilométrage est déjà au barème (1 €/km/camion,
-- ADR-008). Ici on ajoute le versant COÛT réel — km parcourus, durée lue dans
-- Maps, prix de revient au km — qui nourrit la marge réelle, sans toucher au
-- prix client.
--
-- Emballage : les colonnes date_emballage/heure_emballage ont été créées en
-- 0021 (elles déclenchent la 2e mission à la confirmation). Cette migration
-- est idempotente à leur égard (IF NOT EXISTS) — sécurité si 0021 n'a pas
-- encore été joué dans un environnement donné.
-- =============================================================================

alter table affaires add column if not exists trajet_km        numeric(7,1);
alter table affaires add column if not exists trajet_duree     text;      -- « 45 min », lu dans Maps
alter table affaires add column if not exists trajet_prix_km   numeric(6,2);  -- coût de revient €/km

comment on column affaires.trajet_km is
  'Kilométrage réel du trajet (coût), distinct du km facturé au barème.';
comment on column affaires.trajet_prix_km is
  'Prix de revient au km (carburant + usure) — entre dans les coûts, pas dans le prix client.';

-- Rappel (déjà en 0021, sécurisé ici) : journée d'emballage distincte.
alter table affaires add column if not exists date_emballage  date;
alter table affaires add column if not exists heure_emballage time;
