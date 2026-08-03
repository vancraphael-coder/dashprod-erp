# TODO — Claude · Dashprod ERP

> Ma liste de travail. Trois sources : `docs/LAUNCH_TRUTH.md` (le lancement
> et sa cartographie), `docs/analyse-mecanique.md` (INC-xx) et
> `docs/PRODUCT_TRUTH.md` (EX-xx, statuts stricts). Ordonnée par priorité.
>
> **Règle anti-dérive** : chaque document sert une action ; un EX se traite
> analyse → code → test → manipulation réelle → validation → rapport. Pas de
> sous-documents à la place du produit.

Dernière mise à jour : 2026-07-28 — P0 tous réglés (connecteur rétabli, 0058 appliquée et testée, dossier migrations reconstitué).

## P0 — ✅ TOUS RÉGLÉS le 2026-07-28

- [x] **Migration 0058** appliquée et testée en base : `cmd_terminer_chantier`
      archivée (INC-02), signature marque le document (INC-03), `peppol_id`
      tranché côté JSON (INC-07), **plus deux bugs P0 découverts en base** —
      aperçu d'offre cassé (INC-12) et signature toujours en échec (INC-13).
- [x] **`supabase/migrations/` reconstitué** : 0001→0058, 63 fichiers (INC-01).
      0044→0049b rapatriées depuis l'historique Supabase.
- [x] `EspaceClient.jsx` : les affichages `reference` morts — **à vérifier au
      passage suivant** (INC-06, partie rapide non encore faite).

## Plan de lancement 1.0

Le découpage en lots, le registre de traçabilité de toutes les demandes et les
quatre décisions attendues vivent dans **`docs/PLAN-1.0.md`**. Cette liste ne
porte plus que le lot en cours.

