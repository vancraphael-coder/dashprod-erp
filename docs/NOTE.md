# Barres du dossier animées + le plan de travail

**01/09/2026.** **1259 tests verts**, build vert.

## 1. Les barres du dossier reprennent l'animation

Les **trois** barres partagent maintenant le même moteur : la barre principale,
la barre de sections du dossier (bureau) et celle du terrain. Même tracé au
feutre à l'activation, mêmes couleurs liées au thème (donc mode sombre inclus).

- Six nouveaux tracés dessinés pour les sections : Dossier, Relevé, Matériel,
  Devis, Offre, Facture (Mail réutilise l'enveloppe de Messages).
- Des gestes **plus sobres** que la barre principale : un léger soulèvement pour
  les documents, une inclinaison pour Relevé et Matériel. Une barre de 7 entrées
  ne peut pas gesticuler autant qu'une barre de 6 espacées.
- Le tracé y est **plus rapide** (1,3 s au lieu de 2,1 s) : on change souvent de
  section dans un dossier, une animation lente y deviendrait pesante.
- Un test garantit qu'il n'existe **qu'une seule définition du moteur** : si tu
  changes l'animation, les trois barres suivent.

## 2. `05-PLAN-DE-TRAVAIL.md` — le document de pilotage

Tout ce qui reste à faire, fusionné en **une seule liste ordonnée** : les vagues,
tes remarques R1→R16, l'analyse des six secteurs, le plan PWA, la conformité.

**La méthode d'abord — cinq règles qui évitent de se perdre :**
1. **Un seul chantier ouvert à la fois.**
2. Chaque lot a une **porte d'entrée** (dépendances) et une **porte de sortie**
   (critère observable) écrites avant de coder.
3. **« Terminé » a une définition unique** : domaine pur, éprouvé par sabotage,
   vert sur arbre propre, migrations vérifiées, note avec réserves, décisions
   consignées, case cochée. Pas de lot « fini à 90 % ».
4. Toute **décision produit se prend avant** le lot qui en dépend.
5. **On met à jour le plan à la fin de chaque lot.** Un plan qu'on ne met pas à
   jour est un plan qui ment.

**Six phases :**
- **A — Débloquer les métiers** : le cycle de vie par nature (**le verrou**),
  les cartes boxe/zone, le contrat récurrent (c'est là qu'est l'argent non
  facturé), l'établissement boxe, puis le transport/sous-traitance.
- **B — Voir et piloter** : terrain journalier 5h30–20h00, onglet Pilotage (avec
  ta barre de progression), espace client par nature.
- **C — Finir les métiers** : estimation en temps, tarifaire/forfait, onglets de
  la liste, centres dans l'équipe, matériel par véhicule, vente → stock.
- **D — Comptabilité**, bloquée tant que les deux questions au comptable ne sont
  pas posées.
- **E — Délimitation, registre des paramètres, design, PWA, connecteur.**
- **F — Conformité**, en parallèle et **sans code** : le RGPD est exigible
  maintenant.

Plus **un tableau des neuf décisions qui bloquent des lots**, avec mon avis sur
chacune, et **un tableau de suivi à cocher**.

## L'ordre, en une ligne

**F1 (aujourd'hui, hors code) ‖ A1 → A2 → A3 → A4 → B1 → B2 → B3 → C → [D0 puis
D] → E**

A1 est le verrou de tout. B1 (terrain journalier) peut s'intercaler n'importe
quand : lot court, autonome, valeur immédiate.

## Trois décisions n'attendent qu'un mot

D4 (le lift exige-t-il un devis signé ? — mon avis : non), D5 (le boxe passe-t-il
par planifié/effectué ? — non), D6 (une vente comptoir a-t-elle un espace client ?
— non). Elles sont nécessaires pour démarrer A1 et B3. Confirme-les et j'attaque
A1.

## Réserve d'honnêteté

L'animation des barres est vérifiée par le build et les tests de structure, mais
le rendu (fluidité sur une barre dense de 7 entrées, lisibilité des petits
tracés à 19 px) se juge sur ton appareil. Si les libellés sautent ou si le tracé
paraît confus à cette taille, dis-le : on simplifiera les dessins des sections.
