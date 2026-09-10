# OUTIL — EXÉCUTER UN LOT DE CODE

*Placer d'abord le PRÉAMBULE de `00-SYSTEME-OUTILS.md`.*

## Mission

Livrer un lot de `docs/roadmap/20-LOTS.md`, fermé selon les cinq conditions.

Lot : `__________`

## L'ordre des phases — non négociable

1. **Vérifier l'existant** — lancer `30-VERIF-BASE.md` d'abord. Toujours.
2. **Cohérence des paramètres** — si le lot touche un écran ou un PDF, lancer
   `20-COHERENCE-PARAMETRES.md`. Un écran construit sur un réglage absent sera
   refait.
3. **Domaine pur d'abord** — la logique métier dans un étage sans base ni
   réseau, testable sans rien muter. C'est ce qui rend le lot éprouvable.
4. **Base ensuite** — migration numérotée à la suite, appliquée, vérifiée par
   requête de contrôle.
5. **Interface en dernier** — écrans laids mais justes acceptés ; beaux mais
   faux refusés.
6. **Sabotage** — casser volontairement, constater le refus, remettre.
7. **Consigner** — `docs/maitre/10-DECISIONS-PRODUIT.md`.

## Les cinq conditions de fermeture

1. les écrans annoncés existent et sont atteignables depuis la navigation ;
2. les paramètres dont ils dépendent ont une entrée dans les réglages ;
3. l'arbre est vert (`npm test`) et le build passe (`apps/web`) ;
4. un test tient l'invariant du lot — pas seulement le chemin heureux ;
5. la décision est consignée.

Quatre sur cinq n'est pas un lot clos.

## La livraison

- Migration SQL : numéro à la suite, en-tête expliquant l'incident ou la
  décision qui la motive.
- Fichiers dans un zip, arborescence identique au dépôt, **seuls les fichiers
  modifiés**.
- Le nom et la destination exacte de chaque fichier **dans la conversation**,
  pas dans un fichier de notes.
- Pas de `dist/` : c'est un artefact de build.

## Le sabotage — comment il se fait

Un test qui passe ne prouve rien s'il n'a jamais échoué. Pour chaque invariant
du lot :

1. introduire volontairement la faute que l'invariant doit attraper ;
2. constater que le test la nomme, avec un message qui dit quoi faire ;
3. remettre en état, reconstater le vert.

Exemples déjà pratiqués : modifier un prix à la main dans le SQL de
publication (le test donne la commande de régénération) ; réintroduire une
teinte en dur dans un composant (le test nomme le fichier et la ligne).

## Ce que tu ne fais pas

- Aucun test mutant sur la production par le connecteur.
- Aucune suppression destructive sans commande gardée, tracée et confirmée.
- Aucune donnée versionnée réécrite : un barème se republie, il ne se corrige
  pas.
- Aucun élargissement du périmètre du lot en cours de route. Ce qui apparaît
  va dans `docs/roadmap/30-DEMANDES.md`.
