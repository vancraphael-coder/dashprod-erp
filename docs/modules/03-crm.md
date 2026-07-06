# Module 3 — CRM (clients & affaires)

Fiche de module (gabarit Référence 3 · T11).

## Objectif

Faire exister le client comme entité première (résout C-01) et porter le cycle
de vie de l'affaire par une machine à états gardée (résout C-06), en séparant la
vente (affaire) de l'exécution (missions, module Opérations — C-04).

## Architecture

- **Domaine** (`packages/domaine/src/crm/`) :
  - `clients.js` — normalisation téléphone/nom et dédoublonnage déterministe
    (téléphone = correspondance forte, nom = faible).
  - `affaire.js` — la machine à états S4 : table de transitions, gardes,
    projection des transitions possibles.
- **SQL** (`0005`, `0006`) : tables `clients` (avec clé de dédoublonnage
  indexée), `affaires` (état enum), `affaire_adresses` ; la commande
  `cmd_transition_affaire` (seule porte de changement d'état) et le trigger qui
  bloque tout UPDATE direct de l'état ; RLS de tenant.

## Responsabilités

- Client unique par tenant, reconnu à la création d'affaire (cascade S10-1).
- Affaire : état muté seulement par transition autorisée sous garde ; les deux
  invariants absolus de S4 appliqués côté domaine ET base : pas de `confirme`
  sans instance signée (C-02), pas de `facture` sans numéro attribué.
- Adresses de chargement/déchargement structurées, avec accès (I-5).

## Dépendances

Dépend du **Noyau** (organisations, utilisateurs, `emettre_evenement`,
`jwt_org`) et du module **Identité** (acteur authentifié). Fournit l'affaire au
**Chiffrage** (qui reste toutefois indépendant : il prend des faits) et aux
modules aval (Documents, Opérations, Facturation).

## Interfaces (contrat)

- Domaine : `normaliserTel(tel)`, `normaliserNom(nom)`,
  `trouverDoublon(saisie, clients) → {client, confiance}|null` ;
  `transitionPermise(source, cible) → bool`,
  `verifierTransition(source, cible, ctx) → {autorise, raison}`,
  `transitionsPossibles(source, ctx) → string[]`.
- SQL : `cmd_transition_affaire(affaire, cible, contexte)`.

## Événements

`Affaire.<Etat>` à chaque transition (ex. `Affaire.Confirme`, `Affaire.Annule`),
émis par la commande dans sa transaction. Ces événements déclenchent les
consommateurs S10 (création de mission à `confirme`, indemnité à `reporte`/
`annule`, etc.) au fil de la construction des modules aval.

## Tests

`packages/domaine/tests/crm.test.js` — 17 cas : normalisation, dédoublonnage
(priorité téléphone, correspondance faible par nom, nouveau client), chemin
nominal complet, interdiction des sauts, états terminaux, et surtout les
invariants de garde (pas de confirmation sans signature, pas de facture sans
numéro, planification exigeant date+équipe+véhicule). Statut : 17/17 verts
(52/52 au total).

La commande SQL et le trigger de blocage d'état seront vérifiés en intégration
au branchement Supabase (T10).

## Évolutions futures (accueillies, non construites)

- Historique des affaires par client et relances (C-17) : les événements
  `Affaire.*` en sont la matière.
- Fusion de doublons validée par un humain : le dédoublonnage propose déjà les
  correspondances ; l'action de fusion est un ajout, pas une refonte.

## Écarts avec la documentation

Aucun. Traduction fidèle de S4, C-01, C-04, C-06.
