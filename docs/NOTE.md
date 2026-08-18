# Lot 13 — Messages, et le design de toutes les zones d'écriture

`npm test` : **927/927 ✓** — build `apps/web` ✓ — 7 fichiers.
**Aucune migration.** Se pose par-dessus `dashprod-lot-12`.

## Les zones d'écriture — le défaut était de fond

Tu as vu juste : elles avaient un mauvais design, et la cause n'était pas
cosmétique. Toute l'app style **en ligne** (`S.input`, etc.), et un style en
ligne **ne peut pas porter de `:focus`, `:hover` ni `::placeholder`** — ces
pseudo-classes n'existent qu'en CSS. Résultat : un champ ne réagissait pas au
clic. Bordure inerte, aucun anneau, un texte d'invite de la même encre que la
saisie. On ne voyait pas où l'on écrivait. Ça touchait **les 32 champs** de
l'app.

La correction est faite à un seul endroit : une feuille de style
(`champs-dashprod`, dans `theme.jsx`) appliquée par sélecteur. Une source,
effet global, sans toucher un écran. Chaque champ a maintenant :
- un **anneau de focus** à la couleur d'accent (pas le halo bleu du navigateur,
  qui ignore le thème et jure en nuit) ;
- un **survol** qui prévient qu'il est cliquable ;
- un **placeholder** distinct de la saisie, qui s'efface au focus ;
- un **état désactivé** qui a l'air désactivé.

## Messages — la chaîne va jusqu'au bout

**boîte → conversation → client → mission(s).** La conversation ne connaissait
que le dossier. Quand un client écrit « on peut décaler mercredi ? », le bureau
devait rouvrir le dossier pour trouver la mission. Désormais un **bandeau des
missions** s'affiche en tête de conversation — chaque mission avec sa couleur de
type et sa date — et un clic saute **au planning, à la bonne date**
(`jourInitial`, ajouté au planning et routé depuis `main.jsx`). Sans la date, le
pont serait décoratif ; il atterrit au bon jour.

**Mise en page.** Le fil vivait à l'étroit dans une carte à hauteur fixe de
380px. La conversation ouverte prend maintenant la hauteur de l'écran :
en-tête collant, bandeau des missions, fil qui défile seul, lien « Ouvrir le
dossier » en pied. On lit une conversation, plus un encadré.

**La barre de composition.** Le champ grandit avec le texte (auto-hauteur) au
lieu d'une poignée de redimensionnement qui désalignait le bouton. Entrée
envoie, Maj+Entrée passe à la ligne. Les fonds `#fff` en dur des chips (modèles,
pièces jointes) passés au jeton, pour suivre le mode nuit.

## À vérifier à l'œil

1. N'importe quel champ (recherche, devis, connexion) : au clic, bordure et
   anneau à la couleur d'accent ; en nuit, l'anneau suit — pas de halo bleu.
2. Une conversation avec des missions : les puces colorées en tête ; cliquer
   saute au planning **sur le jour de la mission**.
3. Le fil : il remplit l'écran, l'en-tête reste en haut, la saisie en bas.
4. Écrire un long message : le champ s'agrandit jusqu'à une limite puis défile ;
   Entrée envoie.
