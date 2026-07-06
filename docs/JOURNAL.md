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
