# Lot 54 — la carte des circuits et l'ordre de marche

**29/08/2026.** **1198 tests verts**, build vert. Deux documents neufs, tirés du
code ET de la base — pas de mémoire.

## `60-CIRCUITS-QUATRE-COUCHES.md` — la carte du territoire

**Dix circuits** recensés, chacun lu en quatre couches : métier réel,
paramétrage, facturation, comptabilité.

1. Commercial · 2. Terrain · 3. Facturation · 4. Comptabilité · 5. RH/paie ·
6. Boxe & zone · 7. Fournitures · 8. Abonnement · 9. Client · 10. Conformité.

Avec un tableau de synthèse qui montre d'un coup d'œil où ça tient et où ça
casse, et les **quatre invariants inter-couches** (dont : le surcoût interne ne
franchit jamais la frontière vers le facturé).

**Ce que la carte révèle.** Le métier réel est solide presque partout — c'est
l'acquis de ces cinquante lots. **Ce qui casse est en aval.** Des prestations
justes produisent des factures incomplètes.

## Le défaut le plus net, vérifié des deux côtés

**16 factures émises : 16 sans échéance, 16 sans communication en base.**

Et j'ai trouvé pourquoi : l'OGM est calculé **à l'affichage du PDF**
(`FactureDoc.jsx` appelle `genererOGM`), jamais stocké. **Le client reçoit un
document portant une communication que le système ne connaît pas.** Vérifié aux
deux bouts : `cmd_emettre_facture` ne pose ni échéance ni communication, et le
front ne fait que les lire.

Conséquence concrète : Roovers ne peut ni savoir quelle facture est en retard,
ni rapprocher un virement — alors que 23 paiements sont déjà enregistrés.

## `70-ROADMAP.md` — l'ordre de marche

Huit vagues, chacune justifiée :

- **Vague 0 — aujourd'hui, hors code.** RGPD (contrat de sous-traitance : les
  obligations sont DÉJÀ nées avec Roovers) + deux questions au comptable qui
  débloquent les vagues 2 et 3.
- **Vague 1 — fermer la boucle de l'argent.** Échéance, communication en base,
  rapprochement, relances. **La plus rentable : elle transforme 16 factures
  muettes en 16 créances suivies.**
- **Vague 2** — encaisser les fournitures. **Vague 3** — la comptabilité
  complète. **Vague 4** — le garde-meubles (ses fondations sont désormais
  posées). **Vague 5** — le modèle d'affaires. **Vague 6** — délimitation.
  **Vague 7** — design.

Avec une section **« ce qu'il ne faut PAS faire »** et un tableau des questions
ouvertes où je donne mon avis sans trancher à ta place.

## Deux bonnes nouvelles au passage

- **Le bloqueur P1 n'en est plus un** : les offres portent leurs prix
  (180/360/720 HTVA mensuel, annuel remisé).
- **Les fondations du garde-meubles sont là** (centre, rattachement, permissions,
  maison mère) — boxe-2 est débloqué.

## Éprouvé

Le test du dossier maître a détecté mes ajouts (c'est son rôle) — les deux
documents y sont intégrés, avec quatre tests neufs qui les protègent de la
dérive : ordre des couches, invariants énoncés, vagues ordonnées, juridique
avant le code. Sabotage vérifié.

## Ce que je te recommande

Commence par la **vague 0.1** (le juridique, aujourd'hui, sans code) et la
**vague 1 lot A** (l'échéance — purement mécanique, aucune décision).

Une seule question m'attend, un mot suffit : les 16 factures déjà émises sans
échéance, **on ne les réécrit pas** (l'immuabilité prime) — tu confirmes ?
