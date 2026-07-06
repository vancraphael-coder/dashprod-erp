# Module 5 — Shell applicatif & branchement

Fiche de module (gabarit Référence 3 · T11). Premier module d'interface : il
rend le dépôt déployable et projette les futurs modules métier.

## Objectif

Fournir l'ossature front (React + Vite) qui démarre, se connecte à Supabase,
authentifie par email + mot de passe (le rôle est résolu serveur, jamais
choisi — T3), et affiche un diagnostic de branchement. C'est ce qui rend le
déploiement Vercel réel et visible.

## Architecture

- `apps/web/` — application Vite. Le domaine (`packages/domaine`) est consommé
  en source via l'alias `@domaine` : une seule implémentation des règles,
  partagée front + serveur (T1).
- `apps/web/src/lib/supabase.js` — client Supabase. Ne crée le client qu'avec
  des clés valides ; sans configuration, `configPresente = false` et l'app
  affiche un état clair au lieu de planter (prévention de l'écran blanc).
- `apps/web/src/ecrans/Connexion.jsx` — email + mot de passe uniquement.
- `apps/web/src/ecrans/Diagnostic.jsx` — état de configuration et test de vie
  de la base (observabilité, T10).
- `packages/domaine/src/commun/config.js` — garde de configuration et
  interprétation d'état, PURES et testées (le client ne fait que les câbler).

## Responsabilités

- Démarrer et se construire sans base configurée (déploiement Vercel vert dès
  le premier commit, même avant Supabase).
- Parcours de connexion conforme à T3.
- Diagnostic visuel du branchement (variables présentes, base joignable,
  organisation visible).

## Dépendances

Consomme `@domaine/commun/config`. Dépend, à l'exécution, du projet Supabase
(URL + clé anon fournies par variables d'environnement). Fournit le point
d'entrée où les modules métier se projetteront selon les capacités (S9).

## Interfaces (contrat)

- `supabase` (client ou null), `configPresente` (bool), `sessionCourante()`,
  `testerConnexion() → {ok, message, organisation?}`.
- Domaine : `configPresente(url, anon)`, `interpreterEtatConnexion(etat)`.

## Événements

Aucun pour l'instant. Les événements de connexion (`Connexion.Reussie/Echouee`)
seront émis lorsque le hook d'enrichissement du JWT sera déployé côté serveur.

## Tests

`packages/domaine/tests/config.test.js` — 5 cas : garde de configuration
(deux variables exigées) et interprétation d'état (non configuré, refusé,
joignable sans/avec données). Statut : 5/5 verts (57/57 au total). Build Vite
vérifié vert.

Le comportement d'authentification réel et le test de vie contre la base seront
vérifiés au branchement Supabase (connecteur à débloquer).

## Procédure de branchement (rappel)

1. Appliquer les migrations 0001→0006 puis les seeds 0001→0002 sur le projet
   Supabase (via le connecteur, ou à la main dans le SQL Editor).
2. Dans Vercel → Environment Variables : `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY`, puis redéployer.
3. L'écran de diagnostic passe au vert et confirme le branchement.

## Écarts avec la documentation

Aucun. Conforme à T1 (monorepo, domaine partagé), T3 (connexion), T10
(diagnostic). Le connecteur Supabase étant en accès restreint au moment de
l'écriture, l'application effective des migrations est différée (non bloquant
pour la construction).
