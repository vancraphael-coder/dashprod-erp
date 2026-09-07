# La boîte à facturer prend vie + cartes d'offres harmonisées

**01/09/2026.** **1326 tests verts**, build vert.

## 1. L'écran Dépenses — ton idée, à l'écran

Le domaine de la semaine dernière avait tout le calcul mais aucune interface.
C'est réparé : dans Paramètres, une tuile **« Dépenses & dettes »**.

En haut, **le bilan** — pour 100 € encaissés, où va l'argent :
- Recettes, dépenses (avec leur % sur recettes), et surtout le **reste** — ce qui
  te revient, en euros et en pourcentage.
- Chaque poste de dépense en **barre proportionnelle** : tu vois d'un coup d'œil
  que le carburant pèse 12 % ou que les salaires en font 40 %.
- Les **dettes en cours** isolées, et une **santé colorée** : vert si ça va,
  ambre s'il reste peu, rouge si les dépenses dépassent les recettes.

En bas, **la saisie rapide** : un libellé, un montant, une catégorie, et le
choix **réglée** ou **dette** (avec échéance). La liste dessous, où une dette se
marque « Réglé » d'un clic.

C'est le pilotage simple et efficace que tu demandais — les sorties enfin
visibles, en face des recettes.

## 2. Les cartes d'offres, harmonisées

Comme demandé : les offres de l'écosystème utilisent **exactement la même carte**
que les offres déménageur — le même verre dépoli, la même inclinaison 3D au
survol, la même bille qui déplie le détail, et **la même structure de texte**
(secteur, nom, prix, promesse, « pour qui », détail dépliable).

Concrètement, j'ai **supprimé le composant séparé** que j'avais fait la dernière
fois et réutilisé la vraie carte : les « récurrents » de chaque offre deviennent
les lignes de détail, et une offre « bientôt » ferme le bouton d'essai avec un
message clair au lieu de « souscrire ». Une seule carte à maintenir, une
cohérence visuelle parfaite entre déménageur et écosystème.

## À vérifier à l'œil

1. Paramètres → **Dépenses & dettes** : ajoute une dépense, une dette ; le bilan
   se met à jour, les barres et la santé réagissent.
2. La landing, section **Réseau** : les cartes sont maintenant identiques aux
   cartes de tarifs déménageur (verre, bille, dépliable), avec le badge/motif
   « bientôt ».

## Ce qui reste de ta liste

Interface PC à consolider · test « indépendant manutention » Roovers pilote ·
espace équipe (messagerie, invité=code, permissions).

## Réserve d'honnêteté

L'écran dépenses est fonctionnel mais le bilan prend les **recettes = paiements
encaissés du mois** ; si tu préfères raisonner sur le CA émis (engagement), c'est
un réglage à ajouter — dis-moi ta préférence comptable. Et le rendu de la carte
d'offre réutilisée se juge sur ton écran : comme elle a une bille « détail », les
récurrents sont maintenant dépliables au lieu d'être toujours visibles — dis-moi
si tu les préfères ouverts d'emblée.
