# Lot 36 — toute la flotte, groupée, et le véhicule de l'équipe du jour

**23/08/2026.** **1100 tests verts** (1094 avant), build vert.
**Migration 0144** — appliquée et vérifiée en base.

---

## 1. Toute la flotte, sur toute carte mission

La flotte était **filtrée** sur la catégorie attendue : un lift ne voyait que
des lifts, un déménagement que des camions. On ne pouvait donc ni ajouter la
voiture qui suit le lift, ni un second camion sur un gros chantier — deux
besoins courants du terrain, purement interdits par le logiciel.

Le filtre a disparu des **deux** composants (`CarteDate` et `VoletAffectation`).
Un test refuse qu'il revienne dans un seul : les deux offriraient alors des
flottes différentes pour la même mission, et c'est exactement la divergence que
ce dépôt paie à répétition.

## 2. La catégorie devient un minimum, pas une exclusivité

Corollaire nécessaire, et c'est le vrai gain. L'ancienne règle signalait
**chaque** véhicule d'une autre catégorie comme une faute : un lift accompagné
d'une voiture clignotait en orange, alors que l'attelage est correct.

À force de clignoter à tort, l'orange ne veut plus rien dire et on cesse de le
lire — c'est ainsi qu'un avertissement utile se perd.

Désormais, une seule chose est signalée : **l'absence de la catégorie requise.**
« Aucun lift parmi les véhicules affectés ». Ce que l'ancienne règle protégeait
reste protégé — partir sur un lift avec un seul camion est toujours une erreur,
et elle se dit.

## 3. Groupement par catégorie

Offrir quinze véhicules à plat redonnerait le problème que le tri venait de
régler : on cherche « le lift », pas « un véhicule ». Chaque famille a son
en-tête, et le groupe attendu remonte en tête avec la mention « attendu pour
cette mission » — sans cette phrase, on croirait à un ordre arbitraire.

**C'est un ordre, jamais un filtre : aucun véhicule ne disparaît.** Une
catégorie inconnue reste visible plutôt que de s'évaporer — un véhicule
invisible ne se cherche pas, il se rachète.

⚠ **Correction d'une erreur du lot 35 :** j'avais écrit les rangs de catégorie
pour « fourgon » et « remorque ». L'énumération SQL `categorie_vehicule` ne
connaît que **camion | lift | voiture**. Les rangs ne s'appliquaient donc à
rien et le groupement retombait en silence sur l'ordre alphabétique. Un test
verrouille maintenant l'accord avec la base.

## 4. Un véhicule dans l'équipe du jour — migration 0144

Une équipe de journée avait des personnes et des missions, **jamais de
véhicule**. Or on ne compose pas une équipe sans savoir avec quoi elle part :
deux équipes du même jour pouvaient se voir attribuer le même camion, et on ne
s'en apercevait **qu'au dépôt, le matin**, quand il n'y en avait qu'un.

`equipe_vehicules` suit exactement le patron de 0142 : table de liaison **sans
`org_id`**, qui hérite du cloisonnement par jointure sur `equipes_jour`. En
ajouter un créerait une seconde vérité de tenant, qu'on finirait par oublier de
tenir d'accord avec la première.

**Aucune contrainte `unique(jour, vehicule)`** — et c'est délibéré. Le même
camion peut servir le matin puis l'après-midi. Une contrainte aveugle
interdirait ce cas légitime : c'est le domaine qui juge le chevauchement
horaire, et il le met en **avertissement**, jamais en blocage. Ta règle
s'applique ici aussi : on signale, on n'interdit pas.

Vérifié après application : RLS active, 1 politique, 2 index, colonnes
conformes.

Détail au passage : le message de conflit était écrit pour une personne
(« déjà engagée »). Sur un camion, l'accord faux fait douter du message entier —
et un avertissement dont on doute cesse d'être lu.

## 5. Éprouvé par sabotage

| Sabotage | Tests rouges |
|---|---|
| le conflit de véhicule devient bloquant | 2 |
| le groupement redevient un filtre | 1 |
| l'exigence de catégorie disparaît | 1 |

---

## Ce qui n'a PAS été fait

- **Les modèles d'équipe ne retiennent toujours que les personnes.** Un modèle
  qui figerait un camion le réserverait pour toutes les journées où on
  l'applique — l'inverse de ce qu'on veut d'un modèle.
- **Le planning n'affiche pas encore le véhicule sur la vignette de mission.**
  Il est visible sur la ligne de l'équipe ; l'ajouter aussi sur la mission
  demande de trancher quelle source fait foi quand les deux divergent. À
  instruire, pas à deviner.

## À vérifier à l'œil

1. Carte d'un **lift** : les lifts en tête avec « attendu pour cette mission »,
   **puis camions et voitures**, tous cliquables.
2. Lift **+ voiture** affectés : plus aucun orange.
3. Lift **sans lift** : « Aucun lift parmi les véhicules affectés ».
4. Planning → une journée → **« Avec quoi »** : les véhicules groupés.
5. Deux équipes, même camion, horaires qui se chevauchent : **avertissement**,
   et l'enregistrement reste possible.
