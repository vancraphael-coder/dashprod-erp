-- 0166 — APPLIQUÉE ET VÉRIFIÉE le 31/08/2026.
-- GARNIR LE PRIX CLIENT DES FOURNITURES (source unique — 90-PARAMETRES).
-- Ajoute prix_client_centimes (coût × 1,6 arrondi aux 10 c) et tva_pct (21) à
-- chaque fourniture qui n'en a pas. N'écrase jamais un prix client existant.
-- Idempotent. Vérifié : carton standard coût 150 → prix client 240, TVA 21.

update organisations o
set parametres_catalogues = jsonb_set(
  o.parametres_catalogues, '{fournitures}',
  (select jsonb_agg(
    case when f ? 'prix_client_centimes' and (f->>'prix_client_centimes') is not null then f
    else f || jsonb_build_object(
      'prix_client_centimes', (round((coalesce((f->>'cout_centimes')::numeric,0) * 1.6) / 10) * 10)::int,
      'tva_pct', coalesce((f->>'tva_pct')::numeric, 21)) end)
   from jsonb_array_elements(o.parametres_catalogues->'fournitures') f))
where o.parametres_catalogues->'fournitures' is not null;
