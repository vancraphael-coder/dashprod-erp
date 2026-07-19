# AUDIT_REAL — Dashprod ERP
**Date :** 19 juillet 2026
**Commit audité :** `0fdad9b5a465e325b5df9b483d901d111b7b9579` (« ajout jspdf »), branche `main`
**Supabase :** projet `usldgiordguqchclvdms` — PostgreSQL 17.6, région eu-central-1
**Vercel :** projet `dashprod-erp` (`prj_RP35Cp5FmoCfrWAPF1YPglv9oXlX`), scope `vancraphael-coders-projects`

> Méthode : aucune écriture n'a été faite en base. Toutes les lectures SQL, les tests
> d'isolation et les lectures de logs sont reproductibles. Chaque verdict porte sa preuve.
> Ce qui n'a pas pu être prouvé est marqué `NOT_VERIFIED` ou `INACCESSIBLE`, jamais « fonctionnel ».

---

## 0. Synthèse exécutable

| # | Constat | Gravité | Prouvé |
|---|---|---|---|
| 1 | Fuite inter-tenant **active** via 3 vues `SECURITY DEFINER` | **CRITICAL** | Oui — données extraites |
| 2 | Bucket `documents` public + policy SELECT sans filtre d'organisation | **CRITICAL** | Oui |
| 3 | Identité Roovers (IBAN, e-mail, téléphone, BCE) en dur dans un **dépôt public** | **CRITICAL** | Oui |
| 4 | Mode « démo » localStorage activable silencieusement en production | **CRITICAL** | Oui (code) |
| 5 | Le repo Git ne peut pas reconstruire la base actuelle | **HIGH** | Oui |
| 6 | `sous_traitants` hors du modèle multi-tenant | **HIGH** | Oui |
| 7 | Edge Function `inviter-membre` inexistante → aucun e-mail d'invitation | **HIGH** | Oui |
| 8 | 4 tables RLS activée / 0 policy | MEDIUM | Oui |
| 9 | ~30 RPC `SECURITY DEFINER` exécutables par `anon` | MEDIUM | Oui |
| 10 | Historique de déploiement Vercel + variables d'env | — | `INACCESSIBLE` |

**Ce qui va bien, et qui est solide :** le modèle de tenancy lui-même. Il est correct,
et le test d'isolation sur les tables le prouve. Le problème n'est pas l'architecture,
ce sont quatre trous précis autour d'elle.

---

## 1. PHASE A — Inventaire réel du repository

### 1.1 Nature réelle de la stack

Le document de mission supposait « React / Next.js » et « TypeScript ». **C'est faux.**
L'état réel :

| Élément | Hypothèse | Réalité vérifiée |
|---|---|---|
| Framework | Next.js | **Vite 5 + React 18, SPA pure** |
| Langage | TypeScript | **JavaScript** (`.js` / `.jsx`), zéro TS |
| Routage | Next router | **Aucune librairie** — état local dans `main.jsx` |
| Cache serveur | TanStack Query | **Absent** |
| API routes / Server Actions / middleware | supposés | **Aucun — il n'existe aucun code serveur** |
| Rendu | SSR | 100 % client (`vercel.json` : rewrite `/(.*)` → `/index.html`) |

**Conséquence structurante, et c'est la plus importante du document :**
Dashprod n'a **aucun backend applicatif**. Le navigateur parle directement à Supabase
avec la clé `anon`. Il n'existe aucun endroit où cacher une règle, filtrer une donnée
ou valider une permission autrement que dans PostgreSQL.

> **Toute la sécurité du produit repose sur la RLS et sur les fonctions `cmd_*`. Rien d'autre.**
> Le §6 du document de mission (« protection des routes / API / server actions ») est sans
> objet : ces couches n'existent pas. Ce n'est pas un défaut — c'est un choix qui tient,
> à condition que la base soit irréprochable.

### 1.2 Arborescence (monorepo npm workspaces)

```
dashprod-erp/
├── apps/web/               Vite + React — 23 écrans, 5 091 lignes
│   └── src/lib/
│       ├── adaptateur.js   1 829 lignes — 84 fonctions — SEULE couche d'accès données
│       ├── supabase.js     70 lignes — client + OAuth Google
│       ├── pdfOffre.js     165 lignes — génération PDF (jsPDF)
│       └── theme.jsx       167 lignes
├── packages/domaine/       Logique métier pure — 19 fichiers de test
├── supabase/migrations/    37 fichiers SQL
├── supabase/seed/          2 fichiers
└── docs/                   47 documents (modules, ADR, alignement)
```

