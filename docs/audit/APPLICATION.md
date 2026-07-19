# APPLICATION — quoi faire maintenant
19 juillet 2026

---

## 1. Où placer les `.md`

Oui, place-les — c'est ta trace d'audit, et elle a une valeur légale si un client
te demande un jour comment tu protèges ses données.

```
docs/audit/2026-07-19/
├── AUDIT_REAL.md
├── DATA_SECURITY.md
├── MULTI_TENANT.md
├── PRODUCTION_CHECKLIST.md
└── APPLICATION.md
```

Le SQL est déjà au bon endroit : `supabase/migrations/0038_corrections_securite.sql`
(commit `bb7a3d3`). Rien à changer.

Ces documents datent d'un commit précis. Ne les écrase pas au prochain audit : crée un
nouveau dossier daté. Un audit qu'on réécrit perd tout intérêt.

---

## 2. Le point important : 0038 n'est PAS appliquée

Tu as poussé le fichier sur GitHub. Il est bien là. **Mais il n'a jamais été exécuté
sur la base.**

Vérifié à l'instant sur `usldgiordguqchclvdms` :

| Contrôle | Attendu après 0038 | Réel |
|---|---|---|
| Vues en `security_invoker` | 3 | **0** |
| `storage.buckets.public` | `false` | **`true`** |
| Policies Storage | 4 | **2** (les anciennes) |
| Policies ajoutées (sections 3) | 6 | **0** |
| `cmd_*` encore ouvertes à `anon` | 0 | **24** |
| `0038` dans l'historique des migrations | présent | **absent** |

**La fuite inter-tenant est toujours ouverte.** Le CA signé et l'effectif nominatif de
Roovers restent lisibles par n'importe quel autre tenant.

### Pourquoi

Pousser un fichier sur GitHub n'exécute rien. Vercel ne construit que le frontend :
il ne touche jamais à ta base. Aucun pipeline n'applique tes migrations.

C'est exactement le faux succès que ton propre document interdit — croire qu'une chose
est faite parce qu'un fichier a bougé. Prends l'habitude de vérifier l'effet, jamais le geste.

### Comment appliquer

