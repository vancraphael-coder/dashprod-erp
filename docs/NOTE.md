# Vague 1, lot B — la communication structurée (OGM), enfin stockée

**29/08/2026.** **1206 tests verts**, build vert. **Migrations 0161 + 0162**
appliquées et vérifiées. Deuxième lot de la vague « fermer la boucle de
l'argent ».

## Le défaut corrigé

La communication (l'OGM, ce +++123/4567/89012+++ que le client recopie dans son
virement) était **calculée à l'affichage du PDF et jamais gardée en base**. Le
client recevait une communication que ton système ignorait — donc **impossible
de rapprocher un virement de sa facture**.

Désormais : à l'émission, la communication est **posée et figée** avec le numéro.

## Le réglage est respecté

- Si tu actives « communication structurée » : une **OGM belge** (+++…+++),
  celle que les banques rapprochent automatiquement.
- Sinon : le **numéro de facture** comme communication libre.
- Dans les deux cas elle est **stockée** — donc rapprochable. C'est ce qui
  débloque le lot C (rapprochement des paiements).

## Trois bénéfices d'un coup

1. **Rapprochement possible** : la communication existe enfin en base.
2. **PDF juste** : il lit la valeur stockée (et affiche le bon libellé selon
   qu'elle est structurée ou libre). Les anciennes factures gardent un affichage
   calculé, sans être réécrites.
3. **Peppol/UBL correct** : le PaymentID de la facture électronique lit cette
   communication — il était vide jusqu'ici, il est maintenant renseigné.

## Vérifié avec soin

- La fonction OGM en base donne **exactement** le même résultat que le code
  (vérifié sur 4 cas, dont le cas limite de la clé = 97).
- Éprouvé par sabotage :

| Sabotage | Rouges |
|---|---|
| la validation d'OGM accepte tout | 1 |
| une clé de contrôle nulle laissée à 0 | 1 |

## À vérifier à l'œil

1. Émets une facture : sa communication apparaît sur le PDF, et elle est
   maintenant en base (plus seulement à l'écran).
2. Si tu actives « communication structurée » dans les réglages, la prochaine
   facture porte une vraie OGM +++…+++ ; sinon, son numéro.
3. Les anciennes factures restent inchangées.

## Suite de la vague 1

- **Lot C** — rapprocher les 23 paiements ↔ factures par la communication.
  Il peut désormais s'appuyer sur une communication stockée.
- **Lot D** — relances, mention légale, préfixe de numérotation.
