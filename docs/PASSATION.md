# Dashprod — Passation de session

> **À lire en entier avant de coder.** Ce document permet à une nouvelle
> conversation de reprendre le travail sans rien casser ni rien réinventer.
>
> **Dernière mise à jour :** 17/08/2026 — après le lot 10b.
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

### 3.6 Les triggers d'état ne se testent pas au SQL nu
`affaires.etat` est protégé par `bloquer_update_etat()` : tout UPDATE hors
`cmd_transition_affaire` est refusé, et `session_replication_role` n'est pas
accessible sur Supabase. Pour valider un trigger de confirmation, **exercer
séparément chaque lecture et chaque insert de son corps** dans un bloc
`do $$ … rollback $$` — c'est ce qui a validé 0130.

### 3.7 Les tests statiques
Plusieurs tests lisent les **sources** d'`apps/web` plutôt que d'importer
(l'alias `@domaine` n'est résolu que par Vite). Ils ignorent les commentaires
via `sansCommentaires()` — sinon un commentaire citant le bug fautif
déclencherait le garde-fou.

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

### 4.6 Autres invariants
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

## 5. État au 17/08/2026

**`npm test` : 865/865 ✓ — build `apps/web` ✓ (209 modules)**
**Migrations appliquées : jusqu'à `0131_affectation_par_mission`.**

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

### Reste à faire

**Lot 10b — LIVRÉ**, sauf un point :
- [x] Le lift est un **type de mission** (la mission principale porte le type
      de la nature ; boxe et zone n'en produisent aucune, elles sont récurrentes)
- [x] Les dates créent chacune leur mission : principale + emballage + visite
- [x] `VoletAffectation` branché sur les missions réelles du dossier
- [x] **Deux bugs corrigés** : le report d'équipe s'exécutait à CHAQUE
      confirmation (retirer quelqu'un puis reconfirmer le réajoutait), et
      `centre_id` n'était pas repris sur les missions créées
- [ ] ⚠️ **RESTE : la reprise des dossiers DÉJÀ confirmés.** Les affaires
      confirmées avant 0130 n'ont ni mission d'emballage ni mission de visite,
      même quand leurs dates existent. Le trigger ne se déclenche qu'à la
      transition vers `confirme`. Il faut un **backfill** :
      pour chaque affaire `confirme`+ avec `date_emballage` / `date_visite`
      sans mission correspondante, créer la mission (affectation vide).
      À écrire et à EXÉCUTER avant de considérer le lot clos.
- [ ] Le conflit de disponibilité calculé **par mission**

**Lot 11 — couleurs et vue du planning**
- [ ] Une couleur par type de mission, réglable dans Apparence
- [ ] Appliquée **côté bureau ET côté terrain**
- [ ] Sous le planning : filtre par type de mission
- [ ] Sous le planning : masquer un membre **en un clic, cas par cas**

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

### Déjà répondu — ne pas reposer
- Sous-traitance : **on est le prestataire** (recette), pour un vendeur de
  mobilier ou un transporteur incapable d'assurer une livraison simple
- Boxe/Zone dans le `+` : **contrat client**, pas infrastructure
- Lift : couronnes **oui**, avec temps inclus par couronne (§4.2)
- Affectations : **laisser vide**, voyant 3D orange/vert
- Relevé & Matériel : **supprimés** pour les natures sans, pas grisés
- Zones par centre : **fonctionne déjà**, l'unicité est
  `(org_id, centre_id, nom)`

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
