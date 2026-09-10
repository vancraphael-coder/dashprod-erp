# 00 — LE SYSTÈME DE ROADMAP

Ce dossier existe parce que `docs/maitre/` répond à une autre question.
`maitre/` dit **ce qui est vrai** ; `roadmap/` dit **ce qui reste à faire, dans
quel ordre, et pourquoi dans cet ordre**. Les mélanger produit une
documentation où une intention se lit comme un fait — c'est exactement la
dérive contre laquelle le dossier maître a été construit.

## Les quatre fichiers, et rien de plus

| fichier | question à laquelle il répond |
|---|---|
| `00-SYSTEME.md` | comment ce dossier fonctionne |
| `10-AUDIT-ECRANS.md` | quels écrans existent, pour qui, et lesquels manquent |
| `20-LOTS.md` | dans quel ordre on construit, et ce qui bloque quoi |
| `30-DEMANDES.md` | la boîte d'entrée : toute directive arrive ici avant d'être classée |

## La règle d'entrée

**Toute nouvelle idée ou directive va d'abord dans `30-DEMANDES.md`**, datée,
telle qu'elle a été dite. Rien n'est classé, arbitré ou reformulé à la volée.
Une demande sort de la boîte d'entrée par une seule porte : elle devient une
ligne de `20-LOTS.md`, ou elle est explicitement écartée avec son motif.

Pourquoi cette rigidité : une directive reformulée à chaud devient la
compréhension qu'en a eue celui qui l'a notée. Trois semaines plus tard,
personne ne peut plus vérifier ce qui avait été demandé.

## Les trois états d'un écran

Le vocabulaire est fixe. Il n'y a pas de quatrième état.

- **livré** — l'écran existe, il est utilisé, il fait ce qu'il annonce.
- **esquisse** — l'écran existe pour ne pas perdre l'idée. Il s'ouvre, il
  affiche quelque chose, mais il n'a pas été pensé depuis l'usage réel. C'est
  un aide-mémoire déguisé en fonctionnalité, et c'est le cas le plus dangereux
  du lot : il donne l'illusion que le sujet est traité.
- **manquant** — l'écran n'existe pas.

Un écran `esquisse` n'est pas un écran raté : c'est un écran dont le travail
de conception n'a pas encore eu lieu. Le distinguer d'un écran livré est la
seule façon de savoir ce qu'il reste réellement à faire.

## La règle de conception qui gouverne tout ce dossier

> On conçoit depuis ce qu'un utilisateur voit en arrivant, pas depuis ce qu'un
> développeur trouve élégant.

Corollaires, tenus dans l'audit :

1. **Un écran s'ouvre sur la réponse, pas sur un formulaire.** Un déménageur
   qui ouvre l'application à 6 h du matin veut savoir où il va aujourd'hui. Il
   ne veut pas choisir un dossier dans une liste.
2. **Zéro clic pour l'information la plus demandée.** Si l'information la plus
   consultée d'un écran demande deux gestes, l'écran est mal ordonné.
3. **Un PDF est lu par quelqu'un qui n'a pas Dashprod.** Il doit se comprendre
   seul, sans contexte, et porter les mentions que la loi exige — pas celles
   qu'on trouve jolies.
4. **Ce qui est vide se dit.** Un écran sans donnée explique pourquoi et ce
   qu'il faut faire. Un tableau vide sans phrase est un bug de conception.

## LE TROISIÈME ANGLE : les paramètres sont le point de vérité

La pyramide du produit est énoncée dans `plans.js` :

    PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES → LIMITES

Les paramètres sont l'endroit — le seul — où une entreprise déclare ce qui la
concerne : son identité, ses prix, ses coûts, ses listes, ses centres, ses
rôles, ses textes. **Tout le reste en dérive.** Un devis reprend le barème.
Une facture reprend l'identité et les mentions. Un rapport de chantier reprend
les textes. Un accès reprend les rôles.

D'où la règle de cohérence, non négociable :

> **Aucun écran ne peut afficher, imprimer ou calculer une donnée de
> configuration qui n'a pas d'entrée dans les paramètres.**

Si une donnée est nécessaire à un écran mais ne se règle nulle part, elle
finira codée en dur quelque part — et Dashprod a déjà payé ce prix trois fois
(le prix « 360 € » écrit dans l'écran d'inscription, la grille de modules
recopiée dans un test, le préfixe `BE0` figé dans la validation). Ce n'est pas
une question de propreté : c'est le mécanisme par lequel la cohérence
s'effondre.

L'audit traite donc chaque manque de paramètre comme **bloquant**, au même
titre qu'un écran manquant — et plus urgent, parce qu'un écran construit sur
un paramètre absent devra être refait.

## Comment un lot se ferme

Un lot est clos quand les cinq conditions sont réunies :

1. les écrans annoncés existent et sont atteignables depuis la navigation ;
2. les paramètres dont ils dépendent ont une entrée dans les réglages ;
3. l'arbre est vert et le build passe ;
4. un test tient l'invariant du lot — pas seulement le chemin heureux ;
5. la décision est consignée dans `docs/maitre/10-DECISIONS-PRODUIT.md`.

Quatre sur cinq n'est pas un lot clos. C'est un lot ouvert avec une dette.
