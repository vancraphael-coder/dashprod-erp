# Page 10 — Équipe & Flotte (hub Ressources)

Référence modèle : `equipeView()` + `hommesSub` + `memberCard` + `camionsSub` +
`truckCard` + `heuresSub` (l. ~1022-1300) + seeds (l. 129-152).
Écran Dashprod actuel : `Equipe.jsx` (invitations OAuth uniquement).

**Le plus gros chantier en volume — mais le domaine Dashprod (Module 8 :
congés, paie isolée, véhicules, échéances) couvre déjà l'essentiel de la
logique. C'est de l'écran.**

## Structure générale
- **Design** : en-tête « Ressources — X hommes · Y camions », 3 onglets
  segmentés : **Hommes / Camions / Heures**.
- **Dashprod** : ❌ tout ; l'écran actuel ne fait que les invitations (à
  CONSERVER comme sous-partie « accès » des fiches).

## Onglet HOMMES

### 1. Disponibilités aujourd'hui
- **Design** : badges verts (dispo) / rouges « nom · congé ».
- **Logique** : congé si aujourd'hui ∈ [from,to]. **Dashprod** : table
  `conges` ✅ (Module 8) → **P1**.

### 2. Carte « À traiter » (alertes agrégées)
- **Design** : carte ambre listant (a) « Remplacements demandés (N) » —
  chaque équipement marqué « à remplacer » par un membre ; (b) « Documents à
  régler (N) » — non scanné, expiré, ou ≤30 j.
- **Pourquoi** : la boîte de réception RH du patron — rien ne se perd entre
  deux chantiers.
- **Dashprod** : ❌ ; domaine `qualifierEcheance` ✅ (même logique que `dStat` :
  Expiré / ≤30 j ambre / Valide). **P1**.

### 3. Fiche membre (expandable) — le cœur
- **Design** : ligne repliée = avatar, nom, badge MÉTIER (Chef d'équipe
  indigo / Chauffeur bleu / Déménageur gris), taux €/h (masqué en vue
  terrain), badge « devis » si canQuote, badge rouge « N à remplacer ».
  Dépliée :
  - Nom, **Métier** (select), Téléphone.
  - Switch **Actif** (dispo pour affectation).
  - Switch **« Peut créer des devis (terrain) »**.
  - **Rémunération** (encadré, MASQUÉ terrain) : Taux €/h + Contrat
    (CDI/CDD/Intérim/Sous-traitant/Étudiant).
  - **Équipement** : 2 groupes — Vêtements (gants, veste, pull, polo,
    t-shirt, pantalon, short, chaussures sécurité) et Outils (visseuse,
    chargeur, embouts, tournevis, marteau, clé) ; par item : select d'état
    (neuf/bon/usé/à remplacer, coloré) + bouton « Remplacer » (demande rouge
    qui remonte dans « À traiter »).
  - **Documents légaux** : CI (échéance), Permis (échéance), Contrat,
    Visite médicale (échéance) ; toggle « Scanné » + date d'échéance + badge
    dStat. Note : le fichier lui-même = stockage backend (Supabase Storage).
  - **Congés** : liste from→to supprimable + ajout (2 dates + bouton).
  - « Retirer de l'équipe » (danger, masqué terrain).
- **Correspondances Dashprod** :
  - Métier ≠ rôle S3 (synthèse §4) → colonne `metier` sur `utilisateurs`. **P1.**
  - Taux/contrat → table `donnees_paie` ✅ ISOLÉE derrière `voir_paie` —
    NOTRE version du « masqué terrain », en mieux (RLS, pas du CSS). Écran **P1**.
  - canQuote → capacité `creer_affaire` S3 ✅ (rien à inventer : cocher =
    affecter un rôle/capacité). **P1.**
  - Équipement → nouveau : table `equipements_membre` (membre, item, etat,
    remplacer) — pas couvert par Stocks (qui gère le consommable). **P1.**
  - Documents → table `documents_rh` (type, echeance, scan bool, fichier_ref
    Storage) + `qualifierEcheance` ✅. **P1.**
  - Congés → table `conges` ✅ + workflow approbation ✅ (Dashprod a MIEUX :
    demande/approbation ; le modèle saisit direct — garder le workflow, offrir
    la saisie directe par la direction). **P1.**
- **Priorité globale fiche** : **P1** (bloc par bloc : congés d'abord — ils
  nourrissent le planning — puis métier/taux, puis équipement/docs).

## Onglet CAMIONS — P0 minimal, P1 complet

### 4. Fiche camion
- **Design** : ligne = icône (rouge si urgent), nom, « Fourgon · 20 m³ ·
  1-ABC-123 », badges : état méca (OK vert / À surveiller ambre / URGENT
  rouge), « CT · Valide/expiré/Xj », « Assur. · … ». Dépliée : nom, type,
  volume m³, immatriculation, CT (échéance + badge), Assurance (échéance +
  toggle « attestation scannée »), État mécanique (3 boutons + zone « détail
  du problème » + date de signalement auto), supprimer. + Carte d'alerte
  rouge en tête d'onglet « Intervention nécessaire » (urgent ou CT expiré).
  + « Ajouter un camion ».
- **Dashprod** : table `vehicules` ✅ avec échéances (Module 8) ; écran ❌.
  **P0 pour le MINIMUM** (nom, type, volume, immat — parce que le dossier, le
  relevé et le planning en dépendent) ; **P1** pour CT/assurance/état méca.

## Onglet HEURES — P2 (Dashprod a déjà le domaine)

### 5. Équilibre de charge
- **Design** : scopes Tout/Réalisé/À venir ; 3 KPI (total h·homme, moyenne,
  chantiers) ; bandeau vert « Charge répartie équitablement (±20 %) » ou
  ambre « Déséquilibre » ; barres par homme vs trait de moyenne, écart en %,
  « N chantiers · ≈ X € MO » ; coût MO total.
- **Logique** : heures = champ « heures » du devis compté pour chaque affecté ;
  équilibre = min/max dans ±20 % de la moyenne.
- **Dashprod** : 🏗️ `equilibreCharge` (Pilotage) fait EXACTEMENT le ±20 % ;
  `v_charge_membre` existe. Écran ❌. **P2** (après le reste — et à terme les
  heures RÉELLES du chrono remplaceront les heures devis : supérieur).

## Récap priorités page 10
| Élément | Priorité |
|---|---|
| Camions : fiche minimale (nom/type/volume/immat) | **P0** |
| Camions : CT, assurance, état méca + alertes | P1 |
| Congés (saisie direction + liste) | **P1 haut** (nourrit le planning) |
| Champ métier terrain (Chef/Chauffeur/Dém.) | P1 |
| Rémunération (taux/contrat) derrière voir_paie | P1 |
| Équipement par membre + demandes de remplacement | P1 |
| Documents RH + échéances + carte « À traiter » | P1 |
| « Peut créer des devis » (capacité) | P1 (avec page 11) |
| Onglet Heures / équilibre ±20 % | P2 |
