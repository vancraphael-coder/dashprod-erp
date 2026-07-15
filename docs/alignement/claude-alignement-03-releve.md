# Page 03 — Relevé volumétrique

Référence modèle : `releveSec()` (l. ~633-700).
Écran Dashprod actuel : `Releve.jsx` + domaine `releve/volumetrie.js`.

## Élément par élément

### 1. Carte héro (volume total)
- **Design** : carte sombre (dégradé navy), volume en très gros « 12.4 m³ »,
  et deux compteurs à droite : **Articles** (somme des quantités) et
  **Camions** (estimation).
- **Logique modèle** : camions estimés = volume / **30** m³. ⚠ Mon domaine
  actuel (`suggererComposition`) divise par **12** — divergence à trancher
  (synthèse §2). La bonne réponse durable : la capacité RÉELLE des camions
  sélectionnés ; l'estimation fixe n'est qu'un défaut avant sélection.
- **Pourquoi** : le volume est LE chiffre du relevé ; il doit dominer l'écran.
- **Dashprod** : 🟡 volume total + suggestion affichés sobrement. Héro sombre =
  design **P2** ; alignement du diviseur = **P1** (décision).

### 2. Jauge de capacité camions
- **Design** : carte « Capacité camions » : « 12.4 / 20 m³ », barre de
  remplissage (vert ≤85 %, ambre ≤100 %, rouge au-delà avec libellé
  « surchargé »), noms des camions sélectionnés.
- **Logique** : capacité = somme des `vol` des camions cochés sur le dossier.
  N'apparaît que si au moins un camion est sélectionné.
- **Pourquoi** : évite le classique « tout ne rentre pas » découvert le jour J.
- **Dashprod** : ❌ — dépend de la sélection de camions (page 02/10). Le calcul
  est trivial une fois les camions là. **P1**.

### 3. Ajout rapide par pièce
- **Design** : chips de pièces (actif = navy plein), puis boutons meubles du
  catalogue de la pièce « + Canapé 3pl », et **un champ libre « Autre
  meuble… » + bouton Ajouter** (Enter valide aussi).
- **Logique** : l'article libre prend le volume par défaut (0,3 m³), ajustable
  ensuite. Le catalogue du modèle (`QUICK`) diffère légèrement du mien
  (Chambre : + Sommier/Matelas ; Bureau : « Chaise bureau », « Caisson » ;
  Cave : « Étagère métal » ; Autre : « Plante ») — aligner les listes.
- **Pourquoi** : un relevé réel contient TOUJOURS des objets hors catalogue
  (aquarium, billard…). Sans champ libre, l'outil est inutilisable sur place.
- **Dashprod** : 🟡 pièces + catalogue ✅. **Champ libre ❌ → P0.**
  Alignement du catalogue : P2.

### 4. Ligne d'inventaire (l'unité de travail)
- **Design** : nom + pièce en petit ; **volume ajustable** « − 1.20 m³ + » par
  pas de 0,1 (affiché = volume unitaire × quantité) ; **bouton clé à molette =
  démontage** (toggle, la ligne passe en bleu clair) ; quantité − N + ;
  poubelle. En tête de carte : « Tout démonter » (toggle global).
- **Logique** : le volume saisi à la main PRIME sur le volume de référence
  (déjà le cas dans mon domaine via `it.vol`). Le drapeau `demont` alimente :
  l'offre (« Démontage/remontage prévu : 1× Armoire 3p · … »), la vue terrain
  (« À démonter »), et le brief WhatsApp (« (démontage) » après l'article).
- **Pourquoi** : le démontage est LA variable d'heures la plus sous-estimée ;
  la tracer article par article protège la marge et briefe l'équipe.
- **Dashprod** : 🟡 quantités ✅, suppression ✅, regroupement par pièce ✅.
  **Volume ajustable à l'écran ❌ (domaine ✅ prêt) → P1.**
  **Démontage ❌ (par article + tout démonter) → P0** (nourrit pages 05 et 11).

### 5. Répartition par pièce (barres)
- **Design** : sous l'inventaire, une barre horizontale par pièce (dégradé
  bleu→indigo), largeur relative au max, volume à droite.
- **Pourquoi** : lecture instantanée « c'est le salon qui pèse ».
- **Dashprod** : 🟡 sous-totaux par pièce en texte ✅ ; barres ❌. **P2**.

## Notes d'implémentation Dashprod
- Démontage : champ `demont: boolean` dans les lignes du jsonb `releve` (aucune
  migration : jsonb). Exposer `articlesADemonter(inventaire)` dans le domaine
  (une ligne) pour l'offre/terrain — une seule implémentation.
- Article libre : input + volumeUnitaire fallback déjà géré (0,3 par défaut).
- Volume ajustable : boutons ±0,1 écrivant `vol` sur la ligne (le domaine
  `volumeTotal` le respecte déjà).
- Jauge capacité : `capaciteFlotte(camionsSelectionnes)` côté domaine véhicules.

## Récap priorités page 03
| Élément | Priorité |
|---|---|
| Champ « Autre meuble » (article libre) | **P0** |
| Démontage par article + « Tout démonter » | **P0** |
| Volume ajustable par article (UI) | P1 |
| Jauge capacité camions vs volume | P1 (dépend camions) |
| Alignement estimation camions (30 vs 12 vs réel) | P1 (décision) |
| Carte héro sombre + barres par pièce | P2 |
