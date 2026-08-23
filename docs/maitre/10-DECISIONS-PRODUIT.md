# Décisions produit arrêtées

Ce qui est **tranché**. Ne pas rediscuter sans volonté explicite de Raphaël.
Chaque ligne dit la décision, pas l'hésitation qui l'a précédée.

*Rang 4 dans la hiérarchie des sources — la base et le dépôt priment sur ce
document si l'état réel diverge.*

---

## Le barème d'abonnement

| Offre | Mois | An (−5 %) | Membres inclus | Centres inclus |
|---|---|---|---|---|
| Basique (`starter`) | 180 € | 2 052 € | 2 | 0 |
| Regular | 360 € | 4 104 € | 5 | 0 |
| Pro | 720 € | 8 208 € | 30 | 1 |

Membre supplémentaire : **13 €/mois · 148,20 €/an**, toutes offres.
Centre supplémentaire : **50 €/mois · 570 €/an**, Pro uniquement.
Tous les prix sont **HTVA**.

**La remise annuelle de 5 % porte aussi sur les suppléments.**

**Prix STOCKÉS, jamais calculés.** Une facture référence un prix figé : si le
taux changeait, un montant recalculé réécrirait le passé.

**Grille monotone, vérifié** : au-delà des seuils, les trois offres sont des
droites parallèles (`154+13n`, `295+13n`, `330+13n`). Aucune inversion
possible. Les offres se différencient par les **modules**, pas par les sièges —
c'est un axe unique et assumé.

## Modules et accès

- E-signature d'une offre : **toutes les offres**.
- Portail / espace client : **toutes les offres**.
- Centres logistiques : **Pro** uniquement.
- Journal d'audit : la **donnée** n'est jamais verrouillée (une société doit
  pouvoir tracer ses actions). Le module vend l'écran d'exploration et l'export.
- `paie` : **suspendu** du périmètre d'enforcement, sur décision de Raphaël.
- Un module non payé est **refusé en base**, pas seulement masqué au menu.

## Facturation et TVA

- La **nature du dossier** détermine la catégorie d'opération, qui détermine le
  taux. Le client ne choisit pas une catégorie fiscale : Dashprod la déduit et
  l'**explique** à l'écran.
- Déménagement, lift, sous-traitance → *vente de services*, 21 %.
- Boxe, zone → *location d'espace de stockage*, 21 %.
- **Les fournitures sont une vente de BIENS**, distincte de la manutention.
  Lignes propres, dénommées et quantifiées.
- Le **matériel de terrain** (sangles, couvertures, monte-meuble) n'est **jamais
  facturé** : ce sont les outils de l'entreprise.
- Un taux non qualifiable est **refusé**, jamais deviné. Intra-UE, hors UE et
  exonérations intérieures attendent une validation par un conseiller TVA.
- `BuyerReference` absente → **« NA »** (décision Raphaël). Un « NA » sur une
  référence de routage constate une absence ; un taux inventé affirmerait une
  donnée fiscale fausse. La distinction tient.

## Peppol

- Obligation belge en vigueur **depuis le 1ᵉʳ janvier 2026**.
- Dashprod fait **l'envoi ET la réception** (décision Raphaël).
- Un seul point d'accès peut recevoir pour un participant : basculer suppose de
  désinscrire l'organisation de son point d'accès actuel.
- **Recevoir n'est pas accepter** : aucune facture entrante n'est approuvée ni
  comptabilisée sans décision humaine tracée.

## Comptabilité

- Dashprod **n'est pas un logiciel comptable agréé** et ne s'y substitue pas.
  Dit franchement à l'écran, pas en petits caractères.
- **Réversibilité** : le client exporte toutes ses ressources à tout moment.
  CSV point-virgule + BOM — **aucun format propriétaire**, aucun connecteur qui
  lierait Dashprod à un éditeur.

## Planning et équipes

- Une équipe : **une personne au minimum** (seul blocage).
- L'effectif hors barème **avertit**, il n'interdit pas.
- Une personne peut être dans **deux équipes le même jour** si les missions ne
  se chevauchent pas. Une mission sans horaire occupe la journée entière — on
  ne suppose pas qu'elle laisse de la place.
- Un **modèle d'équipe** ne retient que les personnes : ni date, ni missions.

## Reporté explicitement

- **CRM / CMR** : au futur. Ne pas coder un document réglementaire à l'aveugle.
- **Moteur de conformité métier** (licences, agréments, permis) : bonne idée
  produit, mais aucun client payant ne l'attend aujourd'hui.
- **Module boutique** (`stock_articles`) : tables vides, différer ne coûte rien.
