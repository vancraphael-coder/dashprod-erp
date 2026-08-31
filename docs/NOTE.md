# Lot G — R12 : fournitures jointes à la facture déménagement

**31/08/2026.** **1239 tests verts**, build vert. Complète R12 : le matériel peut
être facturé **avec** le déménagement, ou **séparément**.

## Ce que ça donne

Sur la facture d'un dossier, avant émission, un bouton :
**« + Joindre des fournitures à cette facture ».**

Il ouvre une petite section où tu ajoutes des fournitures — nom, prix, TVA,
quantité — reprises de ton catalogue si tu en as un, ou saisies à la main. Elles
s'ajoutent aux lignes du déménagement, le total se met à jour, et **une seule
facture** part avec la prestation ET les cartons.

L'autre choix — **une facture séparée** — existe déjà : c'est la vente rapide
depuis le « + » (lot F). Tu as donc les deux options de ta remarque R12.

## Un point de fond, assumé

Le code disait explicitement que les fournitures étaient **strictement
séparées** de la facture déménagement — c'était une décision que tu avais prise
et « redite ». R12 la fait **évoluer** en un choix. Je l'ai donc appliquée comme
une évolution volontaire, pas comme une correction — ta décision d'hier n'était
pas une erreur, ton besoin a mûri.

## Le nœud du « prix client », résolu

Le catalogue d'emballage interne ne connaît que le **coût** (ce que l'article te
coûte), jamais le prix de vente — c'était le blocage historique pour facturer les
fournitures. Ici, tu factures au **prix client** que tu saisis (ou qui vient du
catalogue de vente du lot E). Jamais au coût. C'est aussi ce que demandait ta
remarque R3.

## Éprouvé

La fusion prestation + fournitures est testée : chaque fourniture garde son
propre taux de TVA (une bulle à 6 % ne devient pas 21 %), et le total additionne
bien tout.

## À vérifier à l'œil

1. Ouvre la facture d'un dossier déménagement (avant émission).
2. « + Joindre des fournitures » → ajoute deux cartons avec leur prix.
3. Le total inclut la prestation ET les fournitures ; émets → une seule facture.

## Réserve d'honnêteté

Les fournitures jointes se saisissent au moment de facturer ; elles ne se
reprennent pas (encore) automatiquement des quantités réellement utilisées sur le
chantier (l'écran Matériel du dossier). Relier « ce qui a été consommé » à « ce
qu'on facture » d'un clic serait la suite — mais ça suppose de fixer un prix
client sur chaque article du catalogue d'emballage, un chantier à part.
