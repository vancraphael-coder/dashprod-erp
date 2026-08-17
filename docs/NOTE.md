# Lot 10e — la matière, l'architecture, la grille, et deux bugs de production

`npm test` : **892/892 ✓** — build `apps/web` ✓
Migrations **0134** et **0135** déjà appliquées en live via MCP.
16 fichiers + `PASSATION.md`.

---

## 1. La Bille — corrigée à la racine

Ta remarque était juste. Cinq écarts avec la bille de `CarteAbonnement` :

| | l'original | les billes de l'app |
|---|---|---|
| **couleur** | bleu → **ambre** → bleu, deux teintes : de l'huile | teinte → même teinte plus sombre : de l'ombre |
| **angle** | `atan2(ny, nx)`, un vrai angle | `135 + x * 90` — y ignoré, la lumière ne pouvait pas venir d'en bas |
| **matière** | `.38` + `backdrop-filter` : du verre | `.95`, opaque : de la peinture |
| **profondeur** | perspective + `translateZ` | aucune — le signe décalé à plat |
| **la cause** | la carte suit le curseur | **chaque bille écoutait sa propre boîte** |

Le commentaire de `Bille.jsx` annonçait « bleu, ambre, bleu » ; le code ne l'a
jamais fait.

**Le cinquième point explique les quatre autres.** Une puce de 14 px ne peut
pas se surveiller elle-même — sa boîte ne mesure que du bruit — donc le suivi
était coupé sous 44 px. Pendant ce temps la carte qui les porte calculait déjà
un champ de lumière complet, en un seul écouteur, que personne ne lisait.

**La bille ne s'éclaire plus elle-même : elle est éclairée par la surface.**
`cartes-vives.js` publie `--carte-angle`, `--carte-nx/ny` et `--carte-sx/sy`
(le regard adouci en sinus, comme la carte). La bille les hérite en CSS, sans
un rendu React. Une puce de 14 px vit donc comme une vedette de 84, et toutes
les billes d'une carte s'éclairent **ensemble** — c'est cet accord qui se lit
comme du relief.

Toute la recette est dans **`lib/matiere-bille.js`**, en fractions du diamètre
`--b` : 14 px et 84 px sont le même objet à deux échelles. Un test refuse toute
mesure figée dans la matière.

`CarteAbonnement` **consomme** désormais la bille partagée. C'est la recopie
qui avait permis la dérive.

> **À confirmer d'un mot** : la passation disait « parallaxe **inversée** », la
> carte d'origine fait l'inverse (le signe suit le curseur, le reflet part à
> contresens). Les deux documents se contredisaient. J'ai suivi **la carte**,
> puisque c'est la référence que tu as citée. Un signe à changer si tu préfères
> l'autre.

## 2. L'architecture — le test qui la fait tenir

`packages/domaine/architecture.js` déclare l'horizontal, les verticaux
(déménagement, lift, sous-traitance, garde-meubles), l'aiguillage et les
dérogations. Le test suit la **chaîne entière** d'imports : une dépendance
revient toujours par un intermédiaire anodin.

Éprouvé sur ses quatre modes de panne — import direct, import transitif,
dérogation retirée, module renommé. Il rend la chaîne complète :

```
Garde-meubles et logistique :
      chiffrage/moteur.js
      → commun/monnaie.js
      → stocks/stockage.js
```

**Une fuite réelle trouvée** : `lib/adaptateur.js`, la plomberie la plus
horizontale de l'app, importe `@domaine/releve/volumetrie.js` pour composer
l'instantané d'offre. Inscrite en **dérogation datée et motivée**, avec sa
sortie prévue. Le test refuse qu'une dérogation devenue inutile y reste : la
liste ne peut que rétrécir.

*Non corrigée dans ce lot volontairement* : une offre signée est opposable et
figée (§4.7). Ce chemin ne se retouche pas en marge d'un autre travail.

## 3. La grille au m³ exact — ajoutée, pas substituée

Deux modes au choix de l'entreprise, dans l'écran Barème.

