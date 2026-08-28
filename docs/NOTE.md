# Lot 47 — garde anti-verrouillage des postes

**28/08/2026.** **1175 tests verts**, build vert. **Migration 0155** appliquée
et vérifiée.

Fait suite à l'incident : ton compte gérant s'était retrouvé secrétaire (via le
nouvel écran d'attribution) et tu avais perdu Ressources/Paramètres/Avis. Déjà
rétabli en base. Ce lot pose la garde pour que ça ne puisse plus arriver.

## Ce qui protège maintenant

Deux verrous, **en base ET à l'écran** :

1. **On ne modifie pas son propre poste.** Sur ton propre compte, l'écran
   affiche « C'est votre compte : vous ne pouvez pas modifier votre propre
   poste. Un autre gérant ou fondateur peut le faire. » — et la commande refuse.
   C'est ce qui t'aurait évité l'incident.

2. **On ne retire pas le dernier fondateur/gérant.** Impossible de rétrograder
   le dernier dirigeant : sinon plus personne n'a accès aux réglages et
   l'organisation se verrouille dehors. Le bouton se grise, et la commande
   refuse avec « ce serait le dernier fondateur ou gérant ».

La règle vit surtout **dans la commande base** (`cmd_definir_poste`, migration
0155) — c'est le seul endroit qui protège quelle que soit l'interface. L'écran
la reflète pour éviter même le clic.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| on peut modifier son propre poste | 1 |
| le dernier dirigeant peut être retiré | 1 |

## Sur l'incident lui-même

Ce n'était **pas** une perte de code — rien de Dashprod n'avait été supprimé.
Ton compte avait juste été affecté au poste « secrétaire » (probablement en
testant le nouvel écran sur toi-même), et la secrétaire n'a pas accès aux
réglages. Remis en « gérant » en base, tout est revenu.

## À vérifier à l'œil

1. Sur TON compte dans l'équipe : le bloc Poste affiche le message « c'est votre
   compte », pas de boutons.
2. Sur un autre membre : Promouvoir/Rétrograder fonctionnent, mais on ne peut
   pas descendre le dernier dirigeant.

## Suite

Retour au **circuit** : le domaine du surcoût interne est prêt (lot précédent),
il reste à le brancher (table, RPC, terrain, bureau), puis les photos.
