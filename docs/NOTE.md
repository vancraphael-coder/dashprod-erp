# Nouvelle barre de navigation + corrections Messages

**01/09/2026.** **1250 tests verts**, build vert. Trois choses d'un coup.

## 1. La nouvelle barre de navigation

Ta maquette, portée en React et branchée sur la vraie app :

- **L'animation « feutre »** : à l'activation, l'icône et le libellé se
  **tracent** (le trait se dessine), comme au feutre.
- **Chaque icône a son geste** : Dossiers fait un petit bond, Planning tourne
  comme une page, Stockage flotte, Messages sonne comme une cloche, Ressources
  respire, Compte salue de la main.
- Le coin supérieur arrondi et l'ombre douce, comme demandé.

**Une adaptation que j'ai faite exprès** : ta maquette avait des couleurs claires
figées (fond blanc, bleu en dur). Je les ai **liées à ton thème** — l'onglet
actif prend ta couleur d'accent (réglable), les autres un gris doux, le fond suit
la surface. Résultat : **la barre marche en mode sombre** (sinon elle serait
restée blanche sur une app noire) et suit l'accent que tu choisis. Le routage et
le filtrage par abonnement (Stockage/Ressources qui n'apparaissent que si
l'offre les ouvre) sont inchangés, et le sélecteur rotatif est conservé.

J'ai aussi ajouté le respect de « mouvement réduit » : sur un appareil réglé pour
limiter les animations, la barre reste sobre.

## 2. Alignement des conversations (R16)

La carte de conversation avait une **largeur 100 % EN PLUS** de la marge latérale
de la carte standard → elle débordait de 32 px à droite, d'où le décalage. Retiré :
elle s'aligne maintenant comme les autres cartes.

## 3. Bulles blanc sur blanc en mode sombre (R16)

Le vrai coupable : la bulle du correspondant décidait de ses couleurs d'après une
prop `theme` qui n'existe que dans le portail client — **absente dans l'app**.
Donc en mode nuit, elle gardait un fond clair avec un texte clair = illisible.
Corrigé : la nuit se détecte maintenant sur le **mode réel** de l'app. Les bulles
reçues et les puces de pièce jointe sont lisibles en clair comme en sombre.

## À vérifier à l'œil

1. La barre : change d'onglet → l'icône se trace au feutre et fait son geste.
2. Passe l'app en mode sombre : la barre reste lisible (accent + gris sur fond
   sombre), pas de barre blanche.
3. Conversations : les cartes ne débordent plus à droite.
4. Mode sombre + un fil de messages : les bulles reçues sont lisibles (plus de
   blanc sur blanc).

## Réserve d'honnêteté

L'animation « feutre » dure ~2,1 s, comme dans ta maquette — c'est un choix
esthétique assumé, mais sur une barre qu'on touche souvent, tu la trouveras
peut-être un peu lente à l'usage réel ; on peut l'accélérer d'un chiffre si tu
veux. Et le rendu exact des gestes (flip 3D, cloche) se juge sur l'appareil : le
build est vert, mais l'œil sur mobile est le juge final.
