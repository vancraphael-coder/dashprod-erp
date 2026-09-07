# A3 — La facturation récurrente + la structure de prix du réseau

**01/09/2026.** **1296 tests verts**, build vert.

## 1. A3 — le cœur du contrat qui court

Le trou comblé : tes 14 contrats de box produisaient **0 échéance, 0 facture**.
Les tables existaient, rien ne les remplissait.

Ce que le calcul fait maintenant, sur le modèle self-storage :
- **Chaque période commencée est due** — facturation d'avance, comme chez
  Shurgard ou Go Box. Une période à venir n'est jamais facturée.
- **Prorata à la sortie** : entré le 15, sorti le 8 → 24 jours, pas un mois
  plein. Et le 31 janvier + 1 mois donne bien le 28/29 février, pas le 3 mars.
- **Idempotent** : relancer la génération ne duplique **jamais** une échéance.
  C'est ce qui permet de la rejouer sans crainte.
- **Une échéance facturée est figée** — corriger, c'est faire un avoir, comme
  toute pièce émise.
- **Un contrat sans tarif ne facture rien** (pas 0 €) : le piège classique.

Trois sabotages le prouvent (duplication, mois plein sur sortie anticipée,
échéance facturée redevenue modifiable).

**Ce qui reste pour que ça se voie** : la commande SQL qui écrit les échéances et
l'écran du contrat. A3 pose le cerveau ; le branchement suit.

## 2. La structure de prix — `16-STRUCTURE-PRIX-RESEAU.md`

**L'argument de vente, en une ligne** : on ne vend pas « gagnez 10 heures par
semaine » — chiffre invérifiable qui abîme ta crédibilité au premier mois. On
vend **12 éléments récurrents qui ne feront plus jamais l'objet d'un litige** :
l'heure d'arrivée réelle, qui est venu, l'état des biens, ce qui a été consommé,
les heures prestées, l'accord du client, le prix convenu, la preuve de livraison,
le document de transport, l'échéance, la référence de paiement, ce qui reste dû.

Chacun existe déjà ou est prévu dans Dashprod. **Un seul litige évité par an paie
l'abonnement.**

**Trois niveaux d'implication** : Recevoir (60 € l'indépendant, **0 € le donneur
d'ordre**), Opérer (180/240/360/720), Orchestrer (600 € liftier, 1 450 €
logistique mobilier). Tous entre **1 % et 3 %** de ce que l'acteur facture via
l'outil — le ratio que le SaaS vertical soutient durablement.

**Le donneur d'ordre à 0 €, c'est le levier.** Sur un réseau à deux faces, on
subventionne le côté rare. Les donneurs d'ordre sont rares, les exécutants
abondants. La valeur se prend ensuite sur le **flux** : commission de 6 % sur les
missions **qu'ils n'auraient pas trouvées sans toi**. À l'échelle : 500 exécutants
× 3 missions × 400 € × 6 % = **36 000 €/mois**, sans un abonnement de plus.

**Le global** : ta thèse tient parce que les 12 récurrents sont universels. Seuls
changent langue, devise, TVA et document de transport — et le code est déjà en
centimes entiers, le moteur TVA refuse déjà de deviner, le CMR couvre 56 pays.
Mon conseil d'ordre : BE → NL/FR → UE → hors UE **par le réseau**, pas par la
vente directe. Un réseau vide dans dix pays vaut moins qu'un réseau dense dans un.

## 3. Là où je ne t'ai pas suivi — et pourquoi ça te rapporte plus

Tu as dit « quitte à être vicieux ». Je t'ai suivi sur l'**agressivité** : prix
fermes, plafonds durs, commission réelle, annuel qui prend la trésorerie
d'avance. C'est un modèle qui prend beaucoup.

Je ne t'ai pas suivi sur trois points, **par intérêt bien compris** :
- **pas de frais cachés ni de résiliation piégée** — sur un réseau, la confiance
  EST l'actif ; un exécutant qui se sent piégé le dit à vingt confrères, et les
  effets de réseau s'inversent contre toi ;
- **pas de commission sur les relations préexistantes** — le jour où un client
  comprend qu'il paie 6 % sur son client historique, il part et il le raconte ;
- **pas de séquestre de paiement sans cadre légal** — c'est une activité
  réglementée, pas un choix esthétique.

**Le vrai « vicieux » qui rapporte, c'est la position, pas l'entourloupe** :
quand les 12 récurrents d'un client vivent chez toi, que ses donneurs d'ordre le
joignent par toi et que sa facturation récurrente tourne chez toi, il ne part
plus — non parce qu'il est piégé, mais parce que **partir lui coûterait plus cher
que rester**. C'est le seul verrouillage qui tient dans le temps.

## Huit décisions t'attendent

T1 donneur d'ordre gratuit (mon avis : oui) · T2 commission 6 % · T3 garde-meubles
240 € · T4 logistique 1 450 € · T5 palier liftier +25 €/plafond 60 · **T6 statut
d'intermédiaire — juridique, bloquant** · T7 séquestre · T8 TVA sur commission
transfrontalière.

## Réserve d'honnêteté

Les prix proposés sont bâtis sur des ratios de marché et sur ce que Dashprod sait
faire — pas sur une étude de ton marché réel. Ils sont un point de départ solide,
à confronter à tes premiers prospects. Et le calcul de commission suppose un
réseau qui tourne : tant que T6 (juridique) n'est pas tranché, cette ligne de
revenus reste théorique.
