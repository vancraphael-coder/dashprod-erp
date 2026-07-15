# Page 06 — Matériel d'emballage (Enlevé / Utilisé / Repris) — ABSENTE de Dashprod

Référence modèle : `chargementSec()` (l. ~907-925) + EMB (l. 104).
Dashprod : ❌ aucun écran. 🏗️ MAIS le domaine Stocks (Module 8) a déjà
`controleSolde` et `valoriserConsomme` — exactement cette logique E/U/R.

## Élément par élément

### 1. La grille E / U / R
- **Design** : tableau simple, une ligne par article, 3 colonnes de saisie
  numérique étroites : **Enl.** (enlevé du dépôt) / **Util.** (utilisé chez le
  client) / **Rep.** (repris au dépôt). Articles fixes : Carton standard ·
  Carton livre · Carton penderie · Tape · Rame papier · Papier bulle · Coins
  mousse.
- **Logique** : invariant métier `Utilisé + Repris ≤ Enlevé` (mon
  `controleSolde` le vérifie déjà). Le **Utilisé** a deux débouchés :
  1) l'offre — « Fourniture du matériel d'emballage (20 cartons standard…) »
  (page 05) ; 2) la valorisation du coût matériel réel
  (`valoriserConsomme` × prix unitaire du référentiel) qui peut nourrir le
  champ « Matériel » des coûts du devis, voire une ligne de facture.
- **Pourquoi** : le matériel qui part et ne revient pas est une fuite de marge
  invisible ; la saisie en 3 colonnes le rend traçable en 20 secondes par
  chantier, par le terrain lui-même.
- **Dashprod** : écran ❌ ; domaine ✅ ; table `stock_mouvements` ✅ (Module 8).
  Manque : rattacher les mouvements à l'AFFAIRE/MISSION (colonne
  `affaire_id`/`mission_id` sur les mouvements, ou jsonb `emballage` sur
  l'affaire en v1 simple, migration ultérieure vers les mouvements). **P1
  haut** — et prérequis du point « fournitures » de l'offre (page 05).

### 2. Intégration terrain
- Le modèle expose la même saisie côté terrain (page 11) : celui qui charge le
  camion remplit « Enlevé », celui qui décharge remplit « Repris ».
- **Dashprod** : la capacité `signaler_materiel` existe (S3) — l'écran terrain
  la portera. **P1** (avec page 11).

## Décision d'implémentation proposée
V1 pragmatique : jsonb `emballage` sur l'affaire `{std:{e,u,r}, livre:{…}, …}`
(zéro migration lourde, rendu immédiat sur l'offre) ; V2 : bascule vers de
vrais `stock_mouvements` liés mission pour la valorisation et l'inventaire
dépôt. Les deux utilisent le MÊME domaine de contrôle.

## Récap priorités page 06
| Élément | Priorité |
|---|---|
| Grille E/U/R par dossier (7 articles) | **P1 haut** |
| Alimentation « fournitures » de l'offre | **P1** (avec page 05) |
| Contrôle U+R ≤ E à la saisie (domaine prêt) | P1 |
| Valorisation coût matériel → devis | P2 |
| Saisie côté terrain | P1 (page 11) |