**Lot en cours : LOT 5 — membres et permissions** (les quatre décisions D1→D4 sont
tranchées ; plus aucun lot n'est bloqué).

- [x] LOT 0 — écran blanc du planning (INC-15) + heures non mappées (INC-16),
      corrigés le 2026-07-29, avec test statique d'imports.
- [x] LOT 1 — ✅ 2026-07-29 : cycles séparés (0064), reprise d'annulation
      réelle (0065), `transition_exigee`, deux badges, bouton de clôture
      ressuscité (INC-21).
- [x] LOT 2 — ✅ 2026-07-29 : remarque par article, démonter/remonter
      distincts, meubles par pièce paramétrables, catalogue codé en dur
      supprimé (INC-22).
- [x] LOT 3 — ✅ 2026-07-29 : validité paramétrable et figée, PDF =
      impression navigateur (INC-20), offre signée verrouillée à deux niveaux
      (INC-23), code uniquement dans Mail avec durée au choix, pièces jointes
      rétablies.
- [x] LOT 4 — ✅ 2026-07-29 : verdict à trois niveaux (libre / double orange /
      indisponible rouge), conflit véhicule ajouté, doublon visible même une
      fois l'affectation faite (INC-19), alerte sur la carte de mission.
- [ ] LOT 5 — membres et permissions : recenser les actions utiles au terrain,
      les rattacher à ressources/membre.

## Jalon de lancement (avant tout EX)

- [ ] **Manipulation complète** (LAUNCH_TRUTH §3) exécutée par Raphaël après
      les migrations — chaque ✗/? remonte ici avec son symptôme. C'est le
      P0.5 : on ne développe pas de nouveaux écarts sur un circuit non prouvé.

## P1-produit — la vision adoptée (EX-xx, après les P0)

Ordre proposé : d'abord ce qui enrichit le circuit existant sans nouvelle
architecture (EX-04, EX-05), puis le déclaratif terrain (EX-02), puis les
chantiers structurants (EX-01 plans, EX-03 demandes) une fois leurs décisions
tranchées.

- [ ] **EX-04 · Article du relevé enrichi** : Fragile / Démonter / Remonter
      (distincts) / Particularité / Statut / commentaire — sans photo, ligne
      compacte, options sous chevron. Propagation offre + chantier.
- [ ] **EX-05 · Meubles pré-remplis par pièce** : structure
      `parametres_catalogues.meubles_par_piece`, UI dans Paramètres →
      « pièces du relevé », insertion en un geste dans le Relevé.
- [x] **EX-02 · Terrain déclaratif** ✅ 2026-07-28 — double minuteur
      départ/arrivée + pauses déclarées (0060). Paie inchangée : le stockage
      `chrono_sessions` est conservé. **Reste** : heures *prévues* de départ et
      d'arrivée pré-remplies par le Bureau sur la mission.
- [ ] **EX-07 · Planning en feux** : verdict véhicule systématique, temps de
      trajet (réutiliser l'itinéraire du devis), affichage 🔴🟡🟢 à la
      création.
- [ ] **EX-06 · Onboarding BCE** : normalisation/affichage des formats
      (BE0123456789 interne), provenance saisie/vérifiée/générée ; la
      vérification externe attend le choix de la source (Raphaël).
- [ ] **EX-01 · Plans & limites** (après pricing tranché) :
      `organisations.plan`, modules + limites vérifiés en base (dont
      5 utilisateurs Regular), **corriger la vitrine** (« illimités » →
      l'offre réelle, `vitrine/Landing.jsx:201`, `vitrine/PorteSociete.jsx:26`),
      pavés Starter/Regular/Pro (EX-09).
- [ ] **EX-03 · Demandes client** (après décision périmètre) : table
      `demandes` hors org_id classique, boîte de réception entreprise,
      bascule explicite vers le CRM à l'acceptation — jamais de fusion avant.
- [ ] **EX-08 · Frontière Core/Premium** : au moment d'EX-01, placer le
      Listing international derrière un droit de plan (en base, pas en
      cachant des boutons).


## P2 — dette et décisions

- [ ] Tri du code mort adaptateur (INC-08) : `signerOffre` (+ noter que
      `cmd_signer_instance` n'a plus d'appelant), `listerClients`,
      `creerAffaire`, `creerMission`, `creerDossierTerrain`,
      `supprimerVehicule`, `CAPACITES`, `FICHIER` — supprimer ou brancher,
      décision par symbole.
- [ ] Fusionner le triple import adaptateur de `main.jsx` (INC-09).
- [ ] Documenter (ou changer) la remise appliquée aux suppléments (INC-10)
      — après décision de Raphaël.
- [ ] Ré-exécuter la batterie d'audit (§2 du fichier d'analyse) après chaque
      lot de migrations ; mettre à jour le registre.

## En attente d'une décision de Raphaël

- [ ] **EX-01** : prix et contenu de Starter et Pro/Group ; confirmer la
      limite 5 utilisateurs Regular (la vitrine actuelle dit « illimités »).
- [x] **EX-02** ✅ tranché : le chronomètre disparaît, remplacé par le double
      minuteur déclaré.
- [ ] **EX-03** : lancement du module Demandes (marketplace) — périmètre v1 ?
- [ ] **EX-06** : source de vérification BCE (KBO/BCE Public Search, service
      tiers ?) — accès à ouvrir côté Raphaël.
- [ ] INC-10 : la remise % doit-elle s'appliquer aux suppléments ?
- [ ] INC-11 : offres multi-entreprises — statu quo, restriction au dossier
      d'origine, ou opt-in réseau ?
- [ ] Rapprochement bancaire CODA/Ponto : lancer le module trésorerie ?
- [ ] CGV/DPA : conversion Word pour l'avocat ?

## Côté Raphaël (hors de ma portée — connecteur coupé)

- [ ] Exécuter **0050 → 0057** dans l'éditeur SQL, dans l'ordre, fichiers
      entiers ; puis les requêtes de vérification en commentaire de chacun.
- [ ] `update organisations set visible_reseau = true where id = jwt_org();`
      (annuaire réseau).
- [ ] Confirmer que `cmd_terminer_chantier` existe en base
      (`select proname from pg_proc where proname='cmd_terminer_chantier';`)
      — sinon 0058 la crée.
- [ ] Repo GitHub → **privé** (IBAN dans l'historique Git).
- [ ] `git rm apps/web/src/ecrans/Landing.jsx` (+ `Portail.jsx` si encore
      sur le distant) au dépôt de la vitrine.
- [ ] Contrat Digiteal (sales@digiteal.eu) puis clés dans
      Paramètres → Facturation.
- [ ] Avocat belge : relecture CGV/DPA. Assurance RC Pro / cyber éditeur SaaS.
- [ ] Tester l'inscription société avec une adresse Google **non** rattachée
      à Roovers.
- [ ] Edge Function `inviter-membre` : à déployer (aucun e-mail d'invitation
      ne part aujourd'hui).

## Journal des points réglés

*(déplacer ici les cases cochées, avec la date et la session)*
