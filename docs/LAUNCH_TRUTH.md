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

Dernière mise à jour : 2026-07-28 — **connecteur Supabase rétabli**, base
vérifiée. Les `?` de la version précédente sont levés : 0050→0057 sont
appliquées, `cmd_terminer_chantier` existe, et la 0058 a corrigé deux bugs
P0 de la signature client (INC-12, INC-13) que seul un appel réel pouvait
révéler. Le circuit a été testé de bout en bout en base.

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

### 07 · Signature client — `LIVE` ✅ (testée en base le 28/07)
Crée : le client (« Lu et approuvé » + nom, exigés **en base**) · Tables :
`acces_client` (code salé/haché, 8 essais, expiration) +
transition `confirmee` via garde S4 · RPC : `cmd_creer_lien_signature`,
`cmd_offre_apercu`, `cmd_offre_signer` · Écrans : `SignatureOffre.jsx`
(?signer=), génération du code dans `Offre.jsx`/`Mail.jsx` · **Test réel du 28/07** :
aperçu lisible (entreprise, client, montant, document) · refus sans mention ·
refus nom trop court · signature acceptée → affaire `confirme`, document
`signee`+`gele`, ligne dans `signatures` (canal `client_en_ligne`), mention et
nom tracés, code consommé (rejeu refusé). Trois bugs corrigés au passage :
INC-12 (aperçu cassé), INC-13 (signature toujours en échec), INC-03 (badge).

### 08 · Planning / Mission — `LIVE` (couches 0056 en attente)
Crée : Bureau · Tables : `missions`, `mission_affectations`,
`mission_vehicules` · RPC : `cmd_creer_mission`, `cmd_affecter_membre` ·
Conflits équipe : `conflitsAffectation` `LIVE` · Congés visibles `LIVE` ;
fériés calculés `LIVE` ; fermetures société → table 0056 **en attente** ·
Écran : `Planning.jsx` · EX-07 (feux, trajet, verdict véhicule) =
post-launch souhaitable, pas bloquant.

### 09 · Terrain — `LIVE` ✅ (fonction vérifiée en base le 28/07)
Crée : chef d'équipe — heures (chrono serveur : sessions/pauses) + photos ·
RPC : `cmd_chrono_demarrer/pause/arreter` (`LIVE` dans le repo) +
`cmd_terminer_chantier` **existe bien en base** et est saine (INC-02 était un
trou d'archive, pas un bouton cassé) ; elle est désormais archivée dans 0058 · Écran : `Terrain.jsx` · EX-02 (déclaratif) et
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

1. ✅ **Fait** — 0050→0057 appliquées, 0058 appliquée et testée (28/07).
2. ✅ **Fait** — `cmd_terminer_chantier` confirmée en base et archivée.
3. **Manipulation complète** §3 sans `✗` — validation, **seul bloqueur
   technique restant**. Le circuit est prouvé côté base ; il reste à le
   prouver dans l'interface.
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
