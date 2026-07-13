# Module 20 — Flotte : camions (P0 n°4)

## Objectif

Les camions étaient référencés partout (dossier, relevé, planning, brief) sans
exister nulle part à l'écran. La table `vehicules` (Module 8) portait DÉJÀ tout
— CT, assurance, état mécanique compris : le P0 était purement de la projection.

## Architecture

- **Domaine** (`flotte/vehicules.js`) : `capaciteFlotte` (somme des m³),
  `jaugeCapacite` (zones ok ≤85 % / serre ≤100 % / surcharge), `alertesVehicule`
  (mécanique urgente, CT/assurance expirés → urgent ; proches → attention).
  Réutilise `qualifierEcheance` (commun) : UNE règle d'échéance pour RH et
  Flotte.
- **SQL** (`0022`) : `affaires.camions` (jsonb d'identifiants) — la sélection
  se fait au stade COMMERCIAL (le relevé a besoin de la capacité avant toute
  mission). Le trigger de confirmation (0021, étendu) REPORTE la sélection
  dans `mission_vehicules` : même logique que date souhaitée → date de mission
  (C-04).
- **Écran `Ressources.jsx`** : remplace Équipe dans la barre — deux onglets.
  Camions : alerte agrégée « Intervention nécessaire », fiches complètes
  (nom, type, volume, immat, CT, assurance, état mécanique avec constat
  horodaté automatiquement, note de panne), ajout/retrait. Membres : l'écran
  d'invitations existant, intégré tel quel (mode `integre`).
- **Dossier** : chips camions — un camion en alerte reste sélectionnable mais
  s'affiche en rouge (le système signale, l'humain décide, C-20).
- **Relevé** : jauge volume/capacité des camions sélectionnés, barre colorée,
  mention « surchargé ».

## Tests

`flotte.test.js` — 5 cas : capacité (types SQL texte inclus), zones de jauge,
alertes urgentes/attention/ok. Total **151/151**.

## Note

La décision « estimation camions /30 vs /12 vs capacité réelle » (synthèse §2)
penche désormais d'elle-même : la jauge sur capacité RÉELLE existe ; la
suggestion fixe du relevé n'est plus qu'un défaut avant sélection.
