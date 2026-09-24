<!-- FICHIER GÉNÉRÉ — ne pas éditer à la main.
     Régénéré par : node outils/pilotage.mjs
     Source de vérité : packages/domaine/src/commercial/referentiel-offres.js
     Toute correction se fait dans la source, jamais ici. -->

# Donneur d'ordre — verrous et état de vente

État : généré
Dernière revue : 2026-09-24

| | |
|---|---|
| Statut affiché | **bientot** |
| Souscriptible | **non** |
| Modules ouverts | 0 |
| Modules non livrés | 0 |

**Pourquoi elle ne se vend pas encore.** Aucun module n'est ouvert : le parcours propre à cette offre n'est pas construit.
Encaisser pour une promesse est le plus sûr moyen de perdre le client au
premier mois. Le verrou vit en base (`plan_souscriptible()`), pas dans
l'interface : c'est le seul endroit à changer pour l'ouvrir.
