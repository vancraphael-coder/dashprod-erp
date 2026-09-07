# Consolidation de l'interface PC

**01/09/2026.** **1331 tests verts**, build vert.

## Le problème

Toute l'app était bornée à 520 px et centrée. Sur un téléphone, parfait. Sur un
écran de bureau, elle flottait au milieu d'un grand vide blanc — deux tiers de
l'écran perdus, et cette impression de « site mobile étiré » qui abîme la
crédibilité auprès d'un prospect qui te découvre sur son ordinateur.

## Ce que j'ai fait — et surtout ce que je n'ai PAS fait

**Je n'ai pas élargi le contenu.** C'était le piège : un texte, un formulaire ou
une liste étirés sur toute la largeur d'un moniteur sont illisibles — l'œil perd
la ligne. La bonne largeur de lecture ne dépend pas de la taille de l'écran.

**J'ai posé l'app sur le bureau.** Au-delà de 900 px de large :
- un **fond de bureau ambiant** discret (deux voiles bleutés très doux, adaptés
  au mode jour comme au mode nuit) remplace le vide blanc ;
- la colonne d'app **se pose dessus** : bordure fine, ombre douce, coins
  arrondis. Elle garde sa largeur de lecture, mais devient une **vraie
  application encadrée**, pas un ruban perdu. C'est le réflexe des apps pro sur
  desktop.

## Propre et sûr

- **Une seule source de largeur** (LARGEUR_APP dans le thème) — fini le 520
  recopié un peu partout.
- **Aucun écran modifié** : le cadre vise un hôte unique qui enveloppe l'app. Les
  40 écrans sont intacts.
- **Le mobile n'est pas touché** : tout est sous un média-query qui ne se
  déclenche qu'au-delà de 900 px. Un sabotage le vérifie.

## À vérifier à l'œil

1. Sur ton **ordinateur** : l'app est maintenant encadrée, posée sur un fond
   coloré doux, avec une ombre — plus de vide blanc autour.
2. Sur **téléphone** : rien ne change, pleine largeur comme avant.
3. En **mode sombre** : le fond de bureau s'assombrit en cohérence.

## Réserve d'honnêteté

C'est une consolidation VISUELLE — l'app reste une colonne, elle n'exploite pas
la largeur pour afficher deux panneaux côte à côte (liste + détail, à la
« desktop »). C'est un choix : le vrai multi-panneau est un gros chantier qui
toucherait chaque écran, et il vaut mieux le faire après que les métiers soient
stables (phase délimitation). Pour l'instant, l'app cesse d'avoir l'air perdue
sur grand écran — c'est ce qui pesait sur la crédibilité. Le rendu exact (largeur
du fond, intensité de l'ombre) se juge sur ton moniteur ; dis-moi si tu veux la
colonne plus large (par ex. 600 px) maintenant qu'elle est encadrée.

## Ce qui reste de ta liste

Test « indépendant manutention » avec Roovers donneur pilote · espace équipe
(messagerie interne, invité = code, permissions du donneur d'ordre).
