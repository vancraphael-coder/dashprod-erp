# Module 25 — Matériel d'emballage E/U/R (P1)

Alignement page 06. L'écran manquait ; le domaine Stocks (Module 8) l'attendait
depuis le début.

## Objectif

Tracer le matériel d'emballage en trois colonnes par article — **Enlevé** du
dépôt, **Utilisé** chez le client, **Repris** au retour. L'ÉCART (E − U − R)
est la fuite de marge invisible : cartons perdus, cassés, oubliés dans le
camion. Vingt secondes de saisie par chantier le rendent visible.

## Architecture

- **Domaine** (`stocks/emballage.js`) : `CATALOGUE_EMBALLAGE` (7 articles, noms
  du modèle validé), `resumeEmballage` (lignes + écarts + total utilisé),
  `fournituresOffre` (« 20 cartons standard, 1 carton livre » — accord du
  pluriel géré par le catalogue, pas deviné). L'équilibre vient de
  `controleSolde` (Module 8) : **aucune règle réécrite**.
- **SQL** (`0024`) : `affaires.emballage` jsonb `{cle: {e, u, r}}`. Choix v1
  assumé — zéro migration lourde, saisie immédiate. **V2 documentée** : bascule
  vers de vrais `stock_mouvements` (table déjà en base) rattachés à la mission,
  pour l'inventaire du dépôt. Le MÊME domaine servira les deux : c'est le
  stockage qui change, pas la règle.
- **Écran** (`Materiel.jsx`) : grille compacte 3 colonnes, ligne en rouge dès
  qu'un écart apparaît, carte « Matériel non justifié » en tête, et aperçu
  bleu de ce qui sera écrit sur l'offre.
- **Contrat** : la coche « Fourniture du matériel d'emballage (…) » apparaît
  automatiquement dès qu'un article est utilisé — la boucle relevé → matériel →
  offre est bouclée.
- **Dossier** : chip « 🧰 Matériel ».

## Un choix d'honnêteté : pas de prix inventés

`valoriserConsomme` (Module 8) sait déjà chiffrer le consommé — mais il exige
des **prix unitaires**, qui sont un RÉFÉRENTIEL à faire valider par le fondateur
(C-07 : versionné, jamais inventé). La valorisation est donc délibérément hors
de ce module : le catalogue ne porte que des noms, tous issus du modèle validé.
**À trancher par Raphaël** : les prix unitaires du matériel (7 articles) —
dès qu'ils existent, la valorisation se branche en une ligne et alimente le
poste « Matériel » des coûts du devis.

## Tests

`emballage.test.js` — 5 cas : équilibre atteint, écart signalé, pas d'écart
fantôme quand rien n'est sorti, fournitures avec accord du pluriel, liste vide
si rien d'utilisé. Total **169/169**.
