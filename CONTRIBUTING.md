# Conventions de développement

## Principe directeur

Chaque ligne de code est un investissement à long terme. On privilégie
lisibilité, maintenabilité, robustesse, modularité, performance, sécurité —
dans cet ordre quand ils s'opposent. Aucun raccourci qui compliquerait les
évolutions futures.

## Méthode : un module à la fois

Aucun développement « en largeur ». Pour chaque module, dans l'ordre :

1. **Documentation** — vérifier ce que les Références 2 et 3 exigent.
2. **Architecture** — concevoir le module (fiche dans `docs/modules/`).
3. **Logique métier** — implémenter.
4. **Tests** — couvrir, en priorité les parties critiques.
5. **Dépendances** — vérifier l'impact sur les autres modules.
6. **Documentation** — mettre à jour, synchrone avec le code.
7. **Commit** — clair, atteignable, traçable.

Un module est terminé (tests verts, doc à jour, déployable) avant de commencer
le suivant.

## Ordre des modules (dépendances)

Le socle d'abord, car tout en dépend :

1. **Noyau** — organisations, utilisateurs, rôles/capacités, référentiels
   versionnés, journal d'événements. (en cours)
2. Identité & permissions (Auth + RLS) — s'appuie sur le Noyau.
3. CRM — clients, affaires.
4. Chiffrage & Offres — relevé, moteur de tarification. *(règles suspendues
   aux grilles tarifaires client)*
5. Documents & Signature — instances immuables, C.B.D.
6. Opérations — missions, planning, chrono.
7. RH · Flotte · Stocks.
8. Facturation & Peppol.
9. Pilotage.

## Git

- Une branche par évolution significative : `module/noyau`, `feat/crm-clients`…
- Fusion seulement quand le module est stable (tests verts).
- `main` reste déployable en permanence.

## Convention de commit

Format : `type(portée): description à l'impératif`

Types : `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`.
Exemple : `feat(noyau): fonctions de transition d'état gardées`

## Fidélité à la documentation

Le code ne contient aucune logique absente des Références. Si l'implémentation
révèle un manque ou une contradiction dans la doc, on ne l'improvise pas : on
ouvre un ADR décrivant l'écart et sa résolution, puis on met à jour la Réf.
concernée.

## Tests

Parties critiques vérifiées avant intégration : authentification, permissions,
transitions d'état, calculs de devis, génération documentaire, planification.
On préfère ralentir plutôt qu'introduire une régression.
