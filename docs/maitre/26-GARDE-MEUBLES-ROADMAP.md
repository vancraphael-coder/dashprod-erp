# Garde-meubles (boxe) — le modèle à construire, et ce dont il dépend

**Rang 4.** Chantiers, pas décisions. Établi le 25/08/2026 d'après les réponses
de Raphaël et l'état réel de la base.

Ce document n'est PAS encore implémenté. Il existe parce que la demande est
claire mais qu'une partie bute sur deux fondations absentes (création de centre,
permissions par membre) — et qu'un demi-modèle serait pire que rien.

---

## Ce que Raphaël a arrêté

1. **Le boxe n'a besoin ni d'« enlèvement » ni de « coût de trajet ».** Ce sont
   des notions de déménagement, pas de garde-meubles. Le box est au dépôt ;
   rien n'est facturé au trajet.

2. **À la place : « boxe libre ».** Et « les deux » — c'est-à-dire À LA FOIS :
   - un **statut affiché** (libre / occupé), déjà calculable
     (`stocks/stockage.js` sait déjà compter occupés/libres) ;
   - une **entrée réservable** distincte du contrat : on peut marquer un box
     comme pris (« entrée en boxe ») avant même que le contrat soit établi.

3. **« Entrée en boxe » n'est rattachée qu'à deux choses** : le /planning (pour
   l'ARCHIVE — trace de qui est entré, quand) et le CONTRAT du client. Pas de
   facturation d'un mouvement, pas de trajet.

4. **Aucune grille de tarif boxe/zone.** Le tarif se saisit au contrat
   (`stock_contrats.tarif_centimes` existe déjà). Il n'y a pas de barème, et il
   ne doit pas y en avoir. Invariant, pas manque.

5. **Visibilité vs établissement, par centre :**
   - **tout centre** peut VOIR les boxes libres (de tous les centres) ;
   - **seul le bon centre** (celui où est le box) **ou la maison mère** peut
     ÉTABLIR le contrat de ce box.

6. **La bille de la carte mission ne se colore PAS** selon le garde-meuble :
   la couleur ne concernait que déménagement / lift / sous-traitance / zone, et
   cette idée de couleur a de toute façon été abandonnée (lot 37b). Le boxe
   n'a d'ailleurs pas de carte de planning (`etapes.planning: false`).

---

## Le mur : deux fondations manquent

Raphaël l'a dit lui-même : **« Il n'y a toujours pas de création d'un nouveau
centre, ni de niveau de permissions par membre. »**

La règle 5 (établissement réservé au bon centre ou à la maison mère) **ne peut
pas être une vraie sécurité** tant que :

- **un membre n'est pas rattaché à un centre** — sans ce lien, la base ne sait
  pas quel est « son » centre ;
- **il n'existe pas de niveau de permission** — sans « maison mère » comme rôle,
  on ne peut pas distinguer qui a le droit d'établir partout.

Ce qui est faisable AUJOURD'HUI sans ces fondations :

- la **visibilité** (règle 5, première moitié) : tout centre voit les boxes
  libres — c'est une lecture, elle ne dépend d'aucune permission ;
- le **statut « boxe libre »** (règle 2, première moitié) : déjà calculable ;
- **retirer « Enlèvement »** du plan d'adresses du boxe (règle 1) : une ligne.

Ce qui doit ATTENDRE les fondations :

- l'**établissement réservé** (règle 5, seconde moitié) : sans permissions, ce
  ne serait qu'un garde-fou d'affichage contournable — une fausse barrière, à
  ne pas fabriquer ;
- l'**entrée réservable** distincte du contrat (règle 2, seconde moitié) et son
  archivage au planning (règle 3) : à concevoir avec le rôle « maison mère »,
  sinon n'importe quel centre réserverait n'importe quel box.

---

## Découpe proposée

**Lot boxe-1 (faisable maintenant, pur ou quasi) :**
- retirer « Enlèvement » du plan d'adresses `boxe` (`commercial/adresses.js`) ;
- exposer le statut « boxe libre » là où le boxe se règle et se vend ;
- rendre les boxes libres visibles depuis tout centre (lecture seule
  cross-centre).

**Lot boxe-2 (BLOQUÉ par les fondations) :**
- création de centre + rattachement membre↔centre + rôle « maison mère » ;
- puis : établissement du contrat réservé au bon centre / à la maison mère ;
- puis : « entrée en boxe » réservable, archivée au planning, liée au contrat.

L'ordre n'est pas négociable : boxe-2 sans les fondations produit une sécurité
de façade. Mieux vaut une visibilité honnête qu'une barrière qu'on croit fermée.

---

## À vérifier avant de commencer boxe-1

- `stock_contrats.nature` accepte-t-il déjà « boxe » et « zone » ? (l'énum
  `nature_affaire` les contient — vérifier la contrainte de la colonne.)
- `stock_boxes.actif` et l'occupation : le « libre » se déduit-il de l'absence
  de contrat actif sur le box, ou d'un champ ? (aujourd'hui : déduit du contrat.)
