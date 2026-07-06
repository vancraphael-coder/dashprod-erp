# Module 2 — Identité & permissions

Fiche de module (gabarit Référence 3 · T11).

## Objectif

Contrôler l'accès à la plateforme et l'écriture dans le noyau : résoudre le
rôle d'un utilisateur côté serveur (jamais choisi), enrichir le jeton, et
exposer les commandes d'administration (provisioning d'utilisateurs, affectation
de rôles, publication de référentiels) — chacune gardée par capacité et traçée.

## Architecture

- **Domaine** (`packages/domaine/src/noyau/`) :
  - `autorisation.js` — table des commandes du noyau et capacité requise ;
    liste blanche stricte (commande inconnue = refus).
  - `jwt.js` — construction et validation des revendications signées du jeton.
- **SQL** (`supabase/migrations/0004`) :
  - `acteur_a_capacite(cap)` — miroir SQL de la résolution de capacités.
  - `cmd_inviter_utilisateur`, `cmd_affecter_role`, `cmd_publier_referentiel` —
    commandes SECURITY DEFINER : vérifient la capacité, écrivent, émettent
    l'événement, dans une seule transaction.

## Responsabilités

- Parcours de connexion (T3) : email + mot de passe (Supabase Auth) ; rôle et
  organisation résolus serveur et inscrits dans le JWT signé.
- Famille 2 de la RLS (capacités) centralisée : toute écriture sensible du
  noyau passe par une commande gardée, jamais par un UPDATE direct.
- Publication versionnée des référentiels (C-07) : nouvelle version, jamais
  modification ; émet `Bareme.Publie`.

## Dépendances

Dépend du **Module 1 — Noyau** (organisations, utilisateurs, rôles/capacités,
`emettre_evenement`, `jwt_org`). Fournit à tous les modules la garantie que
l'acteur est authentifié et ses capacités vérifiables (`acteur_a_capacite`).

## Interfaces (contrat)

- Domaine : `peutExecuter(roles, commande) → bool` ;
  `verifierCommande(roles, commande) → {autorise, capaciteRequise, raison}` ;
  `construireClaims(ctx) → claims` ; `claimsValides(claims) → bool`.
- SQL : `acteur_a_capacite(cap) → bool` ; `cmd_inviter_utilisateur(email, nom) → uuid` ;
  `cmd_affecter_role(utilisateur, role) → void` ;
  `cmd_publier_referentiel(type, cle, valeur, juridiction) → uuid`.

## Événements

Émis : `Utilisateur.Invite`, `Role.Affecte`, `Bareme.Publie`. À venir avec le
branchement Auth : `Connexion.Reussie`, `Connexion.Echouee` (le journal des
connexions demandé est alors une requête sur `evenements`, pas une table de plus).

## Tests

`packages/domaine/tests/identite.test.js` — 9 cas critiques : autorisation par
capacité (direction exhaustive, coordination/commercial exclus des commandes
d'admin, refus par défaut, raison explicite pour l'audit) et claims JWT
(construction, validation de forme, filtrage des rôles hors catalogue).
Statut : 9/9 verts (21/21 avec le noyau).

Les commandes SQL SECURITY DEFINER et la RLS seront vérifiées par tests
d'intégration au branchement Supabase (T10) : un acteur sans capacité doit
recevoir 42501, l'événement doit être présent après succès.

## Évolutions futures (accueillies, non construites)

- MFA (TOTP) — configuration Supabase Auth.
- Permissions temporaires / délégations — `utilisateur_roles.expire_le` déjà en
  place et déjà pris en compte par `acteur_a_capacite` (filtre `expire_le`).
- Détection d'anomalies de connexion — matière première (événements de
  connexion) disponible ; logique de décision = module futur.

## Écarts avec la documentation

Aucun. Traduction fidèle de T3 et T4.
