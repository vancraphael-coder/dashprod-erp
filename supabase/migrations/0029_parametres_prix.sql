-- =============================================================================
-- Migration 0029 — Paramètres de prix configurables (barème client + coûts)
-- Source : demande fondateur — page Configuration, centre des prix ET des coûts.
--
-- Le moteur de chiffrage (moteur.js) accepte DÉJÀ un barème et des coûts en
-- paramètre (ref.bareme, ref.tarifs) — l'architecture était prête. Ici on
-- persiste les valeurs par organisation, en jsonb (souple, une seule ligne).
-- Les valeurs par défaut reprennent ADR-008 (le barème validé).
-- =============================================================================

alter table organisations add column if not exists parametres_prix jsonb;
comment on column organisations.parametres_prix is
  'Barème client (bareme_horaire, tarifs) ET coûts internes (taux, carburant, matériel). Alimente le moteur de chiffrage.';

-- Valeurs par défaut ADR-008 pour l'organisation Roovers.
update organisations set parametres_prix = coalesce(parametres_prix, jsonb_build_object(
  'bareme_horaire', jsonb_build_object('2', 85, '3', 130, '4', 170, '5', 215, '6', 255),
  'tarifs', jsonb_build_object(
    'elevateur', 150, 'km_facture', 1, 'emballage_horaire', 75,
    'emballage_km', 0.75, 'heure_sup_forfait', 42.5, 'assurance_htva', 50
  ),
  'couts', jsonb_build_object(
    'carburant_km', 0.35, 'taux_defaut', 32
  )
)) where tva = 'BE0478363616';
