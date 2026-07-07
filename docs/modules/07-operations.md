# Module 7 — Opérations (missions, planning, chrono)

Fiche de module (gabarit Référence 3 · T11). Sépare l'exécution de la vente.

## Objectif

Porter l'exécution d'une affaire confirmée : missions datées (résout C-04),
affectations comme source unique de l'effectif (résout C-13), détection des
conflits de planning (C-20) et chrono de mission alimentant le coût réel.

## Architecture

- **Domaine** (`packages/domaine/src/operations/`) :
  - `chrono.js` — temps réel par sommation de sessions (pauses exclues), coût
    d'équipe aux taux réels avec repli prudent, formatage.
  - `missions.js` — sous-cycle d'état, détection de congé et de double
    affectation, proposition de remplaçants disponibles.
- **SQL** (`0009`, `0010`) : tables `missions`, `mission_affectations`,
  `mission_vehicules`, `chrono_sessions` ; commandes `cmd_creer_mission`,
  `cmd_affecter_membre`, `cmd_chrono_demarrer/arreter`.

## Responsabilités

- Une affaire → une ou plusieurs missions (déménagement, emballage), datées :
  le planning multi-événements (C-04).
- L'affectation est la seule source de l'effectif (C-13) : le prévu et le coût
  s'en dérivent.
- Conflits d'affectation détectés (congé couvrant la date, double affectation le
  même jour) ; remplaçants disponibles proposés — décision humaine (C-20).
- Chrono : temps réel = somme des sessions ; alimente le coût réel et la
  proposition de passage à « effectuée ».

## Dépendances

Dépend du **Noyau**, de **Identité** (capacité `gerer_planning`) et du **CRM**
(affaire). Consomme `Affaire.Confirme` (création de mission — cascade S10-2) et
`Conge.Approuve` (module RH, à venir, pour les conflits). Fournit au **Pilotage**
le temps réel et le coût, et à **Facturation** la mission effectuée.

## Interfaces (contrat)

- Domaine : `dureeSecondes(sessions, maintenant?)`, `chronoEnCours(sessions)`,
  `coutEquipeCentimes(secondes, taux, prudent?)`, `conflitsAffectation({...})`,
  `remplacantsDisponibles({...})`, `transitionMissionPermise(source, cible)`.
- SQL : `cmd_creer_mission(affaire, type, date, heure) → uuid` ;
  `cmd_affecter_membre(mission, utilisateur, role)` ;
  `cmd_chrono_demarrer(mission) → uuid` ; `cmd_chrono_arreter(mission)`.

## Événements

`Mission.Creee`, `Membre.Affecte`, `Chrono.Demarre`, `Chrono.Arrete`. Consommés :
`Chrono.Arrete` → proposition de transition mission « effectuée » puis
`Mission.Effectuee` → solde matériel (Stocks) et proposition de facturation.

## Tests

`packages/domaine/tests/operations.test.js` — 12 cas : chrono (sommation,
session ouverte, coût réel et repli, formatage), sous-cycle de mission,
conflits (congé, double affectation, exclusion de la mission elle-même),
remplaçants disponibles. Statut : 12/12 verts (82/82 au total).

## Évolutions futures (accueillies, non construites)

- Suggestion de composition de flotte depuis le volume (C-21).
- Optimisation de tournées multi-missions — les données (missions datées,
  adresses) sont en place.
- Synchronisation hors-ligne du terrain (chrono, brief) — T7.

## Écarts avec la documentation

Aucun. Traduction fidèle de C-04, C-13, C-20 et du chapitre chrono.
