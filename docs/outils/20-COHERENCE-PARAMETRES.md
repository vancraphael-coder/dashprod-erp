# OUTIL — COHÉRENCE DES PARAMÈTRES

*Placer d'abord le PRÉAMBULE de `00-SYSTEME-OUTILS.md`.*

## Mission

Vérifier qu'un écran, un document PDF ou un calcul ne porte **aucune donnée de
configuration en dur**, et que chaque configuration qu'il consomme a une entrée
dans les réglages.

Cible : `__________`

## Pourquoi cet outil existe

La règle du produit :

> Aucun écran ne peut afficher, imprimer ou calculer une donnée de
> configuration qui n'a pas d'entrée dans les paramètres.

Trois violations déjà payées dans ce projet :

- le prix « 360 € HTVA/mois » écrit en dur dans l'écran d'inscription, alors
  qu'une société créée démarre à 180 € ;
- la grille de modules recopiée dans un test à la date de la migration 0075 —
  le test verrouillait ensuite la version périmée et **refusait** la
  correction ;
- le préfixe `BE0` figé dans la validation TVA, qui refusait toute la série de
  numéros ouverte depuis septembre 2023.

Aucune de ces trois n'était une faute d'inattention. Toutes venaient d'une
seconde saisie.

## La méthode

1. **Lister ce que la cible affiche ou calcule.** Chaque nombre, chaque
   libellé, chaque seuil, chaque texte légal.
2. **Pour chacun, remonter la source.** Quatre cas :
   - vient du référentiel ou de la base → **conforme** ;
   - vient d'un réglage existant → **conforme** ;
   - vient d'un littéral dans le code → **violation** ;
   - vient d'un littéral dans un test → **violation aggravée**, parce que le
     test empêchera la correction.
3. **Pour chaque violation, nommer l'entrée de réglage qui devrait exister**,
   avec la famille de `packages/domaine/src/organisation/reglages.js` où elle
   se place : Mon entreprise, Vendre et facturer, Coûts et grilles négociées,
   Mes listes, Mon dépôt, Consulter, Dashprod.
4. **Dire ce qui s'effondre** si l'entrée n'existe pas. Pas « ce serait plus
   propre » : ce qui devient faux, et où.

## Le livrable

Un tableau : donnée | source actuelle | verdict | entrée de réglage à créer |
ce qui s'effondre sans elle.

Puis une phrase de conclusion : la cible est-elle constructible en l'état, ou
faut-il créer les entrées d'abord ?

## Ce que tu ne fais pas

Tu ne crées pas les entrées. Tu ne corriges pas les littéraux. Cet outil
constate et qualifie — la construction est un lot de code.
