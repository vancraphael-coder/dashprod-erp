# Module 15 — Planning (écran)

Fiche de module (gabarit Référence 3 · T11). Projette les missions et
affectations du Module 7 en vue agenda pour la coordination.

## Objectif

Donner à la coordination la vue terrain : missions groupées par jour, charge de
chaque journée, et affectation des membres avec détection de conflits en direct
(double affectation le même jour — C-20). Le système signale, l'humain décide.

## Architecture

- **Domaine** (`packages/domaine/src/operations/agenda.js`) : `grouperParJour`
  (tri chronologique, missions triées par heure), `chargeDuJour` (missions +
  effectif affecté), `missionsDuMembre` (filtre terrain — le membre ne voit que
  ses missions). S'appuie sur `missions.js` (Module 7, déjà testé) pour
  `conflitsAffectation`.
- **Écran** (`Planning.jsx`) : agenda par jour, cartes de mission avec heure et
  client, panneau d'affectation où chaque membre est cliquable ; un membre déjà
  affecté à une autre mission le même jour apparaît en rouge (conflit).

## Responsabilités

- Organiser l'affichage des missions en journées ; résumer la charge.
- Affecter/désaffecter un membre (bascule) via l'adaptateur.
- Signaler les conflits d'affectation en direct, sans les interdire
  brutalement : la décision reste humaine (C-20).

## Dépendances

Consomme le Module 7 (Opérations : missions, affectations, `conflitsAffectation`)
et Identité (membres). En réel, l'affectation passe par `cmd_affecter_membre`
(commande gardée par `gerer_planning`). Alimente le Pilotage (charge d'équipe).

## Interfaces (contrat)

- Domaine : `grouperParJour(missions)`, `chargeDuJour(missionsDuJour)`,
  `missionsDuMembre(missions, utilisateurId)`.
- Adaptateur : `listerMissions()`, `listerMembresSimples()`,
  `creerMission(affaireId, {...})`, `basculerAffectation(missionId, membreId, role)`.

## Événements

En réel : `Membre.Affecte` (via la commande, Module 7). L'écran ne produit pas
d'événement propre.

## Tests

`packages/domaine/tests/agenda.test.js` — 5 cas : regroupement et tri par jour,
exclusion des missions sans date, charge du jour, filtre par membre (formes
d'affectation tolérées). Statut : 5/5 verts (135/135 au total). La détection de
conflit réutilise les tests existants de `missions.js` (Module 7).

## Évolutions futures (accueillies, non construites)

- Filtre terrain effectif (un déménageur ne voit que ses missions —
  `missionsDuMembre` est prêt, le branchement au rôle reste à câbler).
- Congés dans la détection de conflit (le domaine `conflitsAffectation` accepte
  déjà les congés ; les alimenter depuis le module RH).
- Glisser-déposer, vue semaine/mois, création de mission depuis le planning.

## Écarts avec la documentation

Aucun. Projette fidèlement l'agenda et les conflits (C-20) déjà spécifiés.