### 1.3 Dépendances

Runtime, quatre seulement : `@supabase/supabase-js ^2.45.0`, `jspdf ^4.2.1`,
`react ^18.3.1`, `react-dom ^18.3.1`. Build : `vite ^5.4.11`, `@vitejs/plugin-react ^4.3.4`.

C'est remarquablement sobre. Aucune dépendance inutile, aucune dépendance exposant un secret.
**Verdict : SAIN.**

### 1.4 Hygiène du dépôt — problèmes réels

| Constat | Détail | Impact |
|---|---|---|
| **`node_modules` versionné** | 2 787 fichiers suivis sur 2 966 (94 %) | Le `.gitignore` liste bien `node_modules/`, mais les fichiers ont été committés **avant** et n'ont jamais été retirés de l'index. Le dépôt est illisible et lourd. |
| **`apps/web/dist` versionné** | 3 fichiers de build | Même cause. Un build obsolète traîne dans Git. |
| **`apps/web/APPS-WEB-package.json`** | Copie exacte de `package.json` | Fichier mort. |
| **Aucun `.env.example`** | Le `.gitignore` prévoit `!.env.example`, il n'existe pas | Rien ne documente les variables nécessaires. Bloquant pour un nouveau déploiement. |
| **Aucune source d'Edge Function** | `supabase/functions/` n'existe pas | Le code des fonctions déployées n'est pas versionné. |

Correction : `git rm -r --cached node_modules apps/web/dist apps/web/APPS-WEB-package.json`

### 1.5 Mock / démo / données simulées (§3.3 du document de mission)

| Fichier | Ligne | Nature | Verdict |
|---|---|---|---|
| `adaptateur.js` | 17–71 | Magasin `localStorage` (`dashprod-demo-v1`) + jeu de données `DEMO_INITIAL` (2 clients, 2 affaires, 3 missions fictifs) | **CRITICAL — voir §1.6** |
| `adaptateur.js` | 749–754 | `ORG_DEMO` : identité Roovers complète en dur | **CRITICAL — voir §5** |
| `adaptateur.js` | 288 | `organisation: "Déménagements Roovers"` en dur dans le corps de l'invitation | **CRITICAL** |
| `adaptateur.js` | 347, 352 | ID de modèles `"cbd-demo"`, `` `${type}-demo` `` | MEDIUM |
| `adaptateur.js` | 442 | `MEMBRES_DEMO` | MEDIUM |
| `pdfOffre.js` | 56 | `org.nom \|\| "Déménagements Roovers"` | **CRITICAL — voir §5** |
| `theme.jsx` | 22–24 | Identifiant DOM `polices-roovers` | Cosmétique |
| `pdfOffre.js` | 164 | `setTimeout` de `revokeObjectURL` | Légitime |
| Écrans | divers | `setTimeout` de feedback UI | Légitime |

### 1.6 Le mode démo — CRITICAL

```js
export function modeDonnees() {
  return configPresente ? "reel" : "demo";
}
```

`configPresente` vaut vrai si et seulement si `VITE_SUPABASE_URL` **et**
`VITE_SUPABASE_ANON_KEY` sont présentes **au moment du build**. Vite fige ces valeurs
dans le bundle : un déploiement est donc **définitivement** réel ou **définitivement** démo.

Si une de ces variables manque, disparaît ou est mal orthographiée lors d'un futur déploiement :
l'application **ne plante pas**. Elle sert un ERP intégralement fonctionnel en apparence,
avec des clients fictifs, alimenté par le `localStorage` du navigateur. Un client payant
peut y saisir une journée de travail réelle et tout perdre au premier vidage de cache,
sans qu'aucun message n'apparaisse.

C'est exactement le « faux succès UI » que le §19 du document de mission classe CRITICAL.

**État actuel : le déploiement de production est bien en mode réel.** Prouvé par les logs
d'authentification Supabase (connexions Google réelles depuis
`dashprod-erp-vancraphael-coders-projects.vercel.app`, le 19/07/2026). Le risque est
donc *futur*, pas actuel — mais il est armé.

**Correction obligatoire :** en build de production, l'absence de configuration Supabase
doit faire **échouer le build**, jamais basculer en démo. Le mode démo doit être
conditionné à un drapeau explicite (`VITE_MODE_DEMO=1`), jamais à l'absence d'une variable.

---

## 2. PHASE B — Matrice de câblage réelle

Chemin réel unique : `écran (.jsx)` → `adaptateur.js` → `supabase-js` → PostgREST → table + RLS.
Aucun hook custom, aucun service, aucune couche intermédiaire.

