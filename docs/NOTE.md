# Lot 14 — permis membres + dérogation d'architecture levée

`npm test` : **938/938 ✓** — build `apps/web` ✓ — 11 fichiers.
Migration **0137** déjà appliquée en live. Se pose par-dessus `dashprod-lot-13`.

## 1. Les permis — signaler, jamais bloquer

Dashprod savait quel permis un VÉHICULE exige, rien de ce que les MEMBRES
possèdent. On ne pouvait donc pas signaler qu'un chauffeur n'a pas le permis du
camion affecté. Tu voulais que ça **signale** — c'est fait, jamais bloquant,
comme les conflits de disponibilité.

**En base (0137)** : `utilisateurs.permis_detenus` (les catégories que le
membre possède) et `code95_echeance`. Commande `cmd_definir_permis` réservée au
bureau, cloisonnée, tracée, qui filtre les catégories inconnues. Éprouvée en
rollback avant livraison.

**Pas l'aptitude médicale groupe 2** : c'est de la donnée de santé. Elle mérite
sa propre décision RGPD (consentement, base légale, durée). Le signalement de
base fonctionne sans — on ne l'embarque pas à la légère.

**La règle (domaine, pure)** : `permisConduite(vehicule, membre, date)`.
- **les permis s'emboîtent** : un CE conduit tout ; ne comparer que l'égalité
  crierait à tort sur un fourgon confié à un titulaire du CE ;
- **deux signaux distincts** : permis absent vs code 95 expiré — deux actions
  différentes (passer un permis / renouveler une formation) ;
- **une échéance absente n'est pas expirée** : on ne crie pas sur ce qu'on
  ignore.

**Où ça se voit** : sur la carte de date, le jeton d'un membre affecté se
teinte s'il n'a pas le permis d'un véhicule affecté à la même mission — au
moment du clic, jamais désactivé. Édition dans la fiche membre (Ressources →
Membres), avec l'échéance code 95 qui s'alarme si elle approche.

## 2. La dérogation d'architecture, levée

C'était la dette laissée depuis le lot 10 : `adaptateur.js` (plomberie
horizontale) importait `releve/volumetrie.js` (déménagement) en direct.

**La sortie** : un **aiguillage de composition**, `releve/rubriques-offre.js`,
qui choisit les rubriques d'un document selon la nature — exactement comme
`chiffrerAffaire` choisit le moteur de prix. Le composeur d'offre reçoit un
objet déjà prêt et le fusionne, sans importer aucun module de métier.

Ça a demandé de distinguer **deux familles d'aiguillage** dans le test :
- *chiffrage* (`scenario-nature.js`) importe lift + sous-traitance → reste
  interne au domaine, la plomberie ne peut pas l'appeler ;
- *composition* (`rubriques-offre.js`) n'importe qu'un métier → la plomberie
  PEUT l'appeler.

Le premier jet passait par l'aiguillage de chiffrage — **le test l'a refusé, à
juste titre** : ça faisait rentrer lift et sous-traitance dans la plomberie. Le
cliquet a été vérifié : il rougit toujours sur un import métier direct ET sur
l'aiguillage de chiffrage, il n'autorise que la composition.

**Plus aucune dérogation dans `architecture.js`.** La liste est vide, et le
test refuse qu'on en rouvre une inutile.

## Le CMR reste bloqué sur tes décisions

Je ne l'ai pas touché — un document réglementaire à 24 cases ne se devine pas.
Rappel du cadre déjà établi : la CMR **exclut le déménagement** (art. 1er §4),
donc le module ne vaut que pour la **sous-traitance internationale** ; la
Belgique n'a pas ratifié l'e-CMR, donc **papier obligatoire** (Dashprod génère
et imprime, 3 exemplaires signés) ; la case 6.1.k sera en dur (seule omission
sanctionnée). Trois questions avant que je code : périmètre exact + blocage sur
déménagement, numérotation (série propre ou carnet Roovers), poids brut (saisi
ou par article).

## À vérifier à l'œil

1. Ressources → Membres → un membre : cocher B, C ; poser une échéance code 95
   passée → l'alerte « expiré » s'affiche.
2. Dossier → carte de date : affecter un camion « permis C » et un membre qui
   n'a que B → son jeton se teinte, avec « permis C requis ». Le jeton reste
   cliquable.
3. Générer une offre de déménagement : le volume et les articles à démonter
   apparaissent toujours (rien cassé par le passage via l'aiguillage).
