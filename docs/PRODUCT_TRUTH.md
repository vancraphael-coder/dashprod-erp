# PRODUCT TRUTH — Dashprod

> **Le document maître.** Ce que Dashprod vend, à quel horizon, comment la
> donnée circule, et ce que le code fait réellement. Hiérarchie :
> `docs/LAUNCH_TRUTH.md` (le lancement : circuit cartographié + critère) ·
> `docs/analyse-mecanique.md` (mécanique du code, INC-xx) ·
> `docs/TODO-claude.md` (exécution).
>
> **Règle de méthode (anti-dérive)** : la documentation ne remplace pas le
> produit. Chaque document sert une action ; un EX se traite
> `analyse → code → test → manipulation réelle → validation → rapport`,
> jamais en sous-documents EX-04.1/.2/.3 sans toucher l'application.
>
> **Boucle de pilotage** de toute demande :
> `VISION → PRODUCT_TRUTH → ÉTAT RÉEL DU CODE → ÉCART → PLAN → CODE → TEST →
> RAPPORT → MISE À JOUR PRODUCT_TRUTH`.

Dernière mise à jour : 2026-07-26 (v2 — trois horizons séparés, statuts
stricts, Terrain créateur de constats).

## Statuts (obligatoires sur toute exigence)

| Statut | Signification |
|---|---|
| `LIVE` | existe et fonctionne réellement |
| `PARTIAL` | existe mais incomplet |
| `BROKEN` | existe mais cassé |
| `MISSING` | absent |
| `DECISION` | doit être décidé par Raphaël |
| `VISION` | direction validée, pas encore développée |
| `LOCKED` | ne se modifie plus sans décision écrite (§11) |
| `?` | invérifiable d'ici (état base inconnu, connecteur coupé) |

Un statut n'est jamais implicite : une idée sans statut n'est pas une
spécification.

---

## 0. État du lancement

Le critère, les bloqueurs et la cartographie maillon par maillon vivent dans
**`docs/LAUNCH_TRUTH.md`**. Résumé du critère :

> Faire tourner une entreprise de déménagement réelle (Roovers) pendant deux
> semaines **sans Excel ni papier**, sur le circuit complet
> authentification → paiement.

## 1. Vision long terme `VISION`

Dashprod devient une **plateforme** : mise en relation clients ↔ entreprises
de déménagement, puis fourniture à ces entreprises de leur système
opérationnel complet. On vend un **circuit**, pas des fonctionnalités :

```
DEMANDE → CLIENT → DEVIS → SIGNATURE → PLANNING → ÉQUIPE + CAMION
        → CHANTIER → PREUVES → FACTURE → PAIEMENT
```

> Dashprod n'est pas une collection de pages. C'est un système de circulation
> de données entre un client, un bureau et un terrain. Aucune étape ne recrée
> manuellement ce qui existe déjà. `LOCKED`

## 2. Horizon A — Produit actuel (à lancer maintenant)

**Périmètre** : Roovers → Bureau → Terrain → Facturation. Une entreprise,
le circuit complet, zéro architecture commerciale nouvelle.

Tout ce document distingue désormais l'horizon de chaque exigence :
**A** (lancement), **B** (SaaS vendable), **C** (plateforme réseau). Les
chantiers d'horizon B/C ne bloquent jamais un correctif d'horizon A.

### 2.1 Bureau / Terrain `LOCKED` (formulation corrigée)

```
BUREAU — DÉCIDE                      TERRAIN — EXÉCUTE ET CONSTATE
  Client · Devis · Offre               Départ réel · Pauses · Fin
  Signature · Planning                 Photos · Constats · Réserves
  Équipe · Véhicule                    Objets non prévus · Incidents
  Facture · Documents · Clôture
```

> Le Terrain **ne crée pas d'objets commerciaux ou administratifs**
> (affaires, clients, missions, factures) sans validation Bureau. Il **peut
> créer des événements et constats opérationnels** : dommage, photo, objet
> non prévu, réserve, pause, incident. Un Terrain qui ne peut que « confirmer
> ou corriger » serait trop passif.

### 2.2 La boucle d'écart terrain `VISION` (brique majeure, EX-10)

```
PLANIFIÉ → EXÉCUTÉ → RÉALITÉ OBSERVÉE → ÉCART → VALIDATION BUREAU → AJUSTEMENT
```

Exemple réel : prévu canapé/armoire/lit/20 cartons ; constaté +piano,
+15 cartons, meuble à démonter, accès escalier impossible. Le Terrain déclare
l'écart (objet non prévu, photo, commentaire, impact potentiel) ; le Bureau
valide et ajuste (devis complémentaire, facture). L'écart est un **objet**,
pas un SMS au bureau.

### 2.3 Terrain déclaratif `DECISION` (EX-02)

