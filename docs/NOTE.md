# Lots R1 + R2 — les centres : choix explicite et ressources cloisonnées

**30/08/2026.** **1224 tests verts**, build vert. Deux remarques d'atelier qui
achèvent Option A.

## R1 — Le « + » demande le centre, et la maison mère voit tout

**Ta remarque** (liste, 23/08) : quand il y a plusieurs centres, le « + » doit
demander dans quel espace créer ; le dossier apparaît en maison mère avec le
libellé de son centre ; les ressources sont reprises du bon centre.

**Ce que ça donne :**
- **À la création**, si tu as plusieurs centres, une question apparaît : « Dans
  quel espace créer ce dossier ? » — maison mère ou centre X. Plus de
  rattachement silencieux. (Un responsable de dépôt, lui, n'est pas dérangé : il
  crée toujours chez lui.)
- **En maison mère, tu vois maintenant TOUS les dossiers**, chacun avec une
  petite étiquette bleue du centre dont il vient. Tu gardes la vue d'ensemble
  sans changer d'espace.
- **Dans un centre**, tu ne vois que ses dossiers — le cloisonnement tient.

## R2 — Les ressources ne débordent plus d'un centre à l'autre

**Ta remarque** (equipe, 30/08) : les ressources ne sont pas utilisables d'un
centre à l'autre.

**Ce que ça donne :** au planning, quand tu affectes une mission, on ne te
propose que **les membres et véhicules de son centre** — plus ceux de la maison
mère, qui restent un **fonds commun** partagé (la tête de réseau mutualise). Une
équipe d'Anvers ne s'affiche plus sur un chantier de Gand.

Nuance utile : une ressource déjà affectée reste visible même hors de son centre,
pour que tu puisses toujours la retirer.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| on demande l'espace même sans aucun centre | 2 |
| la maison mère n'est plus mutualisée | 2 |

## À vérifier à l'œil

1. Avec au moins deux centres : clique « + », choisis un métier → la question
   d'espace apparaît. Choisis un centre → le dossier s'y crée.
2. Passe en maison mère : tous les dossiers sont là, chacun étiqueté de son
   centre.
3. Au planning, sur une mission d'un centre : seuls ses membres/véhicules (et
   ceux de la maison mère) sont proposés.

## Option A est complète

Espaces cloisonnés, création avec choix explicite, missions héritées, ressources
cloisonnées, maison mère qui voit tout ventilé, comptabilité ventilée. Le sujet
des centres est bouclé de bout en bout.

## Réserve d'honnêteté

Le cloisonnement des ressources s'applique à l'affichage d'affectation ; il ne
pose pas (encore) de barrière en base — un appel direct pourrait théoriquement
affecter hors centre. Pour un vrai verrou dur (comme pour l'établissement des
contrats boxe), il faudrait une garde côté fonction SQL. À faire si tu veux
transformer la règle d'usage en interdiction stricte.
