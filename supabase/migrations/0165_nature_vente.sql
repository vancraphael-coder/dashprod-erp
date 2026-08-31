-- 0165 — APPLIQUÉE ET VÉRIFIÉE le 31/08/2026.
-- LA NATURE « VENTE » (vague 2, lot F) — la vente rapide de fournitures.
-- Une vente sèche (comptoir ou livrée) n'est pas un dossier de déménagement :
-- nouvelle valeur d'enum. Elle N'est PAS ajoutée au menu « + » comme métier —
-- une entrée « Vente rapide » dédiée l'expose. L'affaire de vente est insérée
-- directement en état « effectue » (facturable) ; le garde d'état ne vise que
-- les UPDATE, pas l'insert.

alter type nature_affaire add value if not exists 'vente';
