# Lot 33 — Compte et Paramètres : organiser, pas décorer

`npm test` : **1046/1046 ✓** — build `apps/web` ✓ — 6 fichiers.
**Aucune migration.**

## Le défaut n'était pas celui que je croyais

Ma première lecture disait « liste plate de vingt entrées ». C'était faux : les
rubriques existaient déjà. Le vrai défaut était leur **granularité** — dix
rubriques pour vingt entrées, dont **cinq n'en contenaient qu'une seule**.

Un titre de section pour un item unique n'organise rien. Il double la hauteur
de la page sans rien apprendre, et il donne l'illusion d'une structure là où il
n'y a qu'une liste déguisée.

## Six familles, choisies selon ce qu'on cherche

- **Mon entreprise** — identité, centres, fermetures
- **Vendre et facturer** — barème, facturation, textes, comptabilité
- **Mes catalogues** — les listes du relevé et du chantier
- **Stockage et services** — stockage, contrats, sous-traitance
- **Ce que ça vous coûte** — coûts internes, mon offre
- **L'application et vos données** — apparence, journal, confidentialité,
  archivage

Le regroupement suit ce que **l'utilisateur cherche**, pas la structure interne
du logiciel. « Comptabilité » se trouve avec « facturer », pas dans une section
solitaire ; « Mon offre » se trouve avec « coûts », parce que c'est la même
question — combien ça me coûte.

Chaque famille contient au moins deux réglages, et un test le vérifie.

## Le CSS : voir le groupe, pas le lire

Avant, un titre flottait au-dessus de cartes indépendantes qui ne lui étaient
liées par rien. Maintenant le groupe est un **conteneur** : les entrées y sont
cousues par des filets fins, les arrondis sont portés par le bloc, et l'entrée
n'a plus ni bordure ni ombre propres. La première d'un groupe ne porte pas de
filet — sinon elle doublerait la bordure du conteneur.

Résultat : la page est plus courte, et le regard saisit les familles d'un coup
au lieu de lire vingt titres.

## Compte

Deux boutons de navigation vivaient côte à côte, **copiés caractère pour
caractère**. Une copie diverge toujours : l'un se corrige un jour, l'autre est
oublié. Composant `Porte` unique, réunis dans un bloc cousu comme les groupes
de Paramètres — les deux écrans se ressemblent enfin.

## Un trou dans le garde-fou du mode nuit

En touchant le Compte, j'ai trouvé `background: "#E7EFFC"` en dur sur les
onglets sélectionnés — il reste bleu pâle sur le fond nuit.

**Pourquoi le test du lot 18 ne l'avait pas vu** : il ne cherchait que le
*blanc*. Un garde-fou qui ne connaît qu'une forme du bug laisse passer les
autres. Élargi aux bleus clairs, il a immédiatement trouvé un **second** cas
dans `Mail.jsx`. Les deux sont corrigés.

## À vérifier à l'œil

1. Paramètres : six blocs nettement séparés, entrées cousues, plus de titre
   isolé au-dessus d'une carte unique.
2. Compte : « Paramètres » et « Demandes du réseau » dans un même bloc.
3. En mode nuit : onglets du Compte et de Mail sombres, plus de pavé bleu pâle.
