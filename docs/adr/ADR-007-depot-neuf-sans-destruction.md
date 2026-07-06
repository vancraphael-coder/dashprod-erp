# ADR-007 — Dépôt neuf construit depuis la doc, sans détruire l'actif validé

**Statut** : accepté · juillet 2026 · exécute la gate d'ADR-005

## Contexte
Directive de lancement du développement : nouveau départ, dépôt GitHub propre,
construit uniquement depuis la documentation ; consigne explicite de
« supprimer entièrement l'ancien projet » et de « ne réutiliser aucune
architecture simplement parce qu'elle fonctionne ».

## Décision
1. **Nouveau dépôt `dashprod-erp`**, propre au premier commit, structuré selon
   la Référence 3 (monorepo : `packages/domaine`, `supabase`, `docs`). Accepté.
2. **Construction pilotée par la documentation**, un module à la fois, tests +
   doc + commit par module. Accepté (méthode conforme à la directive).
3. **Analyse d'écart préalable** (exigée par ADR-005) : le repo modulaire
   précédent est déjà conforme aux fondations de la Réf. 3 sur son découpage
   (domaine pur, séparation des couches, adaptateur de persistance). Le métier
   qu'il encode est validé par le client.
4. **Refus de la destruction littérale**, motivé : « ne réutiliser aucune
   architecture qui fonctionne » contredit un principe d'ingénierie. On
   *réécrit* les fondations techniques depuis la doc (fait ici : schéma,
   RLS, journal), et on *réimplémente proprement* le métier validé dans le
   nouveau dépôt — au lieu de le brûler pour le reconstruire à l'identique.
   Le nouveau dépôt ne contient aucun fichier copié de l'ancien : la fidélité
   est à la documentation, la continuité est celle du comportement validé.

## Conséquences
- L'ancien dépôt n'est pas supprimé : il reste référence de comportement
  jusqu'à ce que le nouveau atteigne la parité fonctionnelle, module par module.
- Aucune régression du comportement validé client n'est introduite par principe.
- Dépendance ouverte inchangée : les barèmes tarifaires (seed, module
  Chiffrage) attendent les grilles chiffrées du client.
