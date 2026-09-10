# 17 — COÛTS DE STOCKAGE : CE QU'ON RÉDUIT MAINTENANT

Document vivant. Il ne traite que des coûts **récurrents par client**, ceux qui
grossissent tout seuls pendant dix ans. Les coûts fixes de production ne sont
pas ici.

---

## 1. Le constat de départ

Sur le client pilote, après deux mois d'usage réel :

| | volume |
|---|---|
| événements | 1 960 |
| affaires | 133 |
| clients | 131 |
| missions | 51 |
| factures | 28 (20 émises) |
| centres | 2 |
| membres | 5 |

**Rien de tout cela ne coûte quelque chose.** Ces volumes sont dérisoires pour
PostgreSQL — une table de deux mille lignes tient dans la mémoire cache du
serveur. Multipliés par cent clients et par dix ans, ils restent petits. Le
coût marginal de la base est proche de zéro et le restera longtemps.

Ce qui grossit vraiment, dans l'ordre :

1. **les photos de chantier** — le seul poste qui compte réellement ;
2. les PDF générés (devis, factures, rapports) ;
3. les pièces jointes de messages ;
4. la bande passante de relecture (une photo consultée dix fois se paie dix
   fois) ;
5. les sauvegardes, qui multiplient tout ce qui précède.

Les points 4 et 5 sont la raison pour laquelle alléger une photo rapporte
plusieurs fois : moins de stockage, moins de transfert à chaque consultation,
moins de sauvegarde.

---

## 2. Le levier immédiat : la résolution

Un téléphone courant produit une photo de **4032 × 3024 pixels**, pesant 2 à
4 Mo. Une photo de constat sert à montrer une rayure, un emballage, un état de
mur. **1600 px de côté suffisent** — sur un écran de téléphone comme dans un
PDF imprimé.

Ordre de grandeur, à qualité JPEG 0,85 :

| | poids |
|---|---|
| photo brute de téléphone | ~3 500 Ko |
| 1600 px recompressée | ~250 Ko |

**Facteur 14.** Sur un chantier à trente photos : 105 Mo qui deviennent 7,5 Mo.

### Ce qui n'allait pas

`apps/web/src/lib/image.js` faisait déjà ce travail — mais un laissez-passer le
court-circuitait dans le cas le plus fréquent :

    if (dejaAffichable(file.type) && file.size <= 4 * 1024 * 1024) return file;

Tout JPEG sous 4 Mo partait **brut**. Or c'est le poids de la quasi-totalité
des photos de téléphone : le chemin d'optimisation ne servait donc qu'aux HEIC
et aux fichiers énormes, c'est-à-dire presque jamais. Le seuil est descendu à
**400 Ko** — en dessous, ré-encoder ne rapporte rien et dégraderait pour rien.

Corrigé aussi au passage : `createImageBitmap` est appelé avec
`imageOrientation: "from-image"` explicite. Sans ça, une photo prise en
portrait peut ressortir couchée — et ce défaut ne se voit qu'après coup, sur
une preuve qu'on ne peut plus reprendre.

---

## 3. Le levier qui compte encore plus : les métadonnées

Une photo de téléphone embarque de l'EXIF : modèle d'appareil, date, réglages,
et **très souvent les coordonnées GPS du lieu de prise de vue**.

Déposer la photo brute d'un salon, c'est stocker **la position exacte du
domicile d'un client** dans l'ERP. Personne ne l'a demandée. Aucun traitement
n'en a besoin. Elle ne figure dans aucune finalité.

Ce n'est donc pas d'abord une question de poids — l'EXIF pèse quelques dizaines
de kilo-octets. C'est une question de **minimisation des données** au sens du
RGPD, et ça relève directement de la question P6 : l'exploitant de la
plateforme est sous-traitant, et un sous-traitant qui collecte plus que
nécessaire engage sa responsabilité même sans l'avoir voulu.

**La bonne nouvelle : c'est gratuit.** Le ré-encodage par canvas ne recopie
aucune métadonnée — elles disparaissent sans qu'il faille les traquer champ par
champ. Et l'opération a lieu **avant l'envoi** : la donnée inutile ne quitte
même pas l'appareil.

Le même geste règle donc deux problèmes de nature différente. C'est rare, ça
vaut la peine de le noter.

---

## 4. Ce qu'on ne touche PAS, et pourquoi

**Les pièces jointes de messages.** `televerserPieceMessage` calcule une
empreinte SHA-256 qui entre dans le hash du message — registre probant. Ces
fichiers doivent rester **bit pour bit** ce que l'expéditeur a envoyé.
Recompresser une pièce reçue détruirait la seule chose qui en fait une preuve :
la possibilité de démontrer qu'elle n'a pas bougé. On paie le stockage, et
c'est le bon choix.

**Les PDF.** Un devis signé, une facture, un rapport : ce sont des pièces
comptables et probantes. Elles se conservent telles quelles, sur la durée
légale. Un PDF de facture pèse quelques centaines de kilo-octets ; cinq cents
PDF font 250 Mo, ce qui est insignifiant. Il n'y a rien à optimiser ici, et
beaucoup à perdre.

**Les événements.** Deux mille lignes de journal ne coûtent rien, et c'est la
donnée qu'une société doit pouvoir tracer — décision produit arrêtée : le
journal n'est jamais verrouillé. Purger des événements pour économiser
quelques kilo-octets serait détruire de la valeur pour rien.

La règle générale : **on optimise ce que Dashprod PRODUIT, jamais ce qu'il
REÇOIT.** Une photo de constat, c'est nous qui la fabriquons — on choisit sa
résolution. Une pièce jointe, c'est le client qui l'envoie — on n'y touche pas.

---

## 5. Les leviers suivants, dans l'ordre où ils rapporteront

Non faits. Listés pour ne pas les redécouvrir.

1. **Vignettes.** Une liste de trente photos charge trente photos pleines.
   Générer une vignette de 300 px à l'upload et l'afficher dans les listes
   divise la bande passante de relecture par dix, sans toucher à l'original.
   C'est le levier le plus rentable après la résolution, parce qu'il agit sur
   un coût qui se répète à chaque consultation.
2. **Déduplication.** L'empreinte SHA-256 est déjà calculée et déjà dans le
   chemin de stockage. Deux dépôts du même fichier écrivent donc au même
   endroit — la déduplication existe de fait. À vérifier plutôt qu'à
   construire.
3. **Cycle de vie du stockage.** Une photo de chantier de trois ans se
   consulte une fois par an. Un stockage à accès différé coûte une fraction
   du stockage chaud. À instruire quand le volume le justifiera, pas avant :
   la complexité se paie tout de suite, l'économie plus tard.
4. **Purge des brouillons.** Huit factures en brouillon sur vingt-huit. Un
   brouillon jamais émis, vieux de deux ans, n'est ni une pièce comptable ni
   une donnée utile. À trancher comme décision produit, pas comme
   optimisation.

---

## 6. Le vrai coût, celui qu'aucune compression ne réduit

Une société qui paie 360 € par mois et demande **trente minutes** de support :
excellent. Deux heures : encore bon. Dix heures : le produit devient une
prestation de service, et la marge disparaît.

Le poste de coût dominant de Dashprod n'est pas le stockage — c'est le temps de
son unique développeur. L'objectif d'architecture qui en découle :

> qu'une société puisse accumuler énormément de données sans exiger
> énormément de temps humain.

Cela vaut plus que n'importe quelle économie de kilo-octets, et cela oriente
les choix : un écran qui évite un appel téléphonique rapporte davantage qu'une
photo compressée. Les deux se font — mais dans cet ordre de priorité.
