# Module 11 — Écrans du parcours commercial (v1)

Fiche de module (gabarit Référence 3 · T11). Premier module d'écrans métier :
le domaine devient visible et manipulable.

## Objectif

Projeter le parcours commercial à l'écran (S9) : liste des dossiers (CA signé,
statuts, marge colorée), création d'un dossier avec reconnaissance du client
(C-01 rendu visible), et devis branché sur le vrai moteur de chiffrage (barème
validé, trois formules, marge en zones). Utilisable immédiatement en mode
démonstration, sans attendre le branchement Supabase.

## Architecture

- `lib/theme.jsx` — langage visuel unique : couleurs à sens fixe (annexe F),
  badges d'état, styles de base. Les écrans consomment, ne redéfinissent pas.
- `lib/adaptateur.js` — adaptateur de données à DEUX MODES (principe T0 :
  adaptateur au bord) : « réel » (Supabase branché + session) ou « démo »
  (magasin localStorage avec données de démonstration). Les écrans ne parlent
  JAMAIS à Supabase directement : au branchement, rien ne change côté écrans.
- `ecrans/ListeAffaires.jsx` — cartes, recherche + filtre cumulables, CA signé
  calculé par le module Pilotage (`caSigne`), marge colorée via `zoneMarge`.
- `ecrans/NouvelleAffaire.jsx` — saisie client avec reconnaissance en direct
  (`trouverDoublon`) : correspondance forte (téléphone) ou faible (nom),
  proposition d'utiliser la fiche existante.
- `ecrans/Devis.jsx` — les trois formules validées, le barème réel affiché
  (85→255 €/h), recalcul en direct par `calculerScenario`, coûts internes,
  marge colorée par zone (25–45 %). L'écran saisit, le domaine calcule.
- `main.jsx` — routage d'état minimal (pas de dépendance) ; règle d'accès :
  base branchée → connexion (T3) ; base absente → mode démo avec bandeau.

## Responsabilités

- Rendre le produit visible et testable à la main dès maintenant (mode démo).
- Zéro logique métier dans les écrans : toute formule, toute règle vient de
  `@domaine` (une seule implémentation, T1).
- Préparer le branchement : le chemin « réel » de l'adaptateur écrit dans
  clients/affaires/scenarios — vérification d'intégration au branchement.

## Dépendances

Consomme `@domaine` (pilotage, chiffrage, crm) et `lib/supabase`. Aucun ajout
de dépendance npm (pas de react-router : routage d'état).

## Interfaces (contrat)

- Adaptateur : `modeDonnees()`, `listerClients()`, `listerAffaires()`,
  `obtenirAffaire(id)`, `creerAffaire({...})`, `enregistrerChiffrage(id, {...})`.

## Événements

Aucun émis directement : en mode réel, les événements naissent des commandes
serveur au branchement. Le mode démo n'en simule pas (données locales).

## Tests

Logique métier : déjà couverte par les 114 tests du domaine (les écrans ne
calculent rien). Vérification de ce module : build Vite vert + parcours manuel
(liste → création → reconnaissance client → devis → enregistrer → retour liste
avec montant et marge). Tests d'intégration du chemin « réel » au branchement
Supabase (T10).

## Évolutions futures (accueillies, non construites)

- Écran Offre (instanciation figée + C.B.D. + signature) — module suivant.
- Contact/adresses, Relevé volumétrique, Planning, Facture — projections des
  modules déjà construits.
- Bascule automatique démo → réel avec reprise des données saisies.

## Écarts avec la documentation

Un choix assumé : le mode démonstration (données locales) n'est pas décrit dans
les Références — il est un échafaudage de visualisation avant branchement, pas
une fonctionnalité produit. Tracé ici ; à retirer ou conserver à la gate de
branchement.