### 2.1 Tables réellement touchées par le frontend

| Table | Appels | Opérations | Statut |
|---|---|---|---|
| `affaires` | 23 | select/insert/update | FULLY_CONNECTED |
| `vehicules` | 8 | select/insert/update/delete | FULLY_CONNECTED |
| `organisations` | 7 | select/update | FULLY_CONNECTED |
| `clients` | 5 | select/insert/update | FULLY_CONNECTED |
| `factures` | 4 | select/insert | PARTIALLY_CONNECTED (0 ligne en base) |
| `affaire_adresses` | 4 | select/insert/update | FULLY_CONNECTED |
| `utilisateurs` | 3 | select/update | FULLY_CONNECTED |
| `utilisateur_capacites` | 3 | select/insert/delete | FULLY_CONNECTED |
| `scenarios` | 3 | select/insert | FULLY_CONNECTED |
| `missions` | 3 | select/update | FULLY_CONNECTED |
| `mission_vehicules` | 3 | select/insert/delete | FULLY_CONNECTED |
| `equipements_rh` | 3 | select/insert/update | FULLY_CONNECTED |
| `conges` | 3 | select/insert/update | FULLY_CONNECTED |
| `vehicule_signalements` | 2 | select/insert | FULLY_CONNECTED |
| `paiements` | 1 | insert | PARTIALLY_CONNECTED |
| `mission_affectations` | 1 | select | PARTIALLY_CONNECTED (écriture via RPC) |
| `facture_lignes` | 1 | insert | PARTIALLY_CONNECTED |
| `donnees_paie` | 1 | select | PARTIALLY_CONNECTED |
| `documents_instances` | 1 | select | PARTIALLY_CONNECTED (écriture via RPC) |

### 2.2 Tables présentes en base mais jamais atteintes par l'interface

`sous_traitants`, `stock_articles`, `stock_mouvements`, `signatures`, `sequences`, `roles`,
`registre_traitements`, `referentiels`, `incidents_securite`, `evenements`, `demandes_rgpd`,
`consentements`, `chrono_sessions`, `capacites`, `role_capacites`, `utilisateur_roles`,
`documents_modele_versions`, `documents_rh`

Certaines sont écrites indirectement par les `cmd_*` (`chrono_sessions`, `signatures`,
`evenements`, `documents_instances`). Les autres sont **BACKEND_ONLY** : le schéma existe,
l'interface ne l'expose pas. Ce n'est pas une erreur — c'est un état à connaître avant de
verrouiller.

### 2.3 RPC appelées depuis l'interface

21 fonctions `cmd_*` + `mon_profil`. Toutes existent en base. **Aucun appel orphelin.**

### 2.4 Écrans contournant l'adaptateur

`Connexion.jsx`, `Diagnostic.jsx`, `NonInvite.jsx` → légitime (authentification, diagnostic).
`TerrainProfil.jsx` → **entorse réelle** au pattern documenté « les écrans ne parlent jamais
directement à Supabase ». À corriger pour rester cohérent.

### 2.5 Verdict par module

| Module | UI | Adaptateur | Base | RLS | Multi-tenant | Testé réel | **Verdict** |
|---|---|---|---|---|---|---|---|
| CRM / Clients | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY_AFTER_FIX** |
| Devis / Offre | ✅ | ✅ | ✅ | ✅ | ✅ | partiel | **READY_AFTER_FIX** |
| PDF (jsPDF) | ✅ | ✅ | — | — | ⚠️ fallback Roovers | non | **BROKEN** (§5) |
| Planning / Missions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY_AFTER_FIX** |
| Chantier / Chrono | ✅ | ✅ | ✅ | ✅ | ✅ | partiel | **READY_AFTER_FIX** |
| Facturation | ✅ | ✅ | ✅ | ✅ | ✅ | **0 facture existante** | **NOT_VERIFIED** |
| Paiements | ✅ | ✅ | ✅ | ✅ | ✅ | non | **NOT_VERIFIED** |
| **E-mail / invitation** | ✅ | ✅ | ✅ | — | — | — | **BROKEN** (§4) |
| RH / Équipe | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY_AFTER_FIX** |
| Flotte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY_AFTER_FIX** |
| Documents / Storage | ✅ | ✅ | ✅ | ❌ | ❌ | — | **BROKEN** (§6) |
| Stocks | ❌ | ❌ | ✅ | ✅ | ✅ | — | **NOT_CONNECTED** |
| Sous-traitants | ❌ | ❌ | ✅ | ⚠️ | ❌ | — | **NOT_CONNECTED + CRITICAL** |
| RGPD / Conformité | ❌ | ❌ | ✅ | partiel | ✅ | — | **NOT_CONNECTED** |
| Mollie | — | — | — | — | — | — | **ABSENT** |
| Peppol | — | — | — | — | — | — | **ABSENT** |
| Carte / itinéraires | — | champs `trajetKm` seulement | — | — | — | — | **ABSENT** |

