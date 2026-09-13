# 00 — LE SYSTÈME DE ROADMAP

Ce dossier existe parce que `docs/maitre/` répond à une autre question.
`maitre/` dit **ce qui est vrai** ; `roadmap/` dit **ce qui reste à faire, dans
quel ordre, et pourquoi dans cet ordre**. Les mélanger produit une
documentation où une intention se lit comme un fait — c'est exactement la
dérive contre laquelle le dossier maître a été construit.

## Les cinq fichiers, et rien de plus

| fichier | question à laquelle il répond |
|---|---|
| `00-SYSTEME.md` | comment ce dossier fonctionne |
| `10-AUDIT-ECRANS.md` | quels écrans existent, pour qui, et lesquels manquent |
| `20-LOTS.md` | dans quel ordre on construit, et ce qui bloque quoi |
| `30-DEMANDES.md` | la boîte d'entrée : toute directive arrive ici avant d'être classée |
| `40-ARCHITECTURE.md` | les trois axes — forme du code, exigences de qualité, cloison — et pourquoi les confondre est le seul vrai danger |

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

## LA PYRAMIDE — ses trois angles

Corrigée le 10/09/2026. Ce n'est pas la chaîne technique
`PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES → LIMITES` : celle-là
décrit comment le produit est gréé, pas ce qui le fait tenir.

Les trois angles sont :

1. **LE LÉGAL — le produit final.** Une facture, un contrat, une numérotation
   continue, un rapport qui vaut preuve. Ce qui doit être juste devant un
   contrôleur ou un tribunal. Aucune souplesse : cet angle ne se négocie pas
   contre de la simplicité.
2. **LE PARAMÉTRAGE — le point de vérité.** Ce que l'entreprise déclare, et
   dont tout le reste dérive.
3. **LA PRISE EN MAIN — la compréhension rapide.** Ce qu'un vrai utilisateur
   comprend en arrivant, sans qu'on lui explique.

Le légal contraint le paramétrage ; le paramétrage rend la prise en main
possible. Quand le paramétrage manque, l'angle légal se met à vivre dans du
code écrit en dur et la prise en main s'effondre — c'est exactement ce qui est
arrivé aux mentions de facture, réparties entre le code et les textes de
dossier.

### Le deuxième angle : ce qui existe chez l'un n'existe pas forcément chez l'autre

**Il n'y a pas une taxonomie de réglages, il y en a une par métier et par
niveau.** « Coûts internes » n'a aucun sens pour un indépendant seul :
il n'a pas de coût à ventiler, il a un tarif. « Centres logistiques » n'existe
pas dans une entreprise sans dépôt. Un groupe liftier n'a pas de barème de
déménagement.

Deux conditions, donc, et pas une :

- **le module** — la capacité est-elle achetée ;
- **la posture** — cette personne-là en a-t-elle l'usage.

Le module dit ce que l'offre a payé ; **la posture fait le tri entre les
métiers**. C'est elle qui exclut « Coûts internes » chez l'indépendant, pas le
module — parce que le module `facturation`, lui, est bien acheté. Sans cette
seconde condition, chaque métier verrait les réglages de tous les autres, et
le point de vérité deviendrait un fourre-tout.

Tenu en donnée dans `packages/domaine/src/produit/`, tenu par un test.

## LE RITUEL — la doctrine des écrans d'arrivée

Posée le 13/09/2026. Elle gouverne les lots 3c, 7 et 8.

> **Un écran d'arrivée est un rituel, pas un centre de chiffres.**

Un déménageur ouvre l'application à 6 h du matin, debout, dans un camion, avec
des gants. Il ne veut pas un rapport de gestion : il veut savoir où il va.
Même chose pour le bureau — la coordination veut voir ce qui n'est pas couvert,
pas un graphique de chiffre d'affaires. Même chose pour la direction.

**Ce qui fait un rituel, et qui se vérifie :**

1. **Trois blocs au plus.** Chiffre, pas intention. Au-delà, on assomme. Le
   registre le déclare (`blocs`) et un test le plafonne.
2. **Il se termine.** Un rituel a une fin : on l'a fait, on passe à autre
   chose. Un tableau de bord ne finit jamais — c'est ce qui le rend
   anxiogène.
3. **Une action au plus.** Ce qui est à faire maintenant, pas les huit choses
   possibles.
4. **Aucun chiffre qu'on ne peut pas décider.** Un nombre sur lequel on ne peut
   rien est du bruit. « 3 chantiers cette semaine » n'appelle aucune décision ;
   « personne sur celui de jeudi » en appelle une.
5. **La même chose au même endroit, chaque jour.** Le corps apprend. Un
   rituel qui change de forme redevient un écran à lire.
6. **Aucune capacité requise.** Un rituel réservé serait vide pour une partie
   de son public — donc ce ne serait pas un rituel.
7. **Le vide se dit.** « Rien aujourd'hui » est une réponse complète, et c'est
   souvent la meilleure nouvelle de la journée.

**L'exception, et elle est unique : la trésorerie.** Celui qui gère les
paiements VEUT de la densité, et il vient la chercher. Il a donc son onglet —
`tableau_tresorerie`, réservé par la capacité `voir_tresorerie`. C'est le SEUL
écran de tout Dashprod autorisé à être un centre de chiffres, et il n'est
jamais un écran d'arrivée.

Un test tient les trois règles dures : exactement un rituel par posture, trois
blocs au plus, et un seul centre de chiffres dans tout le produit. Le
glissement d'un écran d'arrivée vers un tableau de bord est naturel — on ajoute
un chiffre, puis un graphique, puis une liste. Il fallait une garde, pas une
bonne intention.

### Les paramètres sont le point de vérité

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
