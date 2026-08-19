# Hotfix — écran blanc sur 'Dossier'

`npm test` : **939/939 ✓** — build `apps/web` ✓ — 3 fichiers.
**Aucune migration.** Se pose par-dessus `dashprod-lot-14`. **À déployer en
priorité** — corrige un écran blanc en production.

## La cause

Le symptôme était « Dossier → écran blanc », mais la faute était dans un
composant enfant, **CarteDate** — et introduite par le lot 14 (permis).

`permisManquant` est une `const` fléchée. Une const fléchée **n'est pas
hoistée** : l'appeler avant sa ligne de déclaration lève « Cannot access
'permisManquant' before initialization » **au rendu**. Or `engages` (calculé
pendant le rendu) l'appelait dix lignes **au-dessus** de sa déclaration. Le
build ne voit rien (le fichier compile), les tests unitaires non plus (l'erreur
est à l'exécution) — seul le navigateur plante, en rendant blanc.

Le bug ne se déclenchait que **lorsqu'un membre était affecté** à une date :
c'est là que `engages` parcourt les membres et appelle `permisManquant`. D'où un
Dossier qui marchait tant qu'aucune équipe n'était posée, puis blanchissait.

## Le correctif

Une seule chose : remonter la déclaration de `permisManquant` (et de
`vehiculesAffectes`) **avant** `engages`. Rien d'autre ne change dans le
comportement.

## Le garde-fou

J'ai reproduit le plantage hors navigateur (transpilation de toute la chaîne via
l'esbuild de vite + `renderToStaticMarkup`, états forcés dans l'ordre des
`useState`) pour être certain de la cause avant de corriger.

Puis j'ai ajouté un test statique dans `hooks-conditionnels.test.js`, à côté du
garde « pas de hook après un return » : il détecte, par indentation, tout appel
d'une const fléchée du corps direct d'un composant situé **avant** sa
déclaration. Vérifié dans les deux sens — il rougit sur la régression, il est
vert sur le code corrigé. Cette classe d'écran blanc ne pourra plus passer une
livraison.

## À vérifier à l'œil

1. Ouvrir un dossier, poser une date, **affecter un membre** : la carte
   s'affiche (avant, c'est là que l'écran blanchissait).
2. Affecter un membre ET un camion à permis : le jeton du membre se teinte si
   le permis manque, sans planter.
