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

### INC-04 · ✅ CLOS le 2026-07-29 · Moteur comptable sans interface
`facturation/exports.js` (CSV BOM, journal des ventes PCMN, **FEC**) n'est
importé par **aucun écran**. Tout le livrable comptable de la phase 3 est
inatteignable pour l'utilisateur. Corollaire : `listerFactures` (adaptateur)
est orphelin — il n'existe aucune vue « toutes mes factures ». **Réglé** : écran Comptabilité (Paramètres →
Comptabilité) + `facturesCanoniquesPeriode` dans l'adaptateur — la pièce
réellement manquante était la conversion vers le modèle canonique, pas l'écran.

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

### INC-15 · P0 · ✅ CLOS le 2026-07-29 · Écran blanc du planning
`Planning.jsx` utilisait `hhmm`, `resumeHoraires`, `verifierHoraires` et
`HEURE_DEFAUT` **sans les importer** : une substitution de la veille avait
manqué sa cible et l'import n'avait jamais été ajouté. Conséquence :
`ReferenceError` à l'ouverture → page blanche. **Ni `npm test` ni le build ne
l'attrapent** (l'écran n'est pas exécuté, et Rollup n'échoue pas sur un
identifiant libre). **Réglé** : import ajouté, et surtout un **test statique**
(`packages/domaine/tests/imports-ecrans.test.js`) qui compare les exports du
domaine aux imports de chaque écran. Cette classe d'erreur ne peut plus sortir.
Leçon : après une substitution de texte, VÉRIFIER qu'elle a mordu — un
`assert` sur le résultat, pas un « ok » imprimé.

### INC-16 · P0 · ✅ CLOS le 2026-07-29 · Heures de mission jamais mappées
`listerMissions` **sélectionnait** `heure_depart_prevue` et
`heure_arrivee_prevue` mais ne les recopiait pas dans l'objet renvoyé : le
bureau ne voyait donc jamais les heures qu'il venait d'enregistrer. **Réglé.**
Leçon : dans l'adaptateur, `select` et mapping sont deux endroits — ajouter une
colonne demande les deux.

### INC-17 · ✅ CLOS le 2026-07-29 · Facture émise sur un dossier non facturable
`Dossier.jsx` : `facturable = ["confirme","effectue","facture","paye"]`. Or
`transition_permise` n'accepte que `effectue → facture`. Depuis `confirme`,
`cmd_emettre_facture` appelle `transition_interne(affaire,'facture')` qui
**renvoie false sans lever** : la facture est émise avec son numéro légal, le
dossier reste « confirmé », et le paiement s'enregistre par-dessus. D'où le
symptôme « confirmé et payé en même temps ». **Cause commune** avec INC-18 :
personne ne lit le verdict de `transition_interne`. **Réglé (0064)** : les deux cycles sont séparés ; `cmd_emettre_facture` ne
transitionne plus rien et contrôle explicitement l'état ; l'argent est dérivé.

### INC-18 · ✅ CLOS le 2026-07-29 · Annuler une annulation ne fait rien
`cmd_reprendre_affaire` (0045b) appelle
`transition_interne(p_affaire,'confirme')` depuis l'état `annule`. Or
`transition_permise` ne contient **aucune** paire au départ de `annule` : la
transition échoue silencieusement, seul `archive_le` est remis à null, et la
fonction renvoyait un succès mensonger. **Réglé (0064 + 0065)** : `annule` a
des sorties, l'état d'avant est mémorisé et restauré, et `transition_exigee`
lève au lieu de mentir.

### INC-19 · ✅ CLOS le 2026-07-29 · Double affectation invisible
Dans `Planning.jsx` : `const verdict = estAffecte ? null : conflitPour(...)`.
Le conflit n'est donc **jamais** évalué pour un membre déjà affecté — un homme
sur deux chantiers le même jour n'est signalé nulle part. De plus le rendu de
conflit est rouge (`C.rouge`), alors qu'un « déjà pris » devrait se distinguer
d'un « en congé ». Aucun contrôle n'existait pour les véhicules.
**Réglé** : `disponibiliteRessource` (domaine) rend un verdict à trois niveaux
— libre / double (orange, avertissement) / indisponible (rouge, congé) —
calculé **quelle que soit** l'affectation courante, et appliqué aux membres
comme aux camions. Une alerte remonte au niveau de la carte de mission.
Leçon : une condition d'affichage de la forme `dejaFait ? null : verifier(...)`
masque précisément le cas qu'on cherche à voir.

### INC-20 · ✅ CLOS le 2026-07-29 · Deux rendus concurrents pour l'offre
`Contrat.jsx` (238 lignes, écran) et `lib/pdfOffre.js` (180 lignes,
téléchargement) rendent le même document par deux chemins distincts : ils
divergent par construction, et c'est pourquoi le PDF n'est pas la copie exacte
de l'offre affichée. Contredisait le verrou « une source de vérité, plusieurs
sorties ». **Réglé (D2)** : `lib/pdfOffre.js` supprimé, le navigateur imprime
le composant `Contrat`. Ce qui s'imprime EST ce qui s'affiche.

