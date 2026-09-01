# Emballage — la question réglée entièrement (source unique)

**31/08/2026.** **1243 tests verts**, build vert. **Migration 0166** appliquée et
vérifiée. C'est l'étape 1 du registre : l'emballage devient une source unique.

## Ce qui change

Fini les quatre définitions contradictoires du carton. Désormais **un seul
endroit** décrit chaque fourniture, avec **tout** :

- **Paramètres → Catalogues → Fournitures d'emballage** : chaque article porte
  son **coût** (ce qu'il te coûte), son **prix client** (ce que tu factures) et
  son **taux de TVA**. Une seule saisie.

Et chaque page lit la bonne valeur, exactement comme tu l'as demandé :

- **Matériel** : le **coût total** pour l'organisation — plus, en prime, le prix
  client et la marge, pour que tu voies les trois d'un coup d'œil.
- **Devis / Calcul définitif** : le **prix client** (via la même source).
- **Vente rapide et fournitures jointes** : lisent maintenant ce catalogue-là (et
  non plus une table séparée) — donc quand tu vends un carton, c'est le prix
  client du catalogue qui arrive, avec sa TVA.

## Le ménage fait

- La section « Matériel facturé » du **Barème** — une liste figée de 5 cartons
  que **personne ne lisait** — est retirée, remplacée par un renvoi vers les
  Catalogues. Plus de double saisie, plus de contradiction.
- Les vieilles valeurs orphelines (le carton à 1 € dans le Barème) ne sont plus
  lues. La seule vérité est le catalogue.

## Tes fournitures ont été garnies

Tes 9 fournitures n'avaient qu'un coût. La migration leur a donné un **prix
client par défaut** (coût × 1,6, arrondi) et une **TVA à 21 %**, sans rien
écraser. Exemple : carton standard, coût 1,50 € → prix client 2,40 €. **À toi
d'ajuster ces prix** dans les Catalogues — ce sont des points de départ, pas des
vérités.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| la valorisation « prix client » utilise le coût | 2 |

## À vérifier à l'œil

1. Paramètres → Catalogues → Fournitures : chaque article montre coût + prix
   client + TVA, éditables.
2. Matériel d'un dossier : total coût, prix client, marge.
3. Vente rapide → reprendre un article du catalogue : le prix client et la TVA
   arrivent tout seuls.

## Où on en est du cap

C'est la **preuve du registre** : un paramètre (l'emballage) désormais à source
unique, lu partout, édité une fois. R3 (prix client répercuté) et R12
(facturation des fournitures) reposent enfin sur une seule vérité. Les autres
paramètres (matériel terrain, tarifs, suppléments…) pourront suivre le même
patron — c'est l'étape 2 du plan.

## Note de dépôt

Ce lot embarque `90-PARAMETRES-CARTOGRAPHIE.md` (le doc de cap du tour
précédent), pour être autonome. Dépose-le après — ou à la place de — l'audit :
la version ici est la plus à jour.

## Réserve d'honnêteté

Le prix client circule maintenant dans Matériel et alimente la vente. Le report
AUTOMATIQUE des fournitures consommées vers le devis/la facture (au prix client,
d'un clic) reste à faire : aujourd'hui tu ajoutes les fournitures à la facture
via « Joindre des fournitures » (R12), qui lit ce même catalogue. Relier « ce qui
a été consommé sur le chantier » à « ce qu'on facture » automatiquement serait la
dernière marche — je te la propose quand tu veux.
