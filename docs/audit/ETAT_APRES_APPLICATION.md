# ÉTAT APRÈS APPLICATION — 19 juillet 2026, 17h36

Migrations appliquées sur `usldgiordguqchclvdms` et enregistrées dans l'historique :

| Migration | Contenu |
|---|---|
| `0038_corrections_securite` | Vues, Storage, policies manquantes, search_path |
| `0038b_revoke_public_rpc` | Correctif : le REVOKE passait par `PUBLIC`, pas `anon` |
| `0038c_verrouiller_fonctions_internes` | 11 fonctions internes fermées, dont `transition_interne` |

À ajouter dans `supabase/migrations/` pour que le dépôt corresponde à la base
(fichiers fournis dans `migrations/`).

---

## Avant / après

| Contrôle | Avant | Après |
|---|---|---|
| Vues en `security_invoker` | 0 | **3** |
| Fuite `v_ca_signe` vue par un tenant tiers | 1 ligne (CA 29 566,35 €) | **0** |
| Fuite `v_charge_membre` | 5 lignes (effectif nominatif + heures) | **0** |
| Bucket `documents` public | `true` | **`false`** |
| Policies Storage | 2 (sans filtre org) | **4 (isolées par `org/{org_id}/`)** |
| Tables RLS activée / 0 policy | 4 | **0** |
| Fonctions `SECURITY DEFINER` ouvertes à `anon` | 35 | **0** |
| `transition_interne` appelable par `authenticated` | oui | **non** |
| `search_path` mutable | 2 | **0** |

## Non-régression vérifiée

Sous un jeton Roovers réel :

| Table | Lignes |
|---|---|
| `clients` | 16 |
| `affaires` | 16 |
| `vehicules` | 8 |
| `missions` | 7 |
| `utilisateurs` | 5 |
| `referentiels` | 4 |
| `capacites` | 11 *(était inaccessible avant)* |
| `sequences` | 1 *(était inaccessible avant)* |
| `sous_traitants` | 2 *(était inaccessible avant)* |

- Écriture testée (`insert into clients`, transaction annulée) : **passe**, triggers inclus.
- `hook_ajouter_claims` toujours exécutable par `supabase_auth_admin` : **la connexion fonctionne**.
- Les 24 `cmd_*` restent exécutables par `authenticated` : **l'application fonctionne**.

Le linter Supabase ne signale plus ni `security_definer_view`, ni
`rls_enabled_no_policy`, ni `public_bucket_allows_listing`, ni
`function_search_path_mutable`, ni `anon_security_definer_function_executable`.

---

## Conséquence à connaître

Le bucket est privé et impose le chemin `org/{org_id}/…`. Le frontend **déployé**
utilise encore `getPublicUrl` sur un chemin racine.

- Lecture des CGV : renvoyait déjà `null` (bucket vide) → **aucun changement visible**.
- **Dépôt d'un PDF de CGV : échouera** tant que `corrections_frontend.patch` n'est pas déployé.

C'est le seul effet de bord, et il est volontaire : un échec visible vaut mieux qu'un
document contractuel en accès public.

---

## Ce qui reste, et pourquoi je ne l'ai pas fait

| Item | Raison |
|---|---|
| Déployer `corrections_frontend.patch` | Je n'ai pas d'accès en écriture à ton dépôt GitHub ni à ton compte Vercel. Le patch est prêt et validé (182 tests, build OK). |
| Protection mots de passe compromis | Réglage du dashboard Auth (Authentication → Passwords → HaveIBeenPwned). Aucune API dans mes outils. |
| Dépôt GitHub en privé | Réglage GitHub, hors de ma portée. **C'est ce qui expose encore ton IBAN.** |
| Déplacer `citext` hors de `public` | `utilisateurs.email` est de type `citext`. À tester en branche, pas en production à chaud. |
| `creer_organisation()` | Nécessite de valider la clé de rôle produite par `provisionner_roles_standard` et les types de `sequences` — vérifiable en branche. |
| `pg_dump` de sauvegarde | Pas d'accès à un poste avec les identifiants de connexion directe. |

---

## Suite immédiate

1. `git apply corrections_frontend.patch` → `npm test` → déployer
2. Ajouter `0038b` et `0038c` dans `supabase/migrations/`
3. Dépôt GitHub en privé
4. Activer la protection des mots de passe compromis
5. `supabase db pull` → migration de référence, pour rendre la base reproductible
6. Puis `creer_organisation()` et le protocole ORG_B de `MULTI_TENANT.md` §7

Sur les 5 critères de « prêt » de `PRODUCTION_CHECKLIST.md`, le critère 1
(« une organisation fictive ne lit rien ») est désormais **atteint et prouvé**.
