# 40 — L'ARCHITECTURE : TROIS AXES, PAS UNE FORME

Écrit le 13/09/2026, en réponse à une question posée franchement : « je parle
de pyramide, mais si tu vois que mon architecture ressemble plus à un hexagone
et que je ne le vois pas, dis-le ».

Réponse franche : **ce ne sont pas deux descriptions concurrentes de la même
chose. Ce sont trois axes différents, et les confondre est le seul vrai
danger.**

---

## Axe 1 — La forme du code : c'est un hexagone, et il l'est déjà

Dashprod applique l'architecture hexagonale (ports et adaptateurs) sans que
personne ne l'ait nommée ainsi :

- **le cœur pur** — `packages/domaine/`. Aucune base, aucun réseau, aucun
  `fetch`. Il calcule, il valide, il refuse. C'est la règle posée après le
  lot 02 : « la logique métier se place dans un étage pur, testable sans muter
  quoi que ce soit ». C'est la définition même d'un noyau hexagonal.
- **les adaptateurs** — `adaptateur.js` vers Supabase, les écrans vers
  l'utilisateur, les migrations vers Postgres, le générateur
  `publier-offres.mjs` vers le SQL.
- **la preuve que ça tient** — 1 385 tests qui tournent sans base ni réseau.
  Impossible dans une architecture en couches classique, où la logique est
  mêlée à l'accès aux données.

Donc : oui, c'est un hexagone. Ce n'est pas une correction à apporter, c'est un
acquis à nommer pour ne pas le perdre. **Le jour où une règle métier sera
écrite dans un écran ou dans une migration plutôt que dans le domaine,
l'hexagone se percera** — et c'est arrivé trois fois (le prix en dur dans
l'inscription, la grille recopiée dans un test, le préfixe `BE0` dans la
validation). Les trois fois, le symptôme était le même : une règle hors du
noyau.

## Axe 2 — Les contraintes de qualité : ce sont les trois angles

Le légal, le paramétrage, la prise en main. Ce ne sont pas des couches de code
et ça n'a rien à voir avec l'hexagone : ce sont **trois exigences que chaque
livrable doit satisfaire en même temps**.

C'est un triangle au sens où retirer un sommet fait tomber les deux autres :
sans paramétrage, le légal se code en dur et la prise en main devient une
affaire de formation. Mais ce n'est pas une pyramide au sens d'une hiérarchie
où l'on monterait étage par étage.

**Le mot « pyramide » n'était pas faux, il était vague.** Il désignait tantôt
la chaîne technique `PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES →
LIMITES`, tantôt ces trois exigences. Deux choses sous un mot : c'est
exactement comme une donnée saisie à deux endroits — ça finit par diverger.

## Axe 3 — La cloison : ni une couche, ni une exigence, une frontière

Et c'est celui qu'aucune des deux images ne décrivait.

Une organisation Dashprod est une **cellule** : une membrane (`org_id =
jwt_org()` appliqué par le RLS) et un intérieur où tout circule librement. Ce
n'est pas un étage de l'hexagone — ça traverse tous les étages. Ce n'est pas
une exigence de qualité — c'est une propriété de sécurité, vraie ou fausse,
sans nuance.

Cet axe est devenu visible le jour où il a fallu qu'un donneur d'ordre propose
une date à un indépendant : **deux cellules, et quelque chose à faire passer.**
Aucune métaphore de pyramide ou d'hexagone ne dit quoi faire là. La réponse
vient de la biologie plutôt que de l'architecture logicielle : un **pore
contrôlé**, qui ne laisse passer que ce qui a été explicitement publié ou
négocié, et rien d'autre.

C'est ce qu'est l'objet `engagements` (migration 0182) : la seule structure de
toute la base qui n'a pas de colonne `org_id`.

---

## Ce que ça change concrètement

| axe | où il vit | comment on le garde |
|---|---|---|
| Hexagone | `packages/domaine/` pur, adaptateurs autour | les tests tournent sans base ni réseau |
| Trois angles | chaque écran, chaque document | `produit-registre.test.js` |
| Cloison | le RLS, et un seul objet-frontière | politiques de lecture, aucune écriture directe |

Trois axes, trois gardes différentes. Un seul mot pour les trois aurait
produit, tôt ou tard, une décision prise sur la mauvaise grille.

---

## Sur la question de fond : est-ce qu'une explication peut casser le travail ?

La question était : « je ne vois pas toujours si te donner certaines
explications ne te fait pas effondrer ce que tu fais d'excellent ».

Réponse honnête, avec les faits de ce projet.

**Les corrections apportées ont toutes amélioré le résultat**, et deux d'entre
elles ont changé l'ordre des travaux pour de bonnes raisons :

- « les paramètres sont un point de vérité » a déplacé le lot des réglages
  AVANT les écrans. Sans elle, « Ma disponibilité » aurait été construit sur
  une configuration en dur, donc refait.
- « chacun a les siens » a fait apparaître qu'il n'y avait pas une taxonomie
  de réglages mais une par métier et par niveau. Sans elle, un indépendant
  aurait vu les coûts internes d'un déménageur.

**Le risque réel n'est pas dans les explications. Il est dans le fait
d'adopter une image comme si c'était une contrainte.** Une métaphore juste
éclaire ; la même métaphore appliquée à un axe qu'elle ne décrit pas conduit à
construire de travers en croyant bien faire. C'est pour ça que les invariants
vivent dans des tests et pas dans la documentation : un test qui mord ne se
laisse pas convaincre par une belle image.

**La bonne manière de donner une directive**, au vu de ce qui a marché : dire
le problème réel constaté, pas la solution supposée. « Je n'arrive pas à créer
une seconde société » a produit un meilleur travail que n'aurait produit
« ajoute un bouton dans les paramètres » — parce que le diagnostic a révélé que
le mécanisme existait déjà et qu'il manquait seulement une porte.

Et quand une directive risque de casser quelque chose, c'est à moi de le dire
avant de l'appliquer, avec le motif. C'est arrivé une fois : la suppression de
l'organisation `pro`, refusée parce qu'elle portait le drapeau éditeur.
