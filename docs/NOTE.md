# Lot 38 — le socle des permissions (+ corrections 37b)

**25/08/2026.** **1133 tests verts**, build vert. **Migration 0145** appliquée
et vérifiée.

Ce lot fait deux choses : il corrige le 37b (jamais déposé), et il pose la
LOGIQUE des trois fondations. L'écran complet suit dans un lot séparé — je
l'explique à la fin.

---

## D'abord, les corrections du 37b

**La bille : j'avais inversé, c'est corrigé.** Tu voulais que la bille STATIQUE
(haut de carte) disparaisse et que la DYNAMIQUE (accordéon) reste, puisque
c'est elle qui actionne le dépliage. C'est maintenant le cas : la bille de
l'accordéon est de retour (chevron qui pivote), et le haut de carte n'a plus de
bille — juste un repère « + » discret quand aucune date n'est posée.

Le reste du 37b est inchangé et toujours là : **panne = blocage critique**,
**conflit « deux équipes » nommé**, **modèles sans contrôle de conflit**.

---

## Les trois fondations — ce qui est fait

En explorant, j'ai trouvé que **presque tout le socle existait déjà** :
`utilisateurs.centre_id`, les tables `roles / role_capacites /
utilisateur_roles`, six postes déjà hiérarchisés, et les commandes
`cmd_centre_definir`, `cmd_centre_affecter_membre`, `cmd_affecter_role`. Le
problème n'était pas de construire, mais — tes mots — que « les postes ne sont
pas bien définis » et « les permissions trop vastes ».

### 1. La grille des postes, conçue (le cœur, tu me l'as délégué)

`packages/domaine/src/rh/postes.js` définit **onze postes nommés par métier** :
fondateur, gérant, secrétaire, chef d'équipe, livreur, monteur, chauffeur,
liftier, déménageur, intérimaire, visite terrain.

On ne coche plus 13 capacités : on choisit un poste. Quelques partis pris que
tu retoucheras :

- **Métier ≠ permission.** Les cinq métiers d'exécution (déménageur, livreur,
  monteur, chauffeur, liftier) ont **exactement les mêmes droits logiciels**.
  Ils se distinguent par ce qu'ils FONT, pas par ce que l'outil autorise. Les
  séparer en droits identiques n'ajouterait que du bruit.
- **La hiérarchie n'est pas un empilement mécanique.** `cloturer_chantier` est
  un geste de terrain (arrêter le décompte de l'équipe sur place) : la
  secrétaire, au bureau, ne l'a **pas**, même si son rang dépasse celui du chef
  d'équipe. Monter vers la direction ouvre l'argent et les réglages ; ça ne
  recopie pas les gestes de terrain. Un test verrouille ce choix pour qu'on ne
  le « corrige » pas par erreur.
- **Le terrain ne voit jamais l'argent** — ni prix, ni paie, ni facturation.

### 2. Promotion / rétrogradation

Chaque poste a un **rang**. Promouvoir = monter d'un cran, rétrograder =
descendre d'un cran. Les cinq métiers de rang 4 se promeuvent vers chef
d'équipe (rang 3), jamais l'un vers l'autre. L'écran présentera ça comme un
curseur, pas 13 cases.

### 3. Confier les accès — ta règle exacte

- **Fondateur et gérant** : de plein droit.
- **Secrétaire** : uniquement si un fondateur ou un gérant le lui a **octroyé**.
- **Le terrain** : jamais.
- Et l'octroi lui-même ne peut venir que d'un fondateur ou d'un gérant : pas de
  chaîne où une secrétaire octroierait à une autre.

### 4. Visite terrain — sélection de pages

Accès en **lecture seule**, complété par une **sélection multiple de pages**
qu'on ouvre en modification (`PAGES_MODIFIABLES`). Les écrans sensibles — paie,
paramètres, facturation, compta — **ne sont jamais** dans le catalogue
partageable. Une page inconnue passée par erreur est ignorée, pas ouverte.

### 5. Transfert de membres, par lot

`organisation/centres.js` : la **maison mère = absence de centre** (`null`),
pas une ligne fantôme. `transfererMembres(ids, centreId)` déplace **plusieurs
membres à la fois**, entre centres ou depuis/vers la maison mère, en ne comptant
que ceux qui bougent vraiment.

---

## La migration 0145 — prudente, sur des rôles de production

**Vérifié avant de toucher quoi que ce soit** : 6 membres en « direction », 1 en
« demenageur ». La migration est **additive** : elle ajoute les 11 postes, garde
les anciens rôles, et ne touche **aucune affectation**. Détruire « direction »
aurait retiré ses 14 capacités à 6 personnes d'un coup.

**Vérifié après** : les 11 postes existent avec les bons comptes de capacités,
`confier_les_acces` n'est QUE sur fondateur + gérant, les affectations sont
intactes. Idempotente : rejouable sans dégât.

---

## Éprouvé par sabotage

| Sabotage | Tests rouges |
|---|---|
| la secrétaire confie les accès sans octroi | 1 |
| le terrain gagne « voir les prix » | 1 |
| visite terrain accepte une page inconnue | 1 |
| le transfert oublie de filtrer les « déjà là » | 2 |

---

## Ce qui reste à câbler — le prochain lot

J'ai posé la logique et la base, **pas encore tout l'écran**. Il manque :

- **Créer un centre AVEC transfert multiple** au moment de la création (la
  création existe déjà ; il faut y greffer le transfert que ce lot rend
  possible).
- **L'écran d'attribution de poste** par membre — le curseur promouvoir /
  rétrograder, et la sélection de pages pour « visite terrain ».
- **La garde « confier les accès »** : seul un poste qui en a le droit voit cet
  écran.

Tout est prêt côté logique et base (`cmd_affecter_role` existe). C'est du
câblage d'écran, sans nouvelle décision — je l'ai gardé pour un lot dédié plutôt
que de livrer une UI à moitié faite.

---

## À vérifier à l'œil

1. Ouvrir un dossier : la carte mission n'a **plus de bille en haut**, mais la
   bille de l'accordéon (« Qui la fait ») **actionne bien le dépliage** (son
   chevron pivote).
2. Rien d'autre n'est visible pour l'instant côté permissions — c'est normal,
   l'écran arrive au prochain lot.

## Suite

Le câblage d'écran des permissions (ci-dessus), puis le **36bis** (emballage
sorti des formules exclusives).
