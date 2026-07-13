# Module 21 — Facture rendue, liste datée, devis confidentiel (P0 n°5, 7, 8, 9)

Clôture de la vague P0 de `docs/alignement/00-synthese`.

## P0 n°5 — Rendu de facture (page 08)

- **Domaine** (`facturation/ogm.js`) : communication structurée belge.
  `genererOGM(sequence, annee)` — 10 chiffres de base (année + séquence) + clé
  mod 97 (un reste de 0 s'écrit 97, règle belge), format `+++XXX/XXXX/XXXXX+++`.
  Déterministe : même facture → même OGM, rejouable à vie. `ogmValide` (pour le
  rapprochement des paiements entrants), `decomposerNumero` (lit « AAAA-NNNNNN »
  de `cmd_emettre_facture`). L'OGM est ce qui permet aux banques belges de
  lettrer un virement SANS lecture humaine du libellé.
- **Écran** (`FactureDoc.jsx`) : le document — en-tête émetteur + numéro,
  bloc client, prestation (date + adresses), tableau des lignes, totaux,
  **acompte reçu / solde restant** (le modèle ne savait pas le faire),
  bloc paiement navy avec IBAN + OGM en évidence, pied légal complet.
  Même classe d'impression que le contrat : seul le document part au papier.
- **Branchement** (`Facture.jsx`) : le document s'affiche au-dessus du suivi
  des paiements + bouton Imprimer/PDF. Corrige aussi un manque : revenir sur
  « Facture » depuis un dossier déjà facturé retrouvait l'écran de composition
  au lieu de la facture émise (`obtenirFacturePourAffaire`).

## P0 n°7 — Liste : date de chantier + tri (page 01)

- La carte affiche la **date du déménagement en toutes lettres**
  (« 📅 vendredi 4 juillet ») ou « Date à définir ».
- **Tri métier** : par date de chantier croissante, dossiers sans date en fin,
  puis créations récentes — le bureau vit dans l'ordre des chantiers, pas des
  saisies.
- **Correction d'un manque réel découvert au passage** : en mode réel, la
  liste retournait `tvac_centimes: null` — les cartes n'affichaient JAMAIS de
  montant. Jointure sur le scénario retenu (`scenarios.resultats`) : montants
  et marge visibles.

## P0 n°8 et 9 — Devis : coûts complets + confidentialité (page 04)

- Champs **Divers** et **Péages** ajoutés — le moteur les acceptait déjà
  (`coutsTotalCentimes`, ligne 66) ; seul l'écran ne les exposait pas.
- **Gating `voir_prix`** : la carte des coûts réels et le bloc marge sont
  INVISIBLES sans la capacité (S3). Le domaine l'exigeait depuis le Module 4 ;
  l'écran le respecte enfin. Les totaux HTVA/TVA/TVAC restent visibles à qui
  peut chiffrer.
- Correction de cartographie : la **marge en €** était en réalité déjà affichée
  (docs/alignement/04 la disait manquante).

## Tests

`ogm.test.js` — 4 cas (déterminisme + format + clé, règle du reste 0→97,
rejets, décomposition du numéro légal). Total **155/155**.
