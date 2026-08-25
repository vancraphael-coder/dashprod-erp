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
- **Les fournitures ne s'ajoutent NI au devis NI à la facture.** C'est une
  vente de BIENS, distincte de la manutention : elle a son propre document.
  (Décision redite deux fois par Raphaël ; appliquée le 23/08/2026, verrouillée
  par un test dans `emballage.test.js`.) Ce qui reste à construire — séquence
  légale, prix client, taux — est au chantier V de `25-PARAMETRES-ROADMAP.md`.
  ⚠ Une formulation antérieure de ce document disait « lignes propres sur la
  facture ». Elle est **caduque**.
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

## Cartes métier, planning et facturation par période (23/08/2026)

- **Une CARTE MÉTIER est l'unité de travail** : un travail identifiable, posé à
  une date, pourvu en gens et en véhicules. Le catalogue est unique
  (`metiers/cartes.js`) et HORIZONTAL — il décrit la forme d'une carte, jamais
  le prix ni le contenu d'un métier. C'est ce qui permettra d'ajouter un métier
  futur sans toucher au déménagement.

- **Le « X » de « 2 membres / X » est l'effectif VENDU**, pas une constante du
  code. Le prix vient de `BAREME_HORAIRE[nbDemenageurs]` (2 à 6, choisi au
  devis) : comparer l'équipe à un plancher figé faisait passer au vert un
  chantier vendu à quatre. Le plancher du métier ne sert que de repli quand le
  devis est absent — et un devis SOUS le plancher ne fait pas descendre la
  carte, c'est un devis à revoir.

- **Une mission pressentie SIGNALE, elle n'interdit pas.** (Décision de
  Raphaël.) Une date connue mais non confirmée doit se voir au planning, en
  translucidité, et entrer dans la détection de conflits comme AVERTISSEMENT.
  Bloquer une ressource sur un devis qui ne se signera peut-être jamais
  reviendrait à se bloquer soi-même.

- **Une mission MULTI-JOURS reste UN SEUL document.** (Décision de Raphaël.)
  Une prestation étalée sur plusieurs jours ou mois produit une offre et une
  facture uniques, détaillant **par jour** les heures et le nombre de membres —
  d'abord *prévus*, puis *exacts*. Tout en un à chaque fois : c'est ce qui
  permet la vue d'ensemble instantanée et évite l'erreur de recollement entre
  plusieurs pièces. Côté Peppol, cela correspond exactement à `InvoicePeriod`
  (`prestation_debut` / `prestation_fin`).

  ⚠ **Fondation manquante, constatée en base le 23/08/2026** : `ubl.js` émet
  déjà `<cac:InvoicePeriod>`, mais les colonnes `prestation_debut` et
  `prestation_fin` **n'existent pas dans `factures`**. La période part donc
  toujours vide. Et `missions.date` est une date simple, sans plage. Voir le
  lot 38.

- **Toute la flotte est offerte sur toute carte mission.** (Décision de
  Raphaël, 23/08/2026.) La catégorie attendue est un MINIMUM, pas une
  exclusivité : un lift exige un lift, mais rien n'empêche d'ajouter la voiture
  qui le suit ou un second camion. Les véhicules sont **groupés par catégorie**,
  le groupe attendu en tête — c'est un ordre, jamais un filtre. Le verdict ne
  signale plus que l'ABSENCE de la catégorie requise.

- **Un véhicule peut être assigné à une équipe du jour** (migration 0144). Le
  même véhicule sur deux créneaux disjoints est légitime ; le chevauchement est
  un AVERTISSEMENT, jamais un blocage.

## Équipes du jour : réservation, sélections, couleur (lot 37a, 25/08/2026)

- **Les membres et véhicules d'une équipe du jour sont RÉSERVÉS pour ses
  missions.** Enregistrer une équipe pousse son affectation sur chaque mission
  liée — sans ressaisie. Plusieurs équipes peuvent viser la même mission : on
  fait l'UNION de ce qu'elles apportent, jamais un écrasement, et l'on
  recalcule aussi les missions qu'une équipe quitte.

- **Toute carte mission porte les deux sélections (membres ET véhicules), la
  visite comprise.** Aucune carte n'interdit le véhicule : la voiture de
  service de l'estimateur doit pouvoir être notée. La nuance est dans le
  verdict — un véhicule « facultatif » n'est jamais réclamé, seulement
  disponible.

- **La 2ᵉ bille de la carte mission (bandeau « Qui la fait ») prend la couleur
  du GROUPE DE TRAVAIL.** La couleur se DÉDUIT du rang de l'équipe dans la
  journée — non stockée, donc stable et sans trou à la suppression. Le bleu de
  marque est réservé à « pas encore d'équipe ».
