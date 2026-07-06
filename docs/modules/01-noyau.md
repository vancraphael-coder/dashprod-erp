# Module 1 — Noyau

Fiche de module (gabarit Référence 3 · T11). Ce module est le socle : tout
autre module en dépend, il ne dépend d'aucun autre.

## Objectif

Fournir les fondations transverses de la plateforme : organisations
(multi-tenant), utilisateurs, rôles et capacités (permissions), référentiels
versionnés, séquences légales, et le journal d'événements immuable qui tient
lieu d'audit.

## Architecture

Deux couches complémentaires :

- **SQL** (`supabase/migrations/0001-0003`) — le schéma, les fonctions de
  service (séquence, émission d'événement) et la RLS. C'est la frontière de
  sécurité : un accès sans droit ne reçoit pas la donnée (T3).
- **Domaine** (`packages/domaine/src/noyau/`) — la logique pure et testable,
  identique côté front et serveur (T1) : résolution des capacités, sélection
  de la version de référentiel.

## Responsabilités

- Isolation multi-tenant : `org_id` sur toute table, politique RLS de tenant (I-1).
- Permissions par capacité, jamais par écran (I-7) ; cumul de rôles par union (S3).
- Référentiels versionnés : republication, jamais modification ; sélection
  déterministe de la version active (C-07, I-4).
- Numérotation légale continue, sans trou ni doublon (C-03).
- Journal append-only = audit ; immuabilité forcée par trigger (C-05, S10/T4).

## Dépendances

Aucune (module socle). Fournit à tous les modules suivants : l'entité
organisation, la résolution de permissions, l'émission d'événements, les
séquences.

## Interfaces (contrat)

- SQL : `sequence_suivante(org, type, annee) → int` ;
  `emettre_evenement(org, type, entite_type, entite_id, acteur, payload) → bigint` ;
  `jwt_org() → uuid`.
- Domaine : `resoudreCapacites(roles) → Set` ; `aCapacite(roles, cap) → bool` ;
  `versionActive(refs, type, cle, jur) → Referentiel|null` ;
  `versionPerimee(refs, refId) → bool`.

## Événements

Ce module ne produit pas d'événement métier : il fournit le mécanisme
d'émission (`emettre_evenement`) que les autres consomment. Les événements
d'authentification (`Connexion.Reussie/Echouee`) seront émis par le module
Identité & permissions.

## Tests

`packages/domaine/tests/noyau.test.js` — 12 cas, parties critiques :
matrice de permissions (direction exhaustive, déménageur restreint, cumul par
union, réservations valider_intake/gérer_référentiels) et sélection de version
(active la plus haute, respect de juridiction, détection de version périmée).
Statut : 12/12 verts.

La RLS et les fonctions SQL seront vérifiées par des tests d'intégration au
branchement Supabase (environnement requis), conformément à T10.

## Évolutions futures (accueillies, non construites)

- MFA (TOTP Supabase Auth) — activation par configuration (T3).
- Permissions temporaires et délégations — la colonne `expire_le` de
  `utilisateur_roles` les accueille déjà (I-7).
- Référentiels multi-juridictions — la colonne `juridiction` est en place (I-4).

## Écarts avec la documentation

Aucun. Le module traduit fidèlement T2, T3, T4 et S3.
