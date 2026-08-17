# Lot 10 — paquet consolidé (10e + 10f). **Lot 10 clos.**

`npm test` : **901/901 ✓** — build `apps/web` ✓
23 fichiers + `PASSATION.md`.

Un seul glisser-déposer pour les deux livraisons de la session. Si tu avais
déjà posé `dashprod-lot-10e.zip`, ce paquet le remplace intégralement.

## Migrations — RIEN À FAIRE

`0134`, `0135` et `0136` sont **déjà appliquées en live** via MCP. Les trois
fichiers SQL du paquet sont des **stubs de référence** : ils documentent ce qui
a été fait et pourquoi, ils ne s'exécutent pas. Ils ont leur place dans le
dépôt pour que l'historique reste lisible, mais ils n'ont aucun effet au
déploiement.

## Ce que contient le paquet

**La Bille** (`lib/matiere-bille.js`, `Bille.jsx`, `cartes-vives.js`,
`CarteAbonnement.jsx`, `theme.jsx`, `MenuCreation.jsx`)
Refaite à la racine : huile irisée à deux teintes, angle par `atan2`, verre ou
peinture selon la surface, profondeur réelle. La bille ne s'éclaire plus
elle-même — la carte publie son champ de lumière, la bille l'hérite en CSS.
Une puce de 14 px vit comme une vedette de 84.

**L'architecture** (`packages/domaine/architecture.js` + son test)
Le noyau ne peut plus importer un métier, chaîne d'imports entière vérifiée.
Éprouvé sur ses quatre modes de panne. Une dérogation déclarée :
`lib/adaptateur.js` → `releve/volumetrie.js`.

**La grille de box au m³ exact** (`stocks/stockage.js`, `Bareme.jsx`,
`Stockage.jsx`) — en ajout du mode par tranches, lecture tolérante des barèmes
déjà en base.

**Une seule commande par date** (`CarteDate.jsx`, `Dossier.jsx`)
Trois commandes pilotaient la même affectation ; il n'en reste qu'une, et elle
dit à quelle vérité elle parle (« Prévu » / « Au planning »).

**Le conflit de disponibilité par mission** (`operations/missions.js`,
`Planning.jsx`) — dernier point du lot 10b. Porté par le jeton, au moment du
clic. Rien n'est bloquant.

## Après déploiement, à vérifier à l'œil

1. Une carte de date d'un dossier **confirmé** affiche « Au planning » ; un
   dossier en devis affiche « Prévu ».
2. Sur un dossier de **lift**, cocher un membre au planning doit se voir sur le
   dossier (c'était cassé — 0136).
3. Les petites billes (voyants d'affectation, pastilles de nature) suivent la
   lumière quand la souris balaie la carte.