### INC-21 · P1 · ✅ CLOS le 2026-07-29 · Bouton « Clore le dossier » invisible
`Facture.jsx` n'affichait ce bouton que si `affaire.etat === "paye"` — un état
qu'aucun dossier n'atteignait jamais (conséquence d'INC-17). La clôture était
donc **impossible depuis l'origine**, sans que rien ne le signale. **Réglé** :
condition rattachée au solde réel (cycle de facturation) ET à l'exécution du
déménagement (cycle opérationnel). Leçon : une condition d'affichage qui
dépend d'un état jamais atteint est un mort silencieux — les chercher en
croisant les états produits et les états attendus.

### INC-22 · P1 · ✅ CLOS le 2026-07-29 · Catalogue de meubles codé en dur
`Releve.jsx` portait une constante `CATALOGUE` (meubles par pièce) invisible du
paramétrage : un déménageur ne pouvait rien y ajouter, et ses libellés
(« Canapé 3pl », « Lit 160 ») divergeaient des volumes de référence du domaine.
Deuxième source de vérité, même famille que la liste de fournitures dupliquée
dans Cout.jsx corrigée plus tôt. **Réglé** : suggestions issues du catalogue
(`meubles_par_piece`), avec socle par défaut pour qu'une entreprise neuve soit
utilisable immédiatement. Leçon : toute liste métier affichée dans un écran
doit venir du domaine ou du paramétrage — jamais d'une constante d'écran.

### INC-23 · P0 · ✅ CLOS le 2026-07-29 · Une offre signée pouvait être remplacée
`cmd_instancier_offre` n'effectuait aucun contrôle : on pouvait instancier une
nouvelle offre sur un dossier dont l'offre était déjà signée. Comme
`obtenirInstance` retenait la PLUS RÉCENTE, la signature du client cessait
d'apparaître — alors qu'elle restait en base. Problème de preuve, pas
d'ergonomie. **Réglé (0066)** à deux niveaux : la commande refuse, et un
trigger interdit de dé-signer ou d'altérer le contenu d'une instance signée,
quel que soit le chemin. Le trigger est le vrai garde-fou — il tient même si
une commande future oublie le contrôle. `obtenirInstance` privilégie désormais
l'instance signée. Vérifié en base : les deux tentatives sont refusées.

### INC-24 · P1 · ✅ CLOS le 2026-07-29 · `Number("")` vaut 0, encore
En rendant la validité de l'offre paramétrable, un champ VIDE donnait
`Number("") === 0`, borné à 1 → offre valable 24 h sans que personne l'ait
demandé. **Cinquième occurrence** de ce piège (quatre fois en paie). Réglé en
testant l'absence AVANT de convertir. Ce motif mérite un helper partagé
(`nombreExplicite` existe déjà dans `rh/paie.js`) — à généraliser.

### INC-25 · P0 · ✅ CLOS le 2026-07-29 · Terrain sans aucun contrôle d'accès
Les quatre commandes terrain (`cmd_pointage_definir`, `cmd_pause_ajouter`,
`cmd_pause_retirer`, `cmd_terminer_chantier`) ne vérifiaient **aucune**
capacité — seulement l'appartenance à l'organisation. Tout membre pouvait
déclarer des heures sur une mission où il n'était pas affecté et clôturer le
chantier d'une autre équipe. Corollaire : le rôle `chef_equipe` portait
exactement les mêmes capacités qu'un déménageur. **Réglé (0067)** : capacités
`pointer_chantier` et `cloturer_chantier`, règle d'affectation
(`est_affecte_mission`), bureau conservant la main via `gerer_planning`.
Leçon : lors de l'ajout d'un module (ici le pointage déclaré, 0060), vérifier
que chaque nouvelle commande porte un contrôle — l'absence de contrôle ne
produit aucune erreur, elle ne se voit qu'à l'audit.

### INC-26 · P0 · ✅ CLOS le 2026-07-29 · TVA à 0 % sur toutes les factures
En production, **toutes** les lignes de `facture_lignes` portent `tva_pct` à
NULL : la colonne a été ajoutée en 0049 sur des lignes existantes. Or
`modele.js` faisait `Number.isFinite(Number(tva_pct)) ? Number(tva_pct) : null`
— et `Number(null)` vaut **0**, qui est fini. Chaque ligne sans taux devenait
donc **0 %**. Conséquences si l'export était parti : déclaration TVA à zéro, et
UBL Peppol émis avec 0 % de TVA. Le bug était invisible à l'écran (le TVAC
affiché vient de `scenarios`, pas du modèle) et n'apparaissait qu'au moment de
produire le journal comptable.

**SIXIÈME occurrence** du piège `Number(null)/Number("") === 0` (4× paie,
1× validité d'offre, 1× ici). **Réglé** par un helper partagé
`packages/domaine/src/noyau/nombres.js` (`nombre`, `ouDefaut`, `estFourni`,
`borne`), adopté par `modele.js`, `rh/paie.js` et `documents/cgv.js`. Un taux
0 % **voulu** (export hors UE) reste distinct d'un taux absent — testé.
Leçon définitive : ne jamais écrire `Number(v) || defaut` ni
`Number.isFinite(Number(v))` sur une valeur qui peut manquer ; passer par
`noyau/nombres.js`.

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