| mode | règle |
|---|---|
| `tranches` | inchangé |
| `exact` | `volume × prix/m³`, **minimum mensuel** appliqué au mois *puis* multiplié par la période |

Sans prix au m³ ou sans volume connu → **hors barème**, jamais un prix inventé
(`Number(null) === 0`, le piège payé six fois).

**Aucune migration** : c'est du jsonb. Mais **lecture tolérante obligatoire** —
les barèmes en base sont de simples *tableaux*. Ne pas savoir les relire aurait
mis à zéro le prix de tous les boxes loués, en silence. Changer de mode
n'efface pas les tranches saisies.

La ligne de facture dit son calcul : `Box A1 — 5.2 m³ × 9.00 €/m³`.

## 4. Le rattrapage 10b : sans objet — mais il a révélé deux bugs

**Aucun trou en base.** 2 dates d'emballage → 2 missions, 29 visites → 29
missions. Le backfill aurait été du code mort. Mais le chercher a trouvé ceci :

### Bug critique, en production, qui défaisait le lot 10d (0134)

`sync_dossier_vers_missions` se déclenchait à **chaque** update d'affaire et
réécrivait les affectations de **toutes** les missions planifiées depuis
`affaires.equipe`. Chaque « Enregistrer » recopiait l'équipe du déménagement
sur l'emballage et sur la visite.

Preuve en base : sur `09fd3035`, la visite est faite par **Elisa**, l'équipe du
dossier est **Raphaël**. L'enregistrement suivant remplaçait Elisa par Raphaël.

C'est le bug de 0130 (« le report n'a lieu qu'à la création ») dans un second
déclencheur qui avait été oublié.

### Une date posée après la confirmation ne créait aucune mission (0134)

Le déclencheur de confirmation sort si l'état ne transite pas ; la synchro ne
faisait qu'un `UPDATE`, qui ne trouvait rien et **ne disait rien**. Le dossier
semblait prêt, personne n'était réclamé — ton diagnostic sur la bille, côté
données. Le modèle correct était deux fonctions plus loin
(`sync_visite_vers_mission` : `if not found then insert`).

## 5. L'équipe redevient une vérité du dossier (0135)

Ta réponse : les membres et les véhicules font partie de la vérité d'un
dossier. La relation est donc rétablie — **mais elle vise le jour principal**.
L'équipe d'un dossier est celle qui fait le travail, pas celle qui passe en
visite la semaine d'avant.

| geste | effet |
|---|---|
| cocher un membre sur le dossier | affecte la mission principale |
| affecter la mission principale au planning | se voit sur le dossier |
| visite, emballage | **jamais touchés** |

Trois gardes contre les défauts constatés : rien ne bouge si `equipe` et
`camions` sont inchangés ; équipe et véhicules traités **séparément** ; missions
`planifiee`/`en_cours` seulement — on ne réaffecte pas une journée dont les
heures sont pointées.

Éprouvée en `do $$ … rollback $$` avant livraison, **cinq assertions** :
(a) le dossier commande le jour principal · (b) la visite garde la sienne ·
(c) un enregistrement sans changement d'équipe ne touche rien · (d) le planning
nourrit toujours le dossier · (e) décocher retire vraiment.

L'écran recharge les missions après enregistrement — sans quoi le volet
d'affectation aurait affiché l'équipe d'avant, deux vérités à l'œil.

---

## Ce qui t'attend

1. **La parallaxe de la bille** — un mot suffit (voir §1).
2. **Trois commandes pour une affectation.** L'écran Dossier a la carte de date
   principale, le volet de la mission principale, et le sélecteur « Équipe ».
   Les trois sont cohérents maintenant, mais trois commandes pour une donnée
   reste une odeur. Laquelle disparaît ?
3. **Le CMR** — décidé « généré par Dashprod ». Reste à cadrer : quelles
   natures, quelle série de numérotation, les 24 cases réglementaires. Ça
   mérite son lot, je ne le fais pas en appoint d'un autre.
