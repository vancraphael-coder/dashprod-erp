# Module 14 — Relevé volumétrique

Fiche de module (gabarit Référence 3 · T11). Complète le dossier avant l'offre.

## Objectif

Estimer le volume à déménager par un inventaire meuble par meuble, et en dériver
une suggestion de composition (déménageurs, camions) — proposition indicative,
le devis restant souverain sur les prix. Aligné sur le modèle validé
`roovers-mobile.jsx` (catalogue par pièce, table de volumes, quantités).

## Architecture

- **Domaine** (`packages/domaine/src/releve/volumetrie.js`) : catalogue de
  pièces (`PIECES`), table de volumes de référence (`VOLUMES`, issue de la table
  VOL validée), résolution tolérante (`volumeUnitaire` — casse, préfixe le plus
  spécifique, défaut), `volumeTotal`, `suggererComposition` (heuristique métier
  ~12 m³/camion, ~8 m³/déménageur, bornée), `grouperParPiece`.
- **SQL** (`0017`) : colonne `affaires.releve` (jsonb). Le volume et la
  composition ne sont jamais stockés — calculés à la volée (une donnée existe
  une seule fois).
- **Écran** (`Releve.jsx`) : sélecteur de pièce, catalogue cliquable avec volume
  unitaire affiché, inventaire groupé par pièce avec quantités ±, volume total
  et suggestion en direct, lien vers le devis.

## Responsabilités

- Construire l'inventaire par pièce, regrouper les articles identiques.
- Calculer le volume total en direct ; un volume ajusté à la main prime sur la
  référence (meuble atypique).
- Suggérer une composition — clairement marquée « indicative, à confirmer au
  devis » : le module ne décide pas des prix.

## Dépendances

Autonome côté domaine (aucune dépendance à un autre module métier). Consommé par
le parcours : accessible depuis le devis, l'affaire porte l'inventaire.
Alimentera plus tard la composition de flotte (C-21) et la comparaison
volume/capacité camion.

## Interfaces (contrat)

- Domaine : `volumeUnitaire(nom)`, `volumeTotal(inventaire)`,
  `suggererComposition(volumeM3)`, `grouperParPiece(inventaire)`, `PIECES`,
  `VOLUMES`.
- Adaptateur : `enregistrerReleve(affaireId, inventaire)`, `obtenirReleve(affaireId)`.

## Événements

Aucun (donnée attachée à l'affaire). Une évolution pourrait émettre
`Releve.MisAJour` pour tracer les révisions.

## Tests

`packages/domaine/tests/releve.test.js` — 8 cas : résolution de volume (casse,
préfixe spécifique, défaut), volume total (quantités, volume explicite
prioritaire), suggestion (dérivation, bornes), regroupement par pièce, stabilité
du catalogue. Statut : 8/8 verts (130/130 au total).

## Évolutions futures (accueillies, non construites)

- Report en un clic de la composition suggérée dans le devis (le lien existe ;
  l'injection automatique est un ajout).
- Comparaison volume total vs capacité de la flotte sélectionnée (C-21).
- Photos par pièce, articles personnalisés hors catalogue.

## Écarts avec la documentation

Aucun. La table de volumes et le catalogue reprennent le modèle validé
`roovers-mobile.jsx` ; l'heuristique de composition est indicative et ajustable.
