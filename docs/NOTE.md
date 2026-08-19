# Lot 19 — sélecteur de page façon vitrine

`npm test` : **943/943 ✓** — build `apps/web` ✓ — 5 fichiers.
**Aucune migration.** Se pose par-dessus le lot 18.

## Réutiliser le geste, pas copier le code

La vitrine a sa boussole (`VariateurNav`) : une molette qui tourne, aiguille
ambre pointant la section active. Tu voulais le **même mouvement** pour naviguer
dans le bureau, le terrain et l'espace client.

Mais le variateur de la vitrine pilote un **défilement** entre sections d'une
même page (IntersectionObserver qui suit le scroll). Dans l'app, on change
d'**écran** — il n'y a rien à observer. J'ai donc réutilisé le **geste**, pas le
code :

- même molette, même aiguille ambre, même rotation **par le chemin le plus
  court** (le calcul de diff identique à la vitrine) ;
- mais elle pilote un écran actif, poussé de l'extérieur : un clic sur un cran
  commute l'écran, et l'aiguille s'aligne — que le changement vienne de la
  molette ou de la barre d'onglets du bas.

C'est exactement l'esprit « réutiliser, pas copier » : le nouveau composant
`SelecteurRotatif` est autonome, il ne dépend pas du code vitrine, il en reprend
le mouvement.

## Où il apparaît

Posé en bas à droite, discret au repos, net au survol — **masqué sous 900px**,
où la barre d'onglets du pouce reste la commande. C'est un repère de confort sur
grand écran, pas une béquille.

- **Bureau** : mêmes entrées que la barre (Dossiers, Planning, Messages,
  Ressources, Compte…). Les deux commandes partagent la même liste — pas deux
  vérités de navigation.
- **Terrain** : ses propres entrées (Chantiers, Agenda, Profil). « Nouveau »
  reste hors molette : c'est une action, pas un écran — la molette navigue,
  elle ne déclenche pas.

## L'espace client

Il n'a pas encore de coquille à onglets à équiper : côté client, il y a la
porte d'accès par code et des documents individuels, pas (encore) une
navigation multi-écrans avec un état d'écran actif. Le jour où cet espace
existera, il montera le même `SelecteurRotatif` avec ses entrées — le composant
est prêt. Je préfère le noter que d'inventer une navigation qui n'existe pas.

## À vérifier à l'œil

1. Sur grand écran (> 900px), bureau : une molette en bas à droite. Cliquer un
   cran change d'écran ; l'aiguille tourne vers lui par le chemin le plus court.
2. Cliquer un onglet de la barre du bas : la molette s'aligne toute seule.
3. Réduire la fenêtre sous 900px : la molette disparaît, la barre reste.
4. Terrain : même molette, avec Chantiers / Agenda / Profil.
