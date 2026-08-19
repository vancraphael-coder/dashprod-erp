# Lot 15 — design de la bille

`npm test` : **941/941 ✓** — build `apps/web` ✓ — 4 fichiers.
**Aucune migration.** Se pose par-dessus le hotfix écran blanc.

## Deux demandes

**La palette : bleu clair → bleu foncé/mauve → rose.** Le ton `bleu` est celui
de la bille de marque. Il n'est plus un bleu monochrome : la lumière est bleu
clair, le cœur bleu foncé/mauve, le creux rose. La sphère traverse donc les
trois couleurs de haut en bas — c'est cette transition qui fait l'identité de
la mascotte, pas une teinte plate. J'ai aussi ajouté `mauve` et `rose` comme
tons autonomes, pour colorer une bille isolée sans repasser par tout le
dégradé.

**La grosse bille retirée des cartes de date.** En tête de carte, elle était en
taille `bouton` (44px) — trop lourde sur une carte déjà dense. Remplacée par la
`jeton` (22px), qui suffit comme repère. Le mouvement (survol qui grossit,
parallaxe du signe) est global sur `.bille` : la petite en hérite exactement
comme la grosse. Rien perdu côté vie, juste de l'encombrement en moins.

L'état de la carte reste porté par la barre latérale gauche, jamais par la
bille — comme depuis le lot 10g.

## À vérifier à l'œil

1. N'importe quelle bille de marque (le « + » de création, une carte
   d'abonnement) : dégradé qui va du bleu clair en haut au rose en bas, plus
   un simple bleu.
2. Une carte de date dans un dossier : la bille de tête est petite ; au survol
   elle grossit légèrement et son signe bouge — le mouvement est là.
