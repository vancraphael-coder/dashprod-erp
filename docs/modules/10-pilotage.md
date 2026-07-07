# Module 10 — Pilotage

Fiche de module (gabarit Référence 3 · T11). Dernier module du vertical : il
agrège, il ne possède rien.

## Objectif

Fournir les indicateurs de pilotage par rôle : carnet signé (CA), rentabilité
par chantier (marge devisée vs réelle), et équilibre de charge d'équipe — à
partir des données produites par les autres modules, sans jamais les dupliquer.

## Architecture

- **Domaine** (`packages/domaine/src/pilotage/`) :
  - `finances.js` — CA signé (états engagés seulement), ventilation par état,
    dérive de marge (devisé vs réel), alerte de dérive.
  - `charge.js` — équilibre de charge (moyenne, ±20 %, tri), déséquilibres.
- **SQL** (`0013`) : vues `v_ca_signe` et `v_charge_membre` — AUCUNE table. Le
  pilotage lit les scénarios retenus, les affaires et les missions ; la
  qualification fine reste en domaine.

## Responsabilités

- CA signé : somme des TVAC des affaires engagées (confirme→paye), hors devis et
  annulés — cohérent avec l'indicateur de la liste des dossiers.
- Rentabilité par chantier : marge réelle (coûts constatés via chrono, carburant,
  matériel) vs marge devisée (chiffrage) ; dérive et alerte (S5).
- Charge d'équipe : heures par membre (source unique : affectations, C-13),
  équilibre à ±20 % de la moyenne, extrêmes mis en avant.

## Dépendances

Lit **CRM** (affaires, états), **Chiffrage** (scénarios retenus : TVAC, marge,
heures), **Opérations** (missions, affectations, chrono → coût réel),
**Stocks/RH** (coûts réels). Ne possède ni n'écrit aucune donnée métier :
principe « une donnée existe une seule fois » (noyau). Ne dépend d'aucun module
aval.

## Interfaces (contrat)

- Domaine : `caSigne(affaires)`, `caParEtat(affaires)` ;
  `deriveMarge(recette, coutDevise, coutReel)`, `alerteDerive(d, seuil?)` ;
  `equilibreCharge(membres)`, `desequilibres(bilan)`.
- SQL : vues `v_ca_signe`, `v_charge_membre` (lecture, RLS héritée).

## Événements

Aucun émis (module de lecture). Consomme indirectement les effets de
`Affaire.*`, `Mission.*`, `Chrono.Arrete`, `Facture.Emise` — c'est-à-dire les
données que ces événements ont fait évoluer. Les vues sont candidates à la
matérialisation rafraîchie sur ces événements si le volume l'exige (T8, I-8).

## Tests

`packages/domaine/tests/pilotage.test.js` — 10 cas : CA signé (exclusion
devis/annulé, ventilation), dérive de marge (conforme, réel plus coûteux,
alerte au seuil), équilibre de charge (moyenne, sur/sous-charge ±20 %, tri,
déséquilibres). Statut : 10/10 verts (114/114 au total).

## Évolutions futures (accueillies, non construites)

- Continuité narrative bureau → terrain → comptable (Réf. 2, financial reality
  V3) : les événements en sont la trame.
- Tableaux de bord par rôle projetés à l'écran (S9) — les indicateurs sont
  calculés ; leur affichage relève des écrans.
- Matérialisation des vues sur événements (T8) si montée en charge.

## Écarts avec la documentation

Aucun. Traduction fidèle des indicateurs de la liste, de Ressources · Heures et
de la rentabilité par chantier (S5).
