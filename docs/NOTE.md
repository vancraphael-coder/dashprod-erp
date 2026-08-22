# Lot 24 — P0 : conformité du document Peppol

`npm test` : **969/969 ✓** — build `apps/web` ✓ — 7 fichiers.
**Aucune migration.** Se pose par-dessus le lot 23.

Ta description de la facturation agréée a servi de référentiel : deux de ses
champs — « Réf./bon de commande » et « Date/période de prestation » — ne sont
pas là par hasard. En vérifiant pourquoi, j'ai trouvé un défaut bloquant.

## Le défaut qui rejetait TOUT

**PEPPOL-EN16931-R003**, drapeau **`fatal`** : *« A buyer reference or purchase
order reference MUST be provided »*. Le test du réseau est
`cbc:BuyerReference` **ou** `cac:OrderReference/cbc:ID`.

Dashprod n'émettait **ni l'un ni l'autre**. Conséquence : **toute facture aurait
été rejetée par le point d'accès**, quelle que soit sa qualité par ailleurs.
Vérifié sur `docs.peppol.eu`, pas de mémoire — la règle est confirmée sur les
versions 2023 comme 2025.

Corrigé : `reference_acheteur` (BT-10) traverse le modèle canonique et sort en
`<cbc:BuyerReference>`. Absente, la génération **échoue** avec un motif qui
nomme la règle.

**Un point pour toi.** Certains éditeurs mettent automatiquement « NA » dans ce
champ pour ne jamais être rejetés. Je ne l'ai **pas** fait : ce serait inscrire
une donnée fausse dans un document légal, à rebours de tout le lot 23. Mais
c'est une décision produit — si tu préfères ce repli, dis-le et je l'ajoute en
une ligne. Côté adaptateur, j'utilise la référence saisie, sinon la référence du
dossier (que le client connaît). Les deux absentes → refus.

## L'avoir partait orphelin

`facture_corrigee` existait dans le modèle depuis le début… mais n'était
**jamais émis en UBL**. Un avoir ne disait donc pas quelle facture il corrige —
mention légale, et rapprochement impossible côté client.

Corrigé : `<cac:BillingReference>`. Un avoir sans référence est refusé.

## La date de prestation

Absente du modèle. C'est une mention légale belge dès qu'elle diffère de la date
d'émission — et c'est précisément pour ça que l'app agréée l'affiche.

Corrigé : `prestation_debut` / `prestation_fin` → `<cac:InvoicePeriod>`. Non
émise si inconnue (la règle R008 refuse les éléments vides).

## Deux manques que ton référentiel révèle, non traités ici

**« Le prix comprend la TVA ».** Dashprod raisonne en HTVA uniquement. Or un
déménageur annonce couramment un prix **TVAC** à un particulier. C'est un vrai
manque produit, pas de conformité — à traiter, mais pas dans un lot P0.

**La catégorie d'opération** (vente de biens / services / loyer / droits
d'auteur / don). C'est exactement l'entrée qui manque à `qualifierTva` pour
traiter l'intracommunautaire : au lot 23, j'ai refusé de qualifier ces cas parce
que la règle dépend de la **nature** de la prestation. Ton app agréée capture
cette nature. Le jour où ton comptable valide les règles, c'est ce champ qu'il
faudra brancher.

## À vérifier à l'œil

1. Une facture sans référence de bon de commande : la génération Peppol refuse
   en citant la règle, au lieu de partir se faire rejeter.
2. Un avoir : l'XML contient `BillingReference` vers la facture d'origine.
3. Une facture avec dates de chantier : `InvoicePeriod` présent dans l'XML.
