# Boîte à facturer + pilotage financier + prix révisés + parrainage

**01/09/2026.** **1325 tests verts**, build vert. Migrations 0171 + 0172.

## 1. La boîte à facturer — piloter les sorties

Tu vois tes recettes ; il te manquait les **sorties**. C'est posé :
- Une table **dépenses** pour noter vite une sortie — carburant, une réparation,
  un café — libre mais structurée juste ce qu'il faut : un montant, une
  catégorie, et surtout un état : **réglée** ou **dette à payer** (avec échéance).
- La structure prévoit déjà le **scan de ticket** (champ origine 'saisie'|'scan',
  chemin du justificatif) : quand tu voudras l'analyse d'image plus tard, elle se
  branchera ici sans rien casser.

Un piège attrapé au passage : la policy exigeait une capacité « gérer
comptabilité » qui **n'existait pas** — exactement le bug de la clôture la semaine
dernière. Corrigé avec une capacité réelle.

## 2. La structure financière par pourcentage

C'est le cœur de ton idée : **pour 100 € encaissés, où va l'argent ?**

Le bilan calcule les recettes, ventile les dépenses par catégorie (le poste le
plus lourd en premier), et donne **chaque poste en % des recettes** — le seul
repère comparable dans le temps. Plus le **reste** (ce qui te revient) et les
**dettes en cours** isolées du total.

Et une santé dite sans détour : rouge si les dépenses dépassent les recettes ou
si les dettes dépassent la période, orange s'il reste moins de 10 %. On signale,
on ne juge pas — mais on ne cache rien.

## 3. Les prix révisés — tu avais deux points trop hauts

Comme promis, j'ai corrigé ce que je trouvais excessif :

- **Groupe liftier : 600 € → 450 €.** Le vrai problème n'était pas le montant
  mais l'**unité** : facturer 20 personnes quand 17 sont sur les machines et ne
  se connectent jamais, c'est facturer des fantômes. Maintenant on facture les
  **accès bureau** (5 inclus, +30 €/accès, plafond 15) ; les opérateurs pointent
  sans compter comme utilisateurs. C'est plus juste ET plus vendable.
- **Logistique mobilier : 1450 € → 900 €.** Un chiffre que j'avais posé sans
  connaître le volume réel. 900 € est défendable ; à confronter à un vrai
  prospect avant de le graver.

Les autres tiennent : 60 € l'indépendant (excellent), 240 € le garde-meubles
(peut-être même bas). Dis-moi si ça te va.

## 4. Le parrainage — ta doctrine du casino, à la lettre

Tu as raison : le gratuit ne doit jamais coûter. Le parrainage est donc borné
pour que **la maison ne perde jamais** :
- **Plafonné à UNE mensualité**, et le plafond est **annuel** — douze filleuls ne
  donnent qu'un mois, pas douze.
- Il ne se déclenche qu'au **premier paiement encaissé** du filleul : on ne
  récompense pas une inscription qui ne paiera jamais.
- La facture ne descend **jamais sous zéro** : un crédit réduit une dette, ce
  n'est pas un versement.

Au pire, tu échanges une mensualité contre un client acquis à coût zéro qui
paiera des mois. Casino gagnant, et parrainage = fidélité, comme tu le voyais.
Un sabotage garantit que le plafond ne peut pas sauter.

## Ce qui reste de ta liste

Cartes d'offres harmonisées · interface PC · test « indépendant manutention »
Roovers pilote · espace équipe (messagerie, invité=code, permissions). Je
continue dans cet ordre.

## Réserve d'honnêteté

Le domaine (dépenses, bilan, parrainage) est posé et testé, mais **les écrans
n'existent pas encore** : pas de saisie de dépense ni d'affichage du bilan à
l'écran. C'est le prochain branchement. Les prix révisés sont mon jugement, pas
une étude de marché — à valider avec tes premiers prospects.
