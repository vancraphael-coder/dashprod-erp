# Vague 2, lot F — la vente rapide de fournitures

**31/08/2026.** **1238 tests verts**, build vert. **Migration 0165** appliquée et
vérifiée. Les cartons se facturent enfin.

## Ce que ça donne

Dans le « + », une nouvelle entrée en tête : **🧾 Vente rapide**. Elle ouvre un
écran court, pensé pour aller vite :

- **Client** : un nom (ou rien → « comptoir »).
- **Comptoir ou livraison** : un interrupteur. Si livraison, une adresse et une
  date apparaissent (sinon, rien ne t'encombre).
- **Articles** : des lignes libres — nom, prix HTVA, taux de TVA, quantité —
  avec un pas +/−. Si tu as un catalogue d'articles, tu peux en reprendre un d'un
  menu ; sinon, tu tapes directement. Le **total (HTVA / TVA / TVAC) s'affiche en
  direct**.
- **Créer la vente et facturer** : la facture est émise immédiatement, avec son
  numéro légal, son échéance et sa communication (tout le travail de la vague 1).

Tu arrives directement sur la facture émise.

## Sous le capot — ce qui rend ça propre

- La vente réutilise **tout le flux de facturation existant** : même émission,
  même numérotation, même échéance, même communication rapprochable. Une vente
  est une facture comme les autres pour la comptabilité.
- Une **nature « vente »** distincte a été créée : une vente n'est pas un dossier
  de déménagement, elle n'apparaît pas comme un métier, elle n'a aucune étape de
  parcours. Verrouillé par sabotage.
- **Correction utile trouvée en chemin** : jusqu'ici, l'émission d'une facture ne
  stockait PAS le taux de TVA par ligne — une vente à 6 % aurait été taxée à
  21 %. C'est corrigé : le taux (et la quantité, le prix unitaire) suivent
  maintenant chaque ligne. Bénéfice aussi pour les factures de déménagement.

## Ce que ça couvre de tes remarques

- **R12** (facture matériel jointe ou séparée) : la vente **séparée** existe
  maintenant. La vente **jointe** (ajouter des fournitures à la facture d'un
  dossier de déménagement) reste à poser — c'est le complément naturel.

## Un point à valider avec ton comptable (P2)

La facture de vente utilise la **même série de numérotation** que les
déménagements (une seule séquence légale continue). C'est le choix le plus simple
et le plus courant pour une PME, mais si tu veux une série distincte pour la
boutique, c'est une décision à prendre (et à valider) — dis-le-moi.

## À vérifier à l'œil

1. « + » → 🧾 Vente rapide. Ajoute deux articles (nom + prix), vois le total.
2. Bascule « Avec livraison » → adresse + date apparaissent.
3. « Créer la vente et facturer » → tu arrives sur une facture émise, avec numéro,
   échéance et communication.

## Réserve d'honnêteté

Le catalogue d'articles est vide aujourd'hui : l'écran fonctionne en saisie
libre, ce qui le rend utilisable tout de suite. Un vrai écran de gestion du
catalogue (créer/éditer des articles réutilisables, avec leur stock) serait la
suite logique — je ne l'ai pas fait ici pour garder le lot centré sur la vente.
Et le parcours réel (émettre une vente, voir sa facture) reste à constater à
l'écran connecté.
