# ADR-006 — Directive « moteur métier, ERP événementiel, penser mondial » : arbitrage

**Statut** : accepté avec amendements · juillet 2026 · complète ADR-005

## Contexte
Nouvelle directive du fondateur : abandonner le raisonnement par écrans au
profit du moteur métier ; oublier la structure actuelle ; documenter chaque
moteur interne indépendamment ; décrire chaque workflow en cascade
d'événements ; concevoir chaque règle pour le multi-pays/devises/langues/
législations/sociétés/agences/marques/franchises ; documenter immédiatement
tout ce qui manque ; viser une documentation permettant à une nouvelle équipe
de reconstruire « exactement la même plateforme » sans interprétation.

## Décisions
1. **Accepté — le modèle moteur** (S9). Les écrans deviennent des projections
   de moteurs. Fiche moteur normative en onze rubriques (les douze questions
   de gouvernance). Deux fiches complètes livrées (Tarification,
   Documentaire) comme gabarit contractuel. Les 17 moteurs demandés sont
   réconciliés avec les 11 modules de S2 : six sont des services transverses
   du noyau (identité, notifications, audit, API, IA), pas des modules.
2. **Accepté — l'ERP événementiel** (S10). Conventions de nommage et de
   charge, catalogue normatif de 18 événements, deux cascades de référence
   complètes (création d'affaire, signature d'offre), huit workflows restants
   identifiés au même format. Le journal d'événements EST l'audit (résout
   C-05 par construction).
3. **Amendé — « oublier la structure actuelle »**. Refusé au sens littéral :
   l'application existante est la preuve terrain du métier, validée client.
   Les écrans sont démontés en moteurs, pas amnésiés.
4. **Amendé — « penser mondial dès aujourd'hui »**. La garantie demandée
   (« aucun choix ne doit empêcher l'évolution ») est fournie par neuf
   invariants d'extensibilité (S11 : organisation sur toute donnée, montants
   devisés, textes en clés de traduction, référentiels par juridiction,
   adresses neutres, documents versionnés par langue/juridiction, permissions
   par capacité, communication par événements, temps universel) — pas par des
   chapitres spéculatifs sur marketplace/franchises/banques, explicitement
   exclus avec justification.
5. **Remplacé — le test « reconstruction exacte sans interprétation »**.
   Non falsifiable ; remplacé par un critère d'achèvement en huit points
   vérifiables (S11), incluant la liste explicite des degrés de liberté
   laissés à l'implémentation. À l'atteinte du critère : ouverture de la gate
   ADR-005 (analyse d'écart, décision reconstruire/converger sur pièces).
6. **Réaffirmé** : périmètre v2 = vertical déménagement (ADR-005) ; un seul
   système produit tous les livrables, les ADRs sont la coordination — pas
   d'agents simulés.

## Point de décision ouvert (fondateur)
Le motif d'escalade d'abstraction est contraire à la stratégie écrite du
projet (wedge first) pendant qu'un client pilote attend et que l'échéance
Peppol court. Deux options légitimes, à trancher explicitement :
(a) confirmer le périmètre ADR-005/006 et fournir les documents Word annoncés
    (intrant bloquant de S5) ;
(b) l'overruler par écrit — exécutable, mais avec chiffrage préalable du coût
    en délai pour le pilote.
L'absence de décision vaut (a).

## Conséquences
- Documentation v1.2 : 232 pages (S9-S11 ajoutés).
- Prochaines rédactions : fiches moteur des neuf modules restants, huit
  cascades, matrice complète module × capacité × rôle — dont Chiffrage,
  suspendu aux documents de travail.
