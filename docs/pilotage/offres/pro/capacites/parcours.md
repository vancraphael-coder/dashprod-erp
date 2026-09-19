<!-- FICHIER GÉNÉRÉ — ne pas éditer à la main.
     Régénéré par : node outils/pilotage.mjs
     Source de vérité : packages/domaine/src/commercial/parcours-offres.js
     Toute correction se fait dans la source, jamais ici. -->

# Pro — le parcours réel

État : généré
Dernière revue : 2026-09-17

> Plusieurs dépôts, chacun ses équipes, une seule vue d'ensemble.

## Les étapes, dans l'ordre

1. **Tout ce que fait Regular** — Le circuit complet reste identique sur chaque site.
   · Écran : Le circuit complet · Module : facturation
2. **Chaque dépôt a son périmètre** — Un gestionnaire voit son centre, ses équipes, ses chantiers — et rien du centre d'à côté.
   · Écran : Centres logistiques · Module : multi_depots
3. **Vous gardez la vue d'ensemble** — Où en est chaque centre, en un écran, sans appeler les responsables un par un.
   · Écran : Rapport des centres · Module : gestionnaire_depot
4. **Le garde-meubles se voit** — Les boxes, les zones, ce qui est occupé et par qui — sur un plan, pas sur un tableur.
   · Écran : Stockage · Module : stockage_3d
5. **L'international entre dans le circuit** — Les dossiers hors frontières suivent le même chemin que les autres, avec leurs documents propres.
   · Écran : International · Module : international

## Ce que cette offre ne fait PAS

- Un développement sur mesure : Dashprod est un produit, pas une agence.
