# Dashprod — Passation de session

> **À lire en entier avant de coder.** Ce document permet à une nouvelle
> conversation de reprendre le travail sans rien casser ni rien réinventer.
>
> **Dernière mise à jour :** 17/08/2026 — après le lot 10d.
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

## 4. Le modèle métier — décisions à ne pas défaire

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
- **Dérogations** : datées, motivées, et vérifiées **encore réelles** — une
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

## 5. État au 17/08/2026

**`npm test` : 912/912 ✓ — build `apps/web` ✓**
**Migrations appliquées : jusqu'à `0136_miroir_mission_principale_toutes_natures`.**

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

**Lot 12 — app terrain**
- [ ] Le terrain peut changer son thème (Apparence)
- [ ] Le terrain peut demander un congé
      *(le circuit du lot 5 existe — il manque la porte dans `TerrainProfil.jsx`,
      qui n'a que les onglets Véhicule / Inventaire / Paie)*

**Lot 13 — écran Messages**
- [ ] Centrage et mise en page
- [ ] Logique : **boîte → conversation → client → mission(s)**

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
