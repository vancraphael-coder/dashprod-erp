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

---

## Session 6 — Module 6 (Documents & Signature)

### Modules terminés
- **Module 5 — Shell** : fusionné dans `main`.
- **Module 6 — Documents & Signature** : logique de domaine complète et testée
  (13 cas) ; tables et commandes documentaires écrites (intégration différée).

### Fichiers créés
- Domaine : `documents/instances.js` (immuabilité, empreinte),
  `documents/modeles.js` (versions, règle C.B.D.).
- Tests : `packages/domaine/tests/documents.test.js`.
- SQL : `0007_documents.sql` (modèles, instances, signatures + immuabilité),
  `0008_documents_commandes.sql` (instancier/geler/signer).
- Doc : `docs/modules/06-documents.md`.

### Décisions d'architecture
- Résolution du C-02 : une instance figée est gelée (Object.freeze côté domaine,
  gele=true + trigger côté base) ; empreinte déterministe rejouable pour prouver
  l'intégrité lors d'un litige.
- C.B.D. non négociable (S6) : transportée telle quelle (fichier_ref, jamais
  générée), jointe automatiquement à toute offre ; refus d'instancier une offre
  sans C.B.D. active, côté domaine ET base — protection juridique non désactivable.
- Signatures en écriture seule (dossier de preuve C-26) ; la signature scelle
  l'instance et déverrouille la garde de transition vers 'confirme'.

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- Empreinte domaine = somme de contrôle déterministe (FNV-1a) pour testabilité
  sans dépendance ; l'empreinte cryptographique SHA-256 est calculée côté base
  (colonne dédiée). Cohérence des deux à vérifier en intégration.
- Génération PDF réelle et stockage du fichier gelé non implémentés (T5, D-2).
- Connecteur Supabase toujours restreint : commandes et triggers non testés
  contre une vraie base.

