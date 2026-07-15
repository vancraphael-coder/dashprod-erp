# Page 04 — Devis (prix client + coûts réels)

Référence modèle : `devisSec()` (l. ~703-790).
Écran Dashprod actuel : `Devis.jsx` + domaine `chiffrage/*` (ADR-008).

## Élément par élément

### 1. Carte Marge (en tête, toujours visible)
- **Design** : « MARGE BRUTE » en légende ; **marge en € (gros, 24) + % **,
  tous deux colorés par zone ; badge « Dans la cible » (vert) / « Premium »
  (indigo) / « Sous la cible » (rouge) ; **barre de position** : bande verte
  translucide = cible 25-45 % sur une échelle 0-70, curseur plein = marge
  actuelle ; dessous : « HTVA X · Coûts −Y ».
- **Logique** : recalcul continu à chaque frappe. Zones = TARGET {25,45}
  (identiques à mon ADR-008 : `zoneMarge`).
- **Pourquoi** : le devis se pilote À LA MARGE, pas au prix. L'œil doit voir la
  zone avant le montant.
- **Dashprod** : 🟡 marge % + zone colorée ✅ (domaine). **Marge en € ❌ →
  P0 (trivial)**. Barre de position ❌ → P2. « HTVA · Coûts » en sous-titre
  ❌ → P1.

### 2. Bascule Tarif horaire / Forfait
- **Design** : segmented control 2 positions (fond gris, actif blanc ombré).
- **Logique modèle** : horaire → recette = heures × prixHTVAh + monte-meubles −
  réduction ; forfait → HTVA = forfaitTVAC / 1,21. (Le modèle n'a PAS de
  formule « emballage » côté prix — l'emballage y est du matériel fourni.)
- **Dashprod** : 🟡 trois formules (tarifaire/emballage/forfait, ADR-008).
  Garder les trois (l'emballage facturé 75 €/h + 0,75 €/km est une prestation
  réelle validée), mais présenter en segmented control. **P1** (design).

### 3. Barème « toucher pour appliquer »
- **Design** : liste verticale de 5 lignes — badge « 3 dém. + camion » à
  gauche, « 130 € /h » à droite — la ligne active en bleu clair bordé.
- **Logique** : toucher applique `prixHTVAh` ET `nbDem` d'un coup.
- **Pourquoi** : zéro saisie, zéro erreur de prix — le barème EST l'interface.
- **Dashprod** : ✅ équivalent (barème ADR-008 identique : 85/130/170/215/255).
  Vérifier que le tap règle aussi nbDem. **OK / P2 polish**.

### 4. Heures facturées + Monte-meubles
- **Design** : deux champs côte à côte ; monte-meubles = select « Non / 125 €
  / jour ».
- **⚠ Divergence** : modèle **125 €/jour** vs ADR-008 validé **150 € forfait**.
  → Je garde 150 sauf contrordre (synthèse §1). **Décision Raphaël.**
- **Dashprod** : ✅ heures + élévateur 150. RAS hors décision.

### 5. Réduction (% + motif)
- **Design** : encadré gris « Réduction » : % + select Motif (Promotion /
  Dégâts-geste) ; badge du montant déduit (ambre si promo, ROUGE si dégâts).
- **Logique** : remise = % × (recette + monte-meubles), avant TVA. Le motif
  s'imprime sur l'offre (« Réduction (geste commercial) −10 % appliquée »).
- **Pourquoi** : distinguer le commercial (promo) du correctif (dégâts) —
  deux réalités comptables et relationnelles différentes.
- **Dashprod** : ❌ entièrement. → moteur : `reductionPct` + `reductionType`
  dans les faits, appliqué dans `calculerScenario` ; écran : encadré. **P1**.

### 6. Totaux
- **Design** : HTVA / TVA 21 % / **TVAC en bleu**, séparés par filets.
- **Dashprod** : ✅ (centimes, domaine monnaie). RAS.

### 7. Coûts réels — CONFIDENTIEL
- **Design** : carte titrée « Coûts réels — confidentiel ».
  **Main-d'œuvre multi-lignes** : chaque ligne = Heures × Taux €/h (défaut 32)
  + bouton supprimer ; « Ajouter une ligne d'heures » ; total MO affiché.
  Puis grille : Carburant, Matériel, **Divers**, **Péages** (hint « du
  trajet »). Ligne « Coût trajet (km × prix/km) » si renseigné (page 02).
  Total coûts en rouge.
- **Logique** : MO = Σ(h×taux) — permet 4 h à 32 € + 2 h à 38 € (chef). Coûts
  = MO + carburant + matériel + divers + péages + km×prixKm. C'est la moitié
  « réalité » de la marge.
- **Pourquoi le multi-lignes** : une équipe n'a pas UN taux ; sans ça la marge
  affichée ment de 5-10 points.
- **Pourquoi « confidentiel »** : cette carte ne doit JAMAIS apparaître à un
  œil terrain/client.
- **Dashprod** : 🟡 carburant + matériel + MO **mono-champ €** ✅.
  Multi-lignes h×taux ❌ (domaine `coutEquipeCentimes` sait déjà faire !) →
  **P1**. Divers ❌, Péages ❌ → **P0** (deux champs, la marge réelle en
  dépend). Coût trajet auto ❌ → P1 (avec page 02).
  **Masquage par capacité `voir_prix` : ❌ à l'écran alors que le domaine
  l'exige → P0** (aujourd'hui l'écran Devis s'affiche pareil pour tous ;
  conditionner la carte coûts + la marge à `voir_prix`).

## Récap priorités page 04
| Élément | Priorité |
|---|---|
| Marge en € à côté du % | **P0** |
| Champs Divers + Péages | **P0** |
| Masquage coûts/marge sans `voir_prix` | **P0** |
| Réduction % + motif (promo/dégâts) → offre | P1 |
| MO multi-lignes (h × taux) | P1 |
| Coût trajet auto (km × prix/km) | P1 (page 02) |
| Segmented control + sous-titre HTVA/Coûts | P1-P2 |
| Barre de position de marge | P2 |
| Monte-meubles 125/j vs 150 forfait | **Décision** |
