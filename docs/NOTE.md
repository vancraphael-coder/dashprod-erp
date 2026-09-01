# Audit des paramètres + cap (registre avant map/connecteur)

**31/08/2026.** **1241 tests verts**. Analyse de fond, comme demandé : vérifier
les paramètres avant tout.

## Le constat, prouvé sur ta base

Le carton standard est défini **quatre fois**, à des valeurs qui **se
contredisent** :
- coût **1,50 €** dans les Catalogues (et dans le code)
- coût **1 €** dans le Barème
- prix client **1 €** dans le Barème
- (bientôt) prix dans stock_articles

Personne ne peut dire quel coût fait foi. C'est exactement ta douleur : « 3
paramètres dans 3 pages ou plus », un prix client qu'on n'arrive pas à faire
circuler simplement. **Le code n'est pas faux — il manque une source unique.**

## Ce que j'ai cartographié

Quatre coffres de paramètres, écrits par des écrans différents, lus par d'autres,
avec trois défauts de structure : un concept éclaté sur deux coffres, un écran
qui écrit dans deux coffres, et le prix client des fournitures sans vraie place.
Tout est dans `docs/maitre/90-PARAMETRES-CARTOGRAPHIE.md`.

## Mon avis franc sur la map + le connecteur

**Tu ne t'égares pas** : « les métiers sont un regroupement de paramètres » est
juste, et c'est le vrai avantage du produit. Un seul point de méthode à
infléchir :

**Ne construis pas d'abord une map. Construis d'abord une source unique.**

- Cartographier maintenant, ce serait dessiner la carte d'une contradiction.
- Une map en document se périme au premier changement de code.
- Ce que tu veux vraiment, c'est un **registre des paramètres** : chaque
  paramètre déclaré UNE fois (clé, libellé, unité, type, défaut, métiers). L'UI
  se dessine à partir du registre. **Le registre EST la map — mais exécutable,
  donc elle ne ment jamais.**
- Le connecteur tombe alors tout seul : il lit le même registre. Ta « map
  connecteur » existe déjà — c'est le registre vu de l'extérieur.

*Registre unique → l'UI le lit → le connecteur le lit.* Ta vision, sur une
fondation qui ne se contredit pas.

## Le plan proposé

1. **Consolider l'emballage** (pilote) : un catalogue, chaque article portant
   coût + prix client + TVA, édité à un seul endroit. Matériel lit le coût ;
   Devis/Estimation et Calcul définitif lisent le prix client. **R3 et R12 se
   referment pour de bon**, et l'emballage devient le patron.
2. **Généraliser en registre**, domaine par domaine.
3. **Exposer au connecteur** quand le registre est stable.

## Ce qui manque (paramètres indispensables absents)

Prix client par article de fourniture (le plus urgent), TVA au catalogue
d'emballage, prix client du matériel terrain refacturable, plan comptable par
société, séquences de numérotation.

## Ma recommandation

Valide le cap, et le prochain lot est la **consolidation de l'emballage** — un
coût, un prix client, une seule saisie qui alimente tout. C'est ta demande
d'aujourd'hui, résolue proprement, et la première pierre du registre.
