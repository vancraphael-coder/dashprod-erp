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

- **~~La 2ᵉ bille de la carte mission prend la couleur du groupe de travail.~~**
  ANNULÉ le 25/08/2026. Pas de couleur par nature NI par équipe. Et
  (correction du 25/08) c'est la bille STATIQUE en haut de carte qui est
  SUPPRIMÉE, pas la dynamique : la dynamique de l'accordéon reste, c'est elle
  qui l'actionne (son chevron pivote avec l'état). Quand aucune date n'est
  posée, un repère plat « + » garde l'affordance d'ajout.

## Équipe du jour : panne, double équipe, modèles (lot 37b, 25/08/2026)

- **Un véhicule modifiable à volonté dans l'équipe du jour, mais une PANNE
  bloque.** État mécanique « urgent » = blocage critique (le premier blocage
  matériel de l'app) : l'équipe doit être réorganisée autour d'un autre
  véhicule. « surveiller » n'immobilise pas — le camion roule, on le signale
  ailleurs.
- **Une équipe peut porter plusieurs missions sans défaut.** Le défaut naît
  quand une PERSONNE appartient à deux équipes DISTINCTES en même temps le même
  jour (chevauchement d'horaires) — bloquant, et le message nomme l'autre
  équipe. Deux missions non simultanées ne gênent pas.
- **Les MODÈLES (pré-enregistrement) n'appliquent aucun contrôle de conflit.**
  Une personne peut figurer dans plusieurs modèles : ce sont des rosters
  réutilisables, pas des engagements d'un jour. Les équipes sont mouvantes d'un
  jour à l'autre ; le modèle ne retient QUE des personnes.

## Postes et permissions (lot 38, 25/08/2026)

- **Onze postes nommés par métier** remplacent le choix de 13 capacités à la
  main : fondateur, gérant, secrétaire, chef d'équipe, livreur, monteur,
  chauffeur, liftier, déménageur, intérimaire, visite terrain. Source de
  vérité : `rh/postes.js`. Migration 0145 (additive, anciens rôles conservés).
- **Métier ≠ permission.** Les cinq métiers d'exécution (déménageur, livreur,
  monteur, chauffeur, liftier) ont EXACTEMENT les mêmes droits logiciels ; seul
  le métier (l'étiquette) diffère.
- **La hiérarchie n'est pas un empilement pur.** `cloturer_chantier` est un
  geste de terrain : la secrétaire (bureau), pourtant de rang supérieur au chef
  d'équipe, ne l'a pas. Monter vers la direction ouvre l'argent et les réglages ;
  ça ne recopie pas les gestes de terrain.
- **Promotion / rétrogradation** = un cran de rang. Les cinq métiers de rang 4
  se promeuvent vers chef d'équipe (rang 3), pas l'un vers l'autre.
- **Confier les accès** : fondateur et gérant de plein droit ; secrétaire
  UNIQUEMENT si octroyé par un fondateur ou un gérant ; le terrain jamais.
  L'octroi lui-même ne peut venir que d'un fondateur ou d'un gérant (pas de
  chaîne d'élévation).
- **Visite terrain** : accès en lecture seule, complété par une SÉLECTION DE
  PAGES modifiables. Les écrans sensibles (paie, paramètres, facturation,
  compta) ne sont jamais dans le catalogue partageable.
- **Maison mère = absence de centre (`centre_id null`)**, pas une ligne. Les
  membres se transfèrent PAR LOT entre centres ou depuis/vers la maison mère.

## Circuit terrain → coût réel (lot 40, 27/08/2026)

- **Pointage INDIVIDUEL** (choix A de Raphaël) : `chrono_sessions.utilisateur_id`
  (migration 0147). Chacun pointe pour soi ; le bureau corrige via
  `cmd_valider_heures`. Les sessions collectives d'avant 0147 (utilisateur_id
  null) restent lisibles, non ventilées.
- **Main-d'œuvre RÉELLE = heures pointées × COÛT INTERNE**, par membre
  (`pilotage/main-oeuvre-reelle.js`). Pas la paie : la paie agrège au niveau du
  JOUR (deux déménagements d'un membre dans une journée y sont fondus), on ne
  peut pas la répartir par mission. Le pointage, lui, est par mission.
- **Les heures des membres sont un COÛT INTERNE, pas un coût client.** Le
  Calcul définitif sépare déjà réel (coût) et facturé (client) : un dépassement
  d'heures grossit le réel et réduit la marge, sans toucher le facturé. Le
  module MESURE l'écart prévu/réel ; il ne juge PAS s'il est facturable ou
  interne — décision du bureau (lot suivant : surcoût interne).
- **Carte info « heures pointées »** dans dossier/devis/Calcul définitif, dès
  que le terrain a pointé. Réservée à `voir_prix`.
- **Corrections** : alerte permis UNIQUEMENT si le bon permis manque ; deux
  missions du même jour d'une MÊME équipe ne sont pas un doublon (seules deux
  équipes distinctes le sont).
- **Anciens postes SUPPRIMÉS** (migration 0146) : seuls les 11 transmis
  subsistent ; « direction » remonté en « gerant » avant suppression.

## Responsable dépôt + accès création de centre (lot 41, 27/08/2026)

- **Poste « responsable dépôt »** (migration 0149) : attributions de secrétaire
  + `gerer_depot` (boxes, zones, contrats). Ne touche ni paie, ni facturation,
  ni réglages. Douzième poste.
- **Capacité `gerer_depot`** ajoutée au domaine (`capacites.js`) — elle existait
  en base mais manquait côté code.
- **Bouton d'ajout de centre RÉPARÉ.** Il dépendait de `repartitionCentres()`,
  qui n'aboutit qu'une fois multi-centres : on ne pouvait donc jamais créer le
  PREMIER centre. Le droit d'ajouter/modifier dépend désormais de la capacité
  (`gerer_referentiels`), pas de l'existence d'une répartition.

## À FAIRE — lot centres (cadré le 27/08/2026)

- **Responsable dépôt ne voit QUE son centre.** Scoping sur `centre_id` de
  l'acteur, sur tous les écrans qu'il ouvre.
- **Secrétaire+ accède à TOUS les centres et leurs écrans**, sans interférer
  avec la maison mère ni les autres centres (bascule de centre).
- **Rapports jour / semaine / mois** en CARTE TEXTE + HISTORIQUE, SANS casser
  les KPI de la carte déjà présente (`RapportCentres.jsx` / `cmd_rapport_hebdo`,
  à généraliser par période).

## Lot centres — portée + rapports texte (lot 42, 27/08/2026)

- **Portée par centre** (`organisation/centres.js` : `porteeCentres`,
  `peutVoirCentre`, `filtrerParCentre`). Responsable dépôt = SON centre, sans
  bascule. Secrétaire/gérant/fondateur = tous les centres + maison mère, avec
  bascule. Le terrain reste dans le sien. `filtrerParCentre` ne mélange jamais
  deux centres — le « sans interférer » de Raphaël.
- **Rapports texte tri-cadence** (`organisation/rapport-centre.js`) : fenêtres
  jour / semaine (lundi belge) / mois, `fin` exclusive. Table `centre_rapports`
  (migration 0150, org_id DEFAULT jwt_org()), RPC `cmd_centre_rapport_ecrire` /
  `cmd_centre_rapports` (0151). Carte texte + historique AJOUTÉE sous les KPI de
  RapportCentres.jsx — les KPI ne sont pas touchés.
- **Reste à câbler** : la BASCULE de centre pour secrétaire+ dans les écrans de
  travail (dossiers/planning/stockage filtrés sur le centre choisi). La portée
  domaine est prête ; c'est le câblage d'écran qui suit.

## Bascule de centre (lot 43, 27/08/2026)

- **`mon_profil` expose `poste` et `centre_id`** (migration 0152, additive) —
  la bascule a besoin de savoir qui est l'acteur.
- **Sélecteur de centre** (`composants/SelecteurCentre.jsx`) piloté par
  `porteeCentres` : n'apparaît QUE pour secrétaire+ (peutBasculer). Responsable
  dépôt et terrain n'en voient pas.
- **Écran dossiers filtré par centre** via `filtrerParCentre`, AVANT les vues :
  compteurs et urgences ne comptent que le centre courant. Pas de régression
  pour un gérant sans centre (atterrit sur maison mère, rien ne disparaît).
- **Reste à câbler** : la même bascule sur PLANNING et STOCKAGE (même patron :
  sélecteur + filtrerParCentre). Fait sur les dossiers, l'écran pivot.

## Bascule étendue (lot 44, 27/08/2026)

- **Planning** filtré par centre (missions), même patron que les dossiers :
  sélecteur + filtrerParCentre, avant grille/pastilles/charge. Jamais en
  lecture seule (le terrain n'a pas de bascule).
- **Stockage** : il avait DÉJÀ son sélecteur de dépôt natif. On l'a restreint à
  la PORTÉE — un responsable dépôt n'y voit que son centre ; secrétaire+ tous.
- `listerMissions` expose désormais `centre_id`.

## À FAIRE EN PRIORITÉ — finir les postes/permissions (avant le circuit)

Demande explicite de Raphaël : les postes/permissions doivent être TERMINÉS
avant de reprendre le reste. Reste à câbler (le domaine est prêt depuis lot 38) :
- écran d'attribution de poste par membre (promouvoir/rétrograder) ;
- sélection des pages modifiables pour « visite terrain » ;
- garde « confier les accès » (seul un poste qui peutConfierAcces voit l'écran) ;
- octroi de la confiance à une secrétaire par fondateur/gérant.

## Permissions TERMINÉES (lot 45, 27/08/2026)

L'écran des postes/permissions est complet (le domaine l'était depuis lot 38) :

- **Attribution de poste par membre** dans Equipe.jsx (composant
  `AttributionPoste`, en tête des autorisations) : poste actuel, **promouvoir /
  rétrograder** d'un cran, ou choix direct d'un poste. Commande
  `cmd_definir_poste` (migration 0153) : REMPLACE le poste (ne cumule pas),
  gardée par `confier_les_acces`.
- **Visite terrain** : sélection des **pages modifiables** (colonne
  `utilisateurs.pages_modifiables`, `cmd_definir_pages_visite`, migration 0154).
  Seules les pages partageables sont conservées (jamais paie/paramètres).
- **Octroi « confier les accès »** : une CASE À COCHER (décision de Raphaël),
  visible UNIQUEMENT pour le fondateur/gérant (`peutOctroyerConfiance`) et
  seulement sur un poste octroyable (secrétaire, responsable dépôt). Passe par
  `definirCapacite('confier_les_acces')` — déjà gardé côté base par
  `gerer_referentiels` (que seuls fondateur/gérant ont). Double protection.
- La garde de l'écran : si l'acteur ne `peutConfierAcces`, il voit « Vous ne
  pouvez pas modifier les accès de ce membre ».
- `listerMembres` expose `poste` et `pages_modifiables`.

Éprouvé par sabotage (poste terrain rendu octroyable → rouge ; secrétaire qui
pourrait octroyer → rouge).

## Garde anti-verrouillage des postes (lot 47, 28/08/2026)

INCIDENT : un compte gérant s'est retrouvé secrétaire (via le nouvel écran
d'attribution) et a perdu Ressources/Paramètres. Rétabli en base. Deux verrous
ajoutés, en base ET à l'écran :
- **On ne modifie pas son PROPRE poste** — qu'un autre dirigeant le fasse.
- **On ne retire pas le DERNIER fondateur/gérant** d'une organisation (sinon
  personne ne peut plus accéder aux réglages : verrouillage total).
Domaine : `peutAttribuerPoste` (postes.js), éprouvé par sabotage. Base :
`cmd_definir_poste` (migration 0155) applique les mêmes règles — le seul endroit
qui protège vraiment.

## Surcoût interne — circuit branché (lot 48, 28/08/2026)

Le domaine (pilotage/surcout-interne.js) est branché de bout en bout :
- **Terrain** (RapportChantier.jsx) : le chef d'équipe signale un surcoût
  (panne retour, retard, nettoyage, matériel oublié, autre), en HEURES, sans
  prix, et le FIGE d'emblée. RPC cmd_surcout_declarer.
- **Bureau** (Devis.jsx, Calcul définitif) : une carte « Surcoût interne » sous
  « Heures pointées ». Le coût (heures × taux interne moyen) s'ajoute au coût
  RÉEL, JAMAIS au facturé (effetSurCalcul, gardé par sabotage). Le bureau
  corrige/supprime (cmd_surcout_corriger, gerer_planning).
- **Base** : table surcouts_internes (0156, org_id DEFAULT jwt_org()), 3 RPC
  (0157).
- Piège heredoc EOF attrapé par le test qui exécute vraiment le fichier.

## Photos sur les constats — dernier élément du circuit (lot 49, 28/08/2026)

- **Domaine** (operations/photos-constat.js) : validation pure — type image,
  12 Mo max, 6 photos max par constat, trierPhotos borne à la place restante.
  Éprouvé par sabotage.
- **Base** : table constat_photos (0158, org_id DEFAULT jwt_org()). Le FICHIER
  va dans le bucket privé `documents`, chemin **org/{org_id}/constats/...** —
  IMPÉRATIF pour passer la policy doc_ecriture_org (elle compare foldername[2]
  à jwt_org()). Un chemin sans ce préfixe échouerait en silence.
- **Écran** : composant réutilisable PhotosConstat.jsx (galerie + ajout + aperçu
  plein écran, URL signée 300 s). Branché au TERRAIN (RapportChantier, le chef
  d'équipe ajoute) et au BUREAU (RapportsDossier, gerer_planning ajoute/retire).
- Le circuit terrain→bureau est complet : pointage individuel, main-d'œuvre
  réelle, surcoût interne, constats facturables/non, ET photos.

## Centres = espaces de travail (Option A) — socle (lot 52, 28/08/2026)

Décision de Raphaël : un nouveau centre = un ESPACE de travail vierge, pas un
tri sur liste commune. Une seule société au-dessus (maison mère = vue d'ensemble
+ admin). Ce lot pose le socle :
- **Domaine** (centres.js) : `centreDeRattachement(espaceCourant, acteur, centres)`
  — le centre où RATTACHER une création selon l'espace ouvert. Le responsable
  dépôt crée TOUJOURS dans son centre (jamais ailleurs). `nomEspace` pour dire
  « vous êtes ici ». Éprouvé par sabotage.
- **Création rattachée** : creerAffaire/creerDossierVide acceptent `centreId` et
  le posent sur affaires.centre_id. nav.nouvelle (bureau) et ouvrirNouveau
  (terrain) rattachent à l'espace courant. Un centre neuf devient un vrai espace.
- **Sélecteur reframé** : « Espace de travail » (plus « Centre »/filtre). Le
  filtrage des lots 43/44 reste — un espace ne montre que ses dossiers.

**RESTE À FAIRE (prochain lot centres) :**
1. **Comptabilité** : y amener le tri/centres consolidé (SelecteurCentre +
   filtrerParCentre), maison mère voit tout ventilé par centre. Écran
   Comptabilite.jsx existe.
2. Planning : la création de mission doit aussi hériter du centre du dossier
   (à vérifier — la mission porte déjà centre_id, voir si l'héritage est auto).
3. Éventuel écran d'accueil « choisir un espace » si Raphaël le souhaite.

## Option A complété — planning + comptabilité (lot 53, 28/08/2026)

- **Planning** : la mission HÉRITE du centre de son affaire (migration 0159,
  cmd_creer_mission). Une mission d'un dossier d'Anvers vit dans le planning
  d'Anvers. Comble le trou du lot 52.
- **Comptabilité** (point 2 de la décision Raphaël) : ventilation par centre.
  facturesCanoniquesPeriode expose centre_id (via l'affaire). L'écran
  Comptabilite propose « Tous les centres » (consolidé, défaut), « Maison mère »,
  et chaque centre. Le filtre s'applique au récap, au verdict d'équilibre ET aux
  trois exports (CSV, journal, FEC).

Option A est désormais complet : espaces cloisonnés (dossiers/planning), création
rattachée à l'espace, missions héritées, et compta consolidée ventilable.

## Vague 1 lot A — l'échéance de paiement (29/08/2026)

- **Base** (0160) : cmd_emettre_facture pose echeance = date_emission +
  echeance_jours (réglage société, défaut prudent 30 j). Figée à l'émission avec
  le numéro. **On ne réécrit PAS les 16 factures déjà émises** — décision
  confirmée par Raphaël : on n'écrit pas le passé, on applique aux suivantes.
- **Domaine** : dateEcheance() pure et testée (doublon SQL). Piège Number(null)===0
  neutralisé — un réglage absent vaut 30 j, jamais 0. Éprouvé par sabotage.
- **Écran** : le PDF affiche « Émise le … / Échéance : … ». La fiche facture
  qualifie l'échéance sous le solde (« En retard depuis X jours » rouge, « Échoit
  dans X jours » ambre) — seulement si émise et non soldée.
- Reste de la vague 1 : lot B (communication/OGM stocké à l'émission — même
  défaut, l'OGM est calculé au PDF et jamais gardé), lot C (rapprochement), lot D
  (relances/mention légale/préfixe).

## Vague 1 lot B — la communication structurée (OGM) stockée (29/08/2026)

- **Base** (0161 + 0162) : fonction SQL ogm_structuree (équivalence JS↔SQL
  vérifiée), et cmd_emettre_facture pose `communication` à l'émission, figée avec
  le numéro. Réglage communication_structuree=true → OGM belge ; sinon → numéro
  de facture. Toujours STOCKÉE → rapprochement possible.
- **PDF** : lit facture.communication (repli calcul pour les anciennes). Libellé
  « Communication structurée » si +++…+++, « Communication » sinon.
- **UBL/Peppol** : bénéfice automatique — le PaymentID lit f.communication, enfin
  renseigné.
- **On ne réécrit pas les 16 factures passées.** Lot C (rapprochement) peut
  maintenant s'appuyer sur une communication stockée pour les factures à venir.

## Vague 1 lot C — le rapprochement des paiements (30/08/2026)

- **Domaine** (facturation/rapprochement.js) : decomposerOGM (inverse exact de
  genererOGM), cleDepuisCommunication (OGM OU numéro libre), rapprocherCommunication
  qui retrouve la facture par communication stockée, avec repli sur le numéro
  pour les anciennes factures. Refuse en cas d'ambiguïté ou de communication
  corrompue — ne devine jamais. Éprouvé par sabotage (2).
- **Écran** : OutilRapprochement dans la Comptabilité — coller la communication
  d'un virement reçu retrouve la facture, parmi celles de la période (travail
  local, aucune requête). Respecte le filtre par centre.
- La vague 1 (fermer la boucle de l'argent) a désormais : échéance (A),
  communication stockée (B), rapprochement (C). Reste le lot D (relances,
  mention légale, préfixe).

## Remarques R1 + R2 — centres : choix explicite et ressources cloisonnées (30/08/2026)

- **R1** : à la création, quand plusieurs centres existent, on DEMANDE l'espace
  (ChoixEspace) au lieu de rattacher silencieusement. Domaine espacesCreation
  (choixRequis si peutBasculer + >1 espace + au moins un centre). En MAISON MÈRE,
  la liste montre TOUS les dossiers avec le libellé de leur centre ; un centre ne
  voit que les siens.
- **R2** : ressourcesDuCentre(ressources, centreMission) — le planning ne propose
  que les membres/véhicules du centre de la mission, la maison mère restant un
  FONDS COMMUN mutualisé. Éprouvé par sabotage. Les ressources déjà affectées
  restent affichables pour pouvoir les retirer.
- Membres et véhicules portent centre_id ; missions héritent du centre (lot 53).
  Option A est désormais complète de bout en bout.

## Vague 1 lot D — relances, mention légale, préfixe (30/08/2026)

VAGUE 1 (boucle de l'argent) COMPLÈTE : A échéance, B communication, C
rapprochement, D ce lot.
- **Préfixe** (0163) : prefixe_numero prépendu au numéro à l'émission
  (« GG2026-000018 »). N'affecte PAS l'OGM (année+séquence). Ne touche jamais les
  numéros émis. decomposerNumero rendu tolérant au préfixe. ATTENTION : appliquer
  un préfixe en cours d'année mélange les formats → décision comptable.
- **Mention légale** : facturation(org).mention_legale imprimée sur le PDF si
  renseignée (au-dessus du pied). Sans elle, pas de recouvrement des intérêts.
- **Relances** (domaine relances.js : facturesARelancer/soldeFacture, purs et
  sabotés) : liste des factures échues non soldées dans la Comptabilité, triées
  par retard décroissant. On SIGNALE, rien n'est envoyé. Respecte le filtre par
  centre.

## Vague 2 lot E — fondations des fournitures (31/08/2026)

- **Base** (0164) : stock_articles.tva_pct (défaut 21, check 0–100) — sans taux,
  le moteur TVA refuse ; stock_mouvements.mission_id rendu nullable — vente au
  comptoir sans chantier. Tables vides, sans risque.
- **Domaine** (stocks/vente-fournitures.js) : articleVendable (refuse un taux
  ABSENT, jamais 0 % en douce — piège Number(null)), ligneVente (article →
  ligne de facture en centimes), composerVente. Purs, éprouvés par sabotage.
- Lot E = socle. Le lot F posera la vente effective + R12 (facture matériel
  jointe au déménagement OU séparée, deux factures pour un dossier).

## Vague 2 lot F — la vente rapide de fournitures (31/08/2026)

- **Base** (0165) : nature d'affaire « vente » (enum). L'affaire de vente est
  insérée directement en état « effectue » (facturable) — le garde d'état ne
  vise que les UPDATE.
- **Domaine** : nature « vente » dans NATURES, HORS ORDRE_MENU (entrée dédiée au
  menu). Aucune étape de parcours. Sabotée.
- **Adapters** : catalogueArticles (lecture stock_articles), venteRapide (crée
  l'affaire vente + émet la facture par le flux normal — numéro/échéance/
  communication de la vague 1). emettreFacture ÉTENDU : stocke désormais
  tva_pct/quantite/unite/prix_unitaire_centimes par ligne (une vente multi-taux
  garde son taux ; rétrocompatible pour le déménagement).
- **Écran** VenteRapide : lignes libres (nom, prix, TVA, quantité) pré-remplies
  du catalogue si présent, total en direct, interrupteur comptoir/livraison
  (adresse+date → ligne de note à 0 €). Entrée « Vente rapide » en tête du « + ».
- Couvre en partie R12 : la vente séparée existe ; la vente JOINTE à un
  déménagement (ajouter des fournitures à une facture de dossier) reste à poser.
- Ouvre P2 : la facture de vente consomme la MÊME séquence légale que les
  déménagements (choix assumé — une seule série ; à confirmer au comptable).

## R12 complété — fournitures JOINTES à la facture déménagement (lot G, 31/08/2026)

Évolution assumée d'une décision : les fournitures étaient strictement séparées
(commentaire dans lignesFacturePour). R12 en fait un CHOIX :
- **Séparée** : vente rapide depuis le « + » (lot F).
- **Jointe** (ce lot) : sur la facture d'un dossier, composant AjoutFournitures
  — « + Joindre des fournitures à cette facture ». Lignes au PRIX CLIENT (saisie
  libre ou catalogue stock_articles), chacune avec son taux de TVA, ajoutées aux
  lignes de prestation avant émission. Réutilise composerVente (lot E).
- Résout aussi le nœud « prix client » (le CATALOGUE_EMBALLAGE n'a que le coût) :
  on facture au prix client saisi, jamais au coût. Croise R3.
- lignesFacturePour reste inchangé (il exclut toujours les fournitures « auto ») ;
  l'ajout est explicite et volontaire côté écran.

## Emballage : source unique coût + prix client + TVA (31/08/2026)

Étape 1 du registre (90-PARAMETRES) : le catalogue « fournitures » est LA source.
- **Domaine** : normaliserArticle porte prix_client_centimes + tva_pct (défaut
  21) ; valoriserVenteEmballage (prix client) à côté de valoriserEmballage (coût).
- **Édition à UN endroit** : Catalogues → Fournitures (coût + prix client + TVA).
  Section orpheline du Barème retirée.
- **Lecteurs** : Matériel affiche coût + prix client + marge ; catalogueArticles
  (vente rapide, fournitures jointes) lit la source unique, plus stock_articles.
- **Migration 0166** : garnit l'existant (prix client = coût×1,6, TVA 21),
  idempotente, sans écraser.
- R3 et R12 reposent désormais sur une seule vérité.

## Interconnexion des fournitures — Matériel → Facture (31/08/2026)

- **Domaine** : fournituresAFacturer(emballage, catalogue) → lignes de facture au
  prix client depuis la conso E/U/R. Sabotée.
- **Facture** : section « Fournitures consommées sur le chantier » — proposition
  auto au prix client, ajout d'un geste. État séparé (consommeesAjoutees) des
  fournitures manuelles R12 (fournituresManuelles) pour éviter l'écrasement.
- **Matériel** : repère « ↪ proposées à la facturation ».
- Reste (documenté 90) : porter la prévision dans l'Estimation, et le montant
  fournitures réel dans le Calcul définitif (visibilité de bout en bout).
