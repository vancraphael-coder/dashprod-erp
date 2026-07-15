# Page 08 — Facture

Référence modèle : `factureSec()` (l. ~967-996).
Écran Dashprod actuel : `Facture.jsx` + domaine `facturation/*` (Module 9/16).

**Ici Dashprod est MÉCANIQUEMENT supérieur (séquence légale automatique,
immuabilité, paiements multiples, solde, note de crédit prête, UBL Peppol
prêt). Ce qui manque est le RENDU et quelques données belges.**

## Élément par élément

### 1. N° + date
- **Modèle** : saisie MANUELLE du numéro (« RV-2026-001 ») — fragile
  (doublons, trous : illégal en Belgique).
- **Dashprod** : ✅ SUPÉRIEUR — `cmd_emettre_facture` attribue la séquence
  continue. Ne rien copier. RAS.

### 2. Payée / paiements
- **Modèle** : simple switch « payée » + date.
- **Dashprod** : ✅ SUPÉRIEUR — paiements datés multiples, solde vivant,
  statuts à payer/partiel/payé (C-24 : acompte 30 % puis solde = deux lignes).
  RAS. 🟡 Ajouter « Remarques » facture (modèle) : **P2**.

### 3. LE RENDU DE FACTURE LISIBLE — ❌ P0
- **Design modèle** (pre monospace, à reprendre en mieux) :
  en-tête société (nom, tél, **IBAN**) ; « FACTURE N° {num} {date} » ;
  bloc CLIENT : nom, **adresse de facturation** (ou déchargement à défaut),
  **N° TVA client** si présent ; bloc prestation : « Déménagement {date
  longue} / {chargement} → {déchargement} » ; totaux HTVA / TVA 21 % / TVAC ;
  « Paiement par virement — {IBAN} ».
- **Ajouts Dashprod obligatoires au rendu** (conventions belges actées) :
  - **Communication structurée OGM** (+++XXX/XXXX/XXXXX+++, mod-97) générée
    depuis le numéro de facture — le domaine commun a la brique mod-97 ;
    l'afficher sur la facture ET la porter dans l'UBL. **P1 haut.**
  - Mentions légales : siège, BCE/TVA de l'émetteur, conditions de paiement.
  - Lignes détaillées (Dashprod les a : les rendre) + acompte déjà reçu /
    solde restant (le modèle ne sait pas le faire, nous si).
- **Impression** : même mécanique @media print que l'offre (page 05). **P0.**
- **Pourquoi** : une facture qu'on ne peut ni montrer ni imprimer n'existe pas
  aux yeux du client ni du comptable.

### 4. Paramètres organisation (prérequis transverse)
- Le rendu exige : IBAN, adresse siège, tél, email, BCE — aujourd'hui la table
  `organisations` n'a que nom/tva/pays. → migration `organisations` +
  (iban, adresse, tel, email) + mini-écran Réglages (Compte). **P1** (P0 de
  fait pour le rendu facture/offre — valeurs Roovers connues : IBAN
  BE73 3101 6268 5860, tél 0455/17.16.79).

### 5. Vue « liste des factures »
- Le modèle n'en a pas (facture = onglet du dossier). Dashprod a
  `listerFactures` (adaptateur) sans écran. Une vue « Facturation » (impayées
  d'abord, solde total dû) serait un PLUS Dashprod : **P2**.

## Récap priorités page 08
| Élément | Priorité |
|---|---|
| Rendu facture lisible + imprimable | **P0** |
| Paramètres organisation (IBAN, adresse, tél, mail) | **P0/P1** (prérequis rendu) |
| Communication structurée OGM affichée + UBL | P1 |
| TVA / adresse de facturation client sur la facture | P1 (avec page 02) |
| Acompte reçu / solde restant sur le rendu | P1 |
| Remarques facture | P2 |
| Vue liste des factures / impayés | P2 |
