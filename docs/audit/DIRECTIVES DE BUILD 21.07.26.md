# DIRECTIVES DE BUILD — Dashprod ERP
**À lire avant chaque session de construction.**
Dernière révision : 21 juillet 2026 · commit de référence `770553e`

Ce document existe pour une seule raison : **ne jamais build à l'aveugle, et ne
jamais oublier une règle qui a déjà coûté un problème.** C'est le contrat de
travail entre toi (Raphaël, décision et push) et moi (Claude, build/test/preuve).

---

## 0. Qui fait quoi

| | Toi | Moi (Claude) |
|---|---|---|
| Décision produit, priorités | ✅ | — |
| Écriture du code, tests, migrations | copilote | ✅ |
| Application des migrations Supabase | — | ✅ (via connecteur) |
| Push GitHub | ✅ (Codespaces) | — je n'ai pas d'accès en écriture au repo |
| Déploiement Vercel | ✅ (auto au push) | — |
| Réglages dashboard (Auth, secrets, visibilité repo) | ✅ | — hors de ma portée |
| Preuve que ça marche | exige-la | ✅ je la fournis |

Je ne suis **pas** dans Claude Code : pas de navigateur, pas d'accès à l'app
déployée. Je peux cloner le repo public, lire/écrire Supabase en direct, tester
la logique et la base. Je **ne peux pas** cliquer dans l'app, uploader un fichier,
ni faire un test E2E navigateur. Ces vérifications-là te reviennent.

---

## 1. Règles absolues (déjà payées en problèmes réels)

1. **Toujours repartir d'un clone frais du vrai repo GitHub.** Une divergence
   locale a déjà cassé un build Vercel. Je ne travaille jamais sur un état supposé.

2. **Ne jamais déclarer « fonctionnel » sans preuve.** Toute opération non testée
   en réel est `NOT_VERIFIED`. Ça vaut pour moi aussi. Les 200 tests verts ne
   prouvent que la logique du domaine, rien de la RLS, du navigateur ni du PDF.

3. **Pousser un fichier n'exécute rien.** Une migration sur GitHub n'est pas une
   migration appliquée. Vercel ne construit que le frontend, jamais la base.
   Quand j'écris « APPLIQUÉE en production » dans l'en-tête d'un `.sql`, c'est que
   je l'ai déjà exécutée via le connecteur : tu la ranges, tu ne la rejoues pas.
   Si je veux que tu l'exécutes, je le dis explicitement.

4. **Un fichier `.sql` de migration ne se colle jamais dans l'éditeur SQL tel
   quel** s'il commence par des commentaires `--` : le copier-coller peut manger
   les tirets. Les migrations que je livre sont pour le dépôt, elles sont déjà
   appliquées.

5. **Format de livraison — MD interdit pour les emplacements.** Pour tout fichier
   destiné au repo : je donne le **nom exact et le chemin précis** dans la
   conversation, en clair. Jamais enfoui dans un `.md`.

6. **Si je sais faire le travail, je le fais.** Je ne te renvoie pas une tâche
   que je peux exécuter moi-même.

7. **Sécurité d'abord, toujours.** Aucune table métier sans `org_id NOT NULL` +
   policy. Aucune vue ni fonction `SECURITY DEFINER` sans contrôle de `jwt_org()`.
   Aucun secret en préfixe `VITE_`. Aucun succès affiché sans confirmation base.

---

## 2. Le workflow, étape par étape

À chaque session de build :

1. `git clone --depth … repo` frais, `git reset --hard origin/main`.
2. `npm install` — le `node_modules` versionné est **périmé** (il manque `jspdf`),
   il faut réinstaller sinon le build échoue.
3. Lire le SKILL/le code réel avant d'écrire. Ne jamais présumer d'une signature.
4. Écrire par patch Python idempotent (`s.count(old)==1`), pas à la main.
5. `npm test` — doit rester vert, et j'ajoute des tests pour tout nouveau domaine.
6. `npx vite build` avec des variables factices — doit passer.
7. Migrations : je les applique moi-même sur Supabase, puis je **vérifie l'effet**
   par une requête, jamais le `success:true` seul.
8. `git diff` → un seul patch → `present_files` → **tableau d'emplacements en clair**.

### Ce que je te livre à chaque fois
- Un `.patch` unique à appliquer à la racine (`git apply`, puis `rm`).
- Les `.sql` déjà appliqués, à ranger dans `supabase/migrations/`.
- Le tableau nom → chemin, en clair dans la conversation.

### Ce que tu fais
```bash
cd ~/dashprod-erp && git pull
git apply <le>.patch
npm test
rm <le>.patch
git add -A && git commit -m "…" && git push
```

---

