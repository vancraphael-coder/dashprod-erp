# Lot 17 — cohérence des boutons

`npm test` : **946/946 ✓** — build `apps/web` ✓ — 4 fichiers.
**Aucune migration.** Se pose par-dessus le lot 16.

## Le diagnostic

L'app a 391 boutons ; 184 seulement passaient par un style partagé. Les ~200
autres improvisaient leur style en ligne, avec des rayons de 8 à 14 au hasard.
Et surtout : le thème n'offrait que **deux** styles de bouton (`plein` et
`lien`), donc chaque écran réinventait le bouton secondaire (25 fois) et le
bouton danger (plus de 100 fois). Voilà la source de l'incohérence.

Deux causes, deux corrections.

## 1. Un vrai vocabulaire de boutons

Ajoutés au thème, à côté des deux existants :
- **plein** — action principale (aplat bleu). *(existait déjà)*
- **secondaire** — second rang (Annuler, Retour) : contour, pas remplissage,
  pour ne pas rivaliser avec l'action principale.
- **danger** — destructif (Supprimer) : contour rouge au repos, qui se remplit
  au survol. Un gros bouton rouge plein crie ; on veut prévenir, pas alarmer.
- **puce** — petit bouton en ligne (filtre, étiquette) : rayon pleinement
  arrondi, jamais les rayons intermédiaires qui traînaient.
- **lien** — texte seul. *(existait déjà)*

Un écran qui a un besoin standard s'y sert désormais, au lieu d'improviser.

## 2. Tous les boutons répondent enfin au geste

C'était le plus visible : les boutons étaient **inertes** — aucun retour au
survol, aucun anneau au focus clavier. Une grande part de l'impression
d'incohérence venait de là.

Une feuille CSS globale (les styles en ligne ne peuvent pas porter de `:hover`
/ `:focus`) anime **tous** les boutons, sans toucher un seul des 391 :
- survol qui éclaircit légèrement ;
- enfoncement bref au clic ;
- anneau d'accent au focus **clavier seulement** (pas au clic souris) ;
- le danger se remplit de rouge au survol.

On ne touche ni à la couleur ni à la forme (portées par le style inline) :
seulement au **retour**. C'est ce qui unifie l'ensemble sans tout réécrire.

## Ce que ce lot ne fait PAS

Je n'ai pas migré les ~200 boutons inline vers les nouveaux styles — ce serait
200 risques de régression pour un lot. L'essentiel est que le vocabulaire
existe et que le retour au geste soit universel. La migration écran par écran
se fera au fil des prochains lots design, là où je touche déjà chaque écran.

## À vérifier à l'œil

1. N'importe quel bouton, au survol : il s'éclaircit un peu ; au clic, il
   s'enfonce brièvement.
2. Naviguer au clavier (Tab) : un anneau bleu apparaît sur le bouton visé —
   mais pas quand on clique à la souris.
3. Un bouton rouge (déconnexion, suppression) : au survol il se remplit.