Mollie et Peppol, listés comme « potentiellement intégrés » dans le document de mission,
**n'existent nulle part** : ni dépendance, ni code, ni table, ni Edge Function.

---

## 3. PHASE C — Base de données

### 3.1 Vue d'ensemble

37 tables dans `public`. **RLS activée sur les 37.** 32 portent `org_id`.

Les 5 sans `org_id` :

| Table | Policies | Analyse |
|---|---|---|
| `organisations` | 1 (`id = jwt_org()`) | Correct — c'est la table tenant |
| `utilisateur_roles` | 1 (jointure vers `utilisateurs.org_id`) | Correct — isolation indirecte |
| `capacites` | **0** | Référentiel global. Lisible seulement via `SECURITY DEFINER`. |
| `role_capacites` | **0** | Idem |
| `sous_traitants` | **0** | Registre RGPD des sous-traitants (`nom`, `role`, `pays_traitement`, `garanties`, `contrat_reference`). **Pas des sous-traitants déménageurs** — ce sont tes propres sous-traitants au sens RGPD. Absence de `org_id` défendable **si** le registre est celui de l'éditeur ; à trancher (voir `MULTI_TENANT.md` §6). Dans tous les cas, **0 policy = table inaccessible**. |

### 3.2 Le modèle de tenancy — VÉRIFIÉ ET SOLIDE

```sql
-- 21 tables : policy ALL, USING et WITH CHECK
(org_id = jwt_org())
```

```sql
CREATE FUNCTION public.jwt_org() RETURNS uuid LANGUAGE sql STABLE AS $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id','')::uuid;
$$;
```

Le claim `org_id` est injecté **côté serveur** par un Custom Access Token Hook :

```sql
CREATE FUNCTION public.hook_ajouter_claims(event jsonb) ... SECURITY DEFINER
  -- lit utilisateurs.org_id à partir de event->>'user_id', puis
  -- jsonb_set(claims, '{org_id}', ...) et '{roles}'
```

Vérifications :
- `supabase_auth_admin` a `EXECUTE` sur le hook → **oui**
- `authenticated` a `EXECUTE` sur le hook → **non** (impossible à forger)
- Le hook **tourne réellement en production** → **prouvé par les logs d'authentification** :
  `"hook":"pg-functions://postgres/public/hook_ajouter_claims","msg":"Hook ran successfully","success":true`
  sur `/callback` (connexion) et `/token` (rafraîchissement), le 19/07/2026.

**Le §7 du document de mission — « ne jamais faire confiance à un `organization_id` envoyé
par le frontend » — est respecté.** Le front ne peut pas influencer `org_id`.

### 3.3 Test d'isolation exécuté (§13)

Méthode : `set_config('request.jwt.claims', ...)` + `set local role authenticated`,
dans une transaction annulée. Aucune écriture.

**Test 1 — organisation fictive `11111111-1111-1111-1111-111111111111` :**

| Table | Lignes vues | Attendu |
|---|---|---|
| `clients` | **0** | 0 ✅ |
| `affaires` | **0** | 0 ✅ |
| `utilisateurs` | **0** | 0 ✅ |
| `vehicules` | **0** | 0 ✅ |
| `documents_instances` | **0** | 0 ✅ |
| `organisations` | **0** | 0 ✅ |

**Test 2 — témoin, organisation réelle `5de63170-…` :**

| Table | Lignes vues | Attendu |
|---|---|---|
| `clients` | **16** | 16 ✅ |
| `affaires` | **16** | 16 ✅ |
| `vehicules` | **8** | 8 ✅ |

La RLS discrimine réellement — elle ne bloque pas tout par accident. **Isolation des tables : VALIDÉE.**

### 3.4 CRITICAL — fuite inter-tenant prouvée par les vues

Trois vues sont `SECURITY DEFINER` : `v_ca_signe`, `v_charge_membre`, `v_factures_solde`.
Elles s'exécutent avec les droits de leur créateur et **court-circuitent la RLS**.

**Test 3 — la même organisation fictive lit les vues :**

