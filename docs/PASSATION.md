# Dashprod — Passation de session

> **À lire en entier avant de coder.** Ce document permet à une nouvelle
> conversation de reprendre le travail sans rien casser ni rien réinventer.
>
> **Dernière mise à jour :** 23/08/2026 — après le lot 34.
> **À mettre à jour tous les 7 messages**, ou en fin de conversation.
> Procédure de mise à jour : §9.

---

## 1. Le projet

**Dashprod** — ERP SaaS vertical pour les entreprises de déménagement belges.
Raphaël en est le fondateur solo. Client pilote : **Roovers**
(`5de63170-6a61-4e94-a84c-fd6bce4c2f9c`).

**Pile :** React/Vite SPA en **JS pur (jamais de TypeScript)**, Supabase
PostgreSQL (projet `usldgiordguqchclvdms`), Vercel, domaine `dashprod.com`.

**Monorepo :**
- `packages/domaine` — logique métier pure, sans framework, alias `@domaine`,
  testée avec le **runner natif de Node** (`node --test`)
- `apps/web` — l'interface

**Bac à sable :** `/tmp/dp`, cloné de `github.com/vancraphael-coder/dashprod-erp`.

---

## 2. Comment on livre — à respecter à la lettre

1. **Travailler dans `/tmp/dp`.** Au début d'une session : `git fetch origin`,
   puis **comparer fichier par fichier** l'arbre de travail à `origin/main`
   avant de supposer quoi que ce soit sur ce qui est déployé.
2. **Les migrations s'appliquent EN LIVE** via le MCP Supabase
   (`apply_migration`), numérotées séquentiellement, nommées en clair.
3. **Livrer un zip par lot** : uniquement les fichiers modifiés, plus un
   `NOTE.md`, plus un **stub de référence** pour chaque migration appliquée
   (le SQL réel est déjà en base ; le stub documente).
4. Raphaël dépose le zip sur GitHub par glisser-déposer → Vercel redéploie.
5. **Avant chaque zip, sans exception :** `npm test` **et**
   `cd apps/web && npm run build`. Les deux verts, ou pas de livraison.

---

## 3. Les pièges vérifiés sur le terrain — ne pas réapprendre à ses dépens

### 3.1 PL/pgSQL ne résout les noms qu'à l'EXÉCUTION
**Six bugs de ce type dans cette session**, dont deux préexistants qui
rendaient des fonctionnalités entièrement mortes.

`apply_migration` **réussit** même si le corps d'une fonction vise une table ou
une colonne inexistante. La fonction plante à la première utilisation réelle,
en production.

> **Règle absolue : après chaque `apply_migration` créant une fonction
> PL/pgSQL, EXÉCUTER la fonction ou sa requête** dans un bloc
> `do $$ ... raise exception 'ROLLBACK volontaire' $$`.

Les six trouvés : `affectations` (→ `mission_affectations`), `depot_id`
(→ `centre_id` sur `stock_contrats`), `created_at` (→ `ouvert_le` sur
`litiges`), `tvac_centimes` (n'existe pas sur `affaires` — il vit dans
`scenarios.resultats`), et deux autres du même profil.

**Avant d'écrire un insert/update :** lire la structure réelle avec
```sql
select string_agg(column_name, ', ' order by ordinal_position)
from information_schema.columns where table_schema='public' and table_name='…';
```
**Avant de réécrire une fonction :** `select prosrc from pg_proc where proname='…'`.

### 3.2 Vite ne détecte pas un identifiant manquant dans du JSX
Le build passe, l'écran est **blanc en production**. Arrivé une fois dans cette
session (`Contrat.jsx`) parce qu'un script d'édition avait échoué en silence.

> Après édition par script, **vérifier que chaque identifiant utilisé est
> déclaré** dans le fichier ou importé. Ne jamais se fier au succès du build.

Il existe déjà `packages/domaine/tests/imports-ecrans.test.js` qui scanne tout
`apps/web/src`.

### 3.3 Doublons d'adaptateur silencieux
`grep -c "export async function <nom>" apps/web/src/lib/adaptateur.js` **avant**
d'ajouter une fonction. Deux exports du même nom : le second écrase le premier
sans erreur. Évité de justesse pour `stockContrats`.

### 3.4 `Number(null) === 0`
Le piège récurrent du projet. Un helper partagé existe :
`packages/domaine/src/noyau/nombres.js` → `nombre(v)` rend **NaN** pour
`null`/`""` mais préserve un `0` explicite.

Occurrences traitées : étage `0` = rez-de-chaussée ≠ non renseigné ;
`etage_max` d'un lift non renseigné ≠ 0 ; `jours_couverts` absent → mois plein,
pas zéro.

### 3.5 Les couleurs écrites en dur cassent le mode nuit
Le fond de nuit est `#070B18`. Une ombre noire y est **invisible** ; un pastel
clair y devient un pavé aveuglant. Toujours passer par les jetons `C.*` et
`couleurPlanning(cle)` / `couleurUtilite(app, famille, cle)`.

`packages/domaine/tests/mode-nuit.test.js` refuse la récidive (liste noire de
pastels, interdiction de `C.violet`).

### 3.6 Les colonnes NOT NULL sans valeur par défaut
`scenarios.resultats` est **NOT NULL sans défaut**. Un insert qui l'omet fait
échouer l'enregistrement avec un message Postgres brut, illisible pour
l'utilisateur. Bug introduit au lot 2b-2, remonté par Raphaël en production.

> Avant tout `insert` : vérifier `is_nullable` **et** `column_default`
> ```sql
> select column_name, is_nullable, column_default from information_schema.columns
> where table_schema='public' and table_name='…';
> ```

### 3.7 Les triggers d'état ne se testent pas au SQL nu
`affaires.etat` est protégé par `bloquer_update_etat()` : tout UPDATE hors
`cmd_transition_affaire` est refusé, et `session_replication_role` n'est pas
accessible sur Supabase. Pour valider un trigger de confirmation, **exercer
séparément chaque lecture et chaque insert de son corps** dans un bloc
`do $$ … rollback $$` — c'est ce qui a validé 0130.

### 3.8 Intégrer au bon endroit, pas seulement intégrer
La Bille du lot 10c ne vivait que dans les volets de mission, qui ne
s'affichent **qu'après confirmation**. Techniquement intégrée, pratiquement
invisible — Raphaël l'a dit tel quel : « tu ne l'as mise nulle part ».

> Après avoir posé un élément d'interface, se demander **dans quel état du
> dossier il apparaît réellement**. Un composant derrière une condition rare
> n'est pas livré.

### 3.9 Les tests statiques
Plusieurs tests lisent les **sources** d'`apps/web` plutôt que d'importer
(l'alias `@domaine` n'est résolu que par Vite). Ils ignorent les commentaires
via `sansCommentaires()` — sinon un commentaire citant le bug fautif
déclencherait le garde-fou.

### 3.10 Un déclencheur qui DIFFUSE : la vraie garde est « qu'est-ce qui a changé »
Payé **trois fois** maintenant, toujours de la même façon : une fonction qui
recopie une donnée depuis le parent vers ses enfants s'exécute *à chaque*
update, y compris quand personne n'a touché à la donnée en question.

- 0130 : le report d'équipe se refaisait à **chaque confirmation** — retirer
  quelqu'un puis reconfirmer le réajoutait.
- 0134 : `sync_dossier_vers_missions` réécrivait **toutes** les missions à
  chaque enregistrement du dossier. Renommer un client suffisait à écraser
  l'affectation de la visite.
