# Lot 10d — Cartes de date, et la Bille enfin visible

Migrations **0132–0133**. `npm test` : **872/872 ✓** — build : **✓ (211 modules)**.

## Tu avais raison : la bille n'était nulle part

Je l'avais mise dans les volets d'affectation — qui ne s'affichent **que si le
dossier a déjà des missions en base**, donc seulement après confirmation. Sur
un dossier en cours de saisie, l'écran ne montrait rien. Techniquement
intégrée, pratiquement invisible.

Ta phrase donnait la solution : **c'est la section des dates** qui doit porter
ces cartes. Chaque date est maintenant une carte avec :

- une **bille en taille bouton** (44 px) — assez grande pour être le repère de
  la carte et pour que son suivi 3D se voie
- la date et l'heure
- un **volet « Qui la fait »** avec chevron en bille, qui pivote à l'ouverture
- l'équipe et les véhicules, filtrés par catégorie selon le type
- un **avertissement en bille** quand il manque quelque chose

Le liseré de la carte reprend la couleur du voyant. Sans date posée, la bille
reste grise avec un « + » et **aucune équipe n'est réclamée** — demander qui
travaille un jour qui n'existe pas serait du bruit.

**L'affectation existe désormais avant la confirmation** (`affaires.affectations`,
migration 0132), parce que c'est au moment où l'on pose une date qu'on pense à
l'équipe. À la confirmation, **chaque mission reçoit SA prévision** — plus
seulement le déménagement. Repli sur `affaires.equipe`/`camions` pour les
dossiers d'avant, sinon leur équipe serait perdue.

Le libellé de la date principale suit le métier : « Déménagement », mais
« Intervention lift », « Livraison » pour la sous-traitance. « Date souhaitée »
ne dit rien pour un lift.

---

## Tes trois autres points : ce que j'ai compris, et ce qui me bloque

### Zone → événements, pas adresses

Tu décris une **zone événement**, de deux sortes :

- **avec livraison** → adresse(s), membre(s), camion(s), **coût trajet**, **CMR**
- **entreposage** → m³, **multiples par client**

C'est une refonte de la zone, pas un ajustement : il faut une table
`zone_evenements` avec ces deux formes, le CMR comme document, et le coût de
trajet dans le chiffrage. C'est un lot à part entière (lot 14).

**Ce que je ne sais pas encore :** un CMR est un document de transport
réglementaire (lettre de voiture CMR). Faut-il le **générer** depuis Dashprod,
ou seulement **attacher** celui du donneur d'ordre ? Les deux sont légitimes et
ne coûtent pas le même travail.

### Boxe et lift → grille « par exactitude »

Tu écris : *pas par tranches (ou couronne → lift aussi) mais par exactitude*.

Je le lis comme : **le prix se règle au m³ exact** (12 €/m³ → 7 m³ = 84 €)
plutôt que par paliers, et **au km exact** pour le lift.

Mais tu avais confirmé les couronnes il y a peu (« la couronne est bonne »), et
je ne vais pas défaire un modèle validé sur une lecture. **Ma proposition :
garder les deux modes, au choix de l'entreprise** — `paliers` ou `exact`. Un
garde-meubles à la Shurgard vend au m³ exact ; un déménageur local préfère
souvent trois paliers lisibles.

Confirme-moi : **remplacer** les paliers, ou **ajouter** le mode exact ?

### L'arborescence CORE / MÉTIERS

Ton schéma décrit ce que devrait devenir `packages/domaine` : un **noyau**
(CRM, Finance, Ops) et des **métiers** (Déménagement, Transport, Maintenance)
qui s'appuient dessus.

Aujourd'hui c'est déjà à moitié le cas — `crm/`, `chiffrage/`, `planning/`,
`stocks/` sont des dossiers du noyau, et `commercial/natures.js` porte les
métiers. Ce qui manque, c'est la **frontière explicite** : rien n'empêche
aujourd'hui un module de noyau d'importer un module métier, ce qui finirait par
rendre le noyau inutilisable sans le déménagement.

C'est un travail de structure, à faire **avant** que les métiers grossissent —
donc avant le lot 14. Il tient en deux choses : déplacer les fichiers en
`noyau/` et `metiers/`, et **un test qui refuse toute importation du noyau vers
un métier**. C'est ce test qui fait tenir l'architecture, pas l'arborescence.

Dis-moi si je passe par là avant la zone.

---

## Reste du lot 10

⚠️ Le **backfill des affaires déjà confirmées** n'est toujours pas fait.
