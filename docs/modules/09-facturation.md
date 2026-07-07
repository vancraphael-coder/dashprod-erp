# Module 9 — Facturation & Peppol

Fiche de module (gabarit Référence 3 · T11). Ferme la boucle commerciale.

## Objectif

Faire de la facture une entité légale : numéro de séquence continu (C-03/C-19),
lignes typées par origine, acomptes et paiements partiels avec solde calculé
(C-24), facture émise immuable (correction = note de crédit), et export au
format Peppol UBL BIS 3.0 (obligation belge de facturation électronique).

## Architecture

- **Domaine** (`packages/domaine/src/facturation/`) :
  - `facture.js` — composition du total (lignes prestation/materiel/indemnite),
    solde et statut d'après les paiements, note de crédit (lignes négatives).
  - `peppol.js` — mapping vers la structure UBL BIS 3.0 (montants convertis en
    décimales, identités TVA, communication structurée).
- **SQL** (`0012`) : `factures` (immuable dès `emise=true`), `facture_lignes`,
  `paiements`, vue `v_factures_solde` ; commande `cmd_emettre_facture`
  (séquence + gel), trigger d'immuabilité.

## Responsabilités

- Numérotation légale via `sequence_suivante` : continue, sans trou (C-03).
- Lignes typées : prestation (chiffrage), materiel (stock valorisé, C-18),
  indemnite (annulation, C-23).
- Solde et statut CALCULÉS (a_payer / partiel / paye) depuis des paiements datés
  (C-24) ; remboursement = paiement négatif.
- Facture émise immuable, côté domaine et base ; correction par note de crédit.
- Export UBL BIS 3.0 pour émission via un point d'accès Peppol certifié (D-1).

## Dépendances

Dépend du **Noyau** (`sequence_suivante`, `emettre_evenement`), de **Identité**
(`emettre_facture`), du **CRM** (affaire), du **Chiffrage** (lignes de
prestation), des **Stocks** (matériel valorisé, C-18) et d'**Opérations**
(mission effectuée déclenche la proposition de facturation). Déverrouille la
garde `numeroAttribue` de la transition Affaire → `facture`.

## Interfaces (contrat)

- Domaine : `composerTotal(lignes, tauxTva?)` ; `etatPaiement(total, paiements)` ;
  `noteDeCredit(lignes, tauxTva?)` ; `versUBL({...}) → document UBL`.
- SQL : `cmd_emettre_facture(facture) → numero`.

## Événements

`Facture.Emise`. Consommé : émission Peppol (adaptateur, T0), Pilotage,
transition d'affaire vers `facture`. `Paiement.Recu` (à l'ajout de la commande
de paiement) → recalcul du solde et proposition de clôture.

## Tests

`packages/domaine/tests/facturation.test.js` — 11 cas : composition du total,
solde (à payer / acompte partiel / payé / trop-perçu), note de crédit,
mapping UBL (profil BIS 3.0, conversion des montants, identités TVA,
communication structurée, validations). Statut : 11/11 verts (104/104 au total).

## Évolutions futures (accueillies, non construites)

- Sérialisation XML et envoi via point d'accès Peppol (D-1) — la structure UBL
  est produite ; l'adaptateur d'envoi est un ajout au bord (T0).
- Réconciliation bancaire (CODA/CSV) — les paiements datés en sont la cible.
- Exports comptables enrichis (Bob, Exact) — lignes typées déjà en place.

## Écarts avec la documentation

Aucun. Traduction fidèle de C-03, C-19, C-23, C-24 et de T12 (Peppol).