## 3. Vérité architecturale (pour ne pas me tromper)

- **Stack réelle : Vite + React, JavaScript, SPA pure.** Pas de Next.js, pas de
  TypeScript, **aucun backend applicatif**. Le navigateur parle directement à
  Supabase avec la clé `anon`.
- **Toute la sécurité est dans PostgreSQL** (RLS + fonctions `cmd_*`). Il n'existe
  aucune autre couche où filtrer une donnée.
- **Monorepo npm workspaces** : `packages/domaine` (logique pure, `node:test`,
  alias `@domaine`), `apps/web` (Vite React), `supabase/migrations`.
- **Chemin de données unique** : écran `.jsx` → `apps/web/src/lib/adaptateur.js`
  (87 fonctions) → `supabase-js` → PostgREST → table + RLS. Aucun écran ne parle
  à Supabase directement, sauf auth/diagnostic.
- **Tenancy** : 1 utilisateur = 1 organisation. `org_id` injecté serveur par
  `hook_ajouter_claims`. Ne pas réintroduire de multi-appartenance sans raison.
- **Nomenclature** : `organisations` / `org_id` (pas `organizations`). Ne jamais
  « corriger » vers l'anglais — migration destructive pour rien.

### Modules du domaine déjà présents (ne pas réinventer)
`chiffrage/moteur.js` (accepte `ref.bareme`/`ref.tarifs`), `facturation/peppol.js`
(`versUBL`), `facturation/ogm.js` (`genererOGM` — **déjà branché** dans FactureDoc),
`organisation/identite.js` (source de vérité, nouveau), `communication/textes.js`
(catalogue de textes), `stocks/catalogues.js` (pièces/fournitures/matériel),
`documents/cgv.js` (versionné, empreintes figées — **ne jamais éditer une version
signée**, créer une v+1).

---

## 4. État de production (au 21/07/2026)

### Verrouillé et prouvé
- Isolation inter-tenant : organisation fictive → 0 ligne partout (tables + vues).
- Storage privé, chemins `org/{org_id}/…`.
- 0 fonction `SECURITY DEFINER` ouverte à `anon`.
- `creer_organisation()` : crée une base vierge, testée (0 client/affaire/facture).
- Facturation exercée en réel : `2026-000001`, TVA 21 % exacte, numérotation OK.
- Identité d'entreprise éditable + héritée (nouveau).

### Migrations appliquées au-delà du repo d'origine
`0038`, `0038b`, `0038c` (sécurité), `0039` (creer_organisation),
`0040` (fermeture helpers invoker), `0041` (catalogues), `0042` (identité).
Toutes appliquées en base ; à ranger dans `supabase/migrations/`.

### Trous connus, par priorité
| Priorité | Trou | Note |
|---|---|---|
| **P0** | Dépôt GitHub **public** | Expose l'IBAN. Un clic : Settings → Danger Zone → Private. |
| **P0** | Landing d'onboarding absente | `creer_organisation()` existe, aucun écran ne l'appelle. Voir §6. |
| P1 | Libellé « TVA 21 % » en dur dans Devis, Facture, FactureDoc | `libelleTva(org)` existe. À brancher. |
| P1 | `TVA_PCT = 21` dans `bareme.js` | Le moteur l'utilise ; à faire dériver de l'organisation. |
| P1 | Email d'invitation | Edge Function `inviter-membre` non déployée, source non versionnée. |
| P2 | Logo d'entreprise | Champ absent, à ajouter à l'identité + Storage. |
| P2 | Mollie (paiement) | Absent partout. Non bloquant tant que facturation manuelle. |
| P2 | `node_modules` versionné (2787 fichiers) | `git rm -r --cached node_modules`. |
| P3 | Protection mots de passe compromis | Dashboard Auth, à activer. |

---

## 5. Fonctions « âge de pierre » — politique

Quand je croise une fonction fragile, je la durcis au passage plutôt que de la
laisser. Déjà traité :
- `obtenirOrganisation`, `obtenirParametresPrix`, `obtenirTextes` : `.limit(1)
  .maybeSingle()` avec repli silencieux → `.single()` avec erreur franche.
- `pdfOffre` : repli `|| "Déménagements Roovers"` → refus de générer si nom absent.
- Mode démo : bascule sur variable absente → drapeau explicite `VITE_MODE_DEMO`.

Restent légitimes (ne pas « corriger ») : les deux `limit(1).maybeSingle()` de
`adaptateur.js:370` et `:922` sont des « dernier document par date »
(`order + limit`), c'est le bon pattern.

Règle : un repli silencieux sur une valeur par défaut est presque toujours un bug
en multi-tenant. Préférer une erreur visible à un faux succès.

---

