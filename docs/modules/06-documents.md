# Module 6 — Documents & Signature

Fiche de module (gabarit Référence 3 · T11). Résout le constat le plus grave du
diagnostic : C-02 (le document n'existe pas comme instance figée).

## Objectif

Transformer des modèles versionnés en instances immuables (contenu gelé,
empreinte, horodatage), transporter la C.B.D. telle quelle et la joindre
automatiquement à chaque offre, et constituer un dossier de preuve à la
signature. Un document envoyé ou signé ne change plus jamais.

## Architecture

- **Domaine** (`packages/domaine/src/documents/`) :
  - `instances.js` — sérialisation stable, empreinte déterministe,
    `figerInstance` (Object.freeze), vérification d'intégrité.
  - `modeles.js` — sélection de version de modèle (I-6) ; règle d'attachement
    obligatoire de la C.B.D. aux offres (S6).
- **SQL** (`0007`, `0008`) : tables `documents_modele_versions`,
  `documents_instances` (immuable dès `gele=true`), `signatures` (écriture
  seule) ; commandes `cmd_instancier_offre` (C.B.D. obligatoire),
  `cmd_geler_instance`, `cmd_signer_instance`. Immuabilité forcée par triggers.

## Responsabilités

- Instance immuable : à l'envoi ou à la signature, contenu gelé + empreinte +
  versions de modèle et de C.B.D. mémorisées (C-02).
- C.B.D. non négociable : stockée comme fichier transporté, versionnée, jointe
  automatiquement à toute offre — une offre sans C.B.D. active est refusée,
  côté domaine (`resoudreCbd`) ET base (`cmd_instancier_offre`).
- Dossier de preuve : identité du signataire, canal, empreinte du document au
  moment de la signature, horodatage (C-26).

## Dépendances

Dépend du **Noyau** (organisations, `emettre_evenement`), de **Identité**
(`acteur_a_capacite`, capacité `faire_signer`) et du **CRM** (affaire). La
signature déverrouille la garde `instanceSignee` de la machine à états
(cmd_transition_affaire → `confirme`, invariant C-02). Fournit au **Chiffrage**
le réceptacle figé de l'offre (scenario_id), au module Facturation le document
de facture.

## Interfaces (contrat)

- Domaine : `figerInstance({...}) → instance gelée` ; `instanceIntacte(inst) → bool` ;
  `empreinte(contenu) → hex` ; `versionModeleActive(...)` ; `exigeCbd(type) → bool` ;
  `resoudreCbd(...) → {requise, cbdVersionId, erreur}`.
- SQL : `cmd_instancier_offre(affaire, type, contenu, empreinte) → uuid` ;
  `cmd_geler_instance(instance)` ; `cmd_signer_instance(instance, nom, canal, image) → uuid`.

## Événements

`Document.Instancie`, `Document.Envoye`, `Signature.Recueillie`. Consommés :
`Document.Envoye` → relance J+7 (Noyau) ; `Signature.Recueillie` → garde de
transition vers `confirme` (CRM).

## Tests

`packages/domaine/tests/documents.test.js` — 13 cas : empreinte déterministe
(insensible à l'ordre des clés, sensible au moindre changement), instance
immuable (Object.freeze refuse la mutation), détection d'altération, jointure
C.B.D. aux offres et refus si C.B.D. active absente. Statut : 13/13 verts
(70/70 au total).

Les commandes SQL et l'immuabilité forcée par trigger seront vérifiées en
intégration au branchement Supabase (T10).

## Évolutions futures (accueillies, non construites)

- Génération PDF serveur et stockage du fichier gelé (T5 : `fichier_ref` déjà
  prévu) — la bibliothèque reste un degré de liberté (D-2).
- Signature à distance et envoi tracé (ouvert_le déjà en colonne).
- Signature électronique qualifiée (eIDAS) : le dossier de preuve en est le socle.

## Écarts avec la documentation

Aucun. Traduction fidèle de C-02, C-26 et S6.
