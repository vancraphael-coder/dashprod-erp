# Module 13 — Conformité RGPD & Gouvernance

Fiche de module (gabarit Référence 3 · T11). Scope volontairement resserré à
ce qui est porteur pour un ERP traitant données RH et clients aujourd'hui.

## Objectif

Registre des traitements et des sous-traitants (art. 30, 28), workflow des
demandes RGPD avec échéance légale (art. 12.3 : 1 mois), anonymisation
respectant les obligations de conservation légale (comptabilité : 7 ans),
registre des violations avec échéance de notification (art. 33 : 72h).

## Ce qui est délibérément hors scope (et pourquoi)

Pas d'écran dédié pour les registres (traitements, sous-traitants, incidents) :
consultés en SQL ou exportés pour un DPO — usage rare, construire une interface
maintenant serait spéculatif. Pas de gestion de consentement marketing active :
Dashprod n'envoie aucune communication commerciale aujourd'hui ; la table
existe pour accueillir ce besoin sans refonte (I-7) le jour où il apparaît,
pas pour un usage fictif.

## Architecture

- **Domaine** (`packages/domaine/src/conformite/retention.js`) :
  `echeanceDemandeRGPD` (30 jours), `echeanceNotificationIncident` (72h),
  `eligibleMinimisation` (inactivité commerciale, 3 ans).
- **SQL** (`0016`) : `registre_traitements` et `sous_traitants` (contenu réel,
  pas fictif — reflète la stack T1) ; `consentements` (générique, minimal) ;
  `demandes_rgpd` + `cmd_creer_demande_rgpd`/`cmd_traiter_demande_rgpd` ;
  `cmd_anonymiser_client` (vérifie l'absence de facture sous conservation
  légale avant d'effacer) ; `incidents_securite`.

## Le point de tension documenté, pas caché

Le journal d'événements est append-only par conception (C-05). Certains
événements déjà émis (`Utilisateur.Invite`) portent un email en clair dans
leur payload — techniquement inefficaçable sans casser l'invariant d'audit.
Non corrigé rétroactivement (on ne réécrit pas l'historique). Retenu pour la
suite : les nouveaux événements ne portent que des identifiants.

## Dépendances

Dépend du Noyau, d'Identité (`gerer_referentiels`), du CRM (clients/affaires)
et de Facturation (le verrou de conservation légale interroge `factures`).

## Interfaces (contrat)

- Domaine : `echeanceDemandeRGPD(recueLe, ref?, joursLegal?)`,
  `echeanceNotificationIncident(decouverteLe, ref?, heuresLegal?)`,
  `eligibleMinimisation(derniereActiviteLe, ref?, dureeAns?)`.
- SQL : `cmd_creer_demande_rgpd`, `cmd_traiter_demande_rgpd`,
  `cmd_anonymiser_client(client)`.

## Événements

`DemandeRGPD.Recue`, `DemandeRGPD.Traitee`, `Client.Anonymise`.

## Tests

`packages/domaine/tests/conformite.test.js` — 8 cas : échéance RGPD (calcul,
dépassement, extension motivée), échéance incident (calcul, dépassement),
minimisation (éligible, non éligible, limite incluse). Statut : 8/8 verts
(122/122 au total).

## Écarts avec la documentation

Aucun dans les Références (sujet non couvert par S1-S11/T0-T12). Le contenu
des registres reflète l'état réel du projet (Supabase, Vercel) — actualisable
si la stack évolue.

---

# Complément — Module 6 : écran Offre & Signature (finalisation)

La fiche `06-documents.md` listait l'écran Offre comme évolution future ;
il est construit dans cette même session.

- `Offre.jsx` : instanciation figée (C-02) avec C.B.D. jointe automatiquement
  et non désactivable (S6) ; badge d'intégrité (`instanceIntacte`, rejouable) ;
  pad de signature canvas natif (aucune dépendance ajoutée) ; la signature
  déverrouille la transition d'affaire vers « confirmé » (invariant absolu).
- Gap comblé (`0015`) : `documents_modele_versions` n'avait jamais été semée —
  `cmd_instancier_offre` (Module 6, migration 0008) n'aurait jamais trouvé de
  modèle actif. Trois gabarits d'offre (structure, pas texte légal) + une ligne
  C.B.D. dont le fichier réel doit être déposé en Storage par le fondateur
  (jamais inventé ici). FK `documents_instances.scenario_id → scenarios(id)`
  enfin posée (fermait un gap ouvert depuis Module 6, possible depuis l'ajout
  de la table `scenarios`).