| Vue | Lignes vues | Attendu |
|---|---|---|
| `v_ca_signe` | **1** | 0 ❌ |
| `v_charge_membre` | **5** | 0 ❌ |
| `v_factures_solde` | 0 | 0 (aucune facture en base — fuitera dès la première) |

Contenu réellement extrait par un utilisateur d'une organisation **qui n'existe pas** :

```json
{"org_id":"5de63170-…","nb_affaires":21,"ca_signe_centimes":2956635}
{"org_id":"5de63170-…","utilisateur_id":"…","nom":"<employé>","nb_missions":5,"heures":157}
… 4 autres employés avec nom, nombre de missions et heures travaillées
```

Soit : **le chiffre d'affaires signé de Roovers (29 566,35 €) et l'intégralité de son
effectif nominatif avec les heures prestées**, accessibles depuis n'importe quel autre tenant.

Ce n'est pas un risque théorique. C'est une fuite active, reproductible, et elle porte
sur des données de salariés — donc sur du RGPD, pas seulement du commercial.

**Correction :** `ALTER VIEW … SET (security_invoker = on);` sur les trois vues.
PostgreSQL 17 le supporte nativement. Voir `MIGRATION_CORRECTIONS.sql`.

### 3.5 Fonctions `cmd_*` — solides

24 fonctions `cmd_*` en `SECURITY DEFINER`. Analyse statique :

- **23/24 vérifient `jwt_org()`** ✅
- **24/24 ont un `search_path` figé** ✅
- 18/24 vérifient en plus une capacité via `acteur_a_capacite()` ✅

La seule sans contrôle d'organisation est `cmd_reclamer_invitation()` — **et c'est correct
par construction** : c'est la porte d'entrée d'un invité qui n'a pas encore de claim.
Son garde-fou : elle exige une ligne `utilisateurs` préexistante avec le même e-mail et
`auth_id is null`, créée par `cmd_inviter_utilisateur` (qui, elle, contrôle org + capacité).

Deux faiblesses à durcir :
1. Elle ne vérifie pas que l'e-mail du jeton est **vérifié**. Avec Google OAuth, il l'est.
   Si tu actives un jour l'inscription e-mail/mot de passe sans confirmation obligatoire,
   quelqu'un peut s'inscrire avec l'adresse d'un invité et récupérer sa place.
2. **Les invitations n'expirent jamais.** Une invitation créée il y a deux ans reste réclamable.

### 3.6 Fonctions à `search_path` mutable (WARN)

`refuser_mutation`, `touch_updated_at`, `sequence_suivante`, `emettre_evenement`, `jwt_org`,
`transition_permise`, `bloquer_update_etat`, `bloquer_facture_emise`, `bloquer_instance_gelee`.

