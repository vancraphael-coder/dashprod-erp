# Page 01 — Liste des dossiers (Bureau)

Référence modèle : `listView()` (l. 465-508) + en-tête sticky.
Écran Dashprod actuel : `ListeAffaires.jsx`.

## Élément par élément

### 1. En-tête sticky avec identité et CA signé
- **Design** : bandeau collant en haut : logo camion dans un carré dégradé bleu,
  « Roovers / Carnet de dossiers », et à droite le **CA signé** en vert
  (gros, Fira Code) avec sa légende, + bouton « Accueil ».
- **Logique** : CA signé = somme des TVAC calculés (`compute(x).tvac`) des
  dossiers **non archivés** aux statuts confirmé/en cours/effectué.
- **Pourquoi** : le patron voit d'un coup d'œil le carnet de commandes engagé —
  c'est SON indicateur quotidien, pas le CA facturé.
- **Dashprod** : ✅ CA signé présent (module Pilotage `caSigne`, mêmes états).
  🟡 Pas de logo/en-tête sticky travaillé. **P2** (design).

### 2. Recherche
- **Design** : champ avec icône loupe, placeholder « Rechercher un client, une
  adresse… ».
- **Logique** : filtre sur `nom + adresse chargement + adresse déchargement`
  (insensible à la casse).
- **Pourquoi** : au téléphone, le client donne parfois une adresse, pas son nom.
- **Dashprod** : 🟡 recherche sur le nom uniquement. → étendre aux adresses
  (jointure `affaire_adresses`). **P1**.

### 3. Filtres par statut (chips horizontales)
- **Design** : Tous · Devis · Confirmés · En cours · Effectués · **Archivés** —
  pilule active bleue pleine.
- **Logique** : `archive` est un drapeau séparé du statut (un dossier archivé
  sort de toutes les vues sauf « Archivés »). « Annulé » existe comme statut
  mais n'a pas de chip (accessible via Tous).
- **Pourquoi** : l'archivage nettoie la vue quotidienne sans rien supprimer.
- **Dashprod** : 🟡 filtres par état domaine (brouillon/devis/confirmé/…) mais
  **pas d'archivage** (❌) ni de chip « En cours ». → Archivage = colonne
  `archive boolean` + bouton dans le Dossier. **P1**. « En cours » : voir
  synthèse §3 — dériver de la mission du jour, pas un nouvel état. **P2**.

### 4. Carte de dossier
- **Design** : nom en Fira Code gras 15.5 ; dessous en petit : **date du
  déménagement en toutes lettres** (« vendredi 4 juillet ») ou « Date à
  définir » + « X affectés » (ou « X dém. » prévus si personne d'affecté).
  À droite : badge « À valider » (violet, si dossier terrain) + badge statut.
  Deux lignes d'adresses avec icônes (camion = chargement, carte =
  déchargement), tronquées à la première virgule. Pied de carte séparé par un
  filet : **TVAC** à gauche, **Marge € + %** à droite, colorée selon la zone
  (rouge <25 %, vert 25-45 %, indigo >45 %).
- **Logique** : tout est recalculé à l'affichage par `compute(x)` — jamais de
  montant stocké périmé. Les dossiers « pending » (créés au terrain) ont une
  bordure pointillée violette et une opacité réduite.
- **Pourquoi** : UNE carte répond aux trois questions du bureau : c'est quand ?
  c'est où ? ça rapporte combien ? La marge colorée attire l'œil sur les
  dossiers sous la cible AVANT la signature.
- **Dashprod** : 🟡. Présents : nom, tel, TVAC, marge % colorée par zone
  (domaine `zoneMarge`). Manquants :
  - **date du déménagement** sur la carte (❌ → `date_souhaitee` existe depuis
    0019, il suffit de l'afficher + format long FR). **P0**.
  - **tri par date de déménagement** (aujourd'hui : date de création desc).
    Le bureau vit dans l'ordre chronologique des chantiers. **P0**.
  - adresses (chargement/déchargement, 1re ligne) (❌). **P1**.
  - marge en **€** en plus du % (❌, trivial : le domaine la calcule). **P1**.
  - nb affectés / prévus (❌ → jointure missions). **P1**.
  - badge « À valider » (lié au mode terrain, page 11). **P1**.

### 5. Bouton « + » de création
- **Design** : dans le modèle, la création est un bouton d'en-tête (bureau) ou
  le « + » central violet (terrain).
- **Dashprod** : ✅ bouton « + Nouveau dossier ».

### 6. État vide
- **Design** : icône dossier grisée + « Aucun dossier ici. »
- **Dashprod** : ✅ équivalent.

## Notes d'implémentation Dashprod
- Date + tri : `listerAffaires()` sélectionne déjà l'affaire — ajouter
  `date_souhaitee` au select, trier `order("date_souhaitee")` nulls last,
  formatteur `fmtL` dans `theme.jsx` (réutilisé partout ensuite).
- Adresses sur carte : soit jointure `affaire_adresses(sens=chargement,ordre=1)`,
  soit vue SQL dédiée `v_affaires_liste` (plus propre, une requête).
- Archive : migration `affaires.archive boolean default false` + chip + toggle.

## Récap priorités page 01
| Élément | Priorité |
|---|---|
| Date de déménagement affichée + format long | **P0** |
| Tri par date de déménagement | **P0** |
| Adresses sur la carte | P1 |
| Marge en € | P1 |
| Recherche par adresse | P1 |
| Archivage (drapeau + chip) | P1 |
| Nb affectés/prévus | P1 |
| Badge « À valider » (terrain) | P1 (avec page 11) |
| En-tête riche, chip « En cours » | P2 |
