<!-- FICHIER GÉNÉRÉ — ne pas éditer à la main.
     Régénéré par : node outils/pilotage.mjs
     Source de vérité : packages/domaine/src/commercial/referentiel-offres.js
     Toute correction se fait dans la source, jamais ici. -->

# Indépendant manutention — verrous et état de vente

État : généré
Dernière revue : 2026-09-17

| | |
|---|---|
| Statut affiché | **bientot** |
| Souscriptible | **non** |
| Modules ouverts | 6 |
| Modules non livrés | 0 |

**Pourquoi elle ne se vend pas encore.** Les modules existent, mais le parcours de bout en bout n'est pas éprouvé.
Encaisser pour une promesse est le plus sûr moyen de perdre le client au
premier mois. Le verrou vit en base (`plan_souscriptible()`), pas dans
l'interface : c'est le seul endroit à changer pour l'ouvrir.
