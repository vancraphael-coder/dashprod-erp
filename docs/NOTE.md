# Lot 26 — Réception Peppol : recevoir n'est pas accepter

`npm test` : **989/989 ✓** — build `apps/web` ✓ — 4 fichiers.
**Migration `0139` ÉCRITE mais NON APPLIQUÉE — voir l'avertissement ci-dessous.**

## Deux choses à te dire d'emblée

**1. La migration n'a pas été éprouvée.** Le connecteur Supabase s'est
déconnecté en cours de session. Contrairement aux migrations 0001 à 0138, je
n'ai pas pu appliquer celle-ci ni l'exercer dans un bloc rollback. C'est une
entorse à la règle absolue du projet — je te la signale plutôt que de la
masquer. Le **bloc de vérification est fourni en commentaire à la fin du
fichier de migration** : applique la migration, exécute ce bloc, il doit se
terminer par « ROLLBACK volontaire — garde-fous OK ».

**2. Un bloquant métier que le code m'a révélé.** `digiteal.js` enregistre les
participants avec `envoiSeul = true` — et son propre commentaire l'explique :
**un seul point d'accès peut recevoir pour un participant donné**, et basculer
la réception exige de se désinscrire du point d'accès actuel.

Autrement dit : **aucun client Dashprod ne peut recevoir de facture Peppol
aujourd'hui**, alors que c'est l'obligation légale. Et le code que je viens
d'écrire ne servira à rien tant que ce n'est pas tranché.

Ce n'est pas une décision technique. Beaucoup de PME belges reçoivent leurs
factures Peppol via la plateforme de leur comptable. Reprendre la réception,
c'est toucher à cette relation — à toi de voir si Dashprod veut ce rôle, et ce
que ça implique commercialement.

## Ce que le domaine sait faire

**Lire un UBL entrant** — éprouvé en aller-retour : notre générateur produit un
document, notre lecteur le relit, montants exacts au centime. C'est le meilleur
test possible sans point d'accès réel : si notre lecteur ne relit pas notre
propre UBL, il ne relira rien.

**La règle centrale, verrouillée par sept tests :**

> Une facture reçue n'est **jamais** approuvée ni comptabilisée d'office.
> Même impeccable, elle s'arrête à « à vérifier ».

Le réseau garantit l'acheminement, pas la justesse. C'est l'entreprise qui
décide si elle doit cette somme. Concrètement :
- `APPROUVE` n'est atteignable **que** depuis `A_VERIFIER` ;
- `COMPTABILISE` **que** depuis `APPROUVE` ;
- double serrure : machine d'états dans le domaine **et** trigger en base — une
  écriture comptable mérite deux verrous.
- une approbation sans nom de décideur est refusée : sans ça, impossible de
  prouver que quelqu'un a regardé.

**Les montants sont lus, jamais recalculés.** Recalculer les totaux d'une
facture entrante reviendrait à réécrire la facture de quelqu'un d'autre.

**Le dédoublonnage se fait sur fournisseur + numéro**, pas sur le contenu : un
même document retransmis (reprise après incident, webhook rejoué) diffère
parfois d'un octet sans être une autre facture.

**Un document illisible n'est jamais jeté** — c'est une pièce légale. Il part en
vérification avec son motif, et le XML d'origine est conservé intact.

## Ce qui reste devant

Le webhook Digiteal entrant n'existe pas encore côté client HTTP (`digiteal.js`
ne connaît que `outbound-ubl-documents`). C'est le prochain morceau — mais il
n'a de sens qu'une fois la question du point d'accès tranchée.

## À vérifier

1. Appliquer `0139` puis exécuter le bloc de vérification en fin de fichier.
2. Les trois garde-fous doivent refuser : comptabilisation sans approbation,
   approbation anonyme, doublon.
