# Lot 48 — le surcoût interne, branché de bout en bout

**28/08/2026.** **1184 tests verts**, build vert. **Migrations 0156, 0157**
appliquées et vérifiées.

C'est le circuit que tu voulais : marquer le temps qui déborde pour NOS aléas
(panne au retour, retard, nettoyage) comme un coût interne — qui ronge la marge
mais que **le client ne paie jamais**.

## Le terrain déclare et fige

Sur le rapport de chantier, le chef d'équipe a un bouton **« Signaler un surcoût
interne »**. Il choisit le motif (panne au retour, retard, nettoyage, matériel
oublié, autre), saisit un **temps en heures** — **jamais de prix**, le terrain
ne voit pas les euros — et **déclare + fige** d'un geste. Une fois figé, c'est
au bureau.

## Le bureau voit et corrige

Dans le **Calcul définitif** (là où sont les heures pointées), une carte
**« Surcoût interne »** apparaît : le temps à notre charge, valorisé au coût
interne moyen de l'équipe. Ce montant **s'ajoute au coût RÉEL** — et **jamais au
facturé**. Le bureau (gerer_planning) peut **corriger** les heures ou
**supprimer** une déclaration.

## Le principe, verrouillé par test

`effetSurCalcul` renvoie `{ ajouteAuReel, ajouteAuFacture: 0 }`. Un test
reproduit exactement l'usage du Calcul définitif : le réel absorbe le surcoût,
le facturé ne bouge pas d'un centime. Le sabotage qui enverrait le surcoût sur
la facture passe **rouge**.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| le surcoût interne touche le facturé | 2 |
| le terrain modifie même figé | 1 |
| un motif inconnu compte quand même | 1 |
| effetSurCalcul renvoie au facturé (intégration) | 2 |

## Un piège attrapé au passage

Un `EOF` de heredoc s'était glissé dans le fichier de test — c'est le test qui
**exécute vraiment** le fichier qui l'a fait tomber (`ReferenceError: EOF`).
Nettoyé. C'est exactement pourquoi on éprouve chaque fichier.

## À vérifier à l'œil

1. **Terrain** (rapport de chantier) : le bouton « Signaler un surcoût interne »,
   saisie en heures, sans prix, « Déclarer et figer ».
2. **Bureau** (Calcul définitif d'un dossier avec un surcoût) : la carte
   « Surcoût interne », le coût ajouté au Réel, le Facturé inchangé, le bouton
   « Corriger ».

## Suite

Reste au circuit : les **photos** sur les constats (dernier élément du rapport
de chantier).
