# Lot 20 — refonte de l'en-tête de la landing

`npm test` : **946/946 ✓** — build `apps/web` ✓ — 4 fichiers.
**Aucune migration.** Se pose par-dessus le lot 19.

## Ce qui faisait « designer débutant »

L'en-tête d'avant était le **gabarit SaaS par défaut** : badge pilule, gros
titre, paragraphe, deux boutons, une rangée de chiffres, une capture à droite —
la structure qu'on voit sur mille pages. Et un fond en halo radial bleu+ambre,
le cliché absolu. Rien ne disait *déménagement* au premier regard, alors que ta
vitrine a déjà une identité forte : « la nuit du chargement à 5 h », l'ambre des
sangles, le lettrage étiré du flanc de camion. Cet univers existait mais
n'était pas **mis en scène**.

## Ce que j'ai fait : une scène, pas un gabarit

Je n'ai pas changé le message ni les boutons — j'ai changé la **mise en scène**,
en exploitant ce qui était déjà là.

- **L'aube à l'horizon.** Le fond n'est plus un halo générique : c'est un lever
  de jour ambre en bas de la scène, qui respire lentement (7 s, en boucle). Le
  petit matin d'un déménagement. Le bleu route ne teinte plus discrètement que
  le haut.
- **Le titre = le lettrage d'un camion.** Le mot-clé « facture payée » porte une
  ligne-force ambre qui **se tend** au chargement de la page, de gauche à
  droite — comme une sangle. C'est le premier mouvement qui accroche l'œil.
- **Une entrée en cascade.** Badge, titre, texte, boutons, chiffres montent
  l'un après l'autre (échelonné). La page s'assemble sous les yeux au lieu
  d'apparaître d'un bloc.
- **Une poussière d'étoiles** de la nuit finissante, qui scintille faiblement
  dans le haut. Positions **fixes** (aucun `Math.random` au rendu, qui casserait
  le rendu serveur et ferait clignoter à chaque frame).
- Les **chiffres** sont désormais séparés par des filets verticaux et repris en
  ambre clair — un bandeau de preuve, plus une rangée molle.

Tout respecte `prefers-reduced-motion` : qui a désactivé les animations voit une
scène fixe, sans mouvement.

## Le principe tenu

Rien d'inventé hors de l'univers existant : j'ai puisé dans ta palette (nuit,
ambre sangle, ciel), ta typo (display étiré, mono des étiquettes) et tes
animations (`v-lever`). La refonte **révèle** le concept de la vitrine au lieu
d'en plaquer un nouveau.

## À vérifier à l'œil

1. Ouvrir la landing : le titre s'affiche, puis le trait ambre se tire sous
   « facture payée » ; les éléments montent en cascade.
2. Le fond : une aube ambre en bas qui respire, des étoiles qui scintillent en
   haut — plus le halo bleu d'avant.
3. Activer « réduire les animations » (OS) : la scène est fixe, tout est lisible
   d'emblée.
