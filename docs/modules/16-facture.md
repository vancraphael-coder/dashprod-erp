# Module 16 — Facture (écran)

Fiche de module (gabarit Référence 3 · T11). Projette le module Facturation
(Module 9) et boucle le cycle financier.

## Objectif

Composer une facture depuis une affaire, l'émettre avec son numéro légal
(cmd_emettre_facture), enregistrer les paiements et suivre le solde en direct
(à payer / partiel / payé — C-24). Une facture émise est immuable ; une
correction passerait par une note de crédit (domaine déjà prêt).

## Architecture

- **Écran** (`Facture.jsx`) : deux vues. (1) Composition : lignes proposées
  (prestation depuis le chiffrage), total HTVA/TVA/TVAC (composerTotal), bouton
  d'émission. (2) Suivi : total, déjà payé, solde coloré, historique des
  paiements, formulaire d'enregistrement — statut dérivé par etatPaiement.
- Aucune logique métier dans l'écran : composerTotal et etatPaiement viennent
  du domaine testé (Module 9). L'écran saisit et affiche.

## Responsabilités

- Composer et émettre une facture (numéro légal continu en réel).
- Enregistrer des paiements datés (un remboursement = montant négatif).
- Afficher le solde et le statut en direct ; marquer « soldée » à couverture.

## Dépendances

Consomme le Module 9 (Facturation : composerTotal, etatPaiement, et en réel
cmd_emettre_facture + tables factures/lignes/paiements + vue de solde). Lié au
CRM (affaire) et au Chiffrage (lignes de prestation). Alimentera le Pilotage
(CA facturé, encaissements).

## Interfaces (contrat)

- Adaptateur : `lignesFacturePour(affaireId)`, `listerFactures()`,
  `emettreFacture(affaireId, lignes, tauxTva?)`, `obtenirFacture(id)`,
  `enregistrerPaiement(id, {montant_centimes, moyen, date})`.

## Événements

En réel : `Facture.Emise` (via la commande, Module 9). L'ajout d'une commande
de paiement émettra `Paiement.Recu` (recalcul du solde, proposition de clôture).

## Tests

Logique métier déjà couverte par les 11 tests de facturation (Module 9). Cet
écran : build Vite vert, parcours manuel (composer → émettre → payer partiel →
solder). Tests d'intégration de l'émission réelle (séquence légale, immuabilité)
au branchement Supabase.

## Évolutions futures (accueillies, non construites)

- Injection du matériel consommé en lignes (Stocks, C-18 — valoriserConsomme
  est prêt côté domaine).
- Note de crédit depuis l'écran (noteDeCredit est prêt).
- Génération PDF de la facture et envoi Peppol (versUBL est prêt ; l'adaptateur
  d'envoi reste au bord, D-1).
- Communication structurée belge (OGM/VCS) affichée et portée dans l'UBL.

## Écarts avec la documentation

Aucun. Projette fidèlement C-03 (séquence), C-24 (acomptes/solde) et
l'immuabilité de la facture émise.
