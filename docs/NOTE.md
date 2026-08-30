# Vague 1, lot C — le rapprochement des paiements

**30/08/2026.** **1213 tests verts**, build vert. Troisième lot de la vague
« fermer la boucle de l'argent ».

## Ce que ça fait

Un virement arrive sur ton compte avec une communication. Jusqu'ici, retrouver
la facture qu'il règle était un travail à l'œil. Maintenant, dans la
**Comptabilité**, un outil « Rapprocher un virement » : tu colles la
communication (l'OGM +++…+++ ou le numéro de facture), il retrouve **la facture
qu'elle désigne**, parmi celles de la période.

C'est l'exact inverse de l'émission : à l'émission on va de la facture vers la
communication ; ici on remonte de la communication vers la facture. Et comme la
communication est déterministe, ce chemin est **sûr** — pas une devinette.

## Trois garde-fous

- **Il rattrape les anciennes factures.** Même celles émises avant que la
  communication soit stockée (lot B) : il reconstruit le numéro depuis l'OGM.
- **Il ne devine jamais.** Si deux factures correspondent (ne devrait pas
  arriver), il refuse plutôt que de rapprocher au hasard.
- **Il rejette une communication corrompue.** Une OGM dont la clé de contrôle
  est fausse n'est pas rapprochée — elle serait le signe d'une erreur de saisie
  du client.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| rapprocher devine le premier en cas d'ambiguïté | 1 |
| la décomposition d'OGM ne vérifie plus la clé | 1 |

## À vérifier à l'œil

1. Comptabilité → « Rapprocher un virement ». Colle la communication d'une de
   tes factures émises : elle est retrouvée (numéro + montant).
2. Colle une communication bidon : message clair « non reconnue ».
3. Le rapprochement respecte le filtre par centre (il cherche dans la
   ventilation affichée).

## Où en est la vague 1

- **Lot A** — échéance de paiement ✅
- **Lot B** — communication stockée à l'émission ✅
- **Lot C** — rapprochement ✅ (ce lot)
- **Lot D** — relances, mention légale, préfixe de numérotation (reste à faire)

La boucle de l'argent est presque fermée : les factures ont une échéance, une
communication, et un virement se rattache à sa facture. Le lot D ajoutera le
suivi des retards (relances) et les mentions légales.

## Réserve d'honnêteté

L'outil travaille sur les factures de la période chargée à l'écran : si un
virement règle une facture hors période affichée, élargis la période avant de
rapprocher. Le rapprochement ne modifie encore rien (il retrouve, il n'enregistre
pas le paiement) — l'enregistrement reste manuel depuis la facture. Lier les deux
gestes (rapprocher PUIS enregistrer en un clic) serait une suite naturelle si tu
le souhaites.
