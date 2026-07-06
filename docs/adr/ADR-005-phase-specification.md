# ADR-005 — Phase de spécification ; décision de reconstruction différée à une gate

**Statut** : accepté · juillet 2026

## Contexte
Demande du fondateur : suspendre le développement, faire de la documentation
fonctionnelle la source de vérité, la transformer en spécification exhaustive
(critique de l'existant, architecture ERP cible, rôles automatiques, moteur de
chiffrage, automatisations/IA), puis « repartir de zéro » en supprimant le
projet JSX, le code étant ensuite dérivé de la spécification « sans
interprétation ni improvisation ».

## Décision
1. **Acceptée** : suspension du code ; la documentation (v1.1, 221 pages)
   devient la référence. La Partie IV contient la critique (constats C-01 à
   C-28) et la spécification cible (S1 à S8) : modules, rôles/permissions,
   machine à états, cadre du moteur de chiffrage, socle documentaire,
   catalogue d'automatisations.
2. **Amendée** : le périmètre de la spécification v2 est le **vertical
   déménagement complet** (S8). La trajectoire plateforme (marketplace,
   multi-pays, intégrations bancaires…) est garantie par des points
   d'extension documentés, pas par des chapitres spéculatifs.
3. **Refusée en l'état, remplacée par une gate** : aucune suppression du code
   existant n'est pré-engagée. À la clôture de la spécification, une analyse
   d'écart spécification/code sera produite et la décision — reconstruire ou
   faire converger le repo modulaire — sera prise sur pièces, en ADR. Motifs :
   le code porte le comportement validé client (documents d'offre verbatim,
   calculs) ; détruire du comportement validé avant d'avoir mesuré l'écart est
   une décision sans données (cf. ADR-001).
4. **Notée comme illusion à surveiller** : « sans interprétation ni
   improvisation » — aucune spécification ne couvre 100 % des décisions
   d'implémentation. La spécification fixera les invariants (états, gardes,
   permissions, formules, textes juridiques) et laissera explicitement les
   degrés de liberté restants.

## Dépendances
Le chapitre S5 (moteur de chiffrage) est volontairement un cadre : les règles
fines attendent les documents Word annoncés (contraintes métier — textes quasi
intégraux, tableaux transformés aux standards de l'application).

## Conséquences
- Le fichier known-problems.md reste actif pendant la phase de spécification.
- La documentation est régénérable (`content_a/b/c/d.py` + `gen.py`) ; toute
  évolution passe par ces sources, jamais par une édition manuelle du PDF.
