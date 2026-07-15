# Module 26 — Réduction au devis (% + motif) — P1

Alignement page 04 §5. Le moteur gérait DÉJÀ la remise (recetteHtvaCentimes) ;
le manque était l'écran (le motif) et la propagation jusqu'au contrat.

## Ce qui existait déjà (domaine)

- `recetteHtvaCentimes` applique `remise = remisePct ? c × remisePct/100 : 0`,
  désormais **quelle que soit la formule** (le forfait aussi — le `return`
  anticipé qui excluait le forfait a été corrigé).
- `calculerScenario` expose `reduction: {pct, motif}` (motif défaut « promo »).
- Tests : réduction 10 % en horaire + application au forfait (chiffrage.test.js).

## Ce que ce module ajoute (écran + offre)

- **Devis** : à côté du champ %, un sélecteur de MOTIF — « Promotion (geste
  commercial) » ou « Dégâts (geste correctif) ». Le motif distingue deux
  réalités comptables et relationnelles différentes. Aperçu coloré (ambre pour
  promo, rouge pour dégâts) : « Réduction de 10 % (promotion) appliquée ».
- **Offre** : `composerOffre` porte `reduction` dans le contenu FIGÉ ; le
  Contrat l'affiche dans le bloc prix : « Réduction (promotion) −10 % appliquée »
  en jaune, au-dessus du montant TVAC. La réduction signée est donc scellée
  avec son motif (C-02).

## Tests

166/166 (les 2 cas de réduction du domaine étaient déjà présents). Build vert.
