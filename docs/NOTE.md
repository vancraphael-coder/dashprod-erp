# Lot 16 — Compte : capacités citées, et tri du planning

`npm test` : **944/944 ✓** — build `apps/web` ✓ — 5 fichiers.
**Aucune migration.** Se pose par-dessus le lot 15 (bille).

## 1. Le Compte cite ses capacités au lieu de les compter

« X capacités actives » n'apprenait rien. Ta règle : les citer, ou les retirer.
J'ai choisi de les citer — un compte gagne à montrer ce qu'on peut faire.

Il fallait pour ça des noms lisibles : les capacités n'avaient que des clés
techniques (`voir_prix`). J'ai ajouté une table `LIBELLE_CAPACITE` dans le
domaine, à côté des clés — leur place naturelle. Le Compte affiche maintenant
les capacités comme des puces nommées (« Voir les prix », « Gérer le
planning »…).

Garde-fou fidèle à ta règle : une capacité **sans** libellé n'est pas affichée
du tout — elle retomberait sur sa clé technique, donc elle « ne sait pas se
dire », donc on ne la montre pas. Le filtre `libelleCapacite(c) !== c` s'en
charge.

## 2. Le tri du planning : un / plusieurs / tout type

Le filtre par type existait depuis le lot 11 (une puce par type, qu'on
masque). Il manquait le « tout » explicite. Ajouté :

- un bouton **« Tous »** en tête, actif quand rien n'est masqué, qui remet la
  vue complète d'un clic ;
- le **double-clic** sur une puce **isole** ce type (masque tous les autres) —
  le raccourci « ne montrer que les déménagements » sans éteindre le reste un
  par un ;
- chaque puce continue de basculer son propre type.

Un / plusieurs / tout, donc, comme demandé — sans casser le comportement du
lot 11.

## À vérifier à l'œil

1. Compte : sous le nom, les capacités apparaissent en puces nommées, plus un
   compteur.
2. Planning, un jour à plusieurs types : « Tous » est allumé ; cliquer une puce
   la masque ; double-cliquer une puce n'affiche qu'elle ; « Tous » rallume
   tout.
