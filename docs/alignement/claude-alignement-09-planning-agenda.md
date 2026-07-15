# Page 09 — Planning / Agenda

Référence modèle : `agendaView()` (l. ~1305-1400).
Écran Dashprod actuel : `Planning.jsx` (liste par jour + affectation conflits).

## Élément par élément

### 1. Grille calendrier mensuelle — ❌ P0
- **Design** : en-tête sticky « ← Juillet 2026 → » ; grille 7 colonnes
  (Lu…Di, semaine commençant LUNDI — attention au décalage `getDay()`),
  cases carrées (aspect-ratio 1) ; **aujourd'hui = fond bleu plein blanc** ;
  jour sélectionné = bordure bleue + fond bleu clair ; **pastille** sous le
  chiffre si déménagement ce jour (ambre ; VIOLETTE si un dossier « à
  valider » ce jour ; blanche si c'est aujourd'hui).
- **Logique** : `moveDates` = comptage des dossiers non archivés par
  `dateDem`. Toucher un jour ouvre la liste du jour dessous.
- **Pourquoi** : le bureau raisonne « semaine/mois », pas en liste infinie ;
  les pastilles montrent la densité d'un coup d'œil.
- **Dashprod** : ❌ (liste chronologique seulement) → **P0**. Mon domaine
  `grouperParJour` reste utilisé pour la liste du jour.

### 2. Cartes du jour sélectionné
- **Design** : « vendredi 4 juillet » en titre ; une carte par déménagement :
  liseré gauche vert (effectué) ou bleu ; nom + « ⏰ 08:00 · 👥 3 prévus » ;
  badges statut / À valider ; adresses 🚛/🏠 ; **badges équipe** (bleus ;
  ROUGE « · double » si le membre est sur 2 dossiers ce jour) ; **badges
  camions** ; alertes ambre « Aucune équipe affectée » / « Aucun camion
  affecté » ; bouton violet « Confirmer ce dossier » si pending.
- **Logique** : `dayAssignCount` détecte les doubles affectations DU JOUR
  (équivalent de mon `conflitsAffectation`, déjà testé).
- **Dashprod** : 🟡 liste + affectation + conflits ✅ ; manquent l'alerte
  « aucune équipe », les camions, le lien vers le dossier (toucher la carte).
  **P1**.

### 3. Bloc « Message équipe » (Copier / WhatsApp) — quick win majeur
- **Design** : encadré navy dans chaque carte du jour : « 📱 MESSAGE ÉQUIPE »
  + deux boutons : Copier (blanc) et WhatsApp (vert, `wa.me/?text=`).
- **Logique du brief** (format exact `teamMsg`) :
  `🚛 *DÉMÉNAGEMENTS ROOVERS* / 📅 {date longue} — {heure} / 🚚 {camions} /
  👷 Équipe : Marco (chef), Yassine / 📍 Chargement : (liste numérotée si
  plusieurs) / 🏠 Déchargement : … / 📦 Meubles : 6 premiers articles
  (+ « (démontage) ») puis « … +N autres » / 📝 remarques / 💳 Virement
  {IBAN} / 🙏 Merci à toute l'équipe ! — Raphaël {tél}`.
- **Pourquoi** : c'est LE geste quotidien réel : briefer l'équipe du lendemain
  en un tap. Valeur énorme, coût minuscule (une fonction de formatage).
- **Dashprod** : ❌ → **P1 très haut** (domaine : `briefMission(...)` pur,
  testé ; données : équipe, camions, adresses, relevé, remarques, IBAN org).

### 4. Création de mission à la confirmation — ❌ P0 structurel
- **Le modèle n'en a pas besoin** (le dossier EST l'agenda). Dashprod a séparé
  affaire (vente) et mission (exécution) — c'est plus juste (C-04) MAIS il
  manque le pont : **à la transition `confirme`, créer automatiquement la
  mission de type déménagement à `date_souhaitee`/`heure_souhaitee`** (+ une
  mission `emballage` si date d'emballage). Sans ce pont, le Planning reste
  structurellement vide. → trigger ou dans `cmd_transition_affaire`. **P0.**

### 5. Congés dans les conflits
- Le modèle signale « congé » sur les chips (page 02/10). Mon
  `conflitsAffectation` accepte déjà les congés — les alimenter depuis le
  module RH dès que la page 10 existe. **P1.**

## Récap priorités page 09
| Élément | Priorité |
|---|---|
| Création auto de mission à la confirmation | **P0** |
| Grille calendrier mensuelle + pastilles | **P0** |
| Brief équipe WhatsApp/Copier | **P1 très haut** |
| Cartes du jour enrichies (camions, alertes, lien dossier) | P1 |
| Congés alimentant les conflits | P1 (avec page 10) |
| Pastilles violettes « à valider » | P1 (avec page 11) |
