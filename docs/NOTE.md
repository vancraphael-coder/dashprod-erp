# Vague 1, lot A — l'échéance de paiement

**29/08/2026.** **1197 tests verts**, build vert. **Migration 0160** appliquée et
vérifiée. Premier lot de la vague « fermer la boucle de l'argent ».

## Le défaut corrigé

16 factures émises, **16 sans échéance**. Ton réglage (échéance en jours) était
saisi mais n'agissait pas. Désormais :

- À l'émission, la facture reçoit une **date d'échéance** = date d'émission +
  ton délai réglé. Elle se **fige** avec le numéro : plus jamais modifiable.
- **Les 16 factures déjà émises ne sont PAS touchées** — comme tu l'as confirmé,
  on n'écrit pas le passé. La règle s'applique aux factures suivantes.
- Si le délai n'est pas réglé, **défaut prudent à 30 jours** (jamais 0, jamais
  négatif).

## Ce que tu vois

- **Sur le PDF** : « Émise le … / Échéance : … ».
- **Sur la fiche facture**, sous le solde, tant qu'elle n'est pas payée :
  - **« En retard depuis X jours »** en rouge si l'échéance est dépassée ;
  - **« Échoit dans X jours »** en ambre si elle approche ;
  - la date d'échéance sinon.

C'est le premier pas vers le suivi des retards et les relances (lots suivants).

## Un piège attrapé au passage

Le classique du projet : `Number(null) === 0`. Un réglage d'échéance absent
serait devenu « 0 jour » (payable le jour même) au lieu du défaut de 30 jours.
Neutralisé et verrouillé par sabotage.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| le défaut prudent retombe à 0 jour | 1 |

## À vérifier à l'œil

1. Émets une nouvelle facture : le PDF porte une échéance, cohérente avec ton
   réglage (ou 30 jours par défaut).
2. Sur une facture émise non payée dont l'échéance est passée : « En retard
   depuis X jours » en rouge sous le solde.
3. Les anciennes factures restent inchangées.

## Suite de la vague 1

- **Lot B** — la communication structurée (OGM) stockée à l'émission. Même
  défaut que l'échéance : l'OGM est calculé à l'affichage du PDF et jamais gardé,
  donc aucun rapprochement bancaire possible. C'est le prochain.
- **Lot C** — rapprocher les 23 paiements ↔ factures.
- **Lot D** — relances, mention légale, préfixe de numérotation.
