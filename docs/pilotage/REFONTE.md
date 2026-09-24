# Refonte de la mécanique — journal des lots

État : à jour
Dernière revue : 2026-09-19

> Où en est la refonte, lot par lot. Le plus récent en haut. Chaque lot dit
> ce qu'il a changé, ce qu'il a trouvé en route, et ce qu'il laisse ouvert.

---

## Lot 2 — Socle de production, sauvegarde nocturne, barre du bas · livré

**Socle (A).** Workflow `schema-production.yml`, mode « socle », lancé une
fois à la main : extrait la structure de production vers
`supabase/migrations/0000_socle.sql`, range les 207 migrations historiques
dans `supabase/migrations-historique/`. Rejoué sur un PostgreSQL 17 vierge
AVANT tout commit. Après lui, le rejeu en CI est strict : tout doit passer.
Prochaine migration : **0202**.

**Sauvegarde (B).** Même workflow, mode « photo », chaque nuit à 02:17 UTC :
`supabase/schema-production.sql`. Un changement fait en production sans
migration apparaît dans Git le lendemain.

**Barre du bas.** Cause racine : `overflow-x: hidden` sur html ET body
faisait de body un conteneur de défilement sur Safari iOS — la barre fixe
sautait au repli de la barre d'adresse et au rebond. Plus : quatre barres à
géométrie recopiée, un bouton + qui empiétait sur la barre sur iPhone, une
barre à z-index 10 sous les éléments de l'écran, des onglets qui ne
rétrécissaient pas (les derniers sortaient de l'écran). Une géométrie unique
(`--dp-barre`, classe `.dp-barre`), des couches nommées, des paliers xs → 2xl.
Vérifiée dans Chromium sur 9 formats (320 → 1920 px).

**Ouvert.** Le test de la barre tourne dans la sandbox, pas encore en CI.

## Lot 1 — Migrations · livré

Rejeu des migrations sur base vierge, en CI, à cliquet (repère 149 / 207).
Trouvé : conflit de fusion dans 0021 ; 0062, 0075, 0086 appliquées en
production mais jamais commitées (restaurées depuis le registre Supabase) ;
doublon 0046 ; `utilisateur_capacites` créée par aucune migration
(reconstituée) ; **63 migrations sur 207 sont des stubs sans SQL**.

## Lot 0 — Socle de build · livré

`node_modules`, `dist` (et sa carte de sources publique), 7 correctifs et un
doublon retirés du dépôt. CI : 1 487 tests, build, budget de poids. Écrans en
chargement différé : 374 → 174 ko compressés au premier chargement. Centre de
pilotage des offres généré depuis le code.

---

## À décider

- **`docs/OFFRES.md`** contredit le code (Pro, essai). Le retirer au profit
  de `docs/pilotage/`, ou le réconcilier.
- **Données de référence.** Le socle ne contient que la STRUCTURE : les
  lignes de référence (capacités, rôles par défaut, catalogues) ne sont pas
  extraites, parce que le dépôt est public et qu'aucune donnée n'en sort sans
  tri. Une base reconstruite aurait ses tables, pas encore son contenu de
  base. Prochain lot : les identifier et les semer dans `supabase/seed/`.
