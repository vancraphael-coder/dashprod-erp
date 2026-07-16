# Module 29 — Corrections devis & unification du dossier

Trois demandes du fondateur, dont un bug bloquant.

## Bug bloquant : le prix ne se sauvegardait pas (corrigé)

Trois causes cumulées :
1. **`obtenirAffaire` ne relisait jamais les faits en réel** — il passait par
   `listerAffaires` qui retournait `faits: null, couts: null`. Rouvrir le devis
   repartait donc de zéro. → requête directe qui relit `entrees` (faits +
   coûts) du scénario retenu.
2. **`enregistrerChiffrage` faisait un INSERT à chaque sauvegarde en réel** →
   scénarios `retenu:true` en double, lecture au hasard. → **upsert** : mise à
   jour du scénario retenu existant, création d'un seul sinon.
3. La **formule** choisie au devis n'était pas reflétée sur l'affaire (le type
   d'offre en dépend). → update de `affaires.formule` à l'enregistrement.

Après enregistrement (devis ET dossier), l'affaire est **rechargée** : le
montant et le nom deviennent cohérents dans l'en-tête, la liste et l'offre.

## Navigation du devis clarifiée

Le bouton « ← Dossiers » (avec s, évoquant la liste) ramenait en fait au
dossier : libellé corrigé en « ← Dossier ». Le lien « Relevé » redondant en
tête du devis est retiré — **le dossier est le hub de navigation**, chaque
écran n'a qu'un retour vers lui, pas des raccourcis latéraux qui brouillent
les niveaux.

## Le « + » ouvre directement la fiche dossier complète

Avant : le « + » ouvrait un écran intermédiaire (nom/tel/email) puis sautait au
dossier. Maintenant : `creerDossierVide()` crée l'affaire (client « Nouveau
client ») et route **directement** vers le Dossier, où :
- Un **bloc identité client** en tête permet de corriger nom / téléphone /
  email au même endroit que tout le reste (plus d'écran séparé).
- L'écran `NouvelleAffaire.jsx` est supprimé (la reconnaissance de doublon
  qu'il portait sera réintroduite plus tard comme aide in-situ si besoin).

## Les hommes sélectionnables dans le dossier (comme les camions)

- **SQL** (`0026`) : `affaires.equipe` jsonb — symétrique de `affaires.camions`.
  Le trigger de confirmation reporte l'équipe pressentie dans
  `mission_affectations`, comme il reporte déjà les camions dans
  `mission_vehicules` (C-04).
- **Dossier** : bloc « Équipe (N) » avec chips de membres, juste sous les
  camions, même interaction (toggle, ✓).

## Tests

Bug de persistance couvert par une simulation du flux démo (client créé, état
correct). 169/169 tests domaine inchangés, build vert, audit d'imports propre.
