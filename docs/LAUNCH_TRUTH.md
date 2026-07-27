# LAUNCH TRUTH — Dashprod

> **La définition du lancement.** Ce qui doit être fonctionnel pour faire
> tourner une entreprise de déménagement réelle (Roovers) pendant
> **deux semaines sans Excel ni papier**, sur le circuit complet. Tout ce qui
> n'est pas nécessaire à ce critère est POST-LAUNCH, quel que soit son
> intérêt.
>
> Statuts : voir `docs/PRODUCT_TRUTH.md`. Ici s'ajoute la lecture
> lancement : un maillon `?` est un maillon **non lançable** tant qu'il n'est
> pas vérifié en réel.

Dernière mise à jour : 2026-07-26. Cartographie établie depuis le code
(audit du 26/07) ; les `?` tiennent au fait que l'état de la base est
invérifiable d'ici (connecteur coupé) et que les migrations 0050→0057 sont
en attente d'exécution.

---

## 1. Le critère de lancement

```
Deux semaines · Roovers · zéro Excel · zéro papier
Authentification → Organisation → Client → Relevé → Devis → Offre
→ Signature → Planning → Terrain → Facture → (Peppol) → Paiement
```

Nuance Peppol : l'obligation belge 2026 vise le **B2B**. Un lancement sur des
déménagements de particuliers (B2C) est possible sans contrat Digiteal actif ;
la première facture B2B, elle, l'exige.

## 2. Cartographie réelle du circuit (le P0.5)

Chaque maillon : qui crée · table · RPC/mécanisme · source de vérité · qui
modifie · écran · test automatisé · **statut lancement**.

### 01 · Authentification — `LIVE`
Crée : l'utilisateur (OAuth Google ou email/mdp) · Table : `auth.users` +
`utilisateurs` · Mécanisme : Supabase Auth, `cmd_reclamer_invitation`,
`mon_profil` · Vérité : le JWT (e-mail vérifié) · Écran : `Connexion.jsx` ·
Tests : — (auth déléguée) · Risque connu : aucun.

### 02 · Organisation — `LIVE`, test réel à refaire
Crée : le fondateur · Table : `organisations` · RPC :
`cmd_creer_ma_societe` (refuse un compte déjà rattaché — garde-fou en base) ·
Vérité : `organisations` + JSON `parametres_*` · Modifie : admin
(`gerer_referentiels`, whitelist `CHAMPS_ORG_MODIFIABLES`) · Écrans :
`Inscription.jsx` (deux publics), `Identite.jsx` · ⚠ Le compte Google de
Raphaël est rattaché à Roovers : tester avec une **autre adresse**. L'e-mail
d'invitation ne part pas (Edge Function absente) — contournable au lancement
(invitation dictée), à noter `PARTIAL` sur ce point.

### 03 · Client — `LIVE`
Crée : Bureau · Table : `clients` (+ `fact_*` pour la facturation) · Vérité :
`clients` · Modifie : Bureau · Écran : `Dossier.jsx` · L'e-mail saisi est la
**clé de l'espace client** (rattachement OAuth) : consigne opérationnelle —
toujours l'e-mail Google exact du client.

### 04 · Relevé — `LIVE` (cible EX-04/EX-05 = amélioration, pas bloquant)
Crée : Bureau (visite) · Vérité : `affaires.releve` (JSON — PAS une table) ·
Modifie : Bureau · Écran : `Releve.jsx` (demont 🔧, remarque ; pas de photo —
conforme) · Alimente : devis (volumes), offre (à démonter), espace client.

### 05 · Devis — `LIVE`
Crée : dérivé relevé + barème + suppléments · Table : `scenarios`
(`entrees`/`resultats`) · Moteur : `calculerScenario` + `supplementsRetenus`
(l'écran n'additionne rien) · **Vérité du TVAC : `scenarios.resultats`** ·
Écran : `Devis.jsx` · Tests : moteur + suppléments (jamais NaN).

### 06 · Offre — `LIVE`
Crée : gel du devis · Table : `documents_instances` (contenu figé +
`empreinte_sha256`) · RPC : `cmd_instancier_offre`, `cmd_geler_instance` ·
Vérité : l'instance figée (jamais recomposer après gel) · Écrans :
`Offre.jsx`, `Contrat.jsx` (CGV figées, suppléments listés).

### 07 · Signature client — `?` (base) + `BROKEN` (badge)
Crée : le client (« Lu et approuvé » + nom, exigés **en base**) · Tables :
`acces_client` (code salé/haché, 8 essais, expiration) +
transition `confirmee` via garde S4 · RPC : `cmd_creer_lien_signature`,
`cmd_offre_apercu`, `cmd_offre_signer` · Écrans : `SignatureOffre.jsx`
(?signer=), génération du code dans `Offre.jsx`/`Mail.jsx` · **Dépend des
migrations 0051→0055 (en attente)** → `?` jusqu'à exécution + test réel ·
INC-03 : la signature ne marque pas `documents_instances.statut='signee'`
(badge mort) → correctif en 0058.

