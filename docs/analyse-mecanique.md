# Analyse mécanique — Dashprod ERP

> Fichier de travail pour l'audit du projet. Trois parties : la **mécanique
> interne** (comment le système tient), la **méthode d'audit reproductible**
> (les commandes qui détectent les incohérences), et le **registre des
> incohérences** détectées, daté. À maintenir : toute session qui modifie la
> mécanique met ce fichier à jour.
>
> **Hiérarchie documentaire** : `docs/PRODUCT_TRUTH.md` (le maître — vision,
> offres, circulation des données, écarts vision↔code EX-xx, verrous) ·
> ce fichier (la mécanique du code et ses incohérences internes INC-xx) ·
> `docs/TODO-claude.md` (l'exécution ordonnée). Le registre INC reste
> code-only ; les écarts avec la vision produit vivent dans PRODUCT_TRUTH §8.

Dernier audit complet : 2026-07-26. Vérification EN BASE le 2026-07-28 (connecteur rétabli) — voir §3, plusieurs INC clos et deux nouveaux détectés, invisibles sans accès à la production.

---

## 1. Mécanique interne

### 1.1 Architecture d'exécution

SPA Vite + React (JS pur), **sans backend applicatif**. Le navigateur parle à
PostgreSQL (Supabase) avec la clé `anon`. Toute la sécurité vit en base :
RLS par `org_id` (injecté dans le JWT) + fonctions `cmd_*` en
`security definer`. L'interface *demande*, la base *accorde ou refuse* — un
écran ne décide jamais d'un périmètre.

Monorepo npm workspaces :
`packages/domaine` (logique pure, testée, alias `@domaine`) ·
`apps/web` (~30 écrans) · `supabase/migrations` (SQL).
`apps/web/src/lib/adaptateur.js` est **l'unique couche d'accès aux données** ;
un écran n'importe jamais `supabase` directement (sauf `lib/supabase.js` pour
l'auth).

### 1.2 Les invariants (ce qu'on ne casse pas)

- **Garde S4** — `affaires.etat` ne s'écrit jamais en UPDATE direct : tout
  passe par `transition_interne()` / `cmd_transition_affaire`. Un trigger le
  bloque.
- **Journal `evenements`** — insertion seule, jamais purgé : c'est la preuve
  d'audit (y compris des purges RGPD).
- **Modèle financier canonique** — `facturation/modele.js` est la source de
  vérité ; PDF, UBL, CSV, journal PCMN, FEC en *dérivent*, aucun ne recalcule.
  Totaux toujours dérivés des lignes.
- **Honnêteté Peppol** — sans clé Digiteal, la machine d'états s'arrête à
  `PRETE` et le dit. Aucun statut réseau n'est inventé (un test le verrouille).
- **Deux horloges RGPD** — opérationnel purgé 12 mois après archivage ;
  fiscal conservé 7 ans. La purge ne touche jamais une facture.
- **Frontière commerciale** — un compte OAuth sans organisation est testé
  *client d'abord* (`cmd_client_moi`) avant toute proposition de créer une
  société (parcours payant 360 €/mois).
- **`anon` minimal** — seules RPC ouvertes à `anon` :
  `cmd_offre_apercu`, `cmd_offre_signer`, `cmd_reseau_demenageurs`.
  Jamais de SELECT direct sur une table.

### 1.3 Flux de bout en bout

```
Paramètres (barème, suppléments, textes, identité, Digiteal)
   └─ parametres_prix / parametres_facturation / parametres_textes (JSON org)
Relevé (affaires.releve JSON) ──► Devis (calculerScenario + supplementsRetenus)
   └─ scenarios.entrees/resultats  (le TVAC d'une affaire vit ICI)
Offre (composerOffre → documents_instances : contenu figé + empreinte)
   └─ signature CLIENT : code 12 car. (acces_client, empreinte salée)
      cmd_offre_apercu (lire) → cmd_offre_signer (mention « Lu et approuvé »
      + nom, exigés en base) → transition_interne('confirmee')
Chantier (missions, chrono) ──► Facture (cmd_emettre_facture → numéro légal)
   └─ facture_lignes (quantite/PU/tva_pct depuis 0049)
Peppol (adaptateur assemble canonique → digiteal.transmettre → transmissions)
Espace client OAuth (cmd_client_* filtrées sur l'e-mail authentifié)
```

### 1.4 Pièges connus (déjà payés — ne pas re-payer)

1. `Number(null) === 0` : un taux ABSENT passe pour 0 %. Utiliser
   `nombreExplicite()` (`rh/paie.js`). Commis 4×.
2. Écran blanc : un `return` avant des hooks React. Tout `return` conditionnel
   vient APRÈS tous les `useState`/`useEffect`. Commis 2×.
3. **Schéma supposé ≠ schéma réel** : `affaires.reference` n'existe pas,
   l'inventaire est la colonne JSON `affaires.releve` (pas une table), le TVAC
   est dans `scenarios.resultats`, les adresses dans `affaire_adresses.sens`
   (`chargement`/`dechargement`). Avant d'écrire du SQL : lire ce que
   l'adaptateur sélectionne réellement. Commis 1× (coûté la migration 0055).
4. `pgcrypto` requis pour `gen_random_bytes`/`sha256` (activée en 0055).
5. Ordre de définition SQL : une fonction appelée par une autre doit être créée
   AVANT dans le fichier (coûté le correctif 0054).
6. `touch_updated_at()` écrit `new.updated_at` : toute table avec ce trigger
   doit avoir la colonne.
7. Livraison : `git checkout -- apps/web/dist` avant de zipper ; jamais le
   build dans le zip.

### 1.5 Sources de vérité par donnée

| Donnée | Vit dans | Ne PAS lire ailleurs |
|---|---|---|
| Montant TVAC d'une affaire | `scenarios.resultats.tvac_centimes` | `affaires` (rien), en-têtes recalculés |
| Inventaire | `affaires.releve` (JSON) | table `releve` (n'existe pas) |
| Barème + suppléments | `organisations.parametres_prix` | constantes du domaine (défauts seulement) |
| TVA % | `parametres_facturation.tva_pct` via `tauxTva()` | `TVA_PCT` en dur |
| Document d'offre | `documents_instances.contenu` + `empreinte_sha256` | recomposition à la volée après gel |
| Identité facturation client | `clients.fact_*`, `tva_num` | adresses de chantier |

---

## 2. Méthode d'audit reproductible

Copier-coller depuis la racine du repo. Chaque bloc détecte une classe
d'incohérence. C'est cette batterie qui a produit le registre §3.

```bash
# A. RPC appelées vs définies (l'écart = appels qui casseront en réel)
grep -oE 'supabase\.rpc\("[a-z_]+"' apps/web/src/lib/adaptateur.js \
  | sed 's/.*"\(.*\)"/\1/' | sort -u > /tmp/rpc.txt
cat supabase/migrations/*.sql \
  | grep -oiE 'create (or replace )?function (public\.)?[a-z_]+' \
  | sed -E 's/.*function (public\.)?//i' | sort -u > /tmp/fn.txt
comm -23 /tmp/rpc.txt /tmp/fn.txt          # doit être VIDE

# B. Tables utilisées vs créées
grep -oE '\.from\("[a-z_]+"\)' apps/web/src/lib/adaptateur.js \
  | sed 's/.*"\(.*\)".*/\1/' | sort -u > /tmp/t1.txt
cat supabase/migrations/*.sql \
  | grep -oiE 'create table (if not exists )?(public\.)?[a-z_]+' \
  | sed -E 's/.*(public\.| )([a-z_]+)$/\2/' | sort -u > /tmp/t2.txt
comm -23 /tmp/t1.txt /tmp/t2.txt           # doit être VIDE

# C. Exports adaptateur jamais importés (code mort ou fonctionnalité sans UI)
grep -oE '^export (async )?function [a-zA-Z]+|^export const [a-zA-Z]+' \
  apps/web/src/lib/adaptateur.js | sed -E 's/export (async )?(function|const) //' \
  | sort -u | while read n; do
    grep -rqw "$n" apps/web/src --include=*.jsx --include=*.js \
      --exclude=adaptateur.js || echo "ORPHELIN: $n"; done

# D. Écrans jamais importés
for f in apps/web/src/ecrans/*.jsx apps/web/src/ecrans/vitrine/*.jsx; do
  b=$(basename "$f" .jsx)
  grep -rq "/$b.jsx\"" apps/web/src || echo "ORPHELIN: $f"; done

# E. Résidus de schéma inventé (doit rester vide)
grep -rn '\.reference\b' apps/web/src | grep -v reference_ext
grep -rn 'from("releve")' apps/web/src

# F. RPC ouvertes à anon (à comparer à la liste fermée de §1.2)
grep -n "grant execute .* to anon" supabase/migrations/*.sql

# G. Tests + build (toujours les deux, jamais l'un sans l'autre)
npm test 2>&1 | grep -E "^# (pass|fail)"
cd apps/web && VITE_SUPABASE_URL=https://x.supabase.co \
  VITE_SUPABASE_ANON_KEY=x npx vite build 2>&1 | grep -E "built|error"
```

Compléments manuels : cohérence des `grant`/`revoke` après chaque nouvelle
fonction ; pour toute nouvelle colonne JSON de `organisations`, vérifier la
whitelist `CHAMPS_ORG_MODIFIABLES` de l'adaptateur.

---

## 3. Registre des incohérences (audit du 2026-07-26)

Sévérité : **P0** casse ou peut casser en production · **P1** fonctionnalité
construite mais inopérante/incomplète · **P2** dette, doublon, décision à
trancher.

### INC-01 · ✅ CLOS le 2026-07-28 · Le repo ne contient pas sa propre base
`supabase/migrations/` s'arrête à **0043**. Les migrations 0044→0057 vivent
hors du dépôt (téléchargements + base pour 0044–0049b appliquées via
connecteur). La source de vérité SQL est éparpillée : un clone frais ne peut
pas reconstruire la base. **Réglé** : `supabase/migrations/` contient désormais 0001→0058 (63 fichiers). Les 0044→0049b ont été rapatriées depuis `supabase_migrations.schema_migrations` (Supabase conserve le SQL des migrations enregistrées), les 0050→0057 depuis les livraisons, la 0058 écrite ce jour. Un clone frais peut reconstruire la base.

### INC-02 · ✅ CLOS le 2026-07-28 · `cmd_terminer_chantier`
`Terrain.jsx:163` (bouton « Terminer le chantier ») → adaptateur →
`supabase.rpc("cmd_terminer_chantier")`. Introuvable dans les 45 fichiers du
repo ET dans les migrations en attente ; seulement citée en commentaire
(0034). Elle a probablement été créée en base via connecteur sans que le .sql
soit archivé — invérifiable, connecteur coupé. **Action** : migration 0058 de
rattrapage qui la (re)définit (idempotente : `create or replace`), pour que le
repo redevienne complet et que le bouton soit garanti.

### INC-03 · ✅ CLOS le 2026-07-28 · Signature ne marquait pas le document
`cmd_offre_signer` (0054/0055) fait `transition_interne('confirmee')` et
consomme le code, mais **ne touche pas** `documents_instances.statut`. Or le
badge « ✓ Offre signée » de l'espace client et l'écran Offre lisent
`statut = 'signee'`. Une offre signée par « Lu et approuvé » ne s'affichera
jamais comme signée. **Réglé (0058)** : la signature client marque désormais l'instance `statut='signee', gele=true` ET inscrit une ligne dans `signatures` (canal `client_en_ligne`), comme le fait `cmd_signer_instance` au bureau. Prouvé par test réel.

### INC-04 · P1 · Moteur comptable sans interface
`facturation/exports.js` (CSV BOM, journal des ventes PCMN, **FEC**) n'est
importé par **aucun écran**. Tout le livrable comptable de la phase 3 est
inatteignable pour l'utilisateur. Corollaire : `listerFactures` (adaptateur)
est orphelin — il n'existe aucune vue « toutes mes factures ». **Action** :
écran « Comptabilité » (liste des factures émises par période + boutons
CSV / journal / FEC).

### INC-05 · P1 · Clôture de paie sans bouton
0048 a créé `paie_periodes` ; l'adaptateur exporte `cloturerPeriodePaie` /
`obtenirPeriodePaie` — jamais importés. La clôture mensuelle n'a pas d'UI.
**Action** : bouton « Clôturer le mois » dans Coûts → Paie.

### INC-06 · P1 · Espace client : champ mort + page coordonnées absente
`EspaceClient.jsx:134,289` affiche `d.reference` / `o.reference` — champ que
les RPC 0055 **ne renvoient plus** (colonne inexistante) : affichage vide.
Et `clientProfil` (`cmd_client_profil`, coordonnées du client) n'est jamais
appelé — la promesse « dossier = données personnelles » est incomplète.
**Action** : retirer les `reference`, afficher les coordonnées via
`clientProfil` dans l'onglet Dossier.

### INC-07 · ✅ CLOS le 2026-07-28 · `peppol_id` avait deux sources
Colonne `organisations.peppol_id` (0049) ET clé
`parametres_facturation.peppol_id` (écrite par l'écran Identité). La lecture
tolère les deux (`org.peppol_id || pf.peppol_id`), mais l'écriture ne remplit
que le JSON : la colonne dédiée restera vide pour toujours. **Réglé (0058)** : les deux sources étaient vides en production. Source unique retenue = `parametres_facturation.peppol_id` (ce que l'écran écrit) ; la colonne `organisations.peppol_id` est retirée et l'adaptateur ne lit plus qu'elle.

### INC-08 · P2 · partiellement traité · Code mort dans l'adaptateur
✅ Retirés le 2026-07-28 avec le double minuteur : `chronoDemarrer`,
`chronoArreter`, `chronoPause` (remplacés par le pointage déclaré ; les RPC
`cmd_chrono_*` restent en base, sans appelant).
Orphelins restants : `signerOffre` (ancien pad bureau — sa RPC
`cmd_signer_instance` n'est plus appelée par personne), `listerClients`,
`creerAffaire` (vs `creerDossierVide`), `creerMission`, `creerDossierTerrain`,
`supprimerVehicule`, constantes `CAPACITES`, `FICHIER`. **Action** : supprimer
ou brancher, un par un — chaque orphelin est soit une dette, soit une
fonctionnalité oubliée (les distinguer avant de tailler).

### INC-09 · P2 · Triple import du même module dans `main.jsx`
Lignes 12, 19, 34 importent `./lib/adaptateur.js`. Légal en ESM, illisible.
**Action** : fusionner en un import.

### INC-10 · P2 · La remise s'applique aux suppléments
Dans `recetteHtvaCentimes`, la remise % est calculée APRÈS l'ajout des
suppléments variables : une remise de 10 % remise aussi le piano. Défendable,
mais c'est une décision de gestion jamais actée. **Action** : Raphaël tranche ;
documenter dans le barème quel que soit le choix.

### INC-11 · P2 · Décision produit ouverte — offres multi-entreprises
L'espace client rapproche les offres par e-mail : l'entreprise B n'a pas
consenti à ce que son prix soit comparé chez A. Ouvert depuis la session
espace client. **Action** : décision (statu quo / restreindre au dossier
d'origine / opt-in réseau).

### INC-12 · P0 · ✅ CLOS le 2026-07-28 · `cmd_offre_apercu` était cassée
La fonction triait les documents par `di.created_at` — colonne **inexistante**
(`documents_instances` porte `genere_le`). Toute lecture d'offre par un client
levait une erreur : **le client ne pouvait pas voir l'offre à signer**. Ni les
tests ni le build ne pouvaient le détecter (SQL non typé côté app), seul un
appel réel le révèle. **Réglé (0058)** : tri sur `genere_le`, instance gelée
priorisée. Leçon : ajouter au registre §1.4 — une colonne de tri inventée est
la même famille d'erreur que la table inventée.

### INC-13 · P0 · ✅ CLOS le 2026-07-28 · La signature client échouait toujours
`cmd_offre_signer` appelait `transition_interne(affaire, 'confirmee', jsonb)` :
l'état valide est **`confirme`** (sans e final) et `transition_interne` ne
prend que **deux** arguments. L'appel levait, et le `exception when others`
transformait l'échec en message trompeur (« pas dans un état permettant la
signature »). La signature échouait donc **à tous les coups** en donnant une
fausse explication. **Réglé (0058)** : bon état, bon arity, et on lit le
booléen retourné par `transition_interne` (qui est tolérante) au lieu de
supposer le succès. Le `exception when others` aveugle est supprimé.
Leçon : un `exception when others` qui réécrit le message masque la cause —
ne jamais en poser sur un chemin métier.

### INC-14 · P0 · ✅ CLOS le 2026-07-28 · pgcrypto hors du search_path
« function gen_random_bytes(integer) does not exist » à la génération d'un code
de signature. Sur Supabase, pgcrypto est installée dans le schéma `extensions`,
et nos fonctions figent `search_path = public` : l'extension est présente mais
**inatteignable depuis la fonction**. Le contrôle « l'extension est-elle
installée ? » (fait en 0055) ne prouve donc rien — il faut tester l'appel
DEPUIS le search_path réel. **Réglé (0059)** en qualifiant
`extensions.gen_random_bytes`, sans relâcher le search_path.
Leçon, à ranger avec §1.4 : *un objet installé n'est pas un objet accessible*.

### Hors code (rappels d'état, pas des découvertes)
✅ Migrations 0050→0057 appliquées (vérifié en base le 2026-07-28) ·
✅ `visible_reseau` activé pour Roovers (annuaire peuplé) ·
repo GitHub **public** avec IBAN dans l'historique → repasser privé ·
Edge Function `inviter-membre` non déployée (aucun mail d'invitation ne part) ·
contrat Digiteal (sales@digiteal.eu) · relecture avocat CGV/DPA · assurance
RC Pro/cyber · le compte Google de Raphaël est rattaché à Roovers (tester
l'inscription société avec une autre adresse) · `git rm` de l'ancienne
`ecrans/Landing.jsx` (et `Portail.jsx` si encore présent sur le distant).

---

## 4. Ce que l'audit n'a PAS pu vérifier

Le connecteur Supabase est coupé : l'état **réel** de la base (fonctions
présentes, migrations effectivement appliquées, données) est invérifiable
d'ici. Les requêtes de contrôle en commentaire de chaque migration 0050→0057
sont le moyen de vérité côté Raphaël. Le point le plus sensible :
confirmer que `cmd_terminer_chantier` existe en base (sinon INC-02 est un
bouton cassé en production, pas seulement un trou d'archive).
