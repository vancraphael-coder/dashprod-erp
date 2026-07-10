# Module 12 — Authentification Google sur invitation

Fiche de module (gabarit Référence 3 · T11). Répond à la demande explicite :
accès uniquement sur invitation du master, qui décide du secteur de chacun.

## Objectif

Permettre la connexion par Google OAuth, réservée aux emails invités par un
détenteur de `gerer_referentiels` (le master). Un email Google non invité est
refusé proprement. Le rôle (« secteur ») est choisi par le master à
l'invitation — jamais par l'utilisateur lui-même (T3).

## Gap comblé au passage

Aucune organisation n'avait de rôles en base : `roles`/`role_capacites`
n'existaient que dans le domaine JS (`permissions.js`). Sans eux, aucune
capacité n'était vérifiable après création d'une organisation — un trou qui
aurait bloqué toute invitation. `provisionner_roles_standard(org)` le comble,
en miroir exact du domaine.

## Architecture

- **SQL** (`0014`) :
  - `provisionner_roles_standard(org)` — crée les 5 rôles S3 + capacités,
    à exécuter une fois après la création d'une organisation (SQL Editor).
  - `mon_profil()` — identité + capacités de l'acteur courant, un seul appel.
  - `cmd_reclamer_invitation()` — lie `auth.uid()` à la ligne invitée par
    email (Google), idempotent, refuse proprement si aucune correspondance.
  - `hook_ajouter_claims(event)` — **Auth Hook Supabase**, injecte `org_id` et
    `roles` dans le JWT. Base de `jwt_org()` et donc de toute la RLS.
    ⚠️ Nécessite un enregistrement manuel côté Dashboard (Authentication →
    Hooks) — aucune migration ne peut l'activer à la place.
- **Front** : bouton Google (`Connexion.jsx`), écran `NonInvite.jsx` (refus
  propre), écran `Equipe.jsx` (invitation + liste des membres et secteurs,
  réservé à `gerer_referentiels`), routage dans `main.jsx` (session → réclame
  → profil → capacités → navigation).

## Responsabilités

- Connexion Google ou email/mot de passe, jamais de choix de rôle (T3).
- Master invite (email, nom, secteur) → deux commandes gardées enchaînées
  (`cmd_inviter_utilisateur` puis `cmd_affecter_role`, existantes depuis
  Module 2). Le secteur est un rôle de la matrice S3, une seule source de
  vérité (`ROLES` importé du domaine, pas redéfini dans l'écran).
- Un email Google sans invitation correspondante : message clair, pas d'accès,
  pas d'auto-inscription.

## Dépendances

Dépend du **Noyau** et d'**Identité** (Module 2 : `cmd_inviter_utilisateur`,
`cmd_affecter_role`, déjà existants). Le hook dépend d'une configuration
Supabase Dashboard hors SQL.

## Interfaces (contrat)

- SQL : `provisionner_roles_standard(org)`, `mon_profil() → jsonb`,
  `cmd_reclamer_invitation() → jsonb`, `hook_ajouter_claims(event) → jsonb`.
- Adaptateur : `reclamerInvitation()`, `monProfil()`, `listerMembres()`,
  `inviterMembre({email, nom, roleCle})`.

## Événements

`Utilisateur.InvitationReclamee` (nouveau, à la réclamation), en plus des
événements déjà émis par `cmd_inviter_utilisateur`/`cmd_affecter_role`.

## Tests

Aucun ajout aux 114 tests du domaine (module de câblage SQL + écrans, pas de
nouvelle règle métier pure). Vérifié : build Vite vert. Tests d'intégration au
branchement réel (T10) : réclamation, refus propre, capacités reflétées côté
front — nécessitent le hook enregistré côté Dashboard.

## Procédure de mise en service (rappel, hors SQL)

1. Google Cloud Console : créer les identifiants OAuth (Client ID + Secret).
2. Supabase → Authentication → Providers → Google : coller les identifiants.
3. Supabase → Authentication → Hooks → « Customize Access Token (JWT) Claims
   Hook » → sélectionner `hook_ajouter_claims`.
4. Après création d'une organisation : exécuter
   `select provisionner_roles_standard('<org_id>');` une fois.
5. Le master (première ligne `utilisateurs`, rôle `direction`) est rattaché
   manuellement à sa première connexion Google via `cmd_reclamer_invitation`
   (ou bootstrap direct en SQL le temps qu'il n'y ait personne pour l'inviter).

## Écarts avec la documentation

Aucun sur le fond (T3). Le gap des rôles non provisionnés n'était pas identifié
dans les Références — comblé ici, documenté comme correction, pas comme écart.
