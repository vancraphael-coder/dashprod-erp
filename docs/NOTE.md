# Lot 22 — visite (suite) : un devis pouvait être gonflé silencieusement

`npm test` : **950/950 ✓** — build `apps/web` ✓ — 4 fichiers.
**Aucune migration.** Se pose par-dessus le lot 21.

## Le défaut trouvé

Un article à **quantité 0 comptait pour 1** dans le calcul de volume.

`it.quantite || 1` traite un zéro *voulu* comme une absence. Concrètement : un
métreur qui met une quantité à 0 pour retirer un meuble du calcul — au lieu de
supprimer la ligne — **gonflait le volume, donc le prix**, sans aucune erreur
visible. Un devis faux, silencieux.

C'est exactement la famille du `Number(null) === 0` qui avait mis la TVA à zéro
en production. Le remède était déjà écrit dans le projet : `ouDefaut()`, qui
respecte un zéro et ne remplace que l'absence. Il n'était simplement pas utilisé
ici.

**Méthode** : j'ai d'abord écrit le test — il a échoué, prouvant le bug — puis
corrigé. La correction est démontrée, pas supposée.

**Au brief chantier**, une ligne à 0 est maintenant **retirée** plutôt
qu'affichée. Corriger naïvement aurait donné « 0× Canapé » au chantier, et
l'équipe aurait cherché un meuble absent.

## Ce que la visite a validé par ailleurs

**Faux positifs écartés** — j'ai vérifié avant de « corriger » :
`Math.max(1, f.nbCamions || 1)` est **volontaire** (un déménagement facture au
moins un camion). Les `|| 0` sur valeurs absentes sont sains.

**Planning** — `conflitsAffectation` exclut bien la mission courante du calcul
de doublon. L'invariant tient.

**Terrain** — pointage éprouvé sur ses cas limites : un chantier 22h → 02h rend
**4 h** (passage à minuit géré), et une pause plus longue que le chantier est
refusée avec un motif lisible. Bien fait.

## À vérifier à l'œil

1. Relevé : poser un meuble, mettre sa quantité à **0** → le volume total
   n'augmente pas (avant, il augmentait).
2. Le devis calculé sur ce relevé reflète le bon volume.
3. Le brief chantier ne mentionne pas les lignes à 0.
