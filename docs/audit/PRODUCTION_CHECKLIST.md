# PRODUCTION_CHECKLIST — Dashprod ERP
**État au 19 juillet 2026** · commit `0fdad9b`

Légende : ✅ vérifié · ⚠️ partiel · ❌ bloquant · 🔍 non vérifiable d'ici

---

## Bloquants — rien ne se verrouille avant

| # | Item | État | Preuve / action |
|---|---|---|---|
| 1 | Aucune fuite inter-tenant | ❌ | 3 vues `SECURITY DEFINER` livrent le CA et l'effectif de Roovers à une organisation fictive. Section 1 de `0038_corrections_securite.sql`. |
| 2 | Documents privés protégés | ❌ | Bucket `documents` public, policy SELECT sans filtre d'organisation. Section 2. |
| 3 | Aucune donnée Roovers hors de son tenant | ❌ | `ORG_DEMO` + fallback PDF + nom d'organisation en dur dans l'invitation. |
| 4 | Aucun secret exposé | ❌ | IBAN, e-mail et téléphone personnels dans un dépôt **public**. Passer le dépôt en privé. |
| 5 | Aucun faux succès UI | ❌ | Mode démo `localStorage` activable par simple absence de variable d'environnement. |
| 6 | Build production reproductible | ❌ | Le repo ne peut pas reconstruire la base : 0001→0032 hors historique, 10 migrations en base absentes de Git. |
| 7 | Création d'organisation validée | ❌ | `creer_organisation()` n'existe pas. |
| 8 | Isolation testée avec 2 organisations | ❌ | Une seule organisation existe. Protocole dans `MULTI_TENANT.md` §7. |

---

## Socle technique

| Item | État | Détail |
|---|---|---|
| Authentification | ✅ | Google OAuth fonctionnel, connexions réelles observées le 19/07/2026 |
| Custom Access Token Hook | ✅ | `hook_ajouter_claims` — `"Hook ran successfully"` sur `/callback` et `/token` |
| `org_id` non falsifiable par le client | ✅ | Injecté serveur ; `authenticated` n'a pas `EXECUTE` sur le hook |
| RLS activée sur toutes les tables | ✅ | 37/37 |
| Isolation en lecture sur les tables | ✅ | Organisation fictive → 0 ligne partout ; témoin → 16/16/8 |
| Fonctions `cmd_*` sécurisées | ✅ | 23/24 contrôlent `jwt_org()`, 24/24 ont un `search_path` figé |
| `service_role` absente du frontend | ✅ | Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont lues |
| Policies sur toutes les tables | ❌ | 4 tables : RLS activée, 0 policy |
| RPC fermées à `anon` | ❌ | ~30 fonctions exécutables sans authentification |
| Mots de passe compromis bloqués | ❌ | HaveIBeenPwned désactivé |
| Isolation en écriture | 🔍 | Analyse statique favorable, exécution non testée |

---

## Fonctionnel

| Module | État | Détail |
|---|---|---|
| CRM / clients | ✅ | 16 clients réels |
| Devis / offre | ✅ | 16 affaires réelles |
| Planning / missions | ✅ | 6 missions |
| Flotte | ✅ | 8 véhicules |
| RH / équipe | ✅ | 5 utilisateurs |
| Chrono chantier | ⚠️ | Câblé via RPC, non exercé en réel |
| PDF | ⚠️ | Fonctionne, mais fallback « Déménagements Roovers » |
| **Facturation** | 🔍 | **0 facture jamais créée.** Numérotation jamais exercée. |
| **Paiements** | 🔍 | Jamais exercés |
| **E-mail / invitation** | ❌ | Edge Function `inviter-membre` **inexistante** — une seule fonction déployée, `swift-action` |
| Stocks | ❌ | Schéma présent, aucune interface |
| RGPD (écrans) | ❌ | Tables et RPC présentes, aucune interface |
| Mollie | ❌ | Absent partout |
| Peppol | ❌ | Absent partout |
| Carte / itinéraires | ❌ | Seuls des champs `trajetKm` existent |

---

## Exploitation

| Item | État | Action |
|---|---|---|
| Sauvegardes | 🔍 | Vérifier le plan Supabase et la rétention. **Faire un `pg_dump` avant toute correction.** |
| Restauration testée | ❌ | Jamais testée |
| Monitoring / alertes | ❌ | Aucun |
| Domaine propre | ❌ | `*.vercel.app` uniquement |
| Historique de déploiement | 🔍 | `403` — reconnecter le connecteur Vercel |
| Variables d'environnement Vercel | 🔍 | `403` — non auditables |
| MFA (Supabase / Vercel / GitHub) | 🔍 | À activer |
| Dépôt privé | ❌ | Public |
| Tests d'isolation en CI | ❌ | Aucun |
| Tests métier | ✅ | 181/181 — mais couvrent uniquement `packages/domaine`, zéro test sur l'adaptateur, la RLS ou le multi-tenant |

---

## Séquence recommandée

**Soirée 1 — le plus gros du risque, pour le moins d'effort**
1. `pg_dump` de sauvegarde
2. Dépôt GitHub en privé
3. Section 1 de la migration (vues) — 3 lignes
4. Purge de `ORG_DEMO` et du fallback PDF

**Soirée 2**
5. Frontend : `createSignedUrl` à la place de `getPublicUrl`
6. Section 2 de la migration (Storage) — pendant que le bucket est vide
7. Mode démo sous drapeau explicite `VITE_MODE_DEMO`

**Semaine 1**
8. `supabase db pull` → `0038_baseline.sql` committée
9. Sections 3, 4 et 5 de la migration
10. `git rm -r --cached node_modules apps/web/dist`
11. Edge Function `inviter-membre`, versionnée dans `supabase/functions/`

**Semaine 2**
12. `creer_organisation()` + écran d'onboarding
13. Protocole d'isolation complet avec ORG_B
14. Automatisation des tests d'isolation en CI

**Avant le premier euro facturé**
15. Créer une vraie facture de bout en bout et vérifier la numérotation
16. Domaine propre + monitoring
17. DPA type pour les entreprises clientes
18. Restauration de sauvegarde testée une fois

---

## Définition de « prêt »

Dashprod sera prêt quand ces cinq phrases seront vraies **et prouvées** :

1. Une organisation fictive ne lit **rien**, ni par les tables, ni par les vues, ni par le Storage.
2. Une organisation créée de zéro ne contient **aucune** donnée, et son premier devis
   porte **son** nom.
3. Le dépôt Git seul permet de reconstruire une base Dashprod identique.
4. Aucune variable d'environnement manquante ne peut produire une application
   apparemment fonctionnelle.
5. Une facture a été émise, numérotée, payée et retrouvée en historique — en vrai.

Aujourd'hui : **0 sur 5.**
Les points 1, 2 et 4 se règlent en deux soirées. Le 3 en une journée. Le 5 dépend de toi.
