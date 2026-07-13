# Module 18 — Rendu du contrat (P0 n°1)

Fiche de module (T11). Répond au premier P0 de `docs/alignement/00-synthese`.

## Objectif

Rendre visible le document que le client lit, comprend et signe. Dashprod avait
la meilleure MÉCANIQUE (instance figée, empreinte, C.B.D. jointe, transition
gardée) mais scellait un document invisible : un montant et une empreinte.

## Architecture

- **Domaine** (`documents/cgv.js`) : CGV **versionnées** (texte fourni par le
  fondateur, jamais rédigé ici), `PRESTATIONS_INCLUSES`, `VALIDITE_JOURS_OUVRABLES`,
  `ACOMPTE_PCT`. `cgv(version)` renvoie la version demandée ; une version
  inconnue renvoie `[]` **et non la dernière** — mieux vaut un document
  visiblement incomplet qu'un document silencieusement faux.
- **Domaine** (`releve/volumetrie.js`) : `articlesADemonter(inventaire)` — une
  implémentation, trois usages (offre, terrain, brief).
- **SQL** (`0020`) : `organisations` + bce, adresse, cp, ville, tel, email,
  iban. Le modèle avait ces valeurs EN DUR (constantes) : inacceptable en
  multi-tenant (I-1). Valeurs Roovers renseignées, ciblées par TVA.
- **Adaptateur** : `obtenirOrganisation()`, `composerOffre(affaireId)` — compose
  le contenu COMPLET qui sera figé (tout ce qui s'imprime en vient).
- **Écran** (`Contrat.jsx`) : le document. Ne connaît QUE le `contenu` reçu →
  avant envoi c'est un aperçu vivant, après envoi c'est le contenu FIGÉ. Le
  document rendu ne peut donc plus bouger, même si les tarifs ou les CGV
  changent — supérieur au modèle, qui réédite librement après signature.
- **Impression** (`index.html`) : `@media print` ne laisse visible que
  `.contrat-imprimable` ; `.no-print` masque le reste. Le client reçoit son
  document, pas l'application.

## Contenu du document (ordre de lecture)

En-tête émetteur (nom, BCE, tél) · salutation · adresses de chargement et
déchargement avec étage/ascenseur/monte-meubles · volume estimé + équipe ·
prestations incluses (+ monte-meubles si option) · **démontage prévu** (issu du
relevé) · bloc prix TVAC + TVA · planning + validité 10 jours ouvrables ·
remarques · **bon pour accord** (nom, date, tracé) · **CGV de la version figée**
· pied légal (siège, BCE, IBAN, contacts).

## Le point d'architecture qui compte

`cgv_version` est mémorisée DANS le contenu figé. Une offre signée en 2026
rejouera ses CGV de 2026, même si l'entreprise les change en 2028 (C-02). Les
CGV visibles sont le résumé lisible ; la C.B.D. complète reste jointe (S6).

## Signature

Pad en **pointer events** (doigt, stylet, souris) avec mise à l'échelle
`devicePixelRatio` : tracé net sur écran haute densité. La signature déverrouille
la transition vers « confirmé » (C-02) et l'écran rappelle l'acompte dû (30 %).

## Tests

`tests/cgv.test.js` (4 cas : version courante, version inconnue → vide, gel,
constantes) et 2 cas ajoutés à `releve.test.js` (articlesADemonter). Total :
141/141 verts. Build Vite vert. Rendu et impression : vérification visuelle.

## Reste à brancher (documenté, non fait ici)

Réduction (% + motif) et camions dans le contrat : dépendent des P0/P1 des
pages 04 et 10 de l'alignement. Le contenu composé les accueillera sans refonte.
