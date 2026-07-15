# Page 07 — Mail (envoi de l'offre) — ABSENTE de Dashprod

Référence modèle : `mailSec()` (l. ~927-965).
Dashprod : ❌ rien.

## Élément par élément

### 1. Carte « Pièces jointes »
- **Design** : ligne fichier « Offre de prix — signée / à faire signer » avec
  badge vert « Signée » / ambre « Non signée » ; bouton « Préparer l'offre
  (PDF à joindre) » qui bascule vers la section Offre ; note expliquant que
  l'attachement automatique viendra avec le backend.
- **Logique** : l'état « signée » = signature + nom présents. Le flux v1 est
  assumé manuel : générer le PDF (print) puis le glisser dans le mail.
- **Dashprod** : ❌ → même carte, état depuis l'instance (`statut = signee`).
  **P1**.

### 2. Email généré (le template)
- **Design** : KV « À » (email client) + « Objet » ; corps dans un encadré
  scrollable pré-formaté.
- **Logique du corps** (à reproduire fidèlement) :
  - Salutation par NOM DE FAMILLE (« Bonjour Dupont, » — dernier mot du nom).
  - « vous trouverez en pièce jointe votre offre de prix détaillée
    [, revêtue de votre bon pour accord signé] » (segment conditionnel).
  - Chargement : adresses jointes par « | ». Déchargement idem.
  - « Montant pour 6 h avec 3 déménageurs : X € TVAC (TVA 21 %). » ou
    « Montant forfaitaire : … ».
  - « Kilométrage offert. Offre valable 10 jours ouvrables. »
  - « Date prévue : {longue} — arrivée {h}. » + ligne emballage si présente.
  - « Remarques : … » si présentes.
  - Signature : « Bien à vous, Raphaël Van Cutsem, Déménagements Roovers,
    tél · mail » → à servir depuis les PARAMÈTRES ORGANISATION (pas en dur).
  - Objet : « Offre de prix — Déménagements Roovers — {nom} ».
- **Pourquoi** : dix mails par semaine, identiques à 90 % — le template
  supprime l'oubli (validité, acompte) et uniformise le ton.
- **Dashprod** : ❌ → **P1**.

### 3. Actions
- **Design** : « Copier » (presse-papier) + « Ouvrir dans Mail »
  (`mailto:` avec subject et body encodés) ; **Switch « Envoyé »** qui
  horodate (`mailEnvoyeLe`) et affiche « Envoyé le X » en vert.
- **Logique Dashprod** : le suivi « envoyé » existe déjà côté instance
  (`statut envoyee` + `envoye_le`) — l'aligner plutôt que dupliquer.
  L'envoi RÉEL (SMTP) = adaptateur au bord (D-1), plus tard.
- **Dashprod** : ❌ écran → **P1** (mailto + copier = zéro backend).

## Récap priorités page 07
| Élément | Priorité |
|---|---|
| Template mail complet + mailto + copier | **P1 (quick win)** |
| Carte pièce jointe (état signée) | P1 |
| Marquage « envoyé » aligné sur l'instance | P1 |
| Envoi SMTP réel (adaptateur au bord) | P2 / backend |
| Paramètres organisation (signature, tél, mail) | P1 (partagé pages 05/08) |