**Option A — CLI Supabase (recommandé : ça alimente l'historique des migrations)**
```bash
supabase link --project-ref usldgiordguqchclvdms
supabase db push
```

**Option B — éditeur SQL du dashboard**
Copier le contenu du fichier, l'exécuter. Rapide, mais l'historique des migrations ne
sera pas alimenté — tu aggraves le problème de reproductibilité du §3.9 de l'audit.

**Dans les deux cas : `pg_dump` d'abord.**

### ⚠️ Ordre obligatoire

La **section 2** (Storage privé) casse le code actuellement en production, qui utilise
`getPublicUrl`. Deux façons de faire, au choix :

- **Recommandé** : appliquer **section 1 seule** maintenant (3 lignes, ferme la fuite,
  aucune régression possible), puis déployer le patch frontend, puis appliquer le reste.
- Ou : déployer le patch frontend d'abord, puis appliquer 0038 en entier.

Ne fais pas l'inverse.

---

## 3. Patch frontend — prêt et validé

`corrections_frontend.patch` — 7 fichiers, 107 insertions.

```bash
git apply corrections_frontend.patch
npm test          # 182 tests, 182 passent
npm run build --workspace @dashprod/web
```

### Ce qu'il corrige

| Fichier | Correction |
|---|---|
| `supabase.js` | La config Supabase absente **lève une erreur** au lieu de basculer en démo. Le mode démo exige désormais `VITE_MODE_DEMO=1`. |
| `adaptateur.js` | `ORG_DEMO` neutralisé (plus d'IBAN ni d'e-mail réels) |
| `adaptateur.js` | `obtenirOrganisation()` en `.single()` : 0 ou 2 lignes = erreur franche, plus de repli silencieux |
| `adaptateur.js` | Nom d'organisation dynamique dans l'invitation |
| `adaptateur.js` | Storage : `createSignedUrl` (5 min) + chemin `org/{org_id}/cgv/…` |
| `pdfOffre.js` | Repli « Déménagements Roovers » supprimé — le PDF **refuse** de se générer si le nom manque |
| `brief.js` | En-tête du brief = organisation passée en paramètre |
| `brief.js` | `DEPOT_ROOVERS` supprimé |
| `cgv.js` | CGV **v2** neutre ajoutée, v1 intacte |
| `brief.test.js` | Fixtures neutralisées + **nouveau test garde-fou** anti-régression |

### Trouvé en cours de route — plus grave que prévu

`urlItineraire()` avait pour dépôt par défaut l'adresse de Roovers à Jodoigne, et il est
appelé **sans argument** depuis `Terrain.jsx:118` et `Dossier.jsx:336`. Conséquence :
tous les trajets de toutes les entreprises seraient partis de Jodoigne — donc
**tous les kilométrages facturés auraient été faux** chez un autre client.

Le patch retire la valeur par défaut. Effet de bord à connaître : sans dépôt fourni,
l'itinéraire ne couvre plus que les chantiers, et le km dépôt→chantier→dépôt n'est plus
compté. **À faire ensuite** : passer `org.adresse` en 3ᵉ argument dans ces deux écrans
pour retrouver un kilométrage juste. Je ne l'ai pas fait à l'aveugle — il faut vérifier
dans un navigateur que l'organisation est bien chargée à cet endroit.

Deux points laissés volontairement :
- **CGV v1** : intacte. 7 documents figés en base portent son empreinte. La v2 attend
  ta relecture — c'est du contractuel, pas du code.
- `roovers-mobile.jsx`, `polices-roovers` : commentaires de conception et identifiant DOM.
  Aucune donnée, aucun impact.

### Note sur ton build

Ton `vite.config.js` contient `envPrefix: ["VITE", "NEXT_PUBLIC"]`. Vestige de
l'hypothèse Next.js : il expose aussi toute variable `NEXT_PUBLIC_*` dans le bundle public.
Deux préfixes à surveiller au lieu d'un. Retire `"NEXT_PUBLIC"` si rien ne l'utilise.

Par ailleurs, le `node_modules` versionné est **périmé** : il ne contient pas `jspdf`,
pourtant ajouté au dernier commit. Le build échoue à partir du dépôt seul. Il passe sur
Vercel parce que `npm install` y tourne à neuf. C'est le genre d'écart qui finit par
mordre — raison de plus pour `git rm -r --cached node_modules`.

---

## 4. Ordre d'exécution

1. `pg_dump` de sauvegarde
2. **Section 1 de 0038 seule** → la fuite est fermée
3. Vérifier : le test d'isolation sur les vues doit renvoyer 0, 0, 0
4. `git apply corrections_frontend.patch` → tests → build → déployer sur Vercel
5. Vérifier en production que le dépôt des CGV fonctionne toujours
6. Appliquer le reste de 0038 (sections 2 à 5)
7. Rejouer `MULTI_TENANT.md` §7 en entier
8. Dépôt GitHub en privé
9. `supabase db pull` → `0038_baseline.sql`

Les étapes 1 à 3 prennent dix minutes et retirent le risque le plus grave du projet.

---

## 5. Vérification après application

```sql
-- Doit renvoyer 0, 0, 0. Aujourd'hui : 1, 5, 0.
begin;
select set_config('request.jwt.claims',
  '{"role":"authenticated","org_id":"11111111-1111-1111-1111-111111111111"}', true);
set local role authenticated;
select (select count(*) from v_ca_signe),
       (select count(*) from v_charge_membre),
       (select count(*) from v_factures_solde);
rollback;

-- Témoin : doit renvoyer 16, 16, 8. Une régression ici = policy trop stricte.
begin;
select set_config('request.jwt.claims',
  '{"role":"authenticated","org_id":"5de63170-6a61-4e94-a84c-fd6bce4c2f9c"}', true);
set local role authenticated;
select (select count(*) from clients),
       (select count(*) from affaires),
       (select count(*) from vehicules);
rollback;
```

Tant que le premier bloc ne renvoie pas trois zéros, rien n'est réglé — quel que soit
le nombre de fichiers poussés.