- 0135 : la version correcte compare d'abord — `if new.equipe is distinct from
  old.equipe` — et traite équipe et véhicules **séparément** (les réécrire
  ensemble faisait qu'un changement de camion réinjectait l'équipe).

**La règle** : avant d'écrire, un déclencheur de synchronisation demande
*qu'est-ce qui a changé*, *quelle cible exactement*, et *cette cible est-elle
encore modifiable* (jamais une mission dont les heures sont pointées). Trois
questions, trois gardes.

### 3.11 Un `UPDATE` qui ne trouve rien ne dit rien
`update missions … where type = 'emballage'` sur une affaire qui n'a pas encore
de mission d'emballage : zéro ligne touchée, **aucune erreur**. La date était
posée, le dossier semblait prêt, et personne n'était réclamé pour ce jour-là.
Le modèle correct était déjà dans le code, deux fonctions plus loin
(`sync_visite_vers_mission`) : `if not found then insert`. **Chaque UPDATE de
synchronisation doit décider quoi faire quand il ne trouve rien.**

### 3.12 Vérifier l'existant AVANT d'écrire le correctif
Le rattrapage des dossiers confirmés (§5) était planifié depuis deux lots.
Trois requêtes de comptage ont montré qu'il **n'y avait aucun trou** : le code
aurait été mort. Mais *chercher* le trou a révélé deux bugs de production bien
réels. Compter d'abord coûte trois minutes et change ce qu'on écrit.

### 3.13 Un doublon d'interface MASQUE les bugs de la donnée qu'il double
En retirant le sélecteur « Équipe » du dossier (lot 10f), deux bugs sont
apparus d'un coup — tous deux vieux, tous deux invisibles jusque-là :
`sync_mission_vers_dossier` ne miroitait que le déménagement (donc un lift
affecté au planning était chiffré sans personne), et l'avertissement « ce lift
ne monte pas assez haut » vivait sous ce sélecteur.

Un second chemin d'écriture **compense** silencieusement le premier : tant que
les deux existent, la panne du premier ne se voit pas. C'est pourquoi
supprimer un doublon doit se faire avec les tests statiques allumés — c'est le
test des étages qui a rattrapé l'avertissement perdu.

---

### 3.14 Styles EN LIGNE : pas de `:focus`, `:hover` ni `::placeholder`
Tout l'app style en ligne (`S.input`, etc.). Conséquence longtemps invisible :
un champ ne pouvait PAS réagir au clic — pas d'anneau de focus, pas de survol,
un placeholder de la même encre que la saisie. On ne voyait pas où l'on
écrivait. Les pseudo-classes n'existent qu'en CSS.

La bonne réponse n'est pas de bricoler chaque champ mais **une feuille unique
appliquée par sélecteur** (`input, textarea, select`) — injectée dans
`theme.jsx` (`id="champs-dashprod"`). Une source, effet sur les 32 champs. Le
`!important` du `:focus` l'emporte volontairement sur le style en ligne.

Même principe pour tout comportement d'état d'un élément stylé en ligne : si
ça a besoin d'un `:hover`/`:focus`/`:nth`/media-query, ça va dans une feuille,
pas dans mille attributs `style`.

### 3.16 Un fond clair EN DUR ignore le mode nuit
`background: "#fff"` (ou un bleu clair littéral) ne suit pas le thème : il reste
blanc quand l'app passe en sombre — un pavé lumineux sur le fond nuit. Le jeton
`C.blanc` / `C.bleuClair` vire au sombre. Toujours passer par le jeton pour un
FOND. En revanche `color: "#fff"` (texte sur un aplat coloré) est légitime : il
doit rester blanc dans les deux modes.

Légitimement clairs, donc EXCLUS du garde-fou : la vitrine (identité propre) et
les DOCUMENTS imprimables (un devis PDF est blanc partout). Test :
`mode-nuit.test.js` refuse tout fond blanc en dur ailleurs.

## 4. Le modèle du produit — invariants à respecterpas défaire

### 4.1 Cinq NATURES, quatre MÉTIERS distincts
`@domaine/commercial/natures.js` est la **source unique**.

| nature | métier | particularité |
|---|---|---|
| `demenagement` | Déménagement | seul parcours complet (relevé, emballage) |
| `sous_traitance` | Multi-sectoriel | on est PRESTATAIRE = recette. Hommes + camion si fourni + km, prix négocié |
| `lift` | Flottes nationales | couronnes km, temps inclus par couronne |
| `boxe` | Garde-meubles (type Shurgard) | **récurrent**, prix par tranche de m³ |
| `zone` | Logistique (futur scan QR) | **récurrent**, forfait négocié |

**Raphaël insiste :** ce sont des métiers à part entière, susceptibles d'être
utilisés intensivement. Ne jamais les traiter comme des variantes du
déménagement.

`nature` ≠ `formule`. `formule` (tarifaire/forfait) dit **comment on chiffre**.
`nature` dit **ce qu'on vend**.

### 4.2 Le chiffrage du lift — exact, validé par Raphaël
1. La **couronne** (distance depuis le centre) donne le prix de base
2. Elle **inclut un temps sur place, propre à chaque couronne**
3. Le dépassement se facture à l'heure (heure entamée due)
4. **Un homme supplémentaire reprend TOUT le temps sur place mais NE DOUBLE
   PAS le prix** — il a son supplément horaire, fixé par le bureau. Doubler
   reviendrait à facturer deux fois le déplacement et la machine.

Grille par centre, **repli sur la maison mère**, et le résultat dit toujours
d'où vient la grille (`origine`: `centre` | `maison_mere` | `defaut`).

### 4.3 Boxe vs Zone — deux modèles de prix délibérément différents
- **Boxe** : prix au volume, box par box. **Deux boxes se CUMULENT.**
- **Zone** : forfait sur le **contrat entier**. Rattacher une deuxième zone
  **NE double PAS** le prix — c'est le sens d'un forfait.

**Le box se vend de deux façons, au choix de l'entreprise** (0135 / lot 10e —
Raphaël : « ajouter », pas remplacer) :

| mode | pour qui | règle |
|---|---|---|
| `tranches` | déménageur local | premier palier qui couvre le volume ; au-delà du dernier → **hors barème**, jamais un prix inventé |
| `exact` | garde-meubles type Shurgard | `volume × prix/m³`, **minimum mensuel** appliqué au mois *puis* multiplié par la période ; sans prix/m³ ou sans volume → **hors barème** |

Stocké dans `organisations.parametres_prix.stockage_boxes`. **Lecture toujours
via `lireBareme()`** : les entreprises d'avant ce lot y ont un simple *tableau*
de tranches. Écrire sans relire aurait mis à zéro le prix de tous les boxes
loués, en silence. Changer de mode **n'efface pas** les tranches saisies.

### 4.4 Les adresses suivent le métier
`@domaine/commercial/adresses.js`. Les clés de stockage restent `charges` /
`decharges` (pas de migration), mais leur **sens** change :

| nature | groupes |
|---|---|
| demenagement | Chargement → Déchargement |
| lift | **Adresse 1…5** numérotées (il ne charge rien) |
| sous_traitance | Enlèvement (facultatif) → **Livraison 1…5** |
| zone | Arrivée / Enlèvement (flux, les deux facultatifs) |
| boxe | Enlèvement (facultatif, max 2) |

### 4.5 La vérité des affectations
`@domaine/planning/affectation.js`. **Vide par défaut, rien n'est repris d'une
mission à l'autre** (décision explicite de Raphaël).

| mission | équipe | véhicule |
|---|---|---|
| visite | exactement 1 | aucun |
| emballage | ≥ 1 | facultatif |
| demenagement | ≥ 2 | camion requis |
| lift | ≥ 1 | **lift requis** (un fourgon est une erreur) |
| sous_traitance | ≥ 1 | facultatif |

Voyant à **trois états** : gris (vide) / orange (partiel) / vert (complet).
Bulle en relief, liseré de carte assorti, flèche pour dérouler.
**Rien n'est bloquant** : on signale avec le motif, on n'interdit pas.

**L'équipe et les véhicules du DOSSIER sont ceux du JOUR PRINCIPAL** (0135,
décision de Raphaël : « les membres font partie de la vérité d'un dossier »).
La relation vit dans les deux sens, mais elle ne vise **que** la mission
principale — déménagement / lift / sous-traitance :

| geste | effet |
|---|---|
| cocher un membre sur le dossier | affecte la mission principale |
| affecter la mission principale au planning | se voit sur le dossier |
| visite et emballage | **jamais touchés** : leur équipe est à eux |

Trois gardes, chacune contre un défaut réellement constaté :
`equipe`/`camions` inchangés → on ne touche à rien (renommer un client
réécrivait l'affectation) ; équipe et véhicules traités **séparément** (changer
un camion réinjectait l'équipe) ; missions `planifiee`/`en_cours` seulement (on
ne réaffecte pas une journée dont les heures sont pointées).
La boucle avec `sync_mission_vers_dossier` est tenue par `pg_trigger_depth()`
des deux côtés.

### 4.6 La Bille — la mascotte
`apps/web/src/composants/Bille.jsx`. Vient des cartes d'abonnement de la
vitrine, et **une seule définition sert partout** : voyants d'affectation,
pastilles de métier, flèches de dépliage, croix, attentions.

La recette vit dans **`apps/web/src/lib/matiere-bille.js`**, une seule fois,
**en fractions du diamètre `--b`** : une puce de 14 px et une vedette de 84 px
sont le *même objet à deux échelles*. Toute mesure figée dans la matière est
refusée par un test.

Quatre ingrédients à ne jamais simplifier : l'**huile** irisée qui tourne avec
la lumière (deux teintes — chaque ton porte sa **contre-lumière**, chaude sur
les tons froids et l'inverse ; un dégradé monochrome ne dit qu'« ombre »), le
**reflet spéculaire** décentré qui glisse à l'inverse du regard, le **creux
interne**, et la **parallaxe** du signe avec sa profondeur réelle (perspective
propre, `translateZ` — un décalage à plat n'est pas du relief).

**La bille ne s'éclaire pas elle-même : elle est éclairée par la surface.**
La carte publie `--carte-angle` (un vrai `atan2`), `--carte-nx/ny` (le regard)
et `--carte-sx/sy` (le même, adouci en sinus) ; la bille les hérite en CSS,
sans un seul rendu React. C'est ce qui fait vivre une puce de 14 px : elle ne
peut pas se surveiller elle-même — sa boîte ne mesure que du bruit. Une surface
qui n'est pas une carte se déclare champ de lumière avec `data-champ`.

`CarteAbonnement` **consomme** la bille partagée. C'est la recopie qui avait
permis la dérive : les billes de l'app avaient perdu l'huile, le verre et la
profondeur pendant que l'original les gardait.

La bille **n'importe pas `lib/theme.jsx`** : elle sert aussi la vitrine, qui a
son thème. La matière (verre de nuit, peinte de jour) vient de la surface par
`matiereSurface()`.

Tailles nommées : `puce` / `jeton` / `bouton` / `vedette`.
Tout mouvement s'arrête sous `prefers-reduced-motion` et au pointeur grossier.

> **Divergence assumée, à confirmer** : ce document disait « parallaxe
> INVERSÉE », la carte d'origine fait l'inverse (le signe suit le curseur).
> Suivi la carte, puisque c'est la référence citée. Un signe à changer.

### 4.7 Autres invariants
- Un **litige porte sur exactement une chose** : affaire **OU** contrat
  (contrainte `litiges_porte_sur_une_chose`, migration 0115)
- Une **offre signée est figée** — le document garde SA nature, pas celle de
  l'affaire aujourd'hui
- Un **congé se demande chez le membre, se confirme au bureau**, et
  **on ne décide jamais de son propre congé**
- Une **demande de congé n'est PAS une absence** : elle n'empêche pas
  d'affecter, elle avertit
- `vehicules.categorie` (camion|lift|voiture) est un axe **au-dessus** de
  `vehicules.type` (fourgon|porteur|hayon = carrosserie d'un camion)
- **Aucune facture récurrente n'est émise automatiquement** — le bureau décide
- Le **carnet est bâti sur `clients`**, jamais une table parallèle

### 3.17 Une table sans `default jwt_org()` est INÉCRIVABLE — et l'échec est muet
**Le bug le plus coûteux de la session.** Les tables historiques portent
`org_id uuid not null default jwt_org()`. Six tables créées à la suite ont eu le
`not null` mais **pas le défaut**.

Le front insère sans `org_id` — c'est CORRECT : l'organisation vient de la
session, jamais du navigateur. Mais sans défaut, chaque insertion violait la
contrainte et échouait. **Toutes les écritures ont échoué depuis leur
création** : la balise « i » (0138), les factures fournisseur (0139), les
événements Peppol (0141), les équipes/modèles/notes de planning (0142).

Symptôme observé : « rien ne change à l'écran », deux lots de suite. Ni le code
applicatif, ni le domaine, ni le déploiement n'étaient en cause — j'ai cherché
du côté du rendu et du déploiement pendant trois échanges. **La porte
d'écriture était murée.**

**POURQUOI LE ROLLBACK N'AVAIT RIEN VU** — et c'est la vraie leçon : les blocs
de vérification fournissaient EUX-MÊMES l'org_id
(`insert into … (org_id, …) values (v_org, …)`). Ils prouvaient la STRUCTURE,
jamais le chemin réel.

> **Une migration doit être exercée telle que l'APPLICATION l'utilise,
> pas telle qu'il est commode de la tester.**

Corollaire du §4.29 (« la logique est juste mais rien n'arrive ») : là c'était
l'inverse — la donnée partait, mais la table la refusait.

Garde-fou : `ecriture-org.test.js` refuse toute nouvelle table à
`org_id not null` sans `default jwt_org()`. Portée assumée aux migrations ≥ 0138
(les antérieures sont des stubs ; la base fait foi sur elles).

### 3.15 Une const fléchée appelée AVANT sa ligne = écran blanc
Cousin du hook-après-return. Une `const nom = (...) => …` n'est PAS hoistée :
l'appeler plus haut dans le corps d'un composant lève « Cannot access nom before
initialization » AU RENDU — pas à la compilation. Build vert, tests unitaires
verts, écran blanc en prod.

Vécu sur `CarteDate` : `engages` (calculé au rendu) appelait `permisManquant`,
déclaré dix lignes plus bas. Le symptôme rapporté était « Dossier → écran
blanc », mais la faute était dans un composant enfant (CarteDate), déclenchée
seulement quand un membre était affecté — d'où l'invisibilité au premier coup
d'œil.

Reproduit hors navigateur en transpilant la chaîne via `transformWithEsbuild`
de vite + `renderToStaticMarkup`, avec les états forcés dans l'ordre des
`useState`. Corrigé en remontant la déclaration. Garde-fou ajouté dans
`hooks-conditionnels.test.js` : il détecte, par indentation, tout appel d'une
const fléchée du corps direct d'un composant situé avant sa déclaration.

---

### 4.8 L'horizontal et les verticaux — appliqué par un test
`packages/domaine/architecture.js` (le manifeste) et
`packages/domaine/tests/architecture.test.js` (la règle).

**Dashprod est HORIZONTAL. Le déménagement est un VERTICAL qui l'utilise.**
La flèche va toujours dans le même sens : un métier s'appuie sur le socle, le
socle ne s'appuie jamais sur un métier. Le jour où le noyau importe le
déménagement, Dashprod devient un logiciel de déménagement avec des options —
et on ne s'en aperçoit qu'en essayant de vendre à un garde-meubles.

Une arborescence ne garantit rien : rien n'empêche `crm/` d'importer `releve/`.
**C'est le test qui fait tenir l'architecture**, et il suit la chaîne ENTIÈRE
d'imports (une dépendance revient toujours par un intermédiaire anodin).

- **Verticaux déclarés** : déménagement (`releve/*`, `stocks/emballage.js`,
  `stocks/meubles-piece.js`), lift, sous-traitance, garde-meubles
  (`stocks/stockage.js`). *Tout ce qui n'est pas déclaré est horizontal :
  l'oubli penche du côté sûr.*
- **Aiguillage** : `chiffrage/scenario-nature.js` — le seul autorisé à
  connaître tous les métiers, parce que son travail est de choisir entre eux.
  L'horizontal ne peut pas l'importer non plus, sinon l'interdiction se
  contourne en une ligne.
- **Deux familles d'AIGUILLAGE**, distinguées par leur appelant :
  · *chiffrage* (`chiffrage/scenario-nature.js`) choisit le moteur de prix,
    importe lift + sous-traitance → INTERNE au domaine, la plomberie ne peut
    pas l'appeler ; · *composition* (`releve/rubriques-offre.js`) choisit les
    rubriques d'un document selon la nature, n'importe qu'un métier → la
    plomberie PEUT l'appeler. Le test connaît la différence.
- **Plus AUCUNE dérogation.** La seule (`adaptateur.js → volumetrie.js`) a été
  LEVÉE : le composeur d'offre passe par l'aiguillage de composition. La liste
  reste vérifiée « encore réelle » — une
  dérogation morte fait rougir la suite, pour qu'on la retire. La liste ne peut
  que rétrécir. *Une seule aujourd'hui* : `lib/adaptateur.js` importe
  `releve/volumetrie.js` pour composer l'instantané d'offre. Sortie prévue :
  chaque nature contribue SES rubriques au document.

Le garde-fou a été éprouvé sur ses quatre modes de panne (import direct,
import transitif, dérogation retirée, module renommé) — il rend la chaîne
complète, pas un booléen.


### 4.9 Une donnée, une commande
Règle posée par Raphaël au lot 10f : *« concentre-toi sur les relations entre
informations et privilégie l'UX »*.

L'écran Dossier avait **trois commandes pour une seule affectation** — la carte
de date (l'équipe *prévue*, sur le dossier), le volet de la mission (la
*vérité*, au planning), et le sélecteur « Équipe » du dossier (écrit à
l'enregistrement). Elles se contredisaient à l'œil, et rien ne disait laquelle
faisait foi.

**La carte de date est la seule commande.** Elle vise la cible qui existe :

| moment | cible | ce que la carte affiche |
|---|---|---|
| pas encore de mission | `affaires.affectations` | « Prévu — au planning à la confirmation » |
| la mission existe | `mission_affectations` | « Au planning » |

*La carte le DIT* : c'est la même équipe qui passe du prévu à l'engagement, pas
deux équipes. Sans cette mention, on ne sait pas si l'on regarde une intention
ou un engagement.

Ce qui a disparu : le sélecteur « Équipe », le sélecteur « Véhicules », et la
liste « Affectations » (qui rejouait les cartes avec d'autres mots). Une
mission d'un type sans carte reste affichée sous « Autres missions » — sinon
elle n'aurait plus de porte depuis le dossier.

`affaires.equipe` / `camions` restent alimentés par le **miroir** depuis la
mission principale (0136) et continuent de servir au chiffrage.

**Le conflit de disponibilité se lit au moment du clic**, porté par le jeton
lui-même : le signaler ailleurs obligerait à faire le lien de tête entre une
liste et un avertissement, précisément quand on décide. Rien n'est bloquant.

### 4.10 Les filtres du planning MASQUENT, ils ne suppriment pas
`operations/agenda.js` → `filtrerMissions()`, préférences dans
`lib/preferences-planning.js` (sur l'appareil).

Le planning se lit à plusieurs métiers à la fois. Deux filtres d'affichage :
masquer des **types** (ne montrer que les déménagements), masquer des
**membres** (sortir un intérimaire de la vue). Règles :

- masquer un TYPE retire la mission entière ; masquer un MEMBRE retire ses
  affectations mais **garde la mission** — une mission faite par l'équipe qu'on
  cache reste du travail réel.
- **le filtre n'entre JAMAIS dans le calcul de conflit** : la disponibilité lit
  la réalité complète. Sinon masquer un membre effacerait ses doublons, et on
  réserverait par-dessus. Verrouillé par test.
- **sur l'appareil, jamais en base** : c'est un confort de lecture, l'imposer à
  toute l'entreprise serait un contresens.

La couleur des types est réglable dans **Apparence → Types de travail** (le
moteur `UTILITES` / `couleurUtilite` existait ; le lot 11 a ajouté lift et
sous-traitance, et remplacé le liseré codé en dur du planning). Défauts alignés
entre l'app et le domaine, sinon la couleur clignoterait au rechargement entre
le planning bureau et la fiche terrain.

### 4.11 Congés : deux portes, une seule table
Le circuit vit depuis le module 8. Deux façons d'y entrer, un seul stockage :

- **le bureau** saisit un congé (`ajouterConge`) → créé directement **approuvé**,
  c'est la direction qui décide.
- **le terrain** demande (`demanderConge` SANS utilisateurId) → état **demande**,
  le bureau tranche (`deciderConge`) depuis le planning.

Ce qui distingue les deux, c'est la présence ou non d'`utilisateurId` : passer
le sien depuis le terrain ferait auto-approuver sa propre demande. La règle est
côté base (elle refuse qu'on décide de son propre congé) ET côté écran (l'onglet
terrain n'envoie jamais d'utilisateurId).

Une **demande** en attente s'affiche au planning en pastille creuse (§4.5) :
une absence probable doit se voir pour ne pas réserver par-dessus, mais elle ne
bloque rien tant qu'elle n'est pas accordée. Le membre peut retirer sa demande
tant qu'elle est en attente ; un congé accordé s'annule au bureau.

Validation de la demande dans le domaine (`validerDemandeConge`, pure, date du
jour injectée) : dates présentes, fin ≥ début, pas dans le passé. Le motif de
refus s'affiche — pas de bouton grisé muet.

**L'apparence côté terrain suit le même principe qu'ici : réutiliser, pas
copier.** Le profil terrain ouvre le MÊME écran `Apparence.jsx` que les
Paramètres bureau (un état `reglageApparence` qui bascule le rendu), avec un
`retour`. L'apparence est un réglage d'APPAREIL, pas un privilège bureau — un
déménageur en plein soleil a autant besoin du mode nuit. Corollaire : les fonds
`#fff` en dur du profil terrain ont dû passer au jeton `C.blanc`, qui suit le
mode ; un `#fff` de conteneur posait un pavé blanc sur le fond nuit. (Le blanc
du TEXTE sur une pastille de couleur pleine reste en dur, lui : légitime.)

### 4.12 Permis : signaler, jamais bloquer
`utilisateurs.permis_detenus` (text[]) + `code95_echeance` (date), commande
`cmd_definir_permis` (garde bureau, 0137). Règle pure dans
`flotte/vehicules.js` → `permisConduite(vehicule, membre, date)`, qui rend
`{ok, motif}`.

- **les permis s'emboîtent** : détenir le grand couvre le petit (un CE conduit
  tout). Ne comparer que l'égalité crierait à tort sur un fourgon.
- **deux signaux distincts** : permis absent (passer un permis) vs code 95
  expiré (renouveler une formation) — actions différentes, motifs différents.
- **une échéance absente n'est pas expirée** : on ne crie pas sur ce qu'on
  ignore.
- **SIGNALE, ne bloque pas** (comme la disponibilité, §4.5) : le jeton de la
  carte de date se teinte, jamais désactivé. Édition dans la fiche membre.
- **PAS l'aptitude médicale groupe 2** : donnée de SANTÉ, sa propre décision
  RGPD (consentement, base légale, durée) reste à prendre. Le signalement de
  base fonctionne sans.

### 4.13 Le vocabulaire de BOUTONS vit dans le thème
`theme.jsx` → `S.boutonPlein` / `boutonSecondaire` / `boutonDanger` /
`boutonPuce` / `boutonLien`, plus la feuille globale `champs-dashprod` qui donne
à TOUT bouton son retour au geste.

Le thème n'offrait que « plein » et « lien » : chaque écran réinventait donc le
secondaire (25×) et le danger (100×+), avec des rayons de 8 à 14 au hasard —
d'où l'incohérence visible. Règle désormais : un besoin de bouton STANDARD se
sert dans le thème, on n'improvise plus un style inline.

- **plein** : action principale (aplat bleu). **secondaire** : second rang
  (contour). **danger** : destructif (contour rouge qui se remplit au survol —
  il prévient au repos, confirme à l'intention). **puce** : petit, en ligne,
  rayon pleinement arrondi. **lien** : texte seul.
- Les ÉTATS sont dans une feuille CSS (les styles inline ne portent pas de
  `:hover`/`:focus`) : survol qui éclaircit, enfoncement au clic, anneau au
  focus CLAVIER seulement (pas au clic souris). Universel, sans toucher les
  391 boutons.

### 4.14 VISITE DE LA MÉCANIQUE — tier Basique (validé)
Passage carte par carte, trois étages (domaine / base / écran). Rien de modifié :
c'est un constat, pas un lot.

**Écrans** — les 14 écrans du Basique ont été RENDUS pour de vrai (transpilation
+ `renderToStaticMarkup`), pas seulement compilés : Relevé, Devis, Offre,
Signature, Planning, Terrain, TerrainProfil, Espace client, Liste, Conversations,
Matériel, Mail, Facture, Équipe. **14/14 sans plantage** — aucun écran blanc
latent du type de celui de CarteDate.

**Cycle de vie du dossier — complet en base.** Noms réels (piège : ils ne sont
pas ceux qu'on devine) : `cmd_transition_affaire`, `cmd_geler_instance`,
`cmd_offre_signer` + `cmd_signer_instance`, `cmd_creer_mission`,
`cmd_mission_affecter`, `cmd_pointage_definir`, `cmd_emettre_facture`,
`cmd_creer_acces_client`.

**Chiffrage — architecture saine.** `bareme.js` n'expose que des constantes
gelées (défaut de secours) ; le moteur accepte `ref.bareme` et l'écran Devis
transmet bien les `parametres_prix` de l'organisation, la grille de nature, les
réglages lift et le taux de TVA. **Pas de double vérité de prix.** Quand le
chiffrage n'aboutit pas, l'écran DIT ce qui manque au lieu d'afficher un vide.

**Immuabilité — six triggers ACTIFS vérifiés en base** (`tgenabled='O'`, pas
seulement déclarés dans un fichier) : `trg_instance_signee_immuable`,
`instances_immuables`, `factures_immuables`, `trg_releve_abonnement_immuable`,
`trg_cloison_org`, `trg_dossier_clos`. C'est la ceinture de conformité.

**Écriture directe à noter** : le relevé (`enregistrerReleve`) et le contact
(`sauverContact`) passent par `UPDATE` direct sur `affaires`, pas par commande
gardée. Étanche — la RLS `affaires_tenant` borne en lecture ET en écriture
(`org_id = jwt_org()` + `peut_voir_centre`). Mais asymétrie à connaître : ces
écritures échappent au journal d'événements.

### 4.14b Visite (suite) — relevé, planning, terrain : UN DÉFAUT TROUVÉ ET CORRIGÉ
**Quantité 0 comptée comme 1** (`volumetrie.js`, `brief.js`). `it.quantite || 1`
traitait un zéro VOULU comme une absence : un métreur qui met 0 pour retirer un
meuble du calcul gonflait le volume — donc le PRIX — sans erreur visible. Même
famille que le `Number(null) === 0` qui avait mis la TVA à zéro. Corrigé avec
`ouDefaut()` (§3.x), qui respecte un zéro et ne remplace que l'absence. Au brief
chantier, une ligne à 0 est désormais RETIRÉE (sinon l'équipe lisait « 0× Canapé »
et cherchait un meuble absent). Verrouillé par 2 tests dans `releve.test.js`.

**Faux positifs écartés** (vérifiés, à ne pas « corriger ») :
`Math.max(1, f.nbCamions || 1)` dans `moteur.js` est VOLONTAIRE — un déménagement
facture au moins un camion. Les `|| 0` sur valeurs absentes sont sains.

**Planning** — `conflitsAffectation` exclut bien la mission courante du calcul de
doublon (invariant §4.5 tenu).
**Terrain** — pointage éprouvé sur ses cas limites : 22h→02h rend 4 h (passage à
minuit géré par `corrigerJourSuivant`), une pause plus longue que le chantier est
refusée avec motif. Forme `{ok, message}` respectée.

### 4.14c Visite (fin) — signature, portail, flotte, CRM
**Signature client — la carte la mieux faite du Basique.** `cmd_offre_signer` :
consentement éclairé (mention « Lu et approuvé » obligatoire), nom du signataire
(≥3 car.), **code CONSOMMÉ** (`revoque_le = now()` → aucun rejeu), empreinte du
document scellée dans DEUX registres (`acces_client.document_empreinte` +
table `signatures`), événement journalisé. Le verdict de `transition_interne`
est LU et non supposé (elle rend false sans lever — piège déjà rencontré).
Dossier de preuve complet : `empreinte`+`sel` (code jamais en clair),
`essais_rates`, `expire_le`, `revoque_le`, `signe_le`, `signe_par_ip`,
`signataire_nom`, `mention_saisie`, `document_empreinte`.

**Le code de signature est CHOISI par le bureau** (`p_code`, 12 car. minimum),
pas généré aléatoirement — seul le sel est cryptographique. Création gardée par
`exiger_module('signature_client')` + capacité `creer_affaire`, ancien accès
révoqué, création journalisée.

**POINT DE SÉCURITÉ OUVERT (non corrigé, décision Raphaël attendue)** :
`essais_rates` n'est incrémenté QUE par `cmd_offre_apercu`. `cmd_offre_signer`
passe par `resoudre_acces` mais **ne compte pas les échecs** : sur cette porte,
on peut tenter des codes sans jamais déclencher le blocage à 8. Le risque est
réel surtout parce que le code est choisi à la main (un code faible est
devinable). Correctif envisagé : incrémenter `essais_rates` sur code invalide
dans `cmd_offre_signer`, comme le fait déjà l'aperçu.

**Portail client — hors sujet force brute** : les `cmd_client_*` s'authentifient
par SESSION (`espace_client_email()`, refus `42501` sinon), pas par code. Vérifié
avant de conclure.

**Flotte** (6 tests) et **CRM** (carnet, clients, clôture, litige, vues-dossiers :
tous couverts) : rien à signaler.

### 4.15 Enforcement des modules par offre — état
`exiger_module` lève `42501` si le plan n'ouvre pas le module : le refus est EN
BASE, pas seulement dans le menu. 12 fonctions gardées.

Gardés en base : `comptabilite`, `journal`, `multi_depots`, `rapport_chantier`,
`stockage_3d`.
**Sans garde en base** : `peppol`, `international`, `gestionnaire_depot`
(+ `paie`, SUSPENDU sur décision de Raphaël — hors périmètre, ne pas refermer).

**Bloquant lancement (P1)** : `prix_base_htva_mensuel` et `_annuel` sont `null`
sur les trois offres. Aucune facture d'abonnement émettable. Le membre
supplémentaire à 13 € est bien appliqué aux trois offres.

### 4.16 La TVA se QUALIFIE, elle ne se devine jamais (lot 23)
`facturation/tva.js` → `qualifierTva(contexte)` est la seule porte par laquelle
une opération obtient sa catégorie et son taux. Rend `{ok, motif}`.

**Règle absolue** : information TVA absente → ERREUR → aucune transmission.
JAMAIS un repli sur 21 %. Une facture Peppol a valeur légale ; un taux inventé
est une déclaration fiscale inexacte.

Trois défauts fermés par ce lot :
- **catégorie codée en dur à « S »** dans l'UBL → une prestation intra-UE
  partait à 21 % au lieu de l'autoliquidation : document FAUX transmis par le
  réseau officiel ;
- **`?? 21` en quatre endroits** (domaine + adaptateur) ;
- **ligne sans taux exclue de la ventilation mais comptée dans le HTVA** →
  100 € HTVA pour 0 € de TVA, sans erreur. Sous-déclaration silencieuse.

**`versXmlUBL` ne décide plus rien en TVA** : il LIT la ventilation qualifiée
(`categorie` portée par chaque groupe). Toute ligne hors ventilation échoue.

**Ce que Dashprod qualifie aujourd'hui** : BE → BE avec un taux fourni
(catégorie S). **Tout le reste REFUSE avec un motif** nommant la règle à faire
valider : intra-UE (dépend de la nature de la prestation — déménagement, lift
et sous-traitance ne suivent pas forcément la même règle), hors UE, 0 %
intérieur (exige sa base légale), vendeur non belge.
→ **[À VALIDER PAR UN CONSEILLER TVA]** avant d'activer ces cas.

**Conséquence produit assumée** : Dashprod refuse PLUS qu'avant. C'est
volontaire — il émettait auparavant des documents potentiellement faux.

Ordre respecté (P0-1 → P0-5) : défauts supprimés, moteur construit, `versXmlUBL`
testé (`tva-ubl.test.js`, 16 tests). **La réception Peppol vient APRÈS** — ne
pas construire une branche entrante sur un moteur dont la qualification n'était
pas verrouillée.

### 4.17 Conformité du document Peppol (lot 24)
Trois éléments obligatoires n'étaient PAS émis. Le premier était bloquant pour
la totalité des envois.

**PEPPOL-EN16931-R003 — drapeau `fatal`** : « A buyer reference or purchase
order reference MUST be provided » (test : `cbc:BuyerReference` OU
`cac:OrderReference/cbc:ID`). Dashprod n'émettait NI l'un NI l'autre →
**toute facture aurait été rejetée par le point d'accès.** Vérifié sur
docs.peppol.eu, pas de mémoire.
→ `reference_acheteur` (BT-10) au modèle canonique et dans l'UBL. Absente, la
génération ÉCHOUE avec un motif. **Aucune valeur de repli** : mettre « NA »
automatiquement (ce que font certains éditeurs) serait inscrire une donnée
fausse dans un document légal. **Décision produit ouverte** si Raphaël préfère
ce repli.

**Avoir orphelin** : `facture_corrigee` existait dans le modèle mais n'était
jamais émis → un avoir partait sans dire quelle facture il corrige. Mention
légale, et rapprochement impossible côté client.
→ `cac:BillingReference/cac:InvoiceDocumentReference`. Un avoir sans référence
est refusé.

**Date/période de prestation** : absente du modèle. Mention légale belge dès
qu'elle diffère de la date d'émission.
→ `prestation_debut` / `prestation_fin` → `cac:InvoicePeriod`. Non émise si
inconnue (PEPPOL-EN16931-R008 refuse les éléments vides).

**Référentiel utile** : la description d'une facturation belge agréée fournie
par Raphaël confirme ces champs (« Réf./bon de commande », « Date/période de
prestation ») et signale deux manques ENCORE ouverts dans Dashprod :
- **« Le prix comprend la TVA »** (saisie TTC) — un déménageur annonce souvent
  un prix TVAC à un particulier. Non supporté.
- **Catégorie d'opération** (vente de biens / services / loyer / droits
  d'auteur / don) — c'est exactement l'entrée `natureOperation` qui manque à
  `qualifierTva` pour traiter l'intracommunautaire (§4.16).

### 4.18 La nature définit le taux, l'utilisateur LIT (lot 25)
`facturation/operations.js` — 6 catégories d'opération, alignées sur les
logiciels belges agréés, chacune portant **libellé + lecture + exemple +
conséquence**. Un sélecteur muet ne renseigne personne.

**La chaîne** : `nature du dossier → catégorie d'opération → taux`.
`CATEGORIE_PAR_NATURE` : déménagement / lift / sous-traitance → *vente de
services* (21 %) ; boxe / zone → *location d'espace de stockage* (21 % — la mise
à disposition d'emplacements d'entreposage est exclue de l'exonération
immobilière).

**Ce n'est PAS un retour au défaut implicite du lot 23.** Un taux tombé de nulle
part est une supposition ; un taux DÉRIVÉ d'une catégorie déclarée et affichée
à l'écran est une décision documentée, que l'utilisateur peut lire et corriger.
La règle « rien ne s'invente » tient : il y a désormais une raison.

**Catégories volontairement sans taux** (`tauxUsuel: null`, `aValider: true`) :
loyer professionnel, droits d'auteur, don. Régimes particuliers → on ne
pré-remplit rien, `qualifierTva` refusera avec son motif.

**Priorité du taux** : (1) taux configuré par l'organisation ; (2) taux usuel de
la catégorie déduite de la nature ; (3) rien → refus motivé.

**Décision produit de Raphaël — repli « NA »** sur `BuyerReference` quand aucune
référence n'existe. La documentation Peppol prévoit elle-même cette valeur.
Distinction tenue : un TAUX inventé affirme une donnée fiscale fausse ; « NA »
sur une référence de routage CONSTATE une absence.

**Saisie TTC** (`prix_comprend_tva`) : un déménageur annonce « 1 210 € tout
compris » à un particulier. Ramené au HTVA. **Sans taux connu, aucune
conversion** — diviser par un taux supposé serait le même piège.
**Remise** (`remise_pct`) au prix unitaire ; une remise > 100 % est ignorée
plutôt que d'inverser la ligne.

**Écran** : `LectureCategorie` dans `Facture.jsx` affiche ce que Dashprod a
qualifié, en clair.

### 4.19 Réception Peppol : recevoir n'est pas accepter (lot 26)
`facturation/reception.js` — lecture d'un UBL entrant, dédoublonnage, machine
d'états. Éprouvé en aller-retour : notre générateur produit, notre lecteur
relit, montants exacts au centime.

**La règle centrale** : aucune facture reçue n'est approuvée ni comptabilisée
d'office. Même impeccable, elle s'arrête à `A_VERIFIER`. Le réseau garantit
l'acheminement, pas la justesse — c'est l'entreprise qui décide si elle doit
cette somme.
- `APPROUVE` n'est atteignable QUE depuis `A_VERIFIER` ;
- `COMPTABILISE` QUE depuis `APPROUVE` ;
- double serrure : machine d'états dans le domaine + trigger en base.

**Montants LUS, jamais recalculés** : recalculer les totaux d'une facture
entrante reviendrait à réécrire la facture d'autrui.

**Dédoublonnage par fournisseur + numéro**, pas par contenu : un même document
retransmis (reprise, webhook rejoué) diffère parfois d'un octet sans être une
autre facture.

**Un document illisible n'est jamais jeté** — c'est une pièce légale : il part
en vérification avec son motif, et le XML d'origine est conservé intact.

### 4.20 BLOQUANT MÉTIER — les clients Dashprod ne peuvent PAS recevoir
`digiteal.js` enregistre les participants avec `envoiSeul = true`
(`limitedToOutboundTraffic`). Le code le documente lui-même : **un seul point
d'accès peut recevoir pour un participant donné**, et basculer la réception
exige de se désinscrire de son point d'accès actuel.

Conséquence : le code de réception ne servira à rien tant que ce n'est pas
tranché. **Décision produit et commerciale, pas technique** — beaucoup de PME
belges reçoivent leurs factures Peppol via la plateforme de leur comptable
(CodaBox et équivalents). Reprendre la réception, c'est toucher à cette
relation.

### 4.21 La comptabilité est ASSUMÉE à l'écran (lot 27)
`Comptabilite.jsx` s'ouvre sur ce que Dashprod fait — et sur ce qu'il ne fait
pas. Dit en tête, pas en petits caractères : un utilisateur qui croit que
Dashprod « tient sa comptabilité » découvrirait le malentendu devant son
contrôle.

- **Il prépare** : factures, encaissements, achats approuvés, tiers → écritures
  équilibrées au plan comptable belge.
- **Il rend les données** : export complet, formats standards.
- **Il ne tient PAS la comptabilité** : pas de logiciel agréé, pas de bilan, pas
  de déclaration. Le comptable tient les livres, contrôle et dépose.
- **Il ne décide pas à la place** : un taux non qualifiable est refusé, pas
  deviné (§4.16).

### 4.22 Réversibilité — la donnée n'est jamais prise en otage
Cinq exports couvrent toutes les ressources : relevé des factures, journal des
ventes, **journal des achats**, **paiements**, **tiers**. Plus le FEC (France,
si l'organisation y opère).

**Choix de format assumé** : CSV point-virgule + BOM UTF-8, le dénominateur
commun que tous les logiciels comptables savent importer. **Aucun format
propriétaire** — un connecteur spécifique lie Dashprod à un éditeur, un CSV
documenté ne lie personne. C'est la frontière du futur bridge comptable
(§ document d'architecture, chapitre 13).

**Le journal des achats n'inclut QUE les documents approuvés** — la règle
« recevoir n'est pas accepter » tient jusqu'à l'export. Équilibre débit/crédit
vérifié par test, avoirs inversés.

Chaque ressource se charge indépendamment : si l'une échoue, l'export reste
partiellement possible plutôt que bloqué en entier.

### 4.23 Le barème d'abonnement (lot 28) — P1 LEVÉ
Les six prix étaient `null` depuis le cadrage : **aucune facture d'abonnement
n'était émettable**. C'était le vrai bloquant du lancement, avant toute
question technique.

**Publié (migration 0140, republication versionnée — jamais d'UPDATE)** :

| | mois | an | économie |
|---|---|---|---|
| Basique | 180 | 2 052 | 108 |
| Regular | 360 | 4 104 | 216 |
| Pro | 720 | 8 208 | 432 |

Membre supp. 13 €/mois · **148,20 €/an** (toutes offres).
Centre supp. 50 €/mois · **570 €/an** (Pro seul).
**La remise annuelle de 5 % porte AUSSI sur les suppléments** — règle explicite
de Raphaël, vérifiée par test sur l'ensemble.

**Prix STOCKÉS, jamais calculés.** Une facture référence un prix figé : si le
taux de remise changeait, un montant calculé réécrirait le passé en silence.
`remise_annuelle_pct` sert à EXPLIQUER (« vous économisez 108 € »), jamais à
calculer.

**`organisation/abonnement.js`** — le calcul vit désormais dans l'étage pur,
conformément à la leçon de l'incident Roovers (le barème ne se vérifiait qu'en
écrivant dans la base). `montantAbonnement(offre, mesure, periodicite)` rend
`{ok, motif}`.
- Une équipe SOUS le seuil ne donne pas de crédit.
- Une offre sans prix publié REFUSE d'être facturée.
- Un supplément dû sans prix publié est une ERREUR, pas une gratuité (Basique
  ne vend pas de centre : en demander un est refusé, pas facturé 0 €).
- Périodicité inconnue refusée, jamais ramenée au mensuel.
- Montants en centimes entiers.

**F1 (grille non monotone) est résolue** : au-delà des seuils, les trois offres
sont des droites parallèles (`154+13n`, `295+13n`, `330+13n`). Aucune
inversion — Basique reste toujours le moins cher à effectif égal. Les offres se
différencient par les modules, pas par les sièges : c'est l'option « assumer »
du cadrage.

### 4.24 Le point d'accès Peppol exige un SERVEUR (lot 29)
**Dashprod est un SPA Vite : il n'a aucun serveur.** Deux conséquences longtemps
invisibles :
1. un webhook EXIGE une URL publique — impossible sans fonction serveur ;
2. le secret Digiteal, s'il était lu depuis `organisations.parametres_facturation`
   (jsonb lu par le navigateur), **partirait dans le navigateur de chaque
   utilisateur**.

Vérifié : aucune colonne `digiteal_*` n'existe en base — rien n'est exposé
AUJOURD'HUI, mais y coller les identifiants créerait la fuite. **Ne jamais
mettre le secret dans `parametres_facturation`.**

**Architecture retenue** : fonctions Vercel dans `/api`, secret en variables
d'environnement Vercel, clé de service Supabase côté serveur uniquement.
- `api/peppol/webhook.js` — reçoit les appels du point d'accès.
- `DIGITEAL_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- ⚠ Aucune variable `VITE_*` : ce préfixe expose au navigateur.

**PIÈGE VERCEL corrigé** : la réécriture `"/(.*)" → /index.html` avalait
`/api/*`. Le webhook aurait reçu la page d'accueil, le point d'accès aurait
conclu à un succès et n'aurait **jamais réessayé**. Corrigé en
`"/((?!api/).*)"`, vérifié par simulation.

**Trois dangers de webhook, trois verrous** (`facturation/webhook.js`, pur) :
- **appel non authentifié** → secret partagé, comparaison à temps constant ;
  un serveur non configuré REFUSE au lieu de tout accepter ;
- **rejeu** → clé d'idempotence + contrainte UNIQUE en base (c'est la
  contrainte qui garantit) ; répond 200 pour stopper les réessais, sans agir ;
- **type inconnu** → journalisé, aucune action. Une version future du point
  d'accès enverra des types qu'on ignore.

### 4.25 Envoi OU réception : une décision, jamais un défaut
`enregistrerParticipant` n'a plus de défaut `envoiSeul = true`. Sans booléen
explicite, elle REFUSE avec un motif — et ne fait aucun appel réseau.
Raison : **un seul point d'accès peut recevoir pour un participant**. Un défaut
à `true` condamnerait l'organisation à ne jamais recevoir (obligation légale) ;
un défaut à `false` lui volerait la réception que son comptable assure
peut-être déjà. **Décision de Raphaël : envoi ET réception.**

### 4.26 Les fournitures sont une VENTE DE BIENS (lot 30)
Bug d'argent : `lignesFacturePour` ne produisait QU'UNE ligne — « Déménagement,
<client> » — avec le TVAC recomposé. Les fournitures étaient chiffrées
(`valoriserEmballage` existe et son commentaire dit « c'est ce qui doit être
retranscrit sur l'offre / la facture ») mais **n'atteignaient jamais la
facture**. Cartons fournis, jamais facturés.

Deux problèmes en un :
- commercialement : des fournitures non facturées ;
- légalement : vendre un bien n'est pas prester un service. Deux catégories
  d'opération distinctes (§4.18), traitement comptable différent, et le client
  a le droit de voir ce qu'il achète — dénommé et quantifié, pas dans un total
  opaque.

→ Lignes propres, `categorie_operation: "vente_biens"` (prestation =
`vente_services`). **Via l'aiguillage de composition** (`rubriques-offre.js` →
`lignesFournitures`) : l'adaptateur est horizontal et n'a pas le droit
d'importer `stocks/emballage`. Le test d'architecture m'a attrapé sur le
premier jet — il fonctionne.

### 4.27 Les équipes de journée (lot 30)
`planning/equipes.js`, pur et testable. Trois règles, **une seule bloquante** :

1. **Une personne au minimum** → BLOQUE (seul vrai blocage).
2. **L'effectif hors barème** → AVERTIT seulement. Discipline §4.5 : on
   signale, on n'interdit pas. Le bureau connaît son terrain mieux que la règle.
3. **Une personne dans deux équipes le même jour** → autorisé SI les missions
   ne se chevauchent pas. Chevauchement = blocage : on ne peut pas être à deux
   endroits en même temps.

**Le chevauchement est le cœur.** Deux missions qui se touchent bout à bout ne
se chevauchent pas. Une mission **SANS horaire occupe la journée entière** —
prudence assumée : sans heures, impossible de prouver qu'elle laisse la place,
donc on ne le suppose pas, et le motif dit quoi faire (« posez des heures »).
Chantier de nuit (22h→02h) géré : sans garde, la plage serait inversée et tout
chevauchement passerait inaperçu.

**Un MODÈLE d'équipe ne retient QUE les personnes** — ni date, ni missions. Les
mêmes trois personnes travaillent souvent ensemble, jamais sur le même chantier
deux jours de suite ; garder la date ferait rejouer un passé.

### 4.28 Le DOSSIER MAÎTRE — `docs/maitre/` (lot 32)
Six documents numérotés, à lire dans l'ordre. Il existe pour qu'une nouvelle
session, une autre conversation ou un autre LLM reprenne sans dériver.

Sa valeur tient à **une** propriété : il dit QUI A RAISON quand deux sources se
contredisent.

| Rang | Source | Autorité |
|---|---|---|
| 1 | la base Supabase | l'ÉTAT réel |
| 2 | le dépôt | le CODE réel |
| 3 | `PASSATION.md` | décisions techniques, pièges |
| 4 | `10-DECISIONS-PRODUIT.md` | décisions commerciales |
| 5 | `20-OUVERT.md` | ce qui n'est pas tranché |
| 6 | tout le reste | matière à instruire, **jamais vérité** |

Fichiers : `00-DEMARRER-ICI` · `10-DECISIONS-PRODUIT` · `20-OUVERT` ·
`30-REGLES-IA-EXTERNE` · `40-METHODE` · `50-ARCHIVE`.

**Décidé et ouvert sont dans DEUX fichiers séparés** — les mélanger laisse
croire qu'une décision est négociable ou qu'une question est tranchée.
Chaque question ouverte nomme le professionnel qui doit trancher.

Verrouillé par `dossier-maitre.test.js` : la hiérarchie doit rester énoncée
dans l'ordre, les prix publiés doivent correspondre au barème appliqué (le
CADRAGE d'origine affirmait qu'ils manquaient — vrai en août, faux depuis
0140), l'archive doit se déclarer non normative.

### 4.29 « La logique est juste mais rien n'arrive » (lot 32)
`lignesFournitures` était branché correctement, l'aiguillage respecté, les
tests verts — mais `obtenirAffaire` **ne sélectionnait pas la colonne
`emballage`**. `a.emballage` valait toujours `undefined` : aucune fourniture ne
pouvait être facturée.

**Vérifier que la logique est correcte ne suffit pas : il faut vérifier que la
DONNÉE arrive.** Test statique ajouté sur le `select`.

Au passage : la clé `terrain` de l'emballage (sangles, couvertures,
monte-meuble) est le matériel de l'entreprise et **n'est jamais facturée**.
Exclue par construction (absente du catalogue de fournitures), figée par test.

### 4.30 Compte et Paramètres : organiser, pas décorer (lot 33)
**Le défaut n'était pas l'absence de structure — les rubriques existaient.**
C'était leur GRANULARITÉ : dix rubriques pour vingt entrées, dont **cinq n'en
contenaient qu'une**. Un titre de section pour un item unique n'organise rien,
il double la hauteur sans rien apprendre.

→ **Six familles**, chacune d'au moins deux réglages, regroupées selon ce que
l'utilisateur CHERCHE et non selon la structure interne du logiciel :
*Mon entreprise · Vendre et facturer · Mes catalogues · Stockage et services ·
Ce que ça vous coûte · L'application et vos données.*

→ Le groupe devient un **CONTENEUR** : entrées cousues par des filets, arrondis
portés par le bloc. On VOIT le groupe au lieu de le lire. L'entrée n'a plus ni
bordure ni ombre propres — elle vit dans son groupe. Verrouillé par test :
aucun groupe solitaire, 5 à 7 familles.

**Compte** : deux boutons de navigation étaient copiés caractère pour caractère.
Composant `Porte` + `BlocPortes`. Une copie diverge toujours — l'un se corrige,
l'autre est oublié.

### 4.31 Le test du mode nuit avait un trou
Il ne cherchait que le **blanc**. Un fond `#E7EFFC` sur un onglet sélectionné
passait donc au travers et restait bleu pâle sur le fond nuit. Deux cas trouvés
en élargissant : `Profil.jsx` (onglets) et `Mail.jsx`.

→ `mode-nuit.test.js` couvre désormais aussi les **bleus clairs en dur**
(`#E7EFFC`, `#EEF2F8`, `#EFF4FC`, `#E8F0FE`, `#DBEAFE`). Un garde-fou qui ne
cherche qu'une forme du bug laisse passer les autres.

## 5bis. Lot 34 — 23/08/2026 (le plus récent)

**Dépôt PUBLIC désormais** (`github.com/vancraphael-coder/dashprod-erp`). Il se
clone depuis la sandbox. Conséquence : plus AUCUNE livraison à l'aveugle —
l'arborescence se lit, `npm test` et le build tournent pour de vrai. C'est ce
qui avait produit l'incohérence des lots 01/02 (`.mjs`, dossiers inventés).

**Compteurs :** 1063 tests verts (1049 avant), build vert, migrations toujours
à **0143** (aucune migration ce lot — rien ne le demandait).

### Ce qui a été livré

1. **Fournitures hors devis et facture.** `lignesFacturePour` ne pousse plus
   `lignesFournitures`. Décision de Raphaël, redite deux fois. Verrouillé par
   un test **éprouvé par sabotage** (rebranchement volontaire → rouge).
2. **Rangement des réglages sorti de l'écran** vers
   `packages/domaine/src/organisation/reglages.js` — fonction pure.
3. **Compte et Paramètres** sur une grammaire partagée
   (`composants/ListeReglages.jsx`).
4. **Jetons de teinte** (8 familles) dans `apparence.js` ; 64 fonds + 122
   encres/filets passés aux jetons ; garde `mode-nuit.test.js` durci.
5. **`docs/maitre/25-PARAMETRES-ROADMAP.md`** — 8 chantiers de réglages inertes.
6. **Correctif du test rouge d'origine** : `EspaceClient` avait perdu sa molette.

### Le défaut trouvé en base — à ne pas réapprendre

Interrogée en production, pas déduite du code :

```sql
select count(*) filter (where emise) emises,
       count(*) filter (where emise and echeance is null) sans_echeance,
       count(*) filter (where emise and communication is null) sans_ogm
  from factures;   -- → 16 / 16 / 16
```

**Six réglages se saisissent sans aucun effet** : `echeance_jours` (Roovers a
mis 10), `prefixe_numero` (« GG »), `mention_legale`, `communication` (OGM),
`communication_structuree`, `forfait_base`. Et les cinq prix client de cartons
du Barème (`carton_standard`…) ne sont lus par personne.

**Le pire cas est l'OGM** : `FactureDoc.jsx` le RECALCULE à l'affichage à
partir du numéro. Le PDF montre donc une communication structurée que la base
n'a pas — et Peppol part avec `communication: null`. Deux vérités sur un
document de paiement.

Ces champs restent saisissables et portent une mention « Pas encore appliqué »
(`PasEncoreApplique` dans `Identite.jsx`). **Ces mentions doivent mourir** à
mesure que les chantiers se ferment : une mention qui survit à sa cause
redevient un mensonge.

### Deux leçons de méthode

**Un test qui lit le fichier source ne prouve rien.** Trois tests comptaient
des motifs dans le texte de `Parametres.jsx`. Ils prouvaient une mise en page,
pas un comportement. Déplacée dans le domaine, la logique est devenue
exerçable — et le nouveau test a **immédiatement** attrapé un défaut invisible
autrement : en offre **Basique**, la famille « Consulter » se réduisait à
Archivage seul. On ne le voit jamais en développant, parce qu'on développe
toujours tous modules ouverts. Toujours exercer les cas d'abonnement PAUVRE.

**Corriger la moitié d'un triplet est une régression.** Passer les FONDS aux
jetons sans les ENCRES a rendu des textes foncés illisibles sur fond sombre.
Un bandeau est un triplet (fond, filet, encre) ; en surveiller un seul terme
garantit de casser les autres. Le garde couvre désormais les trois.

### Décisions qui attendent Raphaël

- Les 16 factures émises reçoivent-elles échéance et OGM **rétroactivement** ?
  (avis : non — c'est écrire dans une pièce close ; appliquer aux suivantes.)
- Le **prix client des fournitures** vit-il dans le barème ou dans le catalogue ?
  (avis : le catalogue, à côté du coût — la marge se lit d'un coup d'œil.)
- Sur quel **document** sort la vente de fournitures, et sous quelle séquence
  légale (C-03) ? → expert-comptable + conseiller TVA. Chantier V de la roadmap.

---

## 5. État au 17/08/2026

**`npm test` : 1049/1049 ✓ — build `apps/web` ✓ (le décompte varie légèrement : certains tests scannent les fichiers présents)**
**Migrations appliquées : jusqu'à `0143_org_id_par_defaut`** (appliquée et
éprouvée le 22/08 : comptabilisation sans approbation refusée, approbation
anonyme refusée, chemin nominal validé, doublon rejeté).
### Lots livrés
| lot | contenu | migrations |
|---|---|---|
| — | Ouverture de l'offre Pro | 0111 |
| 1 | Centres : archivage + repères x/y/z (axes définis par l'organisation) | 0112–0114 |
| 2a | Natures d'affaire, menu « + », sous-traitance & lift | 0115–0117 |
| 2b-1 | Écran Services (grilles sous-traitance / lift / axes) | 0118 |
| 2b-2 | Le dossier s'adapte à sa nature | — |
| 3 | Mode nuit (4 bugs, cause unique : couleurs en dur) | — |
| 4 | Véhicules : catégories, carburant, permis, châssis | 0119 |
| 5 | Congés (circuit + **trou RLS fermé**) & transfert de membre | 0120–0123 |
| 6a/b/c | Lift & sous-traitance : chiffrage, saisie, devis, offre | — |
| 7 | Boxe & zone : contrats récurrents, échéances, litige sur contrat | 0124–0127 |
| 8 | Carnet de contacts | 0128–0129 |
| 9 | Messagerie : liens de téléchargement + raccourci boîte | — |
| 10a | Adresses par métier + vérité des affectations | — |
| 10b | Une mission par date, affectation par mission, menu « + » en bulle | 0130–0131 |
| 10c | **Correctif `scenarios.resultats`** + la Bille (mascotte partagée) | — |
| 10d | Cartes de date avec affectation (la Bille enfin visible) | 0132–0133 |
| 10e | Bille refaite, test d'architecture, grille au m³ exact, 2 bugs de production | 0134, 0135 |
| 10f | **Une seule commande par date** (3 doublons supprimés), conflits au point de décision, miroir toutes natures | 0136 |
| 10g | Bille moins fade, survol, icônes affinées, « + » en bille, options en verre, voyants retirés | — |
| 11 | Couleurs par type réglables (édition déjà là), lift+sous-traitance ajoutés, **filtres du planning** (type + membres) | — |
| 12 | **Demande de congé + apparence côté terrain** (portes manquantes ; écrans existants réutilisés) | — |
| 13 | **Messages** : chaîne jusqu'à la mission, mise en page du fil, **focus des zones d'écriture** (global) | — |
| 14 | **Permis membres** (signalement), **dérogation d'architecture LEVÉE** | 0137 |
| 14b | **Hotfix écran blanc Dossier** (TDZ dans CarteDate) + garde-fou statique | — |
| 15 | **Design — bille** : palette bleu clair/mauve/rose, grosse bille retirée des cartes de date | — |
| 16 | **Design — Compte + tri planning** : capacités citées (plus le compteur), bouton « Tous » + isoler au planning | — |
| 17 | **Design — cohérence des boutons** : vocabulaire (secondaire/danger/puce) + états de survol/focus/clic universels | — |
| 18 | **Design — mode nuit** : fonds clairs en dur corrigés (16 écrans), test anti-régression | — |
| 19 | **Design — sélecteur rotatif dans l'espace CLIENT** (les 3 espaces l'ont enfin) | — |
| 20 | **Design — refonte de l'en-tête landing** : scène (aube ambre, titre-lettrage, cascade) | — |
| 21 | **Balise note 'i'** : carnet de corrections page par page → dossier interne | 0138 |
| 22 | Quantité 0 comptée comme 1 (devis gonflés) | — |
| 23 | **P0 — fiabilité fiscale de l'émission Peppol** : moteur de qualification TVA, fin des défauts implicites | — |
| 24 | **P0 — conformité du document Peppol** : BuyerReference (règle fatale), avoir référencé, période de prestation | — |
| 25 | **Catégories d'opération lisibles** : la nature définit le taux, repli NA, saisie TTC, remise | — |
| 26 | **Réception Peppol** — domaine complet | 0139 ✓ |
| 27 | **Comptabilité assumée + réversibilité** : ce que Dashprod fait/ne fait pas, export de toutes les ressources | — |
| 28 | **P1 LEVÉ — prix des offres publiés** + remise annuelle 5 %, calcul d'abonnement dans le domaine | 0140 |
| 29 | **Point d'accès : envoi ET réception** — fonction serveur, webhook, secret hors du navigateur | 0141 |
| 30 | **Fournitures facturées** (vente de biens distincte) + **domaine des équipes de journée** | — |
| 31 | **Planning : note rapide + formation d'équipes** à l'écran | 0142 |
| 32 | **Correctif emballage** (colonne absente du select) + **dossier maître `docs/maitre/`** | — |
| 33 | **Compte + Paramètres réorganisés**, groupes cousus, 2 bugs mode nuit | — |
| 34 | **CORRECTIF MAJEUR — `org_id` sans défaut : 6 tables inécrivables** depuis leur création | 0143 |
| 19 | **Design — sélecteur rotatif** : le geste du variateur vitrine, porté dans bureau + terrain | — |

### Reste à faire

**Lot 10b — LIVRÉ**, sauf un point :
- [x] Le lift est un **type de mission** (la mission principale porte le type
      de la nature ; boxe et zone n'en produisent aucune, elles sont récurrentes)
- [x] Les dates créent chacune leur mission : principale + emballage + visite
- [x] `VoletAffectation` branché sur les missions réelles du dossier
- [x] **Deux bugs corrigés** : le report d'équipe s'exécutait à CHAQUE
      confirmation (retirer quelqu'un puis reconfirmer le réajoutait), et
      `centre_id` n'était pas repris sur les missions créées
- [x] ⚠️ **La reprise des dossiers déjà confirmés : SANS OBJET.** Vérifié en
      base le 17/08 — 2 dates d'emballage → 2 missions, 29 visites → 29
      missions, 23 dates principales → 15 missions de déménagement (les 8
      autres sont des lifts et sous-traitances). **Aucun trou.** Le rattrapage
      n'avait pas lieu d'être : `sync_visite_vers_mission` créait déjà les
      visites, et les emballages avaient tous été posés avant confirmation.
      *La leçon : vérifier l'existant AVANT d'écrire le correctif — le
      backfill aurait été du code mort, et le chercher a révélé deux vrais
      bugs (0134).*
- [x] **Le conflit de disponibilité calculé par mission** — visible sur le
      jeton, au moment du clic. La composition (rassembler engagements et
      congés) est passée dans le domaine : `lecteurDisponibilite()`. Elle
      vivait en closures dans `Planning.jsx` et il aurait fallu une troisième
      copie. **Lot 10 clos.**

**Lot 10e — LIVRÉ** (la matière, l'architecture, la grille, deux bugs)
- [x] **La Bille refaite à la racine** — voir §4.6. Cinq écarts avec la bille
      d'origine, dont la cause de fond : chaque bille écoutait sa propre boîte,
      donc le suivi était coupé sous 44 px pendant que la carte calculait déjà
      un champ de lumière que personne ne lisait
- [x] **Le test d'architecture** — `packages/domaine/architecture.js` +
      `tests/architecture.test.js`. Voir §4.8
- [x] **La grille de box « par exactitude »**, en AJOUT du mode par tranches
      (réponse de Raphaël). Barème au m³ + minimum mensuel, au choix de
      l'entreprise. Stocké dans `parametres_prix.stockage_boxes` — aucune
      migration, **lecture tolérante** de l'ancienne forme tableau
- [x] **0134 — deux bugs de production** : la diffusion d'équipe sur toutes les
      missions (critique, défaisait le lot 10d), et la mission jamais créée
      quand une date est posée après la confirmation
- [x] **0135 — l'équipe du dossier redevient celle du jour principal**, dans
      les deux sens (§4.5)

**Lot 11 — LIVRÉ** (couleurs par type + filtres du planning)
- [x] Édition des couleurs par type : **existait déjà** (Apparence → UTILITES)
- [x] Lift et sous-traitance **ajoutés** aux types (défaut gris auparavant),
      défauts alignés app ↔ domaine
- [x] Liseré du planning `emballage → violet, sinon bleu` en dur **remplacé**
      par `couleurMission(type)`
- [x] **Filtre par type** (puces colorées, seulement si plusieurs types)
- [x] **Masquer un membre** (`filtrerMissions`, préférences sur l'appareil)
- [x] Les filtres **ne faussent pas les conflits** (verrouillé par test)

**Lot 12 — app terrain — LIVRÉ**
- [x] **Le terrain peut demander un congé** — onglet Congés dans
      `TerrainProfil.jsx`. Circuit existant réutilisé. Demande SANS
      utilisateurId (donc à approuver), validée avant envoi
      (`validerDemandeConge`), motif visible, retrait tant qu'en attente.
- [x] **Le terrain peut changer son thème** — entrée Apparence dans le profil,
      qui ouvre le MÊME écran que les Paramètres bureau (aucune copie). Mode
      nuit, accent, taille. Quelques fonds `#fff` en dur du profil terrain
      passés au jeton `C.blanc` pour suivre le mode nuit.

**Lot 13 — écran Messages — LIVRÉ**
- [x] **Mise en page du fil** : il occupait une carte à hauteur fixe (380px) ;
      la conversation ouverte prend maintenant la hauteur disponible, en-tête
      collant, fil qui défile seul.
- [x] **La chaîne va jusqu'à la mission** : boîte → conversation → client →
      mission(s). Un bandeau des missions du dossier en tête de conversation,
      cliquable vers le planning **à la bonne date** (`jourInitial`).
- [x] **Focus des zones d'écriture** — le vrai défaut de fond : styles en
      ligne, donc aucun `:focus`. Feuille globale `champs-dashprod` (theme.jsx)
      qui donne à TOUS les champs (32) un anneau d'accent au focus, un
      survol, un placeholder distinct, un état désactivé. Plus les fonds `#fff`
      en dur du fil passés au jeton (mode nuit).

---

## 6. Questions ouvertes — ne pas trancher seul

1. **Le `+` et les contrats.** Choisir Boxe ou Zone crée une *affaire* de cette
   nature, mais **pas le contrat associé**. `stock_contrats.affaire_id` est
   prêt à les relier. Le `+` doit-il créer directement le contrat ?
2. **Le carnet dans la barre du bas.** Elle compte six onglets ; un septième
   est une décision de design. Aujourd'hui accessible via *Dossiers → Carnet*.
3. **Pièces jointes réelles dans Gmail** (API Google : OAuth, jeton,
   révocation). Non demandé formellement — proposé, sans réponse.
4. **Le CMR** — décidé « généré par Dashprod » (voir plus bas), reste à cadrer :
   quelles natures (sous-traitance seule, ou aussi déménagement international ?),
   série de numérotation, et 24 cases réglementaires. Mérite son lot.
   **C'est le prochain lot.**

> **CMR — EN ATTENTE de décisions produit (bloquant, ne pas coder à l'aveugle).**
> Un document réglementaire à 24 cases ne se devine pas. Trois réponses requises
> avant d'écrire : (1) natures — la CMR EXCLUT le déménagement (art. 1er §4), le
> module ne vaut donc QUE pour la sous-traitance internationale ; confirmer ce
> périmètre et le blocage sur déménagement. (2) numérotation — série propre à
> Dashprod, ou carnet pré-imprimé existant chez Roovers ? (3) poids brut
> (case 6.1.h, plafond d'indemnité 8,33 DTS/kg) — saisi au chargement, ou tenu
> par article ? Rappels acquis : la BE n'a PAS ratifié l'e-CMR → papier
> obligatoire, Dashprod génère et imprime, 3 exemplaires signés. Case 6.1.k
> (mention du régime CMR) EN DUR, jamais saisissable — c'est la seule omission
> sanctionnée nommément (art. 7 §3).

### Déjà répondu — ne pas reposer
- Sous-traitance : **on est le prestataire** (recette), pour un vendeur de
  mobilier ou un transporteur incapable d'assurer une livraison simple
- Boxe/Zone dans le `+` : **contrat client**, pas infrastructure
- Lift : couronnes **oui**, avec temps inclus par couronne (§4.2)
- Affectations : **laisser vide**, voyant 3D orange/vert
- Relevé & Matériel : **supprimés** pour les natures sans, pas grisés
- Zones par centre : **fonctionne déjà**, l'unicité est
  `(org_id, centre_id, nom)`
- Grille de box « par exactitude » : **AJOUTER**, ne pas remplacer les tranches
- CMR : **généré par Dashprod**, pas seulement attaché depuis le donneur d'ordre
- Architecture : **Dashprod ne doit pas dépendre du déménagement** — le
  déménagement est un vertical qui utilise l'horizontal (§4.8)
- Équipe et véhicules : **toujours en relation avec le planning**, ils font
  partie de la vérité d'un dossier (§4.5)
- Les doublons d'interface : **supprimer**, privilégier les relations entre
  informations et l'UX. Une donnée, une commande (§4.9)

---

## 7. Habitudes de travail attendues

- **Signaler les hypothèses AVANT de coder**, pas après.
- **Vérifier l'existant avant de construire** : plusieurs demandes étaient déjà
  satisfaites (zones par centre, transfert de membre, tranches de box).
- **Dire ce qui n'a pas été fait** et pourquoi, dans la réponse et dans le
  `NOTE.md`.
- **Ne pas trancher seul** un choix commercial ou une règle de prix.
- Les commentaires de code expliquent **le pourquoi**, jamais le quoi. Ils
  citent le bug évité quand il y en a un.
- Les fonctions rendent des **décisions motivées** (`{ok, motif}`), pas des
  booléens nus : c'est le motif qui s'affiche.
- Français partout : code, commentaires, interface, noms de variables.
- Chaque règle métier a **un test qui la verrouille**, avec un commentaire
  disant ce qui casserait sans lui.

---

## 8. Repères rapides

```bash
cd /tmp/dp
npm test                                    # suite domaine
cd apps/web && npm run build                # attrape la syntaxe, PAS le JSX manquant
grep -c "export async function <nom>" apps/web/src/lib/adaptateur.js
```

Modules domaine ajoutés cette session :
`commercial/natures.js`, `commercial/adresses.js`, `chiffrage/lift.js`,
`chiffrage/sous-traitance.js`, `chiffrage/scenario-nature.js`,
`planning/affectation.js`, `planning/etages.js`, `stocks/repere.js`,
`crm/carnet.js`, `communication/pieces-jointes.js`.

Composants ajoutés : `composants/Repere.jsx`, `MenuCreation.jsx`,
`BlocsNature.jsx`, `Conges.jsx`, `RaccourciBoite.jsx`, `Affectation.jsx`.

Écrans ajoutés : `Services.jsx`, `Contrats.jsx`, `Carnet.jsx`.

**Lot 34 :** module domaine `organisation/reglages.js` (rangement pur des
familles de réglages) ; composant `composants/ListeReglages.jsx` (Groupe,
Entree, OngletsSegmentes, Bandeau — grammaire partagée par Compte et
Paramètres) ; tests `reglages.test.js`. Jetons de teinte `teinte*` / `filet*` /
`encre*` dans `lib/apparence.js` : **ne jamais réécrire un fond d'alerte en
dur**, le garde `mode-nuit.test.js` le refuse.

---

## 9. Mise à jour de ce document

**Tous les 7 messages**, ou en fin de conversation :

1. Mettre à jour la date en tête et le compte de tests (§5)
2. Cocher ce qui est livré, déplacer le reste
3. Ajouter le numéro de la dernière migration
4. **Ajouter tout nouveau piège rencontré au §3** — c'est la section la plus
   précieuse : elle évite de repayer une erreur déjà payée
5. Déplacer les questions répondues vers « Déjà répondu » (§6)
6. Livrer le fichier mis à jour dans le zip du lot en cours
