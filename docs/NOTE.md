# Vague 2, lot E — les fondations pour encaisser les fournitures

**31/08/2026.** **1236 tests verts**, build vert. **Migration 0164** appliquée et
vérifiée. Premier lot de la vague 2 (les cartons qui, aujourd'hui, se livrent
sans se facturer).

## Les deux trous comblés

Vendre une fourniture était impossible pour deux raisons, maintenant réglées :

1. **Un article n'avait pas de taux de TVA.** Sans lui, le moteur de facturation
   refuse (à raison — il ne devine jamais un taux). Chaque article porte
   désormais un **taux de TVA** (21 % par défaut, ajustable, borné 0–100 %).
2. **Une vente exigeait un chantier.** On ne pouvait pas vendre trois cartons au
   comptoir sans les rattacher à un déménagement. C'est corrigé : **une vente
   peut exister sans chantier**.

Les tables étaient vides : ces changements ne touchent rien d'existant.

## Le domaine, pur et testé

Une brique de calcul qui transforme un article de stock en ligne de facture :
- **articleVendable** : un article se vend s'il a un nom, un prix et un taux de
  TVA. Un taux **absent est refusé** — jamais transformé en 0 % en douce (le
  piège classique). Un 0 % explicite, lui, est accepté.
- **ligneVente** : article + quantité → une ligne de facture propre (prix en
  centimes, TVA), ou rien si l'article n'est pas vendable.
- **composerVente** : additionne un panier, ignore l'invalide sans le facturer.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| un taux de TVA absent devient 0 % | 3 |
| la vente ne valide plus l'article | 2 |

## Ce que c'est, et ce que ce n'est pas encore

C'est le **socle** : la base sait stocker un prix TVA, le domaine sait composer
une vente juste. Ce n'est pas encore l'écran de vente ni la facture.

## Suite : le lot F

Le lot F posera la **vente effective** et, avec elle, ta remarque **R12** : la
facture du matériel pourra être **jointe** à celle du déménagement, ou **séparée**
(deux factures distinctes pour un même dossier). Le socle d'aujourd'hui est ce
qui le rend possible.