### Prochaines étapes proposées
1. **Module 7 — Opérations** : missions (séparées de l'affaire, C-04), planning
   multi-événements, affectations (source unique de l'effectif, C-13), chrono.
2. Débloquer Supabase et appliquer les migrations 0001-0008 + seeds ; tests
   d'intégration RLS et immuabilité ; brancher les variables Vercel.

---

## Session 7 — Module 7 (Opérations : missions, planning, chrono)

### Modules terminés
- **Module 6 — Documents & Signature** : fusionné dans `main`.
- **Module 7 — Opérations** : logique de domaine complète et testée (12 cas) ;
  tables et commandes écrites (intégration différée).

### Fichiers créés
- Domaine : `operations/chrono.js`, `operations/missions.js`.
- Tests : `packages/domaine/tests/operations.test.js`.
- SQL : `0009_operations.sql` (missions, affectations, véhicules, chrono),
  `0010_operations_commandes.sql` (créer mission, affecter, chrono).
- Doc : `docs/modules/07-operations.md`.

### Décisions d'architecture
- Mission séparée de l'affaire (C-04) : une affaire confirmée porte n missions
  datées ; création déclenchée par Affaire.Confirme (cascade S10-2).
- Affectation = source unique de l'effectif (C-13) ; conflits (congé, double
  affectation) détectés côté domaine, remplaçants proposés (décision humaine).
- Chrono par sessions : temps réel = somme, pauses exclues ; coût d'équipe aux
  taux réels avec repli prudent. Chrono.Arrete → proposition « effectuée ».

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- mission_vehicules et les conflits de congé dépendent des modules Flotte et RH
  (à venir) pour être pleinement alimentés ; FK vehicules à ajouter alors.
- Connecteur Supabase toujours restreint : 10 migrations désormais en attente
  d'application et de tests d'intégration.

### Prochaines étapes proposées
1. **Module 8 — RH · Flotte · Stocks** (ou l'un des trois isolément) : congés
   avec workflow (C-25), véhicules et signalements (C-15), matériel E/U/R
   valorisé (C-09, C-18).
2. Priorité montante : débloquer Supabase, appliquer 0001-0010 + seeds, tests
   d'intégration (RLS, immuabilité, transitions), variables Vercel.

---

## Session 8 — Module 8 (RH · Flotte · Stocks)

### Modules terminés
- **Module 7 — Opérations** : fusionné dans `main`.
- **Module 8 — RH · Flotte · Stocks** : logique de domaine complète et testée
  (11 cas) ; tables des trois domaines écrites, FK vehicules complétée.

### Fichiers créés
- Domaine : `commun/echeances.js`, `stocks/stock.js`, `rh/conges.js`.
- Tests : `packages/domaine/tests/rh-flotte-stocks.test.js`.
- SQL : `0011_rh_flotte_stocks.sql` (conges, donnees_paie [RLS renforcée],
  equipements_rh, documents_rh, vehicules + FK mission_vehicules, stock_articles,
  stock_mouvements).
- Doc : `docs/modules/08-rh-flotte-stocks.md`.

### Décisions d'architecture
- Séparation RH / Flotte / Stocks (C-08) ; échéances qualifiées par une règle
  unique partagée (commun/echeances).
- Paie isolée dans donnees_paie sous RLS renforcée (tenant + capacité voir_paie)
  : résout structurellement le problème connu n°2 (salaires UI-only).
- Stock : contrôle E/U/R avec alerte d'écart ; consommé valorisé injectable en
  facture (C-18). Congés avec workflow gardé par approuver_conge (C-25).

### Écarts avec la documentation
- Aucun.

### Point utilisateur / accès (soulevé en session)
- Aucun identifiant n'existe : ni utilisateur créé, ni migrations appliquées.
  Pour entrer dans l'app il faut (A) créer un user dans Supabase Auth, (B)
  appliquer 0001-0011 + seeds et rattacher le user à l'organisation avec le rôle
  direction. Au-delà de la connexion, aucun écran métier n'existe encore.

### Risques identifiés
- 11 migrations désormais en attente d'application/test contre une vraie base.
- L'écart « construit » vs « utilisable » grandit : priorité forte au branchement
  Supabase + premier écran métier avant d'empiler d'autres modules.

### Prochaines étapes proposées
1. DÉCISION requise : brancher Supabase (migrations + user + rattachement, puis
   premier écran métier) OU continuer le code (Facturation, Pilotage).
2. Modules restants : Facturation & Peppol, Pilotage.

---

## Session 9 — Module 9 (Facturation & Peppol)

### Modules terminés
- **Module 9 — Facturation & Peppol** : logique de domaine complète et testée
  (11 cas) ; tables, vue de solde et commande d'émission écrites.

### Fichiers créés
- Domaine : `facturation/facture.js` (total, solde, note de crédit),
  `facturation/peppol.js` (mapping UBL BIS 3.0).
- Tests : `packages/domaine/tests/facturation.test.js`.
- SQL : `0012_facturation.sql` (factures immuables, lignes typées, paiements,
  vue v_factures_solde, cmd_emettre_facture, trigger d'immuabilité).
- Doc : `docs/modules/09-facturation.md`.

### Décisions d'architecture
- Facture = entité légale : numéro via sequence_suivante (continu, C-03) ;
  immuable dès emise=true (domaine + trigger) ; correction = note de crédit.
- Solde et statut calculés depuis paiements datés (C-24) ; remboursement =
  montant négatif. Vue SQL v_factures_solde miroir de etatPaiement.
- Peppol : structure UBL BIS 3.0 produite en domaine pur ; sérialisation XML et
  envoi via point d'accès (D-1) délégués à un adaptateur au bord (T0).

### Écarts avec la documentation
- Aucun.

### Point relevé par l'utilisateur
- Migrations 0005 et 0006 manquantes de son côté : à re-livrer (elles existent
  dans le dépôt, sessions CRM).

### Risques identifiés
- 12 migrations en attente d'application (Supabase à passer en Pro / débloquer).
- Sérialisation XML Peppol et adaptateur d'envoi non implémentés (D-1).

### Prochaines étapes proposées
1. Re-livrer 0005_crm.sql et 0006_crm_transitions.sql à l'utilisateur.
2. **Module 10 — Pilotage** : dernier module du vertical (CA, marges, charge,
   tableaux de bord par rôle) — clôt le domaine.
3. Puis : branchement Supabase + premier écran métier réel.

---

## Session 10 — Module 10 (Pilotage) — VERTICAL DOMAINE COMPLET

### Modules terminés
- **Module 10 — Pilotage** : logique de domaine complète et testée (10 cas) ;
  vues d'agrégation écrites. C'est le DERNIER module du vertical côté domaine.

### Fichiers créés
- Domaine : `pilotage/finances.js` (CA signé, dérive de marge),
  `pilotage/charge.js` (équilibre d'équipe).
- Tests : `packages/domaine/tests/pilotage.test.js`.
- SQL : `0013_pilotage.sql` (vues v_ca_signe, v_charge_membre — aucune table).
- Doc : `docs/modules/10-pilotage.md`.

### Décisions d'architecture
- Le pilotage AGRÈGE, ne possède rien : vues SQL sur les données existantes,
  respectant « une donnée existe une seule fois ». RLS héritée des tables.
- CA signé = états engagés (confirme→paye), cohérent avec la liste des dossiers.
- Rentabilité par chantier : dérive marge devisée vs réelle, avec alerte (S5).
- Charge d'équipe : heures depuis les affectations (source unique C-13),
  équilibre ±20 %.

### Bilan de complétude — vertical déménagement (domaine)
- 10 modules construits : Noyau, Identité, Chiffrage, CRM, Shell, Documents,
  Opérations, RH·Flotte·Stocks, Facturation, Pilotage.
- 114 tests unitaires verts ; 13 migrations SQL ; build front vert.
- Constats du diagnostic (Réf. 2, S1) couverts par le domaine et le schéma :
  C-01 (client), C-02 (instances immuables), C-03 (séquences), C-04 (mission),
  C-05 (journal/audit), C-06 (machine à états), C-07 (référentiels versionnés),
  C-08/09 (RH/Flotte/Stocks séparés), C-13 (effectif source unique),
  C-18 (solde matériel), C-23 (indemnités), C-24 (acomptes/solde), C-25 (congés),
  C-26 (preuve de signature). Problème connu n°2 (paie) résolu par RLS renforcée.

### Écarts avec la documentation
- Aucun.

### Ce qui reste (hors domaine)
- BRANCHEMENT SUPABASE : 13 migrations à appliquer (Supabase à passer en Pro).
  Sans base, aucune vérification d'intégration (RLS, triggers, vues).
- ÉCRANS MÉTIER : au-delà de connexion + diagnostic, aucun écran ne projette
  encore le domaine (liste dossiers, devis, signature, planning, facture…).
- Adaptateurs au bord : génération PDF (T5), envoi Peppol (D-1), envoi mail.

### Prochaine étape recommandée (forte)
Le vertical est complet en logique. Le prochain jalon n'est plus un module de
domaine mais : (1) brancher Supabase et appliquer/tester les migrations, puis
(2) construire le PREMIER ÉCRAN MÉTIER réel de bout en bout (liste dossiers →
création d'un devis → offre signée). C'est ce qui rend l'ensemble utilisable.

---

## Session 11 — Module 11 (Écrans du parcours commercial, v1)

### Modules terminés
- **Module 11 — Écrans commerciaux v1** : liste des dossiers, création avec
  reconnaissance client, devis branché sur le moteur réel. Build Vite vert.
  UTILISABLE EN MODE DÉMONSTRATION dès le prochain déploiement Vercel.

### Fichiers créés / modifiés
- Nouveaux : `apps/web/src/lib/theme.jsx`, `apps/web/src/lib/adaptateur.js`,
  `apps/web/src/ecrans/ListeAffaires.jsx`, `NouvelleAffaire.jsx`, `Devis.jsx`,
  `docs/modules/11-ecrans-commercial.md`.
- Remplacé : `apps/web/src/main.jsx` (routage + règle d'accès + bandeau démo).

### Décisions d'architecture
- Adaptateur de données à deux modes (T0) : « réel » (Supabase) / « démo »
  (localStorage seedé). Les écrans ne parlent jamais à Supabase directement —
  au branchement, rien ne change côté écrans.
- Zéro logique métier dans les écrans : CA signé = caSigne (Pilotage), marge =
  zoneMarge, calcul = calculerScenario, reconnaissance = trouverDoublon. Une
  seule implémentation des règles (T1), enfin visible.
- Base absente → l'app s'ouvre en mode démo avec bandeau violet + lien
  Diagnostic (au lieu d'un écran de connexion sans issue).
- Écart assumé et tracé : le mode démo est un échafaudage de visualisation,
  hors Références — décision de retrait/conservation à la gate de branchement.

### Risques identifiés
- Le chemin « réel » de l'adaptateur (insert clients/affaires/scenarios) est
  écrit mais non vérifié : tests d'intégration au branchement (T10).
- Écrans restants : Offre/signature, Contact/adresses, Relevé, Planning,
  Facture — à construire module par module.

### Prochaines étapes proposées
1. Déployer sur Vercel et VÉRIFIER LE VISUEL en mode démo (parcours complet :
   créer un dossier → reconnaître un client → chiffrer → marge en direct).
2. **Module 12 — Écran Offre & signature** : instanciation figée (C-02) + CBD
   + pad de signature — la suite naturelle du parcours commercial.

---

## Session 12 — Module 12 (OAuth Google sur invitation) + réconciliation Copilot

### Réconciliation (avant le module)
- Repo distant cloné et comparé : Copilot VS Code avait réécrit monnaie.js,
  bareme.js, moteur.js, clients.js avec une API incompatible — CASSAIT Devis.jsx
  en production (formule « emballage » → 0 € silencieux ; écran plantait sur
  champs renommés) — et supprimé affaire.js (machine à états S4/C-02).
- Restauré : les 7 fichiers testés (114/114, tarifs ADR-008). Adopté : la table
  `scenarios` ajoutée par Copilot dans 0013 (bon ajout, compatible, comblait un
  manque réel) — mon 0013 local mis à jour en conséquence.

### Modules terminés
- **Module 12 — OAuth Google sur invitation** : connexion Google, réclamation
  d'invitation par email, hook d'enrichissement JWT, écran Équipe (le master
  décide qui rejoint quel secteur), écran de refus propre si non invité.

### Fichiers créés / modifiés
- SQL : `0014_invitations_oauth.sql` (provisionner_roles_standard, mon_profil,
  cmd_reclamer_invitation, hook_ajouter_claims + grants).
- Front nouveaux : `ecrans/NonInvite.jsx`, `ecrans/Equipe.jsx`.
- Front modifiés : `lib/supabase.js` (+connecterAvecGoogle, deconnecter),
  `lib/adaptateur.js` (+reclamerInvitation, monProfil, listerMembres,
  inviterMembre), `ecrans/Connexion.jsx` (+bouton Google),
  `ecrans/ListeAffaires.jsx` (+lien Équipe conditionnel), `main.jsx` (routage
  complet : session → réclamation → profil → capacités → navigation).
- Doc : `docs/modules/12-oauth-invitations.md`.

### Gap comblé (critique, non documenté avant)
- Aucune organisation n'avait de rôles en base (roles/role_capacites vides à la
  création) : sans provisionner_roles_standard(), AUCUNE capacité n'aurait
  fonctionné après branchement — bloquant pour tout le système de permissions,
  pas seulement l'OAuth.

### Décisions d'architecture
- Le rôle n'est jamais choisi par l'utilisateur : le master invite + assigne
  (cmd_inviter_utilisateur + cmd_affecter_role, réutilise Module 2 tel quel).
- Réclamation par correspondance d'email (auth.jwt()->>'email'), idempotente,
  refus propre et explicite si aucune invitation ne correspond.
- Hook JWT : nécessite un enregistrement MANUEL côté Dashboard Supabase — tracé
  comme procédure hors-SQL dans la fiche module.

### Risques identifiés
- Le hook doit être enregistré côté Dashboard pour que jwt_org() fonctionne —
  sans ça, la RLS ne verra jamais org_id après connexion.
- Le bootstrap du tout premier master (avant qu'aucun master n'existe pour
  l'inviter) nécessite une étape manuelle en SQL Editor — à documenter au
  moment du branchement réel avec l'utilisateur.
- Deux constructeurs (Copilot + moi) sur le même repo sans processus de revue :
  risque de récidive identifié, décision de gouvernance en attente du fondateur.

### Prochaines étapes proposées
1. Décision de gouvernance : un seul constructeur sur packages/domaine et
   supabase/migrations, ou processus de revue formel.
2. Branchement réel (Codespaces) : appliquer 0001-0014, configurer Google OAuth
   + hook, provisionner les rôles de l'organisation, bootstrap du master.
3. Écrans restants : Offre & signature (C-02 visible), Contact/Relevé, Planning.

---

## Session 13 — Écran Offre & Signature (finalise Module 6) + Module 13 (Conformité RGPD)

### Modules terminés
- **Finalisation Module 6** : écran Offre & Signature — instanciation figée,
  C.B.D. jointe automatiquement, pad de signature, transition vers confirmé.
- **Module 13 — Conformité RGPD & Gouvernance** : registres, demandes RGPD,
  anonymisation avec verrou légal, incidents de sécurité.

### Fichiers créés / modifiés
- SQL : `0015_documents_offre_ecran.sql` (seed templates offre + C.B.D. par
  organisation, FK scenario_id enfin posée), `0016_conformite_rgpd.sql`
  (registre_traitements, sous_traitants, consentements, demandes_rgpd + 2
  commandes, cmd_anonymiser_client, incidents_securite).
- Domaine : `conformite/retention.js` (échéances légales 30j/72h, minimisation).
- Tests : `packages/domaine/tests/conformite.test.js` (8 cas).
- Front nouveaux : `ecrans/Offre.jsx` (avec pad de signature canvas intégré).
- Front modifiés : `lib/adaptateur.js` (+envoyerOffre, obtenirInstance,
  signerOffre), `ecrans/Devis.jsx` (+bouton vers l'offre), `main.jsx`
  (+route offre).
- Doc : `docs/modules/13-conformite-rgpd.md` (couvre les deux compléments).

### Décisions d'architecture
- RGPD scopé à ce qui est porteur aujourd'hui : pas d'écran pour les registres
  (SQL/export DPO), pas de gestion de consentement marketing active (table
  accueillante, usage non fictif). Refusé : liste exhaustive spéculative.
- Anonymisation avec verrou légal explicite : une facture émise < 7 ans bloque
  l'effacement du client — la fonction refuse plutôt que de casser une
  obligation comptable.
- Tension documentée et NON corrigée rétroactivement : des événements déjà
  émis portent un email en clair (append-only, C-05) — techniquement
  inefficaçable sans casser l'audit. Retenu pour la suite : IDs seulement.
- C.B.D. par organisation (pas système) car juridiquement propre à chaque
  entreprise ; templates d'offre système (org_id null, réutilisables) car
  structurels, pas juridiques.

### Écarts avec la documentation
- Sujet non couvert par les Références (S1-S11, T0-T12) — pas d'écart, un
  ajout motivé par une demande légale explicite.

### Risques identifiés
- Le fichier C.B.D. réel (texte validé) doit être déposé en Storage par le
  fondateur — jamais généré ni inventé par le système.
- Pas d'écran pour traiter les demandes RGPD/incidents : géré en SQL pour
  l'instant, à réévaluer si le volume le justifie.

### Prochaines étapes proposées
1. Écrans restants : Contact/adresses, Relevé volumétrique, Planning, Facture.
2. Branchement réel : appliquer 0001-0016, uploader la C.B.D. réelle en Storage,
   configurer le hook OAuth (Module 12).

---

## Session 14 — Module 14 (Relevé volumétrique)

### Modules terminés
- **Module 14 — Relevé volumétrique** : logique de domaine testée (8 cas),
  écran complet, colonne d'affaire. Build Vite vert.

### Fichiers créés / modifiés
- Domaine : `releve/volumetrie.js` (catalogue, volumes, suggestion).
- Tests : `packages/domaine/tests/releve.test.js`.
- SQL : `0017_releve.sql` (colonne affaires.releve jsonb).
- Front nouveaux : `ecrans/Releve.jsx`.
- Front modifiés : `lib/adaptateur.js` (+enregistrerReleve, obtenirReleve),
  `ecrans/Devis.jsx` (+lien vers relevé), `main.jsx` (+route releve).
- Doc : `docs/modules/14-releve.md`.

### Décisions d'architecture
- Table de volumes et catalogue alignés sur roovers-mobile.jsx (modèle validé),
  pas réinventés. Résolution tolérante (préfixe le plus spécifique).
- Volume et composition CALCULÉS côté domaine, jamais stockés (une donnée existe
  une seule fois). L'inventaire seul est persisté (jsonb sur l'affaire).
- Suggestion de composition explicitement indicative : le devis reste souverain
  sur les prix. L'IA/le système propose, l'humain décide.

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- Le report de la suggestion dans le devis est manuel (lien) : l'injection
  automatique volume→heures reste à faire si souhaité.
- 17 migrations désormais en attente d'application contre une vraie base.

### Prochaines étapes proposées
1. Écrans restants : Contact/adresses (compléter le dossier), Planning
   (projeter les missions et affectations), Facture (émission + paiements).
2. PWA (manifest, service worker, icônes) — prérequis du but 3 (Play Store).

---

## Session 15 — Module 15 (Planning, écran)

### Modules terminés
- **Module 15 — Planning** : agenda par jour, affectation avec détection de
  conflits en direct. Domaine testé (5 cas), build Vite vert.

### Fichiers créés / modifiés
- Domaine : `operations/agenda.js` (grouperParJour, chargeDuJour, missionsDuMembre).
- Tests : `packages/domaine/tests/agenda.test.js`.
- Front nouveaux : `ecrans/Planning.jsx`.
- Front modifiés : `lib/adaptateur.js` (+listerMissions, listerMembresSimples,
  creerMission, basculerAffectation ; +missions de démo au seed),
  `ecrans/ListeAffaires.jsx` (+lien Planning), `main.jsx` (+route planning).
- Doc : `docs/modules/15-planning.md`.

### Décisions d'architecture
- L'agenda réutilise conflitsAffectation (Module 7, déjà testé) : aucune
  duplication de la logique de conflit. Le nouveau domaine ne fait qu'organiser
  l'affichage (regroupement, charge, filtre membre).
- Conflit signalé en direct (rouge) mais NON interdit : décision humaine (C-20).
- missionsDuMembre prêt pour le filtre terrain (un déménageur ne voit que ses
  missions) — câblage au rôle à activer au branchement réel.

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- La désaffectation en mode réel nécessiterait une commande dédiée (actuellement
  cmd_affecter_membre est idempotent à l'ajout) — à ajouter au branchement.
- Congés pas encore alimentés dans la détection de conflit (le domaine les
  accepte ; les brancher depuis le module RH).

### Prochaines étapes proposées
1. Écran Facture (émission + paiements + solde) — dernier grand écran du parcours.
2. PWA (manifest, service worker, icônes) — prérequis du but 3 (Play Store).
3. Écran Contact/adresses (compléter le dossier).

---

## Session 16 — Module 16 (Facture, écran)

### Modules terminés
- **Module 16 — Facture** : composition, émission (numéro légal), paiements et
  solde en direct. Build Vite vert. Le parcours financier est bouclé.

### Fichiers créés / modifiés
- Front nouveaux : `ecrans/Facture.jsx`.
- Front modifiés : `lib/adaptateur.js` (+lignesFacturePour, listerFactures,
  emettreFacture, obtenirFacture, enregistrerPaiement), `ecrans/ListeAffaires.jsx`
  (+bouton Facturer/Voir la facture sur affaires effectuées/confirmées),
  `main.jsx` (+route facture).
- Doc : `docs/modules/16-facture.md`.

### Décisions d'architecture
- Zéro logique métier dans l'écran : composerTotal et etatPaiement viennent du
  Module 9 (déjà testé). L'écran saisit et affiche.
- Deux vues : composition/émission puis suivi des paiements. Solde et statut
  dérivés en direct (C-24). Facture émise présentée comme immuable (correction =
  note de crédit, mentionné à l'utilisateur).

### Écarts avec la documentation
- Aucun.

### Risques identifiés
- L'insertion facture+lignes en mode réel est écrite mais non testée contre une
  vraie base (vérification au branchement). L'émission de séquence passe par
  cmd_emettre_facture (déjà en base).
- Injection matériel consommé, note de crédit UI, PDF/Peppol : prêts côté
  domaine, à câbler.

### Prochaines étapes proposées
1. PWA (manifest, service worker, icônes) — prérequis du but 3 (Play Store).
2. Écran Contact/adresses (compléter le dossier).
3. Branchement réel : bootstrap master, hook OAuth, upload C.B.D.

---

## Session 17 — Incident au branchement réel : privilèges perdus (0018)

### Incident
Premier vrai test d'intégration (connexion réelle de l'utilisateur master) :
403 / 42501 « permission denied for table clients » sur toutes les tables.
Cause racine : le reset « drop schema public cascade » recommandé avant de
rejouer les migrations a effacé les privilèges par défaut du schéma public
(installés par Supabase à la création du projet) ; le script de recréation ne
les restaurait que partiellement (usage sur le schéma, pas les grants tables).
Second bug latent identifié dans la foulée : l'adaptateur insère sans org_id
(colonne NOT NULL) — aurait échoué juste après la réparation des grants.

### Correctif — migration 0018_reparation_privileges.sql
- Rétablit les grants standard Supabase (tables, séquences, fonctions) pour
  anon/authenticated/service_role — la RLS reste la couche de sécurité (modèle
  Supabase : grants larges, RLS restreint).
- alter default privileges : les migrations futures n'auront plus ce piège.
- Re-verrouille hook_ajouter_claims (réexposé par le grant global) : exécution
  réservée à supabase_auth_admin.
- DEFAULT jwt_org() sur toutes les colonnes org_id du schéma : l'organisation
  vient du jeton ; le with check RLS reste le garde-fou.

### Leçon (procédure)
Tout futur reset de schéma doit utiliser 0018 comme post-scriptum obligatoire,
ou mieux : ne plus jamais dropper le schéma entier (préférer drop des objets).

### Premier branchement réel par ailleurs RÉUSSI
Auth Google OK, hook OK, réclamation OK, master en rôle direction, app servie
par Vercel sur la vraie base. Restent les 403 (corrigés par 0018) puis reprise
de la construction : navigation, création de dossier complète, écrans manquants.

---

## Session 17b — Module 17 (Dossier complet & navigation)

### Contexte
Premier retour d'usage réel du fondateur après branchement : création minimale,
pas de barre de navigation, écrans non reliés, planning nu. Réponse directe.

### Modules terminés
- **Module 17 — Dossier & navigation** : barre inférieure (Dossiers, Planning,
  Équipe, Compte avec déconnexion), écran Dossier hub avec Contact complet
  (adresses multiples chargement/déchargement : type, étage, ascenseur,
  monte-meubles ; date/heure souhaitées ; remarques), recâblage du parcours
  (carte → Dossier ; retours → Dossier ; fin des culs-de-sac).

### Fichiers créés / modifiés
- SQL : `0019_dossier_contact.sql` (date_souhaitee/heure_souhaitee — les
  adresses existaient depuis 0005, enfin projetées).
- Front nouveaux : `ecrans/Dossier.jsx`.
- Front modifiés : `main.jsx` (barre de nav, écran Compte, recâblage),
  `lib/adaptateur.js` (+obtenirContact, sauverContact),
  `ecrans/ListeAffaires.jsx` (nettoyage en-tête, carte → dossier),
  `ecrans/NouvelleAffaire.jsx` (libellé bouton).
- Doc : `docs/modules/17-dossier-navigation.md`.

### Décisions d'architecture
- Date souhaitée sur l'affaire (commerciale) vs date d'exécution sur la mission
  (C-04) — la confirmation transformera l'une en l'autre.
- Le Dossier devient le hub : les écrans du parcours y reviennent.
- Barre de nav : Équipe conditionnée à gerer_referentiels ; Compte porte la
  déconnexion (absente jusqu'ici — un utilisateur réel ne pouvait pas sortir).

### Prochaines étapes proposées
1. PWA (manifest, service worker, icônes) — but 3.
2. Création de mission à la confirmation (date souhaitée → mission planifiée).
3. Fiche membre Équipe (congés, documents — domaine Module 8 prêt).

---

## Session 18 — Cartographie d'alignement complète (docs/alignement/)

### Contexte
Demande explicite du fondateur après premier usage réel : cesser de découvrir
les manques au fil de l'eau ; cartographier EXACTEMENT chaque écart entre la
vraie app et le modèle validé (roovers-mobile.jsx, relu intégralement —
1647 lignes), page par page, élément par élément : design, logique, pourquoi,
priorité.

### Livré : 13 documents dans docs/alignement/
00 synthèse (P0 globaux, décisions à trancher, avantages Dashprod à préserver),
01 liste, 02 contact, 03 relevé, 04 devis, 05 offre (le plus gros P0 : rendu
du contrat lisible), 06 matériel E/U/R (absent, domaine prêt), 07 mail
(absent), 08 facture (mécanique supérieure, rendu absent), 09 planning
(P0 : mission auto à la confirmation + calendrier mensuel), 10 équipe & flotte
(P0 : camions minimaux), 11 terrain (P0 : routage + mes chantiers),
12 connexion/compte (supérieur au modèle, reste : réglages organisation).

### Décisions à trancher par le fondateur (documentées en synthèse)
1. Monte-meubles : 125 €/jour (modèle) vs 150 € forfait (ADR-008) — je garde
   ADR-008 sauf contrordre.
2. Estimation camions : /30 m³ (modèle) vs /12 (domaine actuel) vs capacité
   réelle des camions sélectionnés (recommandé).
3. Statut « en cours » : dériver de la mission, pas un nouvel état d'affaire.
4. Rôles terrain (métier) ≠ rôles d'accès S3 : champ metier séparé.

---

## Session 19 — P0 n°1 : le rendu du contrat + relevé complété

### Contexte
Première vague P0 de la cartographie d'alignement, dans l'ordre de la synthèse.

### Livré
- **Module 18 — Rendu du contrat** : `Contrat.jsx` (le document que le client
  lit et signe), CGV versionnées (`documents/cgv.js`), paramètres organisation
  (0020), `composerOffre` (contenu figé complet), impression navigateur
  (@media print sur `.contrat-imprimable`), pad de signature en pointer events
  + devicePixelRatio.
- **P0 relevé** : article libre (« Autre meuble… »), **démontage par article**
  + « Tout démonter », volume unitaire ajustable (±0,1) — le démontage alimente
  directement le bloc « Démontage prévu » du contrat.

### Décisions d'architecture
- CGV VERSIONNÉES et `cgv_version` figée dans le contenu de l'instance : une
  offre signée rejoue SES CGV, jamais les dernières (C-02). Une version inconnue
  renvoie [] et non la dernière — un document visiblement incomplet vaut mieux
  qu'un document silencieusement faux.
- Le composant Contrat ne connaît QUE le contenu reçu : aperçu vivant avant
  envoi, contenu FIGÉ après. Le document rendu ne peut plus bouger — c'est ce
  qui nous distingue du modèle, qui réédite après signature.
- Identité de l'émetteur en base (0020) et non en constantes : le modèle avait
  IBAN/tél/mail EN DUR — impossible en multi-tenant (I-1).

### Fichiers
- SQL : `0020_organisation_params.sql`.
- Domaine : `documents/cgv.js`, `releve/volumetrie.js` (+articlesADemonter).
- Tests : `cgv.test.js` (4), `releve.test.js` (+2) → 141/141.
- Front : `ecrans/Contrat.jsx` (nouveau), `ecrans/Offre.jsx` (réécrit),
  `ecrans/Releve.jsx` (enrichi), `lib/adaptateur.js` (+obtenirOrganisation,
  composerOffre, signature ramenée sur l'instance), `index.html` (CSS print).
- Doc : `docs/modules/18-contrat-offre.md`.

### Prochain P0 (ordre de la synthèse)
n°2 création de mission à la confirmation ; n°3 calendrier mensuel ; n°4 camions.

---

## Session 20 — P0 n°2 (mission à la confirmation) et n°3 (calendrier)

### Livré
- **0021** : trigger `creer_missions_a_la_confirmation` — la signature crée la
  mission (et celle d'emballage si date). Colonnes `date_emballage`/
  `heure_emballage`. Idempotent + rattrapage de l'existant. Résout un TROU
  D'ARCHITECTURE : sans ce pont, le Planning restait vide à vie.
- **Domaine** : `grilleMois` (décalage lundi, densité, bissextiles),
  `missionsDuJour`. 5 tests → 146/146.
- **Planning.jsx** réécrit : calendrier mensuel avec pastilles + journée
  détaillée + affectation/conflits + lien vers le dossier.

### Décision d'architecture
Trigger plutôt que code dans la commande : la règle vaut pour TOUT chemin vers
« confirmé », y compris ceux qu'on écrira plus tard. Une commande future
pourrait oublier de créer la mission ; un trigger, non.

### Correction d'une erreur de ma cartographie
docs/alignement/01 disait « Dashprod n'a pas d'état en cours » : FAUX, l'enum
etat_affaire (0005) contient planifie/en_cours/clos. Corrigé dans la fiche 19.

---

## Session 21 — P0 n°4 : la flotte (camions)

### Livré
- Domaine `flotte/vehicules.js` (capacité, jauge 85/100 %, alertes via
  qualifierEcheance — une seule règle d'échéance RH/Flotte). 5 tests → 151/151.
- 0022 : `affaires.camions` (sélection commerciale) + trigger étendu qui
  REPORTE la sélection dans mission_vehicules à la confirmation (C-04).
- Écran Ressources (barre de nav) : onglet Camions complet (fiches, CT,
  assurance, état méca horodaté, alerte agrégée) + onglet Membres (invitations
  existantes, intégrées).
- Dossier : chips camions (alerte = rouge mais sélectionnable, C-20).
- Relevé : jauge volume/capacité réelle des camions sélectionnés.

### Incident réglé en session
Refactor d'Equipe.jsx (mode intégré) : premier remplacement Python trop
optimiste → fragment JSX non fermé, build cassé. Corrigé au motif exact ;
leçon réitérée : toujours rebuilder après un refactor scripté.

---

## Session 22 — Clôture de la vague P0 (n°5, 7, 8, 9)

### Livré
- **OGM** (facturation/ogm.js) : mod 97 belge, déterministe, +4 tests → 155/155.
- **FactureDoc.jsx** : facture imprimable (client, lignes, totaux, acompte/solde,
  IBAN + OGM, pied légal) — même mécanique print que le contrat.
- **Liste** : date de chantier en toutes lettres + tri métier (par date de
  chantier, sans-date en fin) + CORRECTION : les cartes réelles n'affichaient
  jamais de montant (tvac null) — jointure scénario retenu.
- **Devis** : Divers + Péages (le moteur les acceptait déjà !) + gating
  voir_prix sur coûts et marge (le domaine l'exigeait, l'écran l'ignorait).
- **Facture** : retour sur un dossier facturé retrouve la facture émise.

### Corrections de ma cartographie
- Marge € : déjà affichée (04 la disait manquante).
- diversEuros/peagesEuros : déjà dans le moteur (04 les croyait absents du
  domaine). La cartographie reste juste sur les ÉCRANS, trop pessimiste sur le
  domaine — biais à garder en tête pour la vague P1.

### État : LES 9 P0 DE LA SYNTHÈSE SONT CLOS.
Prochaine vague (P1, ordre proposé) : brief WhatsApp + itinéraire Maps (quick
wins), écran Mail, congés + métier terrain, matériel E/U/R, réduction devis.

---

## Session 23 — P1 quick wins : brief équipe & itinéraire

### Livré
- Domaine `communication/brief.js` : briefMission (format terrain exact du
  modèle : troncature 6 articles, démontage, blocs sans lignes vides),
  urlWhatsApp, urlItineraire (multi-arrêts ordonnés). 6 tests → 161/161.
- Adaptateur composerBrief : rassemble contact+relevé+camions+organisation,
  délègue le formatage au domaine (une implémentation, testée).
- Planning : boutons Copier (presse-papier + repli prompt) et WhatsApp par
  mission — LE geste quotidien : briefer l'équipe du lendemain en un tap.
- Dossier : bouton itinéraire Google Maps sous les adresses (zéro API).

### Prochains P1 : écran Mail, congés + métier terrain, matériel E/U/R.

---

## Session 24 — P1 : écran Mail

### Livré
- Domaine : emailOffre (salutation par nom de famille, segment signé
  conditionnel, horaire/forfait, validité, dates longues, signature depuis les
  paramètres organisation) + urlMailto. 3 tests → 164/164.
- Écran Mail : pièce jointe avec état (signée/non signée/à émettre) + lien
  impression PDF, en-tête À/Objet avec alerte si email client absent, corps
  scrollable, Copier + Ouvrir dans Mail.
- Dossier : chip ✉️ Mail (dès que chiffré).

### Prochains P1 : congés + métier terrain (nourrit les conflits planning),
matériel E/U/R, réduction devis.

---

## Session 25 — P1 : congés & métier terrain

### Livré
- 0023 : utilisateurs.metier + cmd_definir_metier (gardée — la RLS
  utilisateurs est SELECT-only par conception, toute écriture d'identité passe
  par une commande). Décision synthèse §4 actée : métier ≠ rôle d'accès.
- Adaptateur : listerConges (approuvés), ajouterConge (saisie direction,
  directement approuvé — le workflow terrain du Module 8 reste), supprimerConge,
  definirMetier ; listerMembresSimples expose le métier.
- Ressources → Membres : fiches dépliables (accès, métier 3 boutons, congés
  liste+ajout+suppression, badge N congés).
- Planning : congés branchés dans conflitsAffectation ; chips avec RAISON
  (« congé » vs « pris »), toujours sélectionnables (C-20).

### Incident évité
Premier câblage lisait verdict.raisons ; le contrat réel retourne
{enConge, doubleAffectation, conflit} — vérifié à la source, corrigé avant
livraison (un congé aurait été étiqueté « pris »).

---

## Session 27 — P1 : réduction au devis (% + motif)

### Découverte
Le moteur gérait DÉJÀ la remise, y compris (après un refactor du repo) sur le
forfait, et exposait reduction:{pct,motif}. Les 2 tests de réduction du domaine
étaient déjà présents (166/166). C'était PUREMENT de l'écran.

### Livré
- Devis : sélecteur de MOTIF (promo/dégâts) à côté du %, aperçu coloré.
- composerOffre : porte reduction dans le contenu figé.
- Contrat : « Réduction (promotion) −X % appliquée » dans le bloc prix — la
  réduction signée est scellée avec son motif (C-02).

### Note de vigilance
Au build, le compte de tests semblait « baisser » (169→166) : fausse alerte.
Le 169 comptait le module matériel ; après le merge congés (164) + les 2 tests
de réduction déjà présents = 166. Aucune perte. Vérifié via git diff et
relance ciblée avant de continuer.

---

## Session 28 — P1 : données de facturation client

### Livré
- Adaptateur : obtenirClientFacturation / sauverClientFacturation (liste
  blanche de colonnes). La table clients (0005) portait DÉJÀ societe, tva_num,
  fact_lignes/cp/ville/pays — encore un cas domaine-en-avance-sur-l'écran.
- Dossier : bloc « Facturation » dépliable (masqué par défaut, particulier ;
  ouvert pour une société → société, TVA, adresse de facturation).
- Facture : le rendu utilise les vraies données (société prime sur nom, TVA
  affichée, adresse de facturation structurée, repli déchargement).

### Note
28 modules construits. Prochains petits P1 : coût de trajet (km/durée/prix-km),
date+heure d'emballage sur le dossier. Puis gros chantiers : mode Terrain, PWA.

---

## Session 29 — P1 : coût de trajet & horaire d'emballage

### Livré
- 0025 : trajet_km/trajet_duree/trajet_prix_km (versant COÛT, distinct du km
  facturé au barème) + sécurisation date_emballage/heure_emballage (déjà en
  0021).
- Dossier : bloc coût de trajet sous l'itinéraire (Km/Durée/Prix-km + calcul
  live) ; bloc emballage (jour séparé) sous la date souhaitée — génère la 2e
  mission à la confirmation via le trigger 0021.
- obtenirContact/sauverContact étendus pour porter emballage + trajet.

### Petits P1 restants de la cartographie : tous fermés.
Reste les gros chantiers : mode Terrain (page 11), PWA. Et 4 décisions
ouvertes + prix du matériel d'emballage à trancher par Raphaël.

---

## Session 30 — Corrections devis/dossier + équipe sur le dossier

### Bug bloquant corrigé : le prix ne se sauvegardait pas
- obtenirAffaire relisait faits:null en réel (passait par listerAffaires) →
  requête directe relisant entrees du scénario retenu.
- enregistrerChiffrage faisait un INSERT → doublons de scénarios retenus →
  passé en UPSERT.
- Formule reflétée sur l'affaire ; affaire rechargée après enregistrement
  (montant/nom cohérents partout).

### Navigation devis
- « ← Dossiers » → « ← Dossier » (ramenait déjà au dossier, libellé trompeur).
- Lien Relevé redondant retiré : le dossier est le hub, un seul retour par écran.

### Le « + » ouvre directement le dossier
- creerDossierVide() + route directe vers Dossier. Écran NouvelleAffaire
  supprimé. Bloc identité client (nom/tel/email) éditable en tête du dossier.

### Équipe sur le dossier (comme les camions)
- 0026 : affaires.equipe jsonb, reportée dans mission_affectations à la
  confirmation par le trigger (symétrie exacte avec les camions).
- Dossier : bloc Équipe avec chips de membres.

### Prochain : app terrain.

---

## Session 31 — App terrain

### Livré
- Adaptateur terrain : mesMissionsTerrain (missions enrichies SANS prix),
  chronoDemarrer/chronoArreter (cmd_chrono_*), signalerSouci, creerDossierTerrain
  (→ brouillon), validerDossierTerrain (brouillon → devis).
- Terrain.jsx : « Mes chantiers » + fiche chantier repliable (chrono sessions
  serveur, itinéraire, équipe/camions, à démonter, remarques, brief WhatsApp).
- TerrainOutils.jsx : création rapide + signalement véhicule.
- main.jsx : routage terrain — un profil sans capacité bureau reçoit AppTerrain
  (coquille dédiée, barre Chantiers/Outils/Compte), cloisonnement RÉEL (RLS).
- Dossier + Liste : validation des dossiers terrain (bandeau + badge « à valider »).

### Le domaine était prêt
chrono.js, missionsDuMembre, cmd_chrono_*, signaler_materiel, machine à états
brouillon : tout préexistait. L'app terrain était de l'assemblage, pas de la
logique nouvelle — d'où 169/169 inchangés.

### Reste : devis terrain complet (canQuote), PWA.

---

## Session 32 — Corrections bloquantes + bloc Dossier (lot 1)

### Bugs bloquants corrigés
- **Signature impossible** ('Instance figée : modification interdite C-02') :
  le trigger bloquer_instance_gelee (0007) interdisait TOUT update d'une
  instance gelée, y compris le passage envoyee→signee de la signature elle-même.
  Migration 0027 : autorise la seule transition de scellement (contenu et
  empreinte inchangés), l'immuabilité reste intacte pour tout le reste.
- **Validation terrain KO** : validerDossierTerrain envoyait p_vers au lieu de
  p_cible ET sans le contexte requis par la garde (aReleve/aMontant). Corrigé.

### Bloc Dossier
- 0028 : affaire_adresses + code_postal/ville ; affaires + date_visite/heure_visite.
  (escalier existait déjà en base depuis 0005.)
- Adresses : rue + code postal + ville en champs séparés + case Escalier
  (en plus d'ascenseur et monte-meubles).
- Date de visite préalable ajoutée au dossier.
- Itinéraire : part TOUJOURS du dépôt Roovers (Rue de l'Avenir 9, 1370 Jodoigne)
  et y revient — dépôt → chantiers → dépôt. Km lu dans Maps = trajet réel
  aller-retour. Compose rue+CP+ville. Tests d'itinéraire mis à jour (170/170).

---

## Session 33 — Onglet Heures

### Livré
- Domaine : heuresParMembre (réparti sur les affectés), heuresGlobales (temps
  chantier compté une fois). 2 tests → 178/178.
- Heures.jsx : onglet de Ressources, vue Par membre (classement + barres) et
  vue Global (total terrain).
- Adaptateur : missionsAvecChrono.

### Bilan de la longue liste fondateur : TOUT traité.
Dossier (visite/escalier/CP-ville/dépôt Roovers), relevé épuré, MO auto,
signature déblocée (0027), validation corrigée, config prix, ressources
(carte carburant/invitation mail/équipement), app terrain (contact/relevé/
matériel + chrono pause), onglet Heures. Facture "pas encore disponible" +
comptabilité = chantier futur documenté (non demandé maintenant).
