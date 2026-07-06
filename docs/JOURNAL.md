# Journal de progression

Suivi continu du développement. Une entrée par session (méthode : Réf. 3 + CONTRIBUTING).

---

## Session 1 — Fondation du dépôt et Module 1 (Noyau)

### Modules terminés
- **Module 1 — Noyau** : logique de domaine (permissions, référentiels
  versionnés) complète et testée (12/12) ; schéma SQL, RLS et fonctions de
  service écrits (vérification d'intégration en attente du branchement Supabase).

### Fichiers créés
- Gouvernance : `README.md`, `CONTRIBUTING.md`, `.gitignore`, `.env.example`,
  `package.json`, `.github/workflows/ci.yml`.
- SQL : `supabase/migrations/0001_noyau.sql` (schéma + immuabilité),
  `0002_noyau_fonctions.sql` (séquence, émission d'événement),
  `0003_noyau_rls.sql` (isolation de tenant) ; `supabase/seed/0001_noyau_seed.sql`.
- Domaine : `packages/domaine/src/noyau/permissions.js`, `referentiels.js` ;
  `packages/domaine/tests/noyau.test.js`.
- Doc : `docs/modules/01-noyau.md`, `docs/adr/ADR-007-...md` (+ ADR-005/006 repris).

### Décisions d'architecture
- Dépôt neuf `dashprod-erp` construit depuis la doc, **sans copier** l'ancien
  (ADR-007). Fondations réécrites, métier validé à réimplémenter proprement.
- Stack confirmée (T1) : React+Vite, Supabase, RLS ; Prisma et Next.js exclus.
- Journal d'événements immuable comme mécanisme d'audit (C-05) — trigger
  refusant UPDATE/DELETE dès la première migration.
- Permissions par capacité et par union de rôles (S3) — implémentation unique
  de domaine, consommée front + serveur.

### Écarts avec la documentation
- Aucun écart de logique. Refus assumé de la consigne « supprimer l'ancien
  projet » au sens littéral, tracé et motivé en ADR-007 (contradiction avec un
  principe d'ingénierie ; analyse d'écart d'ADR-005 réalisée).

### Risques identifiés
- **Dépendance bloquante persistante** : les grilles tarifaires du client ne
  sont toujours pas fournies. Elles bloquent le module Chiffrage, le seed des
  barèmes, les règles S5 et le chapitre T12. Le développement peut progresser
  sur Noyau → Identité → CRM → Documents sans elles, mais s'arrêtera au
  Chiffrage.
- Vérification RLS non automatisée tant que Supabase n'est pas branché : à
  couvrir en tests d'intégration (T10) avant toute mise en production.

### Prochaines étapes proposées
1. **Module 2 — Identité & permissions** : fonctions SECURITY DEFINER de
   provisioning (créer organisation, inviter utilisateur, affecter rôle),
   hook d'enrichissement du JWT, événements de connexion. Tests d'intégration
   RLS au branchement Supabase.
2. Puis **Module 3 — CRM** (clients, affaires, dédoublonnage).
3. Brancher un projet Supabase de staging pour activer les migrations et la CI
   d'intégration ; premier déploiement Vercel du shell applicatif.

---

## Session 2 — Module 2 (Identité & permissions)

### Modules terminés
- **Module 1 — Noyau** : fusionné dans `main` (module stable, 12/12).
- **Module 2 — Identité & permissions** : logique de domaine complète et testée
  (9 cas) ; commandes SQL SECURITY DEFINER écrites (vérification d'intégration
  au branchement Supabase).

### Fichiers créés
- Domaine : `packages/domaine/src/noyau/autorisation.js`, `jwt.js`.
- Tests : `packages/domaine/tests/identite.test.js`.
- SQL : `supabase/migrations/0004_identite_commandes.sql`.
- Doc : `docs/modules/02-identite.md`.

### Décisions d'architecture
- Les écritures sensibles du noyau passent exclusivement par des commandes
  SECURITY DEFINER gardées par capacité (famille 2 de la RLS centralisée, T3) —
  jamais d'UPDATE direct. Chaque commande émet son événement dans sa transaction.
- Autorisation en liste blanche stricte : une commande inconnue est refusée par
  défaut. `verifierCommande` renvoie la raison du refus pour l'audit.
- Défense en profondeur sur le JWT : validation de forme des claims et filtrage
  des rôles hors catalogue, en plus de la barrière RLS.
- `acteur_a_capacite` prend déjà en compte l'expiration des rôles
  (`expire_le`) : les délégations temporaires futures fonctionneront sans refonte.

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- **Dépendance bloquante inchangée** : grilles tarifaires client toujours
  absentes. Progression possible jusqu'au CRM et Documents ; arrêt au Chiffrage.
- RLS et commandes SQL non couvertes par tests automatisés tant que Supabase
  n'est pas branché — tests d'intégration requis avant production (T10).

### Prochaines étapes proposées
1. **Module 3 — CRM** : entité Client (résout C-01), dédoublonnage sur
   téléphone/nom normalisés, entité Affaire et sa machine à états (S4) opérée
   par commandes gardées + événements.
2. Brancher Supabase de staging : appliquer les migrations 0001-0004, activer
   les tests d'intégration RLS, premier déploiement Vercel du shell.

---

## Session 3 — Correction du faux blocage + Module 4 (Chiffrage)

### Correction majeure
- Le « blocage tarifaire » invoqué depuis plusieurs sessions était une erreur
  d'analyse (ADR-008) : les tarifs validés figuraient déjà dans les documents
  d'offre. Le fondateur a confirmé qu'ils sont définitifs. Blocage levé.

### Modules terminés
- **Module 2 — Identité & permissions** : fusionné dans `main`.
- **Module 4 — Chiffrage & Offres (moteur de tarification)** : logique de
  domaine complète et testée (14 cas), montants vérifiés à la main ; barème
  matérialisé en référentiel versionné (seed 0002).
- (Module 3 — CRM : à faire ; le moteur de chiffrage n'en dépend pas.)

### Fichiers créés
- Domaine : `commun/monnaie.js`, `chiffrage/bareme.js`, `chiffrage/moteur.js`.
- Tests : `packages/domaine/tests/chiffrage.test.js`.
- SQL : `supabase/seed/0002_bareme.sql`.
- Doc : `docs/modules/04-chiffrage.md`, `docs/adr/ADR-008-...md`.

### Décisions d'architecture
- Montants en centimes entiers (anti-virgule-flottante) ; TVA et déduction
  HTVA/TVAC centralisées dans `commun/monnaie.js`.
- Le moteur accepte un barème injecté : la republication d'une version de
  référentiel (C-07) change le calcul sans modifier le code.
- Barème validé matérialisé comme version 1 des référentiels de chiffrage.

### Écarts avec la documentation
- Aucun écart de règle. Précision tracée (ADR-008) sur l'origine des paliers
  2/4/5/6 (barème interne, confirmés par le fondateur).

### Risques identifiés
- Le seed 0002 nécessite l'org_id réel de Roovers à l'application (paramétré).
- Persistance des scénarios et émission Scenario.Calcule/Retenu à implémenter
  au branchement Supabase (entité `scenarios`, migration à venir).

### Prochaines étapes proposées
1. **Module 3 — CRM** : entité Client (C-01) + dédoublonnage ; entité Affaire
   et machine à états (S4) par commandes gardées + événements.
2. Brancher Supabase de staging : migrations 0001-0004 + seeds 0001-0002,
   tests d'intégration RLS, premier déploiement Vercel.

---

## Session 4 — Module 3 (CRM : clients & affaires)

### Modules terminés
- **Module 4 — Chiffrage** : fusionné dans `main`.
- **Module 3 — CRM** : logique de domaine complète et testée (17 cas) ;
  tables et commande de transition d'état écrites (intégration au branchement
  Supabase).

### Fichiers créés
- Domaine : `crm/clients.js` (dédoublonnage), `crm/affaire.js` (machine S4).
- Tests : `packages/domaine/tests/crm.test.js`.
- SQL : `0005_crm.sql` (clients, affaires, adresses),
  `0006_crm_transitions.sql` (cmd_transition_affaire gardée + RLS + blocage
  UPDATE direct de l'état).
- Doc : `docs/modules/03-crm.md`.

### Décisions d'architecture
- Le client devient entité première (C-01), avec clé de dédoublonnage indexée
  (téléphone normalisé) ; reconnaissance déterministe, priorité téléphone > nom.
- L'état de l'affaire n'est mutable QUE par cmd_transition_affaire : la fonction
  vérifie la transition et les gardes (invariants S4), émet l'événement, et un
  trigger bloque tout UPDATE direct de la colonne etat (drapeau de session).
- Invariants absolus appliqués côté domaine ET base : pas de confirmation sans
  instance signée (C-02), pas de facture sans numéro.

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- Le dédoublonnage SQL (tel_norm) est une approximation par regex ; la logique
  fine (+32) vit côté domaine. Cohérence à vérifier en intégration.
- Toujours pas de branchement Supabase : RLS, commandes et triggers non
  couverts par des tests automatisés. Priorité montante (T10).

### Prochaines étapes proposées
1. Brancher Supabase de staging : appliquer 0001-0006 + seeds, écrire les tests
   d'intégration RLS (isolation tenant, refus 42501, blocage d'état), premier
   déploiement Vercel du shell.
2. **Module 5 — Documents & Signature** : instances immuables (C-02), C.B.D.
   versionnée jointe automatiquement, dossier de preuve de signature (C-26).

---

## Session 5 — Module 5 (Shell applicatif & branchement)

### Modules terminés
- **Module 3 — CRM** : fusionné dans `main`.
- **Module 5 — Shell applicatif** : frontend Vite déployable, connexion
  email+mot de passe, diagnostic de branchement ; garde de configuration pure
  et testée. Build Vite vert.

### Fichiers créés
- Frontend : `apps/web/` (package.json, vite.config.js, index.html),
  `src/main.jsx`, `src/lib/supabase.js`, `src/ecrans/Connexion.jsx`,
  `src/ecrans/Diagnostic.jsx`.
- Domaine : `packages/domaine/src/commun/config.js`.
- Tests : `packages/domaine/tests/config.test.js`.
- Config : `vercel.json` (monorepo : build du workspace @dashprod/web),
  workspaces racine étendus à `apps/*`.
- Doc : `docs/modules/05-shell.md`.

### Décisions d'architecture
- Monorepo : le domaine est consommé en source par le front via l'alias
  `@domaine` — une seule implémentation des règles (T1).
- Le client Supabase ne se crée qu'avec des clés valides ; sans config, l'app
  affiche un état clair (prévention de l'écran blanc des prototypes). La garde
  est une fonction pure testée, câblée par le client.
- vercel.json configure explicitement le build monorepo (outputDirectory
  apps/web/dist) — évite l'échec de déploiement d'un repo sans app à la racine.

### Écarts avec la documentation
- Aucun.

### Blocage externe (non lié au code)
- Le connecteur Supabase répond « permission denied » sur toutes les actions
  (lecture comprise) pour le projet mjezskjdnylmcjygpppr. Cause probable :
  connecteur en lecture seule / portée restreinte, ou organisation différente.
  L'application des migrations est donc différée. Plan B disponible : appliquer
  les 6 migrations + 2 seeds à la main dans le SQL Editor Supabase.

### Prochaines étapes proposées
1. Débloquer le connecteur Supabase (permissions d'écriture sur le projet), OU
   appliquer les migrations à la main ; puis renseigner les variables
   d'environnement Vercel et vérifier le diagnostic au vert.
2. **Module 6 — Documents & Signature** : instances immuables (C-02), C.B.D.
   versionnée jointe automatiquement, dossier de preuve de signature (C-26).
