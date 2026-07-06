# Module 4 — Chiffrage & Offres (moteur de tarification)

Fiche de module (gabarit Référence 3 · T11). Cœur commercial du produit.

## Objectif

Transformer les faits d'une affaire (formule, effectif, heures, distance,
options) et un barème versionné en un scénario chiffré — recette HTVA, TVA,
TVAC, coûts, marge et sa zone — comparable à d'autres scénarios. Calculer aussi
les indemnités de report et d'annulation.

## Architecture

Logique de domaine PURE (aucune base, aucun réseau), consommée à l'identique
par le front (onglet Devis) et le serveur (préparation d'offre). Trois fichiers :

- `commun/monnaie.js` — montants en centimes entiers (anti-virgule-flottante),
  TVA, déduction HTVA depuis TVAC.
- `chiffrage/bareme.js` — les valeurs validées client (ADR-008) : barème
  horaire, suppléments, TVA 21 %, cible de marge, barèmes d'indemnité.
- `chiffrage/moteur.js` — `calculerScenario`, `comparerScenarios`, `zoneMarge`,
  `indemnite`.

Le barème vit en base comme référentiel versionné (`supabase/seed/0002`) ; le
moteur accepte un barème injecté, si bien qu'une republication (nouvelle
version, C-07) change le calcul sans toucher au code.

## Responsabilités

- Recette selon la formule : tarifaire (heures × taux + élévateur + km×camions),
  tarifaire + emballage (+ 75 €/h et 0,75 €/km), forfait (HTVA déduit du TVAC).
- Kilométrage facturé = km × 1 € × nombre de camions (dépôt → dépôt).
- Remise commerciale en pourcentage sur la recette horaire.
- Marge = recette HTVA − coûts réels ; pourcentage et zone (25–45 % = cible).
- Indemnités report (25/50/75 %) et annulation (50/70/100 %) selon la distance
  à la date (résout C-23).

## Dépendances

Aucune dépendance de module : le moteur prend des faits, pas un client — il
n'attend donc pas le CRM. En production, il lit le barème depuis les
référentiels du Noyau. Fournit à Documents (l'offre instanciée) et à Pilotage
(marge devisée).

## Interfaces (contrat)

- `calculerScenario(faits, couts?, ref?) → scénario` (montants en euros + centimes).
- `comparerScenarios([{nom, faits, couts?}], ref?) → [{nom, scenario}]`.
- `zoneMarge(pct) → "sous_cible"|"dans_cible"|"premium"`.
- `indemnite(tvacCentimes, joursAvant, "report"|"annulation") → {pct, montant}`.

## Événements

Le moteur est pur (ne persiste rien) : les événements `Scenario.Calcule` et
`Scenario.Retenu` seront émis par la commande de persistance du scénario
(entité `scenarios`, à créer au branchement Supabase), qui appellera ce moteur.

## Tests

`packages/domaine/tests/chiffrage.test.js` — 14 cas, chaque montant vérifié à la
main : les trois formules, ajout élévateur/km, multiplication par camions,
emballage en régie, remise, marge et zones, division par zéro, effectif hors
barème, comparaison, et les deux barèmes d'indemnité avec montants.
Statut : 14/14 verts (35/35 avec noyau + identité).

## Évolutions futures (accueillies, non construites)

- Suggestion d'heures par prédiction (C-14) : le moteur reçoit les heures ;
  la couche de suggestion les proposera en amont sans le modifier.
- Grilles de suppléments par cas / tarifs saisonniers : nouvelles clés de
  référentiel versionné, calcul inchangé.
- Multi-devises : les montants portent déjà leur logique en centimes ; l'ajout
  d'une devise (I-2) est une étiquette, pas une refonte.

## Écarts avec la documentation

Aucun écart de règle. Précision tracée (ADR-008) : les paliers de barème
2/4/5/6 déménageurs proviennent du barème interne de l'app (seul le palier 3 à
130 € figure dans le texte des offres) ; repris sur confirmation du fondateur
et versionnés.