Heures déclarées (Bureau pré-remplit le prévu, le chef d'équipe saisit départ
réel / pauses / fin) au lieu du chronomètre. Impact vérifié : **la paie lit
aujourd'hui les heures chrono**. Décision ouverte : le chrono disparaît ou
reste en aide facultative.

## 3. Horizon B — Produit SaaS vendable

Le pricing est une **contrainte technique d'accès**, pas une page marketing :

```
PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES → LIMITES → PERMISSIONS
```

| Plan | Prix | Utilisateurs | Contenu | Statut |
|---|---|---|---|---|
| Starter | à trancher | à trancher | Clients · Devis · Planning | `DECISION` |
| **Regular** | **360 €/mois HTVA** | **5 inclus** | Core complet (devis→Peppol, inventaire simple) | `DECISION` (confirmé sur le prix, limite à confirmer — la vitrine dit « illimités ») |
| Pro / Group | à trancher | à trancher | Regular + modules avancés | `DECISION` |

Modules d'expansion `VISION` : **Multi-Dépôts** (dépôts = entités complètes —
équipes, véhicules, stocks, planning local, responsables — avec vue
consolidée direction, pas des filtres) · **Stockage 3D** (visualisation
d'occupation : plan → zones → emplacements → placement visuel → localisation ;
le 3D est l'interface, la base reste la vérité ; potentiellement produit
séparé) · **Listing International** maritime/aérien (documents, douanes,
réglementation — offre premium distincte ; ⚠ aujourd'hui codé dans le Core,
EX-08).

Implémentation cible : `organisations.plan` + droits de modules et limites
vérifiés **en base** (comme les capacités), jamais seulement masqués en UI.

## 4. Horizon C — Plateforme réseau

« Vous déménagez ? » devient moteur d'acquisition `VISION` (EX-03) :

```
CLIENT FINAL ── crée sa DEMANDE ──► BOÎTE DE RÉCEPTION entreprise
                                        │ accepte
                                        ▼
                                  CRM interne (clients/affaires)
```

**Frontière stricte** `LOCKED` par anticipation : la demande est un objet
plateforme (compte client final ↔ entreprise), **jamais fusionnée au CRM
interne avant acceptation**. Architecture : table `demandes` hors périmètre
`org_id` classique, bascule explicite à l'acceptation.

Déjà en place côté C : espace client OAuth (suivi), annuaire réseau opt-in,
signature d'offre par code.

## 5. Circuit opérationnel (horizon A)

La cartographie maillon par maillon — qui crée, quelle table, quelle RPC,
quelle source de vérité, qui modifie, quel écran, quel test, quel statut —
vit dans **`docs/LAUNCH_TRUTH.md`** (elle EST l'état du lancement). Règles
transverses :

- Une donnée saisie une fois n'est jamais réencodée (relevé → devis →
  planification → chantier → facturation). `LOCKED`
