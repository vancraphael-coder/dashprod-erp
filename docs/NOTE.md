# L'empreinte visuelle desktop — une scène, la roulette en emblème

**01/09/2026.** **1334 tests verts**, build vert.

## Le bon cap, cette fois

J'avais mal compris : le mobile reste linéaire (c'est parfait ainsi), et c'est le
**PC qui devient la zone d'expression** — non-linéaire, une atmosphère de confort.
J'ai remplacé mon rail par une vraie **scène**.

## Ce que Dashprod devient sur grand écran

Ce n'est plus une colonne qui défile. C'est une **composition en deux temps** :

**À gauche, l'emblème.** La roulette que tu aimes, **agrandie**, posée dans un
**puits de lumière** qui respire doucement. Ton logo et le nom de ta société
au-dessus, le nom de l'écran courant en dessous. Quand tu changes de page, la
roulette **tourne** pour pointer la nouvelle section — le geste-signature du
projet, enfin au centre de la scène au lieu d'être une pastille en coin. C'est
elle, l'empreinte visuelle.

**À droite, le plateau.** L'écran courant ne défile pas : il **se pose** dans une
carte de verre (flou, ombre ample, liseré lumineux) avec une petite animation à
chaque changement — il arrive, il s'installe. Confortable, jamais brusque.

**Le fond** est un espace profond : des halos lents qui dérivent sur 22 secondes,
adaptés à ton mode clair/sombre et à ta couleur d'accent. Une pièce vivante, qui
respire — pas un tableur. Tout, du puits à la carte, suit **ta** couleur.

## Propre et sûr

- **Le mobile est 100 % intact** : la scène ne s'affiche qu'au-delà de 1024 px ;
  en dessous, le shell s'efface et la barre du bas reprend la main.
- **Aucun des 40 écrans touché** : la scène les enveloppe.
- **Plus de doublon** : la roulette flottante des barres est masquée sur desktop,
  puisque l'emblème la porte.
- Réactif au redimensionnement, mouvement réduit respecté, sabotage vérifié (la
  scène qui redeviendrait linéaire fait rougir un test).

## À vérifier à l'œil — c'est là que tu juges l'empreinte

1. Sur **ordinateur** : la roulette trône à gauche dans sa lumière ; change de
   page → elle tourne, l'aiguille pointe, la carte de droite se re-pose.
2. Change ta couleur d'accent → toute la scène (fond, puits, carte) suit.
3. Mode sombre → l'atmosphère s'assombrit en profondeur.
4. Sur **téléphone** : rien n'a changé.

## Ce que je propose ensuite

C'est le **socle d'expression** — la scène et son emblème. Le cran d'après, celui
qui rend l'expérience « promax » : que le **contenu** exploite cette scène. Par
exemple, sur Dossiers, la liste et le dossier ouvert cohabitent sur le plateau
(maître-détail), et la roulette pourrait piloter des vues, pas seulement des
écrans. Mais ça se fait écran par écran.

Regarde d'abord cette scène. Si l'empreinte te parle, on l'enrichit ; si la
roulette ne te semble pas assez marquante en emblème, dis-le — je peux la
repenser plus spectaculaire (halo réactif à la souris, reflets, matière).

## Réserve d'honnêteté

C'est l'ossature et l'atmosphère : le rendu exact (la douceur de la rotation
agrandie, la lisibilité des petites icônes à l'échelle ×1.55, la profondeur des
halos) se juge sur ton écran. La roulette a été dessinée petite ; agrandie, ses
graduations et libellés peuvent demander un ajustement de finesse — dis-moi ce
que tu vois, j'affine.
