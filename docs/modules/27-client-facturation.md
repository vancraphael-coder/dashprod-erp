# Module 27 — Données de facturation client (P1)

Alignement pages 02 §1 et 08 §3. Encore un cas où le domaine était en avance :
la table `clients` (0005) portait DÉJÀ `societe`, `tva_num`, `fact_lignes`,
`fact_cp`, `fact_ville`, `fact_pays`. Seul l'accès manquait.

## Livré

- **Adaptateur** : `obtenirClientFacturation(affaireId)`,
  `sauverClientFacturation(affaireId, champs)` (liste blanche des colonnes
  autorisées — pas d'écriture sauvage).
- **Dossier** : bloc « Facturation » dépliable — masqué par défaut (la majorité
  des clients sont des particuliers), il s'ouvre pour saisir société, N° TVA et
  adresse de facturation dès qu'il s'agit d'un professionnel. Enregistré avec
  le reste du contact.
- **Facture** : le rendu utilise désormais les vraies données — la raison
  sociale prime sur le nom, la TVA s'affiche, et l'adresse de facturation
  structurée remplace le placeholder (repli sur l'adresse de déchargement si
  absente, comme l'exige le rendu belge).

## Règle métier rendue

Dès qu'un client est une société, TVA + adresse de facturation deviennent
nécessaires pour une facture conforme. Le champ est là ; l'affichage « société »
vs « particulier » sur le bouton signale l'état d'un coup d'œil.

## Tests

Aucune logique de domaine nouvelle (accès aux colonnes existantes). 169/169
inchangés, build vert.