### 08 · Planning / Mission — `LIVE` (couches 0056 en attente)
Crée : Bureau · Tables : `missions`, `mission_affectations`,
`mission_vehicules` · RPC : `cmd_creer_mission`, `cmd_affecter_membre` ·
Conflits équipe : `conflitsAffectation` `LIVE` · Congés visibles `LIVE` ;
fériés calculés `LIVE` ; fermetures société → table 0056 **en attente** ·
Écran : `Planning.jsx` · EX-07 (feux, trajet, verdict véhicule) =
post-launch souhaitable, pas bloquant.

### 09 · Terrain — `?` **(bloqueur n°1 à lever)**
Crée : chef d'équipe — heures (chrono serveur : sessions/pauses) + photos ·
RPC : `cmd_chrono_demarrer/pause/arreter` (`LIVE` dans le repo) +
**`cmd_terminer_chantier` : appelée par le bouton, définie NULLE PART dans le
repo** (INC-02). Soit elle existe en base (créée jadis via connecteur), soit
le bouton casse. Vérification Raphaël :
`select proname from pg_proc where proname='cmd_terminer_chantier';` —
sinon la 0058 la (re)définit · Écran : `Terrain.jsx` · EX-02 (déclaratif) et
EX-10 (écarts) = post-launch, `DECISION`/`VISION`.

### 10 · Facture — `LIVE`
Crée : Bureau (émission = numéro légal, séquence en base) · Tables :
`factures`, `facture_lignes` (quantité/PU/tva_pct — 0049 appliquée),
`paiements` · RPC : `cmd_emettre_facture` · Vérité : la facture émise
(intouchable) ; communication structurée `LIVE` · Écrans : `Facture.jsx`,
`FactureDoc.jsx` · ⚠ INC-04 : aucune vue « toutes mes factures » ni export
comptable UI — **non bloquant pour deux semaines**, indispensable au premier
passage comptable (post-launch immédiat).

### 11 · Peppol — `PARTIAL` (volontaire et honnête)
Crée : système · Tables : `transmissions` (journal, idempotence) · Moteur :
canonique → UBL BIS 3.0 → adaptateur Digiteal ; sans clé : s'arrête à
`PRETE` et le dit (verrou honnêteté) · Écrans : `FacturePeppol.jsx`, config
dans `Identite.jsx` (env test par défaut) · Bloqueur B2B uniquement :
**contrat Digiteal** (sales@digiteal.eu).

### 12 · Paiement — `LIVE` (manuel)
Crée : Bureau (encaissement saisi) · Table : `paiements` · Écran :
`Facture.jsx` (solde, historique) · Rapprochement bancaire CODA/Ponto =
POST-LAUNCH (module trésorerie).

## 3. Manipulation complète *(à exécuter par Raphaël après les migrations)*

Parcours dans l'ordre, en réel, notation `✓ / ⚠ UX / ✗ / ?` :

```
[ ] 02 Création société (adresse Google NON rattachée à Roovers)
[ ] 03 Création client (e-mail Google exact du client de test)
[ ] 04 Relevé complet (pièces, demont, remarques)
[ ] 05 Devis (barème + un supplément avec quantité)
[ ] 06 Offre figée (PDF téléchargeable)
[ ] 07 Code de signature → lecture → « Lu et approuvé » → état confirmé
[ ] 08 Mission planifiée (équipe + véhicule ; un férié + une fermeture visibles)
[ ] 09 Terrain : chrono complet → TERMINER LE CHANTIER (le point ?)
[ ] 10 Facture émise (numéro, communication structurée)
[ ] 11 Peppol env. test : vérifier client → envoyer → journal (PRETE attendu sans clé)
[ ] 12 Paiement encaissé → solde à zéro
[ ] Espace client OAuth : dossier / meubles / offres / factures / annuaire
[ ] RGPD : aperçu rétention + purge en dry-run
```

Chaque `✗` ou `?` remonte dans `docs/TODO-claude.md` avec le symptôme exact.

## 4. Bloqueurs de lancement (état au 26/07)

1. **Exécuter 0050→0057** (ordre strict), puis 0058 (rattrapage : INC-02,
   INC-03, INC-07) dès qu'elle est livrée — technique.
2. **`cmd_terminer_chantier`** confirmée en base ou recréée — technique.
3. **Manipulation complète** §3 sans `✗` — validation.
4. **Repo privé** (IBAN dans l'historique Git) — hygiène, avant tout accès
   tiers.
5. Lancement **commercial** (au-delà de Roovers) : relecture avocat CGV/DPA +
   assurance RC Pro/cyber + contrat Digiteal pour le B2B.

## 5. POST-LAUNCH (rappel des horizons)

Écran Comptabilité (INC-04, premier de la file) · clôture paie (INC-05) ·
EX-04 article enrichi · EX-05 meubles par pièce · EX-02 terrain déclaratif ·
EX-10 boucle d'écart · EX-07 planning feux · EX-06 BCE · plans Starter/
Regular/Pro (EX-01) · Demandes client (EX-03) · Multi-Dépôts · Stockage 3D ·
Listing international premium (EX-08) · CODA/Ponto.
