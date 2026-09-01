# Fournitures : la chaîne concorde, de Matériel à la Facture

**31/08/2026.** **1246 tests verts**, build vert. Les deux étapes du devis qui
manquaient sont branchées. Tout part de Matériel, tout concorde.

## Ce qui manquait, maintenant en place

Le montant des fournitures traverse désormais **les deux onglets du devis** :

- **Estimation** : sous le total, une ligne **« Fournitures (matériel) »** au
  prix client.
- **Calcul définitif** : sous les colonnes Prévu / Réel / Facturé, une ligne
  **« Fournitures (matériel) · à facturer »**.

Et à la Facture, ces mêmes fournitures sont proposées à l'ajout (lot précédent).

## La garantie : une seule source

Les quatre stades — Matériel, Estimation, Calcul définitif, Facture — lisent
**exactement la même chose** : les fournitures consommées (E/U/R de Matériel)
valorisées au prix client du catalogue. Ce n'est pas « la même formule recopiée
quatre fois », c'est **la même fonction**, appelée partout
(`valoriserVenteEmballage`). Donc le montant que tu vois à l'Estimation est, au
centime près, celui du Calcul définitif et celui que facture la Facture.

Un **test de concordance** le verrouille : montant affiché === montant facturé.
Si un jour quelqu'un casse la concordance, un test rougit.

## Réservé aux prix

Ces montants n'apparaissent que pour qui voit les prix (`peutVoirPrix`) — le
terrain ne voit pas les valeurs, comme partout ailleurs.

## À vérifier à l'œil

1. Sur un dossier avec des fournitures dans Matériel : onglet **Estimation** →
   la ligne « Fournitures (matériel) » montre le montant au prix client.
2. Onglet **Calcul définitif** → la même valeur, sous les trois colonnes.
3. Facture → la proposition « Fournitures consommées » porte le même montant.
   Les trois concordent.

## Réserve d'honnêteté

Estimation et Calcul définitif AFFICHENT le montant fournitures (pour que tu
voies la chaîne concorder) ; ils ne l'AJOUTENT pas encore au total de prestation
— c'est à la Facture que tu décides de les inclure, d'un geste (lot précédent).
C'est un choix de design cohérent avec ta règle : la facture reste maîtrisée
jusqu'à l'émission. Si tu veux que l'Estimation additionne d'office les
fournitures au devis (pour un prix « tout compris » annoncé au client), c'est une
petite évolution — dis-le-moi.
