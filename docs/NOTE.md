# Lot 23 — P0 : fiabilité fiscale de l'émission Peppol

`npm test` : **966/966 ✓** — build `apps/web` ✓ — 8 fichiers.
**Aucune migration.** Se pose par-dessus le lot 22.

L'ordre proposé a été suivi : défauts supprimés → moteur construit →
`versXmlUBL` testé. **La réception Peppol n'est pas touchée** — elle vient
après, volontairement.

## Ce que j'ai trouvé en ouvrant le capot

Le troisième défaut était pire que le diagnostic annoncé. Une ligne sans taux
n'était pas seulement « mise à 21 % par défaut » : elle était **exclue de la
ventilation tout en restant comptée dans le HTVA**. Démontré avant correction :

```
HTVA : 10000 c
TVA  :     0 c   ← aucune erreur levée
ventilation : []
```

Une facture de 100 € qui déclare 0 € de TVA, en silence. C'est la même famille
que le bug historique — mais côté document légal cette fois.

## Le moteur

`facturation/tva.js` — `qualifierTva(contexte)` est désormais la seule porte par
laquelle une opération obtient sa catégorie et son taux. Il rend `{ok, motif}`,
jamais une valeur de repli.

**La règle du lot :**

```
information TVA absente  →  ERREUR  →  aucune transmission
JAMAIS                   →  21 %
```

**Ce que Dashprod qualifie aujourd'hui** : Belgique → Belgique avec un taux
fourni (catégorie S). C'est le pain quotidien de Roovers, et ça marche.

**Ce qu'il refuse, avec un motif exploitable** : intra-UE, hors UE, 0 % intérieur
sans base légale, vendeur non belge. Chaque refus nomme la règle à faire valider.

Je n'ai pas encodé le droit fiscal, et c'était le point important. Pour une
prestation intra-UE, la qualification dépend de la **nature** de la prestation —
déménagement, lift et sous-traitance ne suivent pas forcément la même règle de
lieu. Décider à ta place aurait été exactement l'erreur que ce module existe
pour empêcher. Ces cas attendent **un conseiller TVA**.

## `versXmlUBL` ne décide plus rien

Il **lit** la catégorie portée par la ventilation qualifiée. Plus aucun « S »
codé en dur, plus aucun `?? 21` (quatre occurrences supprimées : domaine et
adaptateur). Une ligne absente de la ventilation fait échouer la génération.

## Les tests

`tva-ubl.test.js`, 16 tests. La pièce la plus engageante du dépôt n'en avait
aucun. Dont le verrou du lot :

> **taux absent → `versXmlUBL` échoue ET aucune transmission n'est préparée.**

Deux tests existants encodaient l'ancien comportement avec un exemple
fiscalement incohérent (une ligne « hors UE » à 0 % sur une facture
belgo-belge). Je ne les ai pas supprimés : j'ai **préservé leur intention** —
ne jamais confondre « absent » et « zéro » — en la reformulant. Les deux
situations échouent désormais avec des motifs **différents**, et un test
vérifie qu'ils ne se confondent jamais.

## Conséquence produit — à accepter consciemment

**Dashprod refuse plus qu'avant.** Une facture intra-UE ne part plus. C'est
volontaire : avant, elle partait à 21 % et pouvait être fiscalement fausse. Un
refus se corrige, un document faux transmis par le réseau officiel se découvre
au contrôle.

Si tu as un besoin intra-UE réel à court terme, c'est la question à poser à ton
comptable en premier — j'ai laissé l'emplacement prêt dans le moteur.

## À vérifier à l'œil

1. Facture belge classique : inchangée, 21 % dans l'UBL, transmission normale.
2. Organisation sans taux configuré dans les paramètres de facturation :
   la génération échoue avec « Taux de TVA non fourni » au lieu de produire
   une facture à 21 %.
3. Client avec un pays autre que BE : refus explicite mentionnant
   « À VALIDER par un conseiller TVA ».
