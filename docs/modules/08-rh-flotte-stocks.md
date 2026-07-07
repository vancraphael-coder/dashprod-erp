# Module 8 — RH · Flotte · Stocks

Fiche de module (gabarit Référence 3 · T11). Sépare trois domaines que
l'application d'origine agrégeait sous « Ressources » (résout C-08).

## Objectif

Gérer le personnel et ses congés (workflow, C-25), la flotte et ses
signalements (C-15), et les consommables en E/U/R valorisés (C-09, C-18) — avec
la donnée de paie isolée sous permission renforcée (résout le problème connu
n°2 : cloisonnement salaires UI-only).

## Architecture

- **Domaine** :
  - `commun/echeances.js` — qualification Valide/Proche/Expirée/Absente, filtre
    « À traiter » (partagé RH documents + Flotte CT/assurance).
  - `stocks/stock.js` — contrôle de solde E/U/R, valorisation du consommé,
    liste des écarts.
  - `rh/conges.js` — workflow (demande/approbation/refus), droit d'approbation,
    chevauchements.
- **SQL** (`0011`) : `conges`, `donnees_paie` (RLS renforcée), `equipements_rh`,
  `documents_rh`, `vehicules` (+ FK `mission_vehicules`), `stock_articles`,
  `stock_mouvements`.

## Responsabilités

- RH : congés avec workflow gardé (approuver_conge, S3) ; échéances de documents
  en file « À traiter » ; paie **isolée** — un rôle sans `voir_paie` ne reçoit
  pas la ligne, par politique RLS (pas un masquage d'écran).
- Flotte : véhicules, échéances CT/assurance qualifiées, état mécanique
  signalable depuis le terrain (C-15) ; `volume_m3` alimente la jauge du relevé.
- Stocks : consommables distincts de l'outillage (C-09) ; contrôle
  Enlevé = Utilisé + Repris avec alerte d'écart ; consommé valorisé et
  injectable en lignes de facture (C-18).

## Dépendances

Dépend du **Noyau**, de **Identité** (`acteur_a_capacite`, `voir_paie`,
`approuver_conge`) et d'**Opérations** (missions pour les mouvements de stock ;
FK `mission_vehicules` complétée ici). Fournit à **Opérations** les congés
approuvés (conflits) et le coût d'équipe (paie), à **Facturation** le consommé
valorisé.

## Interfaces (contrat)

- Domaine : `qualifierEcheance(date, ref?, seuil?)`, `echeanceARegler(q)` ;
  `controleSolde({enleve,utilise,repris})`, `valoriserConsomme(lignes)`,
  `articlesEnEcart(articles)` ; `transitionCongePermise`,
  `verifierTransitionConge(source, cible, peutApprouver)`,
  `chevauchementsApprouves(demande, existants)`.
- SQL : tables ci-dessus (commandes gardées à ajouter au fil des écrans).

## Événements

À l'implémentation des commandes : `Conge.Demande/Approuve/Refuse`,
`Vehicule.Signale`, `Materiel.Solde`. `Conge.Approuve` → conflits Opérations ;
`Materiel.Solde` → injection facture + alerte d'écart.

## Tests

`packages/domaine/tests/rh-flotte-stocks.test.js` — 11 cas : échéances (4 états,
file à traiter), stock (solde cohérent/écart, valorisation, écarts), congés
(transitions, droit d'approbation, chevauchements approuvés). Statut : 11/11
verts (93/93 au total).

## Évolutions futures (accueillies, non construites)

- Demande de remplacement d'équipement depuis le terrain (colonne `a_remplacer`
  en place).
- Coûts kilométriques par véhicule (carburant dérivé, C-15) — `volume_m3` et
  flotte en place ; l'ajout d'une consommation est une colonne.
- Soldes de congés annuels, types d'absence — extensions du modèle conges.

## Écarts avec la documentation

Aucun. Traduction fidèle de C-08, C-09, C-15, C-18, C-25 et du problème connu n°2.