Risque réel faible (aucune n'est `SECURITY DEFINER`), mais c'est du durcissement gratuit.

### 3.7 Tables RLS activée / 0 policy

`capacites`, `role_capacites`, `sequences`, `registre_traitements`.

Elles sont donc **totalement inaccessibles** en lecture directe depuis l'application.
Conséquences :
- `capacites` / `role_capacites` : atteintes uniquement via `acteur_a_capacite()` et
  `mon_profil()`, toutes deux `SECURITY DEFINER`. **Fonctionne, mais par accident** —
  tout futur écran d'administration des rôles échouera silencieusement.
- `sequences` : `sequence_suivante()` est **`SECURITY INVOKER`** et écrit dans `sequences`.
  Appelée directement par un utilisateur authentifié, elle **échouera** (`42501`).
  Elle ne fonctionne aujourd'hui que parce qu'elle est appelée depuis `cmd_emettre_facture`
  (`SECURITY DEFINER`). Fragile. Aucune facture n'existant en base, **la numérotation
  n'a jamais été exercée en réel : `NOT_VERIFIED`.**
- `registre_traitements` : registre RGPD inaccessible. Obligation légale non outillée.

### 3.8 RPC exposées à `anon`

Une trentaine de fonctions `SECURITY DEFINER` sont exécutables par le rôle `anon`,
donc appelables **sans être connecté**, via `/rest/v1/rpc/<nom>` :
`cmd_emettre_facture`, `cmd_affecter_role`, `cmd_inviter_utilisateur`,
`cmd_anonymiser_client`, `cmd_publier_referentiel`…

Sans jeton, `jwt_org()` renvoie `NULL` et les contrôles internes échouent — l'impact réel
est donc probablement nul. Mais c'est une surface d'attaque **gratuite** : elle ne sert à
rien et elle expose la liste complète de tes commandes métier à l'internet.

`REVOKE EXECUTE … FROM anon` sur toutes, sauf celles qui doivent l'être.

### 3.9 Migrations — le repo ne peut pas reconstruire la base

| Source | Contenu |
|---|---|
| Repo Git | 37 fichiers, `0001_noyau.sql` → `0037_fix_facturation.sql` |
| Historique Supabase | **13 entrées seulement**, la plus ancienne `20260718021312 / 0033_…` |

Deux divergences :

1. **`0001` → `0032` ne figurent pas dans l'historique appliqué.** Elles ont été passées
   hors `supabase migration` (éditeur SQL, ou historique réinitialisé).
2. **Des migrations existent en base et pas dans Git** : `0033b_desaffecter_membre`,
   `0034a_sync_dossier_planning_capacites`, `0034b_cycle_vie_chantier`, `0034c_fix_sync_orgid`,
   `0034d_transition_interne`, `0035a_desistement_sync_date_paiement`, `0035a_fix_colonne_tvac`,
   `0035b_textes_offre_desistement`, `0036b_fix_reprise_report`, `0037b_totaux_facture_derives`.

**Conséquence directe et bloquante pour ton objectif :** tu ne peux pas, aujourd'hui,
recréer une base Dashprod propre à partir du dépôt. Or c'est précisément ce qu'exige
« une nouvelle entreprise sur une base vierge ». Tant que ce n'est pas réparé, chaque
nouvel environnement sera un artisanat non reproductible.

**Correction :** `supabase db pull` pour capturer le schéma réel en une migration de
référence (`0038_baseline.sql`), la committer, et repartir de là.

### 3.10 Autres constats base

- Extension `citext` installée dans `public` (WARN — à déplacer dans `extensions`)
- Protection contre les mots de passe compromis (HaveIBeenPwned) : **désactivée**
- Avertissements GoTrue : `GOTRUE_JWT_DEFAULT_GROUP_NAME` / `GOTRUE_JWT_ADMIN_GROUP_NAME`
  dépréciés — sans impact immédiat

---

## 4. PHASE — E-mail : BROKEN

`adaptateur.js` ligne 287 :

```js
await supabase.functions.invoke("inviter-membre", {
  body: { email, nom, lien, organisation: "Déménagements Roovers" },
});
```

Edge Functions réellement déployées sur le projet : **une seule**, `swift-action`
(nom d'échafaudage Supabase par défaut, version 1, créée le 16/07/2026).

**`inviter-membre` n'existe pas.** L'appel échoue, l'erreur est avalée par le `try/catch`,
`envoye` passe à `false` et l'interface propose un lien à copier manuellement.

Donc :
- Aucun e-mail d'invitation n'est envoyé.
- Le nom d'organisation transmis serait de toute façon « Déménagements Roovers » pour
  **tous** les tenants.
- Le source de `swift-action` n'est pas dans le dépôt.

Le module e-mail complet du document de mission (devis, facture, relance, invitation,
reset password, notifications) est **NOT_CONNECTED**, à l'exception du reset password
géré nativement par Supabase Auth.

---

## 5. PHASE — Données Roovers en dur : CRITICAL

### 5.1 Le bloc d'identité

`adaptateur.js`, lignes 749–754 :

```js
const ORG_DEMO = {
  nom: "Déménagements Roovers", bce: "BE 0478.363.616", tva: "BE0478363616",
  adresse: "Rue de l'Avenir 9", cp: "1370", ville: "Jodoigne",
  tel: "0455/17.16.79", email: "raphael.roovers@gmail.com",
  iban: "BE73 3101 6268 5860",
};
```

**Ce dépôt GitHub est public.** Un IBAN, une adresse, un numéro de téléphone et une adresse
e-mail personnelle sont donc indexables par n'importe qui, et le resteront dans l'historique
Git même après suppression du fichier.

C'est le point qui te concerne personnellement, pas seulement tes clients.

### 5.2 Le chemin par lequel Roovers contamine un nouveau tenant

```js
// adaptateur.js — obtenirOrganisation()
const { data } = await supabase.from("organisations")
  .select("nom, tva, bce, …").limit(1).maybeSingle();
return data || {};          // ← {} si la ligne organisation est absente
```
```js
// pdfOffre.js ligne 56
ligne(org.nom || "Déménagements Roovers", { taille: 17, gras: true });
```

Enchaînement : nouvelle entreprise créée → sa ligne `organisations` est incomplète ou
absente → `obtenirOrganisation()` renvoie `{}` → **le PDF de devis part au client final
avec l'en-tête « Déménagements Roovers »**.

Le §19 du document de mission classe précisément ce cas CRITICAL. Il est atteignable
aujourd'hui, sans bug, par le chemin nominal.

À noter aussi : `.limit(1)` sans `.eq('id', …)` s'en remet entièrement à la RLS pour ne
renvoyer qu'une ligne. C'est vrai aujourd'hui. Le jour où une policy est relâchée, l'écran
affichera l'identité d'une organisation arbitraire.

### 5.3 Contamination supplémentaire — trouvée le 19/07 en appliquant les correctifs

Mon premier passage avait tronqué la recherche à 30 résultats et **manqué quatre points
dans `packages/domaine`**. Correction :

| Fichier | Ligne | Contenu | Portée |
|---|---|---|---|
| `communication/brief.js` | 48 | `"🚛 *DÉMÉNAGEMENTS ROOVERS*"` en dur | **Tout brief WhatsApp envoyé aux équipes de n'importe quel tenant** |
| `communication/brief.js` | 91 | `DEPOT_ROOVERS = "Rue de l'Avenir 9, 1370 Jodoigne"` | **Valeur par défaut de `urlItineraire()`** — appelée sans dépôt depuis `Terrain.jsx:118` et `Dossier.jsx:336`. Tous les trajets de tous les tenants partaient de Jodoigne, donc **tous les kilométrages facturables étaient faux** pour une autre entreprise. |
| `communication/brief.js` | 176 | `org.nom \|\| "Déménagements Roovers"` | Second repli, distinct de celui de `pdfOffre.js` |
| `documents/cgv.js` | 24 | « Roovers est assurée pour les dommages… » | **Texte contractuel** des CGV v1 |
| `tests/brief.test.js` | 21–22 | IBAN et téléphone réels en fixture | Dépôt public |
| `ecrans/Textes.jsx` | 25 | Adresse du dépôt en exemple | Cosmétique |

Le cas des CGV est le plus délicat : `cgv.js` **fige** ses versions (`VERSIONS`,
`CGV_VERSION_COURANTE`) et les documents signés portent une empreinte calculée dessus.
Modifier la v1 invaliderait l'empreinte des 7 instances déjà en base. La v1 est donc
**laissée intacte** ; une v2 neutre a été ajoutée et `CGV_VERSION_COURANTE` passe à 2.
Le texte de la v2 doit être relu par toi avant diffusion : c'est du contractuel.

### 5.4 Le seed documente un mauvais identifiant

`supabase/seed/0002_bareme.sql` :

> « Pour Roovers, utiliser `:org_id = '893d9c67-9d07-4408-a484-13fa31aec500'`. »

Or l'organisation Roovers a pour identifiant **`5de63170-6a61-4e94-a84c-fd6bce4c2f9c`**.
`893d9c67-…` est un **identifiant d'utilisateur `auth`**, pas une organisation.

Appliqué tel quel, ce seed insère des barèmes avec un `org_id` orphelin : invisibles pour
tout le monde, et le chiffrage du nouveau tenant démarre sans grille tarifaire.

---

## 6. PHASE — Storage : CRITICAL

Un seul bucket : `documents`.

| Propriété | Valeur |
|---|---|
| `public` | **`true`** |
| Objets | 0 |
| Policy SELECT | `documents_lecture` — `bucket_id = 'documents'` |
| Policy ALL | `documents_ecriture` — `bucket_id = 'documents' AND acteur_a_capacite('gerer_referentiels')` |
| Isolation par chemin | **aucune** |

La policy de lecture ne contient **aucun filtre d'organisation** et s'applique au rôle
`public`, donc à `anon`. Le bucket étant public, les objets sont en outre servis par URL
directe sans aucun contrôle, et le linter Supabase confirme que le bucket est **listable**.

Le code confirme l'intention : `getPublicUrl(FICHIER_CBD)` dans `urlConditionsCbd()`.

Aujourd'hui il n'y a **aucun objet** — donc aucune donnée n'a fuité. C'est ta seule fenêtre
propre : à la première photo de chantier, au premier contrat signé, au premier document RH,
la fuite devient effective et rétroactive.

Cible : bucket **privé**, chemins `org/{org_id}/…`, policies filtrant sur le premier segment
du chemin, URLs signées à durée courte. Détail dans `DATA_SECURITY.md`.

---

## 7. PHASE — Vercel

### 7.1 Ce qui est établi

| Élément | Valeur |
|---|---|
| Projet | `dashprod-erp` — `prj_RP35Cp5FmoCfrWAPF1YPglv9oXlX` |
| Scope | `vancraphael-coders-projects` (compte personnel, aucune équipe) |
| Framework preset | **`null`** — pas de preset, tout repose sur `vercel.json` |
| Node | `24.x` |
| Dernier déploiement production | `dpl_F7QZWNvfCL8a4fgtnY4vxV1QEntQ` — **READY** |
| Domaines | `dashprod-erp.vercel.app` + 2 domaines générés |
| Domaine réellement utilisé | `dashprod-erp-vancraphael-coders-projects.vercel.app` (d'après les logs Supabase) |

`vercel.json` :
```json
{ "buildCommand": "npm install && npm run build --workspace @dashprod/web",
  "outputDirectory": "apps/web/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Correct pour une SPA.

### 7.2 INACCESSIBLE

Le connecteur Vercel dispose d'un jeton qui lit le projet mais **refuse** (`403 forbidden`)
la liste des déploiements, les logs de build et les variables d'environnement.

Ne sont donc **pas vérifiés** :
- l'historique des déploiements ERROR mentionné dans le document de mission, et leurs causes ;
- la liste des variables d'environnement et leur portée (production / preview / development) ;
- qu'aucun secret n'est préfixé `NEXT_PUBLIC_*` / `VITE_*` par erreur.

**Action de ta part :** reconnecte le connecteur Vercel avec un jeton ayant accès au scope
`vancraphael-coders-projects`, et je termine cette phase.

Ce qui est **déduit avec certitude** malgré tout : `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` **sont bien configurées en production**, puisque l'application
déployée effectue de vraies connexions Google contre Supabase (logs du 19/07/2026).

### 7.3 Point d'attention

Une SPA Vite n'expose **que** des variables `VITE_*`, et **toutes** finissent en clair dans
le bundle JavaScript. La clé `anon` y est légitimement — c'est son rôle. Mais la règle est
absolue : **aucun secret ne doit jamais porter le préfixe `VITE_`.** Pas de
`SUPABASE_SERVICE_ROLE_KEY`, pas de clé Mollie, pas de clé API. Vérifié côté code :
seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont lues. ✅

---

## 8. Tests

`npm test` → **181 tests, 181 passent, 0 échec.**

Périmètre réel : `packages/domaine` uniquement — chiffrage, facturation, CGV, documents,
opérations, relevé, conformité, RH/flotte/stocks. Logique métier pure, sans base.

**Non couvert, et c'est là que sont tous les risques identifiés dans ce document :**
`adaptateur.js` (1 829 lignes, 0 test), la RLS, l'isolation multi-tenant, l'authentification,
le Storage, la génération PDF, et le parcours de bout en bout.

Les 181 tests verts ne disent rien de la sécurité du produit. Ils ne doivent pas servir
d'argument de mise en production.

---

## 9. Parcours minimum du §16 — état réel

| Étape | État |
|---|---|
| Nouvelle entreprise | ❌ aucune procédure — voir `MULTI_TENANT.md` |
| Compte admin | ⚠️ manuel en base |
| Création organisation | ❌ pas de `create_organization()` |
| Onboarding | ❌ absent |
| Création client | ✅ |
| Création devis | ✅ |
| Génération PDF | ⚠️ fonctionne, mais fallback Roovers |
| Envoi | ❌ Edge Function absente |
| Conversion chantier | ✅ |
| Planification équipe + véhicule | ✅ |
| Exécution | ✅ |
| Facture | ⚠️ `NOT_VERIFIED` — 0 facture jamais créée |
| Paiement | ⚠️ `NOT_VERIFIED` |
| Historique | ✅ |

---

## 10. Ce que je n'ai pas pu vérifier

Marqué `NOT_VERIFIED` — à ne jamais présenter comme fonctionnel :

1. Toute la couche navigateur : connexion réelle, persistance de session, expiration,
   déconnexion, téléversement de fichier, téléchargement de PDF, comportement hors ligne.
   Je n'ai pas de navigateur ici.
2. L'écriture inter-tenant via les `cmd_*` : je n'exécute pas d'écriture sur une base de
   production. L'analyse statique est favorable (23/24 contrôlent l'organisation), mais la
   preuve d'exécution manque.
3. L'invalidation du cache applicatif au changement d'organisation (§13 test 10) : sans objet
   aujourd'hui — il n'y a ni cache serveur ni changement d'organisation possible.
4. Vercel : déploiements, logs de build, variables d'environnement (§7.2).
5. La numérotation de facture en conditions réelles.

Ces cinq points doivent être exécutés depuis ton poste, ou depuis Claude Code avec un
navigateur, avant tout verrouillage.
