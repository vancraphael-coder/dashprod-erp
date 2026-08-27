# Lot 44 — bascule de centre étendue (planning + stockage)

**27/08/2026.** **1168 tests verts**, build vert. (Ce zip embarque aussi le
lot 43 — bascule sur les dossiers + migration 0152 — s'il n'était pas encore
déposé.)

---

## La bascule, maintenant sur les trois écrans

- **Dossiers** (lot 43) : sélecteur de centre + filtrage.
- **Planning** (ce lot) : les missions sont filtrées sur le centre choisi AVANT
  la grille, les pastilles et la charge du jour. Même sélecteur, secrétaire+
  seulement, jamais en lecture seule (le terrain n'a pas de bascule).
  `listerMissions` expose désormais `centre_id`.
- **Stockage** (ce lot) : il avait DÉJÀ son propre sélecteur de dépôt. Je ne
  l'ai pas doublé — je l'ai **restreint à la portée** : un responsable dépôt n'y
  voit que son centre, secrétaire+ voit tous les dépôts.

Le « sans interférer » tient partout : jamais deux centres dans la même liste.

## Éprouvé

- Le filtrage des dépôts du stockage selon la portée est verrouillé par test
  (responsable dépôt → un seul dépôt ; secrétaire → tous).
- La portée elle-même (responsable cloisonné, secrétaire+ qui bascule) était
  déjà éprouvée par sabotage au lot 42.

## Pas de régression

Un gérant sans centre (Roovers aujourd'hui) atterrit sur « Maison mère » ;
tant qu'aucun centre n'existe, le sélecteur ne montre que « Maison mère » et
rien ne disparaît.

---

## PROCHAIN LOT — finir les postes/permissions (ta priorité)

Tu as dit : les postes/permissions doivent être **terminés avant le reste**.
C'est le prochain lot, et il ne reste QUE du câblage d'écran (le domaine est
prêt depuis le lot 38) :

- **écran d'attribution de poste** par membre, avec **promouvoir / rétrograder** ;
- **sélection des pages modifiables** pour « visite terrain » ;
- **garde « confier les accès »** : seul un poste qui en a le droit voit cet
  écran ; **octroi** de la confiance à une secrétaire réservé au fondateur/gérant.

Ensuite seulement, retour au **circuit** (surcoût interne, photos).

## À vérifier à l'œil

1. **Planning** en tant que secrétaire/gérant : la barre « Centre » apparaît, et
   changer de centre filtre les missions du mois et du jour.
2. **Stockage** en tant que responsable dépôt : tu ne vois que ton dépôt dans
   le sélecteur. En tant que secrétaire : tu les vois tous.
3. Terrain (planning en lecture seule) : pas de bascule.
