# OUTIL — AUDITER UN ÉCRAN

*Placer d'abord le PRÉAMBULE de `00-SYSTEME-OUTILS.md`.*

## Mission

Juger UN écran depuis l'usage réel, et rendre un verdict d'état : **livré**,
**esquisse** ou **manquant**.

Écran à auditer : `__________`
Posture concernée : `__________` (direction, coordination, commerce, dépôt,
chef d'équipe, exécution, accès ponctuel, indépendant, client)

## Ce que tu lis, dans cet ordre

1. le fichier de l'écran dans `apps/web/src/ecrans/` ;
2. les fonctions d'adaptateur qu'il appelle, pour savoir quelles données il
   lit réellement — pas celles qu'il pourrait lire ;
3. les capacités et le module qui le conditionnent ;
4. `docs/roadmap/00-SYSTEME.md` pour les quatre corollaires de conception.

## Les sept questions, dans cet ordre

Réponds à chacune par une phrase et un constat vérifiable dans le code.

1. **La première ligne.** Que voit la personne dans la première demi-seconde ?
   Est-ce la réponse à sa question, ou un moyen d'y arriver ?
2. **Le geste zéro.** L'information la plus consultée demande combien de
   clics ? Au-delà de zéro, l'écran est mal ordonné.
3. **Les conditions réelles.** Un exécutant est debout, dans un camion, avec
   des gants, sur un réseau faible. Un gérant est assis. Lequel des deux
   l'écran suppose-t-il ?
4. **Le vide.** Que montre l'écran quand il n'y a aucune donnée ? Un tableau
   vide sans phrase est un défaut de conception, pas un cas limite.
5. **La configuration en dur.** Quelle donnée l'écran affiche-t-il qui devrait
   venir d'un réglage ? (Si oui → passer l'outil `20-COHERENCE-PARAMETRES`.)
6. **Le mensonge possible.** L'écran peut-il montrer quelque chose que la base
   refuserait, ou cacher quelque chose que l'offre a payé ? C'est arrivé :
   `signature_client` était ouvert en base et fermé dans le domaine.
7. **La sortie.** Après avoir fait ce qu'elle venait faire, où va la personne ?
   Un écran sans sortie évidente est un cul-de-sac.

## Le livrable

Une fiche, dans la réponse, pas dans un fichier :

- **État** : livré / esquisse / manquant, avec le motif en une phrase.
- **Les trois corrections qui changent le plus**, ordonnées par écart entre
  valeur et coût. Trois, pas dix : une liste de dix ne se traite jamais.
- **Les paramètres manquants** que l'écran révèle, s'il y en a.
- **Ce que tu n'as pas pu vérifier**, nommé. Une limite énoncée vaut mieux
  qu'une confiance fabriquée.

## Ce que tu ne fais pas

Tu ne modifies aucun fichier. Tu n'ouvres pas un second écran « pour
comparer ». Un audit = un écran.
