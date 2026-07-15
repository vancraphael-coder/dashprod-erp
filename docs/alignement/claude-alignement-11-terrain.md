# Page 11 — Mode Terrain (l'app des hommes)

Référence modèle : `terrainLogin/Jobs/Job/Mat/New/Nav/Full` (l. ~1402-1647)
+ `fieldMode` (vue Ressources bridée).
Dashprod : ❌ quasi tout ; 🏗️ domaine largement prêt (missionsDuMembre,
chrono_sessions, signaler_materiel, creer_affaire, machine à états brouillon).

## Philosophie du modèle
Deux apps en une : le BUREAU voit tout ; le TERRAIN voit SES chantiers, le
matériel, et (si autorisé) crée des dossiers « à valider ». Le modèle simule
le cloisonnement (données masquées côté client) et le dit honnêtement :
« le cloisonnement réel se fait côté backend ». **Dashprod a ce backend**
(rôles S3 + RLS) — notre terrain sera cloisonné pour de vrai.

## Élément par élément

### 1. Identification terrain
- **Modèle** : liste de noms « Qui es-tu ? » (aucune sécurité).
- **Dashprod** : ✅ SUPÉRIEUR — OAuth. Routage : un utilisateur dont le rôle
  est `demenageur`/`chef_equipe` (sans capacités bureau) atterrit
  automatiquement sur la vue terrain. **P0 du mode terrain.**

### 2. « Mes chantiers »
- **Design** : cartes de MES missions triées par date ; **aujourd'hui =
  liseré vert + « Aujourd'hui »** ; adresses ; chips camions + coéquipiers ;
  badge statut / « À valider ».
- **Logique** : filtre = missions où je suis affecté (+ dossiers que J'AI
  créés, même non validés). Mon domaine `missionsDuMembre` ✅.
- **Dashprod** : ❌ écran → **P0** (c'est l'app de 80 % des utilisateurs).

### 3. Fiche chantier terrain
- **Design** : chrono en tête ; adresses avec étage/asc/monte-meubles ;
  bouton **Itinéraire** (Maps multi-arrêts) ; Équipe & camions (badges) ;
  **« À démonter »** (articles `demont` du relevé) ; Remarques ; **Brief
  équipe** (Copier/WhatsApp — même `teamMsg` que page 09) ; bandeau violet si
  « en attente de validation ». **PAS de prix, PAS de coûts, PAS de marge.**
- **Chrono (détail important)** : gros digits hh:mm:ss ; Démarrer/Pause/Reset ;
  barre de progression vs heures BUDGÉTÉES du devis (vert→ambre >80 %→rouge
  dépassé) ; **marge live** = HTVA − (coûts − MO_devis + heures_écoulées ×
  taux_équipe_réel) — la marge fond en direct si le chantier déborde.
  ⚠ Affiche une marge € : à réserver au chef d'équipe ou masquer selon
  `voir_prix` (décision fine : le modèle la montre au terrain ; je recommande
  chef d'équipe uniquement).
- **Dashprod** : chrono ❌ écran, `chrono_sessions` + `dureeSecondes` +
  `coutEquipeCentimes` ✅ domaine. → **P1 haut** (sessions serveur =
  supérieur au chrono navigateur du modèle, qui se perd si l'app se ferme).
  Le reste de la fiche : **P0** avec « Mes chantiers ».

### 4. « Devis complet · faire signer le client » (bouton violet)
- **Logique** : un membre `canQuote` ouvre depuis le chantier le PROCESSUS
  COMPLET (les 7 sections) pour chiffrer et faire signer SUR PLACE.
- **Dashprod** : capacités `creer_affaire`+`faire_signer` ✅ ; router les
  écrans existants (relevé→devis→offre) en mode terrain. **P1.**

### 5. Onglet Matériel terrain
- **Design** : « Mon équipement » — chaque item avec bouton « À remplacer »
  (remonte au bureau) ; « Camions — signaler un souci » : par camion, les 3
  boutons d'état (OK/À surveiller/URGENT) + zone de description.
- **Dashprod** : capacité `signaler_materiel` ✅ ; tables page 10. **P1.**

### 6. Création rapide terrain (« Nouveau dossier »)
- **Design** : bandeau violet « Saisie rapide — le bureau complétera le prix
  et confirmera » ; champs : Client, Téléphone, Chargement, Déchargement,
  Date souhaitée, Notes ; « Envoyer au bureau ».
- **Logique** : crée un dossier `pending` auto-affecté au créateur, tracé
  `createdByName` ; le bureau voit « À valider » partout (liste, agenda) et
  confirme en un bouton.
- **Correspondance Dashprod** : état `brouillon` de la machine à états ✅ +
  `cree_par` déjà tracé par l'événement ✅ ; « valider » = transition
  brouillon→devis (gardée `valider_intake` ✅ !). Le concept EXISTE
  intégralement dans le domaine — il manque les deux écrans (saisie terrain,
  bouton valider bureau). **P1.**

### 7. Navigation terrain
- **Design** : barre basse dédiée : **Chantiers / Matériel / + Devis**
  (bouton rond violet central, seulement si canQuote).
- **Dashprod** : adapter `BarreNav` selon le rôle. **P0** avec le routage.

## Récap priorités page 11
| Élément | Priorité |
|---|---|
| Routage auto terrain selon rôle + barre dédiée | **P0** |
| « Mes chantiers » + fiche chantier (sans prix) | **P0** |
| Brief WhatsApp/Copier depuis le chantier | **P1 très haut** |
| Chrono écran (sessions serveur) | P1 haut |
| Signalement équipement/camion | P1 |
| Création rapide « à valider » + validation bureau | P1 |
| Devis complet terrain (canQuote) | P1 |
| Marge live du chrono (chef uniquement) | P2 + décision |
