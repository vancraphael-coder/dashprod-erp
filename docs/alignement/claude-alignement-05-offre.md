# Page 05 — Offre / Contrat + Signature

Référence modèle : `offreSec()` (l. ~792-905) + CGV (l. 106-113) + SignaturePad.
Écran Dashprod actuel : `Offre.jsx` (instanciation figée + pad + transition).

**C'est la page au plus gros écart. Dashprod a la MEILLEURE mécanique
(document figé, empreinte, C.B.D. jointe, transition gardée) mais n'affiche
pas le document que le client lit et signe. Le modèle a le meilleur RENDU
mais réédite après signature. La cible = rendu du modèle + scellement Dashprod.**

## Élément par élément

### 1. Sélecteur de statut du dossier
- **Design** : select en tête (Devis/Confirmé/En cours/Effectué/Annulé).
- **Dashprod** : volontairement ≠ — les transitions passent par la machine à
  états gardée (C-02 : confirmé EXIGE une signature). Ne pas copier le select
  libre ; proposer les transitions VALIDES seulement. **P1** (afficher l'état
  + les transitions possibles, ex. « Marquer effectué » après le jour J).

### 2. LE CONTRAT LISIBLE (cœur de la page) — ❌ P0 absolu
Structure exacte du rendu modèle, de haut en bas :
- **En-tête navy dégradé** : « Déménagements Roovers » (Fira Code blanc),
  sous-titre « OFFRE / CONTRAT · tarif horaire|forfait », à droite
  « BCE 0478.363.616 » + téléphone.
- **Salutation** : « Madame, Monsieur **{nom}**, » + phrase d'intro.
- **Blocs adresses** : Chargement (liseré gauche bleu) et Déchargement
  (liseré indigo), chaque adresse sur sa ligne : `adresse · étage 2 ·
  ascenseur · monte-meubles`, numérotées si plusieurs.
- **Grille 2 cases** : Volume estimé « 12.4 m³ » | Équipe/camions
  « 3 déménageurs · 2 cam. ».
- **Prestations incluses** (coches vertes) : 3 lignes fixes (mise à
  disposition équipe+matériel ; chargement/transport/déchargement ;
  démontage-remontage standard) + conditionnelles : « Mise en œuvre d'un
  monte-meubles » (si une adresse a lift) ; « Fourniture du matériel
  d'emballage (20 cartons standard, 5 cartons livre…) » (si Matériel.Utilisé
  > 0 — lien direct avec la page 06).
- **Encadré bleu « Démontage / remontage prévu »** : liste « 1× Armoire 3p ·
  2× Lit 160 » (articles `demont` du relevé — lien page 03).
- **Bloc prix navy centré** : « Pour **6 h** avec **3 déménageurs** et
  **2 camions** : » (ou « Prix forfaitaire : ») ; ligne jaune si réduction
  « Réduction (promotion) −10 % appliquée » ; **montant TVAC en bleu clair,
  19px** ; « dont TVA 21 % : X ».
- **Planning** : « Emballage le {date} (départ {h}). Déménagement le {date} —
  arrivée prévue {h}. **Kilométrage offert. Offre valable 10 jours
  ouvrables.** »
- **Zone signature** : « Bon pour accord », nom, date | image de la signature
  (ou ligne vide), légende « Signature précédée de "lu et approuvé" ».
- **CGV — 7 articles** (petits caractères) : 1. Acompte 30 % & réservation ·
  2. Tarif horaire (tranches commencées, estimation) · 3. Accès &
  stationnement à charge du client · 4. Responsabilité & assurance ·
  5. Réclamations 48 h · 6. Annulation <7 j = acompte retenu · 7. Droit belge,
  TVA 21 %. Puis pied légal : adresse, BCE/TVA, IBAN, tél, mail.
- **Logique Dashprod cible** : ce rendu = le GABARIT du modèle d'offre
  (0015 en a déjà les sections !) rempli par le contenu FIGÉ de l'instance.
  Avant envoi : aperçu vivant ; après envoi : rendu depuis `contenu` gelé
  (donc le document affiché ne peut plus bouger — supérieur au modèle). Les
  CGV : soit rendues depuis le gabarit versionné, soit portées par la C.B.D.
  PDF jointe — les deux coexistent (CGV courtes visibles + C.B.D. complète).
- **Pourquoi P0** : c'est CE document que le client lit, comprend et signe.
  Sans lui, la signature Dashprod scelle un objet invisible.

### 3. Signature sur écran
- **Design modèle** : canvas 160px pointer-events (doigt), placeholder
  « Signez ici avec le doigt », adapté au devicePixelRatio (net sur Retina),
  Effacer ; champ Nom du signataire ; bouton vert « Valider le devis » ;
  confirmation verte « Accepté le X — signé Y ».
- **Dashprod** : ✅ pad + nom + validation + transition. 🟡 mon canvas est en
  mouse/touch events et résolution fixe → passer en **pointer events + DPR**
  (rendu net, stylet ok). **P1**. Date de signature affichée : P2.

### 4. Imprimer / PDF + Copier
- **Design** : « Imprimer / PDF » (window.print, CSS @media print n'imprimant
  QUE `.print-contract`) ; « Copier » (résumé texte) ; note « choisis
  Enregistrer en PDF — un PDF serveur viendra avec le backend ».
- **Dashprod** : ❌. → même approche v1 : classe print + window.print =
  **P0** (dix lignes de CSS, rend l'offre transmissible immédiatement).
  PDF serveur (D-2) : P2/plus tard. Copier : P2.

### 5. Badge d'intégrité (spécifique Dashprod)
- ✅ à conserver tel quel (empreinte + `instanceIntacte`) — c'est notre
  avantage. L'afficher discrètement SOUS le contrat, pas à sa place.

## Récap priorités page 05
| Élément | Priorité |
|---|---|
| Rendu complet du contrat (structure ci-dessus) | **P0 — le plus gros P0 du projet** |
| Impression navigateur (@media print) | **P0** |
| Mention acompte 30 % + validité 10 j (dans le rendu) | **P0** (inclus) |
| Liens relevé→démontage et matériel→fournitures | P0/P1 (avec pages 03/06) |
| Pad en pointer events + DPR | P1 |
| Transitions d'état proposées (au lieu du select libre) | P1 |
| Réduction affichée avec motif | P1 (avec page 04) |
| PDF serveur, bouton Copier | P2 |