- Trois natures de données à distinguer (onboarding d'abord, EX-06) :
  introduite par l'utilisateur · vérifiée externe · générée par Dashprod.
- L'article du relevé (EX-04, cible validée par Raphaël) : **pas de photo sur
  l'article**, ligne compacte, options sous **chevron** — Commentaire ·
  Fragile · Démonter · Remonter · Particularité · Statut.
- Le Planning vérifie en chaîne à la création `VISION` (EX-07) :
  `DATE → DISPO ÉQUIPE → DISPO VÉHICULE → CONFLIT ? → TRAJET → CONFIRMATION`
  avec verdict 🔴 conflit · 🟡 trajet élevé · 🟢 disponible.

## 6. Architecture des offres — voir §3 (horizon B)

*(fusionné dans l'horizon B pour ne pas dupliquer une source de vérité)*

## 7. Permissions

**Aujourd'hui `LIVE`** : capacités par utilisateur (`utilisateur_capacites`,
`acteur_a_capacite()`), vérifiées en base.

**Cible `VISION` (horizon B)** : deux étages composés — le PLAN de
l'organisation ouvre modules et limites ; le RÔLE de l'utilisateur ouvre les
actions dans ces modules ; une action passe si module ouvert ET capacité
portée ET limite non atteinte, les trois en base. La matrice complète
plan × module × rôle × action sera écrite ICI avant toute implémentation.

## 8. Sources de vérité par donnée `LOCKED`

| Donnée | Vit dans | Ne PAS lire ailleurs |
|---|---|---|
| Montant TVAC d'une affaire | `scenarios.resultats.tvac_centimes` | en-têtes recalculés |
| Inventaire | `affaires.releve` (JSON) | table `releve` (n'existe pas) |
| Barème + suppléments | `organisations.parametres_prix` | constantes du domaine |
| TVA % | `parametres_facturation.tva_pct` via `tauxTva()` | `TVA_PCT` en dur |
| Document d'offre | `documents_instances.contenu` + empreinte | recomposition après gel |
| Identité facturation client | `clients.fact_*`, `tva_num` | adresses de chantier |
| Heures travaillées | chrono serveur **aujourd'hui** ; heures déclarées **cible** (EX-02 `DECISION`) | — |

## 9. État vision ↔ code

| Élément | Horizon | Statut | Réf. |
|---|---|---|---|
| Trois portes + résolution client d'abord | A | `LIVE` | — |
| Circuit relevé→devis→offre→facture | A | `LIVE` | LAUNCH_TRUTH |
| Signature « Lu et approuvé » | A | `?` base / badge `BROKEN` | INC-03 |
| Terrain (chrono) | A | `LIVE` mais `?` (cmd_terminer_chantier) | INC-02 |
| Boucle d'écart terrain | A | `MISSING` | EX-10 |
| Article enrichi (chevron) | A | `PARTIAL` (demont seul ; pas de photo ✓) | EX-04 |
| Meubles pré-remplis par pièce | A | `MISSING` (pièces : `LIVE`) | EX-05 |
| Planning feux + trajet + véhicule | A | `PARTIAL` (conflits équipe `LIVE`) | EX-07 |
| Exports comptables (UI) | A | moteur `LIVE`, écran `MISSING` | INC-04 |
| Onboarding BCE vérifié | A/B | `MISSING` (format TVA `LIVE`) | EX-06 |
| Plans / limites / 5 users | B | `MISSING` + vitrine `BROKEN` (« illimités ») | EX-01 |
| Demandes client | C | `MISSING` | EX-03 |
| Multi-Dépôts · Stockage 3D | B | `VISION` | EX-08 |
| Listing international | B | `LIVE` mais **dans le Core** | EX-08 |

## 10. Rapports

**Écarts (EX-xx)** — chaque écart porte statut, impact, dépendances :

- **EX-01** plans & limites & vitrine — `DECISION` · IMPACT: vitrine,
  base, inscription · DEP: pricing Starter/Pro, confirmation 5 users.
- **EX-02** terrain déclaratif — `DECISION` · IMPACT: **PAIE**, missions,
  Terrain · DEP: sort du chrono.
- **EX-03** demandes client — `VISION` (horizon C) · IMPACT: architecture
  hors org_id · DEP: périmètre v1.
- **EX-04** article enrichi — `PARTIAL→cible validée` · IMPACT: relevé,
  offre, chantier · DEP: aucune. **Premier développement post-P0.**
- **EX-05** meubles par pièce — `MISSING→cible validée` · IMPACT:
  paramètres, relevé · DEP: aucune. **Deuxième.**
- **EX-06** onboarding BCE — `MISSING` · DEP: source de vérification
  (`DECISION` Raphaël).
- **EX-07** planning feux — `PARTIAL` · DEP: réutiliser l'itinéraire devis.
- **EX-08** frontière Core/Premium — `VISION` · DEP: EX-01.
- **EX-09** vitrine vend le circuit + pavés prix — `PARTIAL` · DEP: EX-01.
- **EX-10** boucle d'écart terrain — `VISION` validée · IMPACT: terrain,
  bureau, devis complémentaire, facture · DEP: EX-02 souhaitable avant.

**Manipulation** *(tenu par Raphaël)* — la checklist complète du circuit vit
dans LAUNCH_TRUTH §3 ; notation `✓ / ⚠ UX / ✗ / ?`.

**Régression** — leçons payées : policies UPDATE (0043), `Number(null)=0`
paie ×4, écran blanc hooks ×2, schéma supposé (0055), ordre SQL (0054).
Processus : avant refactor d'un flux verrouillé, batterie d'audit + parcours
de manipulation correspondant.

## 11. Verrous `LOCKED`

1. Garde S4 — aucun UPDATE direct sur `affaires.etat`.
2. Journal `evenements` en insertion seule, jamais purgé.
3. Modèle financier canonique unique ; tous les formats en dérivent.
4. Honnêteté Peppol — jamais de statut réseau inventé.
5. Deux horloges RGPD (12 mois / 7 ans) ; la purge ne touche jamais une
   facture.
6. Résolution **client d'abord** après OAuth.
7. `anon` limité à trois RPC (aperçu, signature, annuaire).
8. Signature = mention « Lu et approuvé » + nom, exigés en base.
9. L'adaptateur, unique couche d'accès données côté web.
10. Codes : sel + empreinte, jamais en clair.
11. Le Terrain crée des constats opérationnels, pas des objets commerciaux
    (formulation §2.1).
12. La Demande (horizon C) ne fusionne jamais avec le CRM avant acceptation.

Contredire un verrou = citer le verrou, expliquer, décision écrite de
Raphaël, mise à jour de cette liste.
