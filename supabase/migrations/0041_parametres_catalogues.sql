-- =============================================================================
-- 0041_parametres_catalogues.sql — APPLIQUÉE en production le 19/07/2026
--
-- Catalogues réglables par entreprise : pièces du relevé, fournitures
-- d'emballage, matériel de terrain (diable, planche à roulettes, bandes…).
--
-- Ces listes étaient des constantes dans le code : identiques pour tous les
-- tenants et non modifiables. Elles deviennent des données de l'organisation,
-- réglées depuis Compte → Paramètres → Catalogues.
--
-- NULL = rien de personnalisé, le domaine applique ses défauts.
-- Aucune reprise de données nécessaire.
-- =============================================================================
alter table public.organisations
  add column if not exists parametres_catalogues jsonb;

comment on column public.organisations.parametres_catalogues is
  'Catalogues réglables : {pieces:[], fournitures:[], materiel_terrain:[]}. '
  'NULL ou clé absente = valeurs par défaut du domaine.';