## 6. LA LANDING D'ONBOARDING — spécification

C'est le morceau qui ferme le circuit décrit dans ton diagnostic du 21/07.
Objectif : **créer une organisation → premier admin → configurer une fois →
produire**, sans reconfiguration ailleurs.

### 6.1 Ce qui existe déjà côté base
- `creer_organisation(p_nom, p_email_admin, p_nom_admin, …)` → crée org + rôles
  standards + admin (rôle `direction`) + compteur de facture. Retourne
  `{org_id, admin_id, statut: "PRET_A_CONFIGURER"}`. **Réservée à l'éditeur**
  (aucun GRANT à `authenticated`).
- `cmd_reclamer_invitation()` → rattache le compte Google de l'admin à sa ligne
  `utilisateurs` lors de sa première connexion.
- `identiteComplete(org)` → dit si l'entreprise peut produire des documents.

### 6.2 Le problème d'accès à résoudre
`creer_organisation()` ne doit **pas** être appelable par un utilisateur anonyme
depuis le navigateur (sinon n'importe qui crée des tenants). Deux options :

- **Option A — Edge Function `creer-organisation` en `service_role`.** La landing
  publique appelle l'Edge Function, qui valide puis appelle la fonction SQL.
  C'est la voie propre. Nécessite de déployer une Edge Function (source à
  versionner dans `supabase/functions/`).
- **Option B — création manuelle par l'éditeur (toi), landing = simple formulaire
  de demande** qui t'envoie un email. Plus lent, zéro risque, bon pour les 10
  premiers clients.

Recommandation : **Option B pour démarrer** (tu contrôles chaque tenant créé),
Option A quand le volume le justifie. Ne pas ouvrir la création de tenant au
public tant que ce n'est pas nécessaire.

### 6.3 Parcours cible (une fois l'org créée)
```
Connexion Google de l'admin
   ↓
cmd_reclamer_invitation()  → claim org_id injecté
   ↓
Écran d'accueil "Bienvenue" SI identiteComplete(org).pretDocuments == false
   ↓
Paramètres → Identité de l'entreprise  (remplir une fois)
   ↓
Paramètres → Facturation, Barème, Catalogues  (régler une fois)
   ↓
Premier client → premier devis  (hérite tout, ne redemande rien)
```

### 6.4 Ce que je construirai
1. Une **page publique de présentation** (landing marketing simple : ce qu'est
   Dashprod, un CTA « Demander un accès »).
2. Un **écran d'accueil post-connexion** qui détecte une organisation incomplète
   (`identiteComplete`) et guide vers Identité avant de laisser produire un devis.
3. Option A si tu la choisis : l'Edge Function `creer-organisation` + son source
   versionné + le formulaire de création.

### 6.5 Critère de fin (le tien, verbatim)
> Créer une organisation → un utilisateur → un rôle → configurer l'entreprise une
> seule fois → un client → un devis → planifier → exécuter → facturer → recevoir
> le paiement, **sans jamais reconfigurer la même information dans un autre module.**

Test d'acceptation : créer ORG_B vierge, se connecter en admin, remplir l'identité
UNE fois, produire un devis dont l'en-tête, la TVA et l'IBAN sont corrects **sans
avoir rien saisi ailleurs**. Tant que ce test n'est pas passé en réel, la landing
est `NOT_VERIFIED`.

---

## 7. Constantes belges (référentiel, ne pas coder en dur ailleurs)
- TVA par défaut : 21 % — **désormais dans `parametres_facturation`, plus une
  constante.** `bareme.js` reste à migrer.
- Numérotation : `<annee>-000001`, compteur par `(org_id, type, annee)`.
- Peppol ID Roovers : `0208:0478363616` (donnée Roovers — jamais en dur ailleurs).
- Structured communication (OGM/VCS) : `genererOGM` dans le domaine.

Ces valeurs appartiennent à l'organisation, pas au code. Roovers est une
organisation comme une autre.

---

## 8. Definition of Done (à cocher avant de dire « prêt »)
- [ ] `npm test` vert, tests ajoutés pour tout nouveau domaine.
- [ ] `npx vite build` passe.
- [ ] Migration appliquée ET vérifiée par requête (pas seulement `success`).
- [ ] Isolation retestée si la RLS ou une policy a bougé (org fictive → 0).
- [ ] Non-régression Roovers (16 clients, 16 affaires, 8 véhicules toujours vus).
- [ ] Aucune donnée réelle en dur introduite (grep roovers/iban/van cutsem = 0).
- [ ] Patch unique + tableau d'emplacements en clair.
- [ ] Ce qui n'a pas pu être prouvé est marqué `NOT_VERIFIED`, pas « fonctionnel ».
