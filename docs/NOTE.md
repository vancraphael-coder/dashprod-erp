# Desktop — abandon du design, une colonne qui épouse l'écran

**01/09/2026.** **1330 tests verts**, build vert.

## Ce que j'ai fait

J'ai retiré la scène (roulette-emblème) — abandonnée comme tu l'as demandé — et
je l'ai remplacée par une adaptation **sobre** : la colonne de l'app **s'élargit
avec l'écran**, sans effet, sans figer le mobile.

Concrètement, la largeur suit des **paliers** :
- téléphone : 520 (exactement comme avant) ;
- à partir de 760 px : 600 ;
- à partir de 1024 px : 720 ;
- grand écran (1440 px+) : 820.

Elle s'élargit avec douceur au redimensionnement, mais **garde une largeur de
lecture** — je n'étire jamais le contenu sur tout un moniteur, ce serait
illisible. Les barres (nav du bas, sections) suivent exactement la même largeur,
donc rien n'est décalé.

C'est piloté par **une seule variable** (`--dp-largeur`) : si tu veux d'autres
valeurs, on ajuste un seul endroit.

## Propre

- **Mobile strictement inchangé** (520, repli garanti).
- Aucun écran touché : la largeur vient de S.page et des barres, via la variable.
- Un test garde ce choix et **interdit le retour** d'un shell desktop invasif
  (ni cadre redimensionné, ni scène).

## ⚠️ Dépôt — une suppression à faire à la main

Le composant `apps/web/src/composants/CadreBureau.jsx` (la scène) est **sur ton
dépôt** et doit être **supprimé** : un zip ne peut pas effacer un fichier. Après
avoir déposé ce lot :
- **supprime `apps/web/src/composants/CadreBureau.jsx`** de ton repo.
Sans ça, le fichier reste présent mais inutilisé (rien ne l'importe), et un test
échouerait. Le zip contient déjà les deux tests mis à jour qui constatent
l'abandon.

## À vérifier à l'œil

1. Sur **ordinateur** : la colonne est un peu plus large et centrée, avec de
   l'air autour — elle épouse l'écran sans s'étirer.
2. Redimensionne la fenêtre : la largeur s'ajuste par paliers, en douceur.
3. Sur **téléphone** : rien n'a changé.

## Réserve d'honnêteté

C'est volontairement minimal — pas de disposition repensée, juste une colonne qui
respire mieux sur grand écran. Si 820 px te semble trop étroit ou trop large sur
ton moniteur, dis-moi la valeur, c'est un chiffre à changer.
