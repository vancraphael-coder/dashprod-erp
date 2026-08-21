# CHARTE DU CHANTIER COMPTABLE — Dashprod

> **Document maître du chantier comptable.** Il fait office à la fois de note
> d'architecture et de **charte de fonctionnement** entre le **Mentor**
> (l'architecte/visionnaire qui veille à la trajectoire) et le **Constructeur**
> (Claude, qui inspecte l'existant, écrit le domaine, les tests et les
> interfaces). Raphaël reste le seul décideur métier/juridique/fiscal ; il
> consulte GPT personnellement pour une confirmation quand il le juge utile.
>
> **Hiérarchie documentaire :** `PRODUCT_TRUTH.md` (le produit) ·
> `PASSATION.md` (l'exécution) · **ce document** (le chantier comptable).
> En cas de conflit, `PRODUCT_TRUTH.md` reste la source produit ; la présente
> charte ne contredit jamais la règle d'horizontalité (`packages/domaine/architecture.js`).
>
> **Dernière mise à jour :** 21/08/2026 — ajustement du périmètre Phase 1
> (découpage 1a/1b/1c : un seul type d'événement `facture_emise`, écritures
> figées, `exports.js` adaptateur consommateur). Après inspection du schéma
> Supabase (projet `usldgiordguqchclvdms`, 62 tables) et du paquet
> `packages/domaine`.
>
> **Méthode (anti-dérive) :** aucune ligne de cette charte n'est une spécification
> tant qu'elle n'a pas le statut `LIVE` / `PARTIAL` / `MISSING` / `DECISION` /
> `VISION` / `LOCKED` au sens de `PRODUCT_TRUTH.md`. Une idée sans statut n'est
> pas une spec.

---

## 0. Rôles et boucle de pilotage

```
Raphaël (décideur métier/juridique/fiscal)
        │  tranche les décisions irréversibles
        ▼
MENTOR (architecte / visionnaire / contradicteur)
   · pense les trajectoires, les risques, les architectures possibles
   · formule des ADR, découpe la roadmap, prépare les questions à trancher
   · NE code pas à la place du Constructeur
        │  livrables contrôlés (paquets courts, versionnés)
        ▼
CONSTRUCTEUR — Claude
   · inspecte l'existant avant de construire
   · écrit le domaine, les tests, les interfaces, les migrations
   · reste aux commandes de l'exécution
        │
        ▼
TESTS → RAPPORT → mise à jour PRODUCT_TRUTH + présente charte
```

**Boucle obligatoire de toute décision comptable :**
`VISION → cette charte → ÉTAT RÉEL DU CODE → ÉCART → ADR → CODE → TEST → RAPPORT`.

Le Mentor n'intervient **pas en continu** : il intervient sur des **livrables
contrôlés** (paquets courts, versionnés), pas sur un flux d'opinions en temps
réel. C'est ce qui garantit la vitesse sans diluer la responsabilité.

---

## 1. Constat vérifié de l'existant (au 21/08/2026)

Inspection du schéma Supabase (62 tables) + paquet `packages/domaine`. Ce qui
existe **déjà** et touche à l'argent, à la facturation, à la TVA, aux paiements,
aux documents et à la traçabilité :

### 1.1 Ce qui existe et DOIT être réutilisé (ne pas reconstruire)

| Brique | Où | Statut | Pourquoi c'est un socle |
|---|---|---|---|
| Journal d'audit append-only | `evenements` (trigger d'immutabilité) | `LIVE` (1275 lignes) | Audit/provenance : « qui a fait quoi, quand, sur quelle entité ». **Ne pas surcharger** en y mettant la comptabilité. |
| Facture légale immuable | `factures` (`emise=true` fige par trigger) | `LIVE` | Stocke `htva_centimes`/`tva_centimes`/`tvac_centimes`, `echeance`, `communication`, `facture_corrigee` (UUID), `type` (facture/avoir). La correction passe par une nouvelle facture, jamais par édition. |
| Lignes de facture | `facture_lignes` | `LIVE` | `montant_htva_centimes`, `prix_unitaire_centimes`, `tva_pct` (NULL = taux org à l'émission ; figé à l'émission). |
| Paiements | `paiements` | `LIVE` | `montant_centimes` → `factures`, `moyen`, `date_paiement`. Un remboursement = montant négatif. |
| Référentiels versionnés | `referentiels` (`version`, jamais modifié, republié) | `LIVE` | TVA, barèmes, mentions. C'est déjà le bon modèle pour toute donnée fiscale stable. |
| Canal de transmission documentaire | `transmissions` (`canal` ∈ PEPPOL/EMAIL/PDF, `etat`, `cle_idempotence`) | `LIVE` | **Peppol est déjà un canal, pas la comptabilité.** Préserver cette frontière. |
| Échéances récurrentes | `stock_echeances` (`contrat_id`, `periode_debut/fin`, `montant_centimes`, `facture_id`) | `PARTIAL` (0 lignes) | Moteur de facturation récurrente garde-meubles. Alimente déjà une créance. |
| Numérotation légale | `sequences` (`org_id`+`type`+`annee`+`prochain`) | `LIVE` | Sécable : on peut numéroter des écritures/comptes de la même façon. |
| Tiers client | `clients` (`tva_num`, `peppol_id`, `fact_pays`, `client_interne`) | `LIVE` | A déjà la TVA et l'identifiant Peppol du destinataire. |
| Organisation | `organisations` (`tva`, `parametres_facturation` jsonb, `retention_operationnelle_mois`=12 vs fiscal 7 ans) | `LIVE` | Conscience de la rétention fiscale déjà présente. |
| Litiges chiffrés | `litiges` (`montant_centimes`, `journal` jsonb) | `LIVE` | Un litige a déjà un impact économique et un journal. |

### 1.2 Le bridge comptable existe DÉJÀ — comme projection stateless

`packages/domaine/src/facturation/exports.js` contient déjà :

- `journalVentes(factures, comptes)` — **écritures à double entrée** (débit
  client TVAC, crédit ventes HT par taux, crédit TVA collectée par taux).
- `COMPTES_DEFAUT` — **plan comptable PCMN belge** paramétrable :
  `clients: 400000`, `ventes: 700000`, `tva_due: 451000`.
- `equilibre(ecritures)` — contrôle débit = crédit.
- `journalCsv`, `versCsv` — relevé que tout comptable sait lire.
- `ecrituresFec` / `versFec` / `FEC_COLONNES` — **format FEC français** (18 colonnes
  réglementaires), pour les clients opérant en France.
- `noteDeCredit(...)` — génération d'avoir (signe inversé).
- `versUBL` (Peppol) + `peppol.js` + `digiteal.js` — e-invoicing/facturation électronique belge.

**Forme canonique de l'écriture aujourd'hui (à préserver/évoluer, pas à inventer) :**

```js
// Écriture (projection, non persistée)
{ date, piece, compte, libelle, debit_centimes, credit_centimes }

// Modèle canonique facture consommé par exports.js
f = {
  numero, date_emission, type,        // 'facture' | 'avoir'
  devise, echeance, communication,
  acheteur: { nom, tva },
  total: { htva_centimes, tva_centimes, tvac_centimes },
  ventilation_tva: [{ taux, base_centimes, tva_centimes }]
}
```

> Le commentaire du fichier le dit lui-même : « Tous partent du MODÈLE
> CANONIQUE, jamais du PDF. Le cœur ne dépend d'aucun logiciel comptable :
> chaque format est un adaptateur, testable seul, remplaçable sans toucher au
> reste. » **L'Architecture D du brief (ERP → ledger → moteur fiscal → moteur
> comptable → bridge) est donc déjà esquissée — sauf le maillon central : le
> ledger immuable n'existe pas.**

### 1.3 Ce qui manque (le gap)

| Manque | Statut | Impact |
|---|---|---|
| Ledger économique immuable persisté | `MISSING` | `exports.js` calcule les écritures **à la volée** ; elles ne sont ni stockées, ni versionnées, ni immuables. Aucune réversibilité, aucune preuve d'écriture passée. |
| Événement économique canonique | `MISSING` | Pas de représentation unifiée d'un fait économique (qu'est-ce qui s'est passé, pourquoi, sur quelle source, avec quelle pièce, quelle règle l'a transformé). |
| Côté achats / fournisseurs | `MISSING` | Aucune table d'achat, de facture fournisseur, de dépense, de note de frais. Donc **TVA déductible inexistante** — seule la TVA collectée (ventes) est couverte. |
| Période comptable / clôture | `MISSING` | Pas de modèle de période ouverte/contrôle/verrouillée/réouverture. Aucun verrou de clôture. |
| Rapprochement bancaire | `MISSING` | Aucun lettrage, aucune correspondance paiement ↔ flux bancaire importé. |
| Comptable externe | `MISSING` | Pas de rôle « expert-comptable », pas de permissions de lecture/validation/verrouillage/export. |
| TVA : déclarations et déductible | `MISSING` | Pas de moteur de déclaration TVA (collectée − déductible), pas de gestion des exonérations/intracommunautaire/autoliquidation. |
| Mouvement de stock à conséquence économique | `PARTIAL` | `stock_mouvements` existe (0 lignes) mais sans lien comptable. `valoriserConsomme` est prêt côté domaine (C-18) mais non branché. |

---

## 2. La question fondamentale — représentation canonique d'un événement économique

> « Quelle est la représentation canonique d'un événement économique dans Dashprod ? »

Réponse de principe (statut `VISION`, à valider en Phase 0) :

Un événement économique est un **fait structuré immuable** qui décrit ce qui
s'est passé dans l'entreprise, **avant** toute interprétation fiscale ou
comptable. Il est produit par les modules métier (ventes, achats, trésorerie,
stocks) et **consommé** par le moteur fiscal puis comptable. Les verticales
(déménagement, lift, garde-meubles…) n'ont jamais à connaître la comptabilité :
elles émettent des événements économiques.

```
EVENT ÉCONOMIQUE (fait immuable)
   ├── organisation
   ├── type            (vente | avoir | paiement_recu | achat | frais | remboursement |
   │                   mouvement_stock | echeance | correction | cloture | …)
   ├── date_economique (quand le fait s'est produit — ≠ date de saisie)
   ├── source          (module métier émetteur : crm | facturation | stocks | rh | …)
   ├── source_id       (entité d'origine : facture_id, paiement_id, contrat_id…)
   ├── sens            (entrée | sortie de valeur)
   ├── montant_centimes, devise
   ├── partenaire      (client_id | fournisseur_id — tiers économique)
   ├── pièce           (justificatif : facture, ticket, bon, reçu, document Peppol)
   ├── fiscalite       (qualification : assujetti, taux, exonération, intracommunautaire…)
   ├── auteur, horodatage, version
   └── provenance      (lien vers evenements — l'audit, jamais le double emploi)
```

Puis la chaîne (une seule direction, jamais l'inverse) :

```
événement économique immuable
        ↓  qualification (règle métier : que représente ce fait ?)
        ↓  fiscalité     (règle fiscale : comment est-il traité ?)
        ↓  moteur comptable (règle comptable : comment le représenter ?)
        ↓  écriture (double partie, immuable, versionnée)
        ↓  journal → période → reporting
        ↓  bridge comptable (exports.js devient UN adaptateur parmi plusieurs)
```

**Invariant :** la comptabilité est une **projection** des événements
économiques, jamais une deuxième source de vérité. Le plan comptable est une
représentation, pas le socle. On ne commence JAMAIS par dessiner « 400 Clients /
700 Ventes ».

---

## 3. Architectures candidates

| | A | B | C | D (light) ★ |
|---|---|---|---|---|
| Flux | ERP → écritures | ERP → événements → moteur → écritures | ERP → **ledger immuable** → projections multiples | ERP → **ledger économique immuable** → qualification → fiscal → comptable → bridge |
| Avantage | Simple, immédiat | Découplage métier/compta | Auditabilité, réversibilité, multi-projections | Idem C + séparation fiscale/comptable explicite + bridge remplaçable |
| Inconvénient | Dette structurelle : 2ᵉ source de vérité, pas de réversibilité | Le moteur reste stateful, pas d'historique d'écriture | Plus de tables, plus de discipline | Le plus exigeant en conception |
| Auditabilité | Faible | Moyenne | Forte | Forte |
| Multi-secteur | Cassé | OK | OK | OK |
| Bridge externe | Verrouillé | Remplaçable | Remplaçable | Remplaçable |
| Risque de verrouillage | Élevé | Moyen | Faible | Faible |

### 3.1 Recommandation — Architecture D light (statut `VISION`)

**Choix : D light.** Raisons :

1. **Le socle existe déjà.** `exports.js` est *déjà* un adaptateur partant d'un
   modèle canonique. La seule chose qui manque est le maillon central — le
   ledger immuable — pas toute la chaîne.
2. **`evenements` ne peut pas servir de ledger.** C'est un journal d'audit
   opérationnel (« qui a modifié quoi »). Le ledger économique est un concept
   différent (« quel fait économique existe »). Les lier par `provenance`, pas
   les fusionner — sinon on mélange provenance et fait économique.
3. **La réversibilité est un invariant du brief.** Seul un ledger immuable +
   contrepassation permet de corriger sans « modifier l'histoire ».
4. **Le bridge doit rester remplaçable.** Le modèle canonique appartient à
   Dashprod ; `exports.js`, FEC, CSV, Peppol sont des projections consommatrices.

### 3.2 Frontières explicites (séparation des responsabilités)

| Couche | Responsabilité | Où |
|---|---|---|
| Métier | Ce qui s'est passé dans l'entreprise | modules métier existants (crm, facturation, stocks, rh…) |
| Événement économique | Le fait structuré immuable | **à créer** : `evenements_economiques` |
| Qualification | Comment le fait est qualifié | **à créer** : règles du domaine |
| Fiscal | Comment l'opération est traitée fiscalement | **à créer** : moteur TVA (réutilise `referentiels`) |
| Comptable | Comment elle est représentée | **à créer** : `ecritures_comptables` (immuables, versionnées) |
| Documentaire | Quelle pièce justifie l'opération | `documents_instances` + `transmissions` (existants) |
| Réglementaire | Contraintes à respecter | ADR + `DECISION` à trancher par Raphaël |
| Audit | Comment prouver ce qui s'est passé | `evenements` (existant) + `provenance` |
| Interface | Comment l'utilisateur le voit | écrans (en dernier) |

---

## 4. Couche d'écoulement logique

### 4.1 Vision pratique — comment l'argent circule aujourd'hui

```
CLIENT (crm)
   └─ affaire (etat = machine S4)
        ├─ chiffrage → scenario.resultats (HTVA)
        ├─ offre signée (signatures)
        ├─ mission(s) → exécution (planning, affectations, chrono, constats)
        │     └─ stock_mouvements (consommation matériel — valoriserConsomme prêt, non branché)
        ├─ facture (immuable dès emise=true)
        │     ├─ facture_lignes (tva_pct figé à l'émission)
        │     ├─ ventilation_tva (par taux)
        │     └─ transmissions (PEPPOL/EMAIL/PDF) — Peppol = canal, pas compta
        ├─ paiements → solde (etatPaiement : à_payer|partiel|payé)
        ├─ note de crédit (facture_corrigee — signe inversé)
        ├─ stock_echeances (récurrent garde-meubles → facture_id)
        └─ litiges (montant_centimes + journal)
```

L'argent est déjà **cohérent en centimes**, immuable sur la facture, tracé par
`evenements`. Ce qui n'existe pas : la **projection comptable persistée** de ces
faits, et le **côté achats/fournisseurs**.

### 4.2 Vision logique mécanique — la chaîne cible

```
[faits métier]  factures · paiements · stock_echeances · (à venir) achats · frais · remboursements
        │
        │  (1) capture — le module métier émet un événement économique
        ▼
evenements_economiques  (IMMUABLE, append-only, trigger comme factures)
   type · date_economique · source · source_id · sens · montant_centimes ·
   partenaire · pièce · fiscalite · auteur · horodatage · version · provenance→evenements
        │
        │  (2) qualification — que représente ce fait ?
        ▼
qualifications_comptables  (règle appliquée, version de règle, résultat motivé)
   retourne une Décision motivée {compte, contrepartie, sens, tva}
        │
        │  (3) projection comptable — représentation double partie
        ▼
ecritures_comptables  (IMMUABLE, versionnées, lettrées, rattachées à une période)
   journal · piece · compte · libelle · debit_centimes · credit_centimes ·
   periode_id · source_event_id · regle_version
        │
        │  (4) agrégation / contrôle
        ▼
periodes_comptables  (ouverte → contrôle → verrouillée → réouverture contrôlée)
journaux · ventilation_tva · equilibre (débit=crédit)
        │
        │  (5) bridge — projections consommatrices, remplaçables
        ▼
exports.js (CSV · journalVentes · FEC · …)   ← déjà existant, devient adaptateur
        │
        ├── logiciel comptable A
        ├── logiciel comptable B
        ├── comptable humain
        ├── API / export réglementaire
        └── déclaration TVA
```

**Règle de la flèche (invariant) :** le sens est unique. Le module métier ne
connaît jamais la comptabilité. Le ledger ne connaît jamais l'interface. Le
bridge ne remonte jamais modifier le ledger. `architecture.js` l'impose déjà
pour les verticaux ; la même discipline vaut pour la comptabilité.

---

## 5. Modèle comptable canonique (à créer, Phase 1)

Tables cibles (statut `VISION` — à valider avant tout code) :

- `evenements_economiques` — ledger immuable (trigger d'immutabilité comme
  `factures`). Clé de provenance vers `evenements` (audit), jamais l'inverse.
- `qualifications_comptables` — règle appliquée + version de règle + résultat
  motivé (une décision, pas un booléen).
- `ecritures_comptables` — écritures immuables, versionnées, lettrées,
  rattachées à `periode_id` et `source_event_id`.
- `periodes_comptables` — état complet (ouverte/contrôle/verrouillée), pas un
  booléen.
- (plus tard) `factures_fournisseurs`, `depenses`, `notes_frais`,
  `rapprochements_bancaires`, `comptable_acces` (rôle externe).

> **À NE PAS reconstruire :** `exports.js`, `factures`, `facture_lignes`,
> `paiements`, `referentiels`, `transmissions`, `sequences`, `evenements` (audit),
> le modèle canonique facture de `modele.js`. Ils deviennent consommateurs ou
> sources du ledger, jamais remplacés.

---

## 6. Audit, immutabilité, corrections

- **Immuabilité :** le ledger et les écritures sont append-only (trigger, comme
  `factures.emise`). Une écriture validée ne s'édite pas.
- **Correction :** passe par **contrepassation** (nouvel événement opposé +
  nouvelle écriture), avec conservation de l'historique. Reproduit le pattern
  `facture_corrigee` déjà en place.
- **Provenance :** chaque événement économique pointe vers sa source métier
  (`source_id`) ET vers `evenements` (audit d'origine). Double traçabilité.
- **Audit trail :** chaque écriture répond à « qui, quand, quoi, pourquoi,
  depuis quoi, avec quelle règle, quelle pièce, quelle modification, quelle
  version ».

---

## 7. TVA — séparation des responsabilités

Ne jamais coder une règle fiscale sans distinguer :

- **règle métier** (le fait) · **règle fiscale** (le traitement TVA) ·
  **règle comptable** (la représentation) · **règle réglementaire** (la contrainte).

La TVA réutilise `referentiels` (taux versionnés, jamais modifiés, republiés).
Le moteur TVA couvrira, par paliers : collectée → déductible → intracommunautaire
→ autoliquidation → exonérations → avoirs → déclarations. **Le taux est figé à
l'émission** (déjà le cas sur `facture_lignes.tva_pct`) : le moteur ne
recalcule jamais une facture émise.

---

## 8. Peppol — place exacte

Peppol est un **canal d'échange documentaire**, pas la comptabilité. La chaîne
est :

```
événement économique → facture structurée (modèle canonique) → Peppol
```

et dans l'autre sens (réception d'une facture fournisseur Peppol) :

```
document Peppol entrant → qualification → comptabilité fournisseur (à créer)
```

`transmissions` + `peppol.js` + `ubl.js` + `digiteal.js` incarnent déjà ce canal.
On ne les fusionne jamais avec le ledger.

---

## 9. Bridge comptable — frontière propre

```
Dashprod → Canonical Accounting Model → Accounting Bridge
   ├── exports.js (CSV / journalVentes / FEC)   ← existant, devient adaptateur
   ├── logiciel comptable A
   ├── logiciel comptable B
   ├── comptable humain
   ├── API
   └── export réglementaire / déclaration TVA
```

Le modèle canonique appartient à Dashprod. Les connecteurs sont remplaçables.
Le bridge **consomme** le ledger, ne l'alimente jamais.

---

## 10. Architecture UX — « expliquer la comptabilité »

L'utilisateur non comptable ne choisit jamais lui-même compte/journal/contrepartie.
Dashprod déduit du contexte, mais **toute automatisation reste explicable,
contrôlable et corrigeable**.

Concept UX central : le **« Pourquoi ? »**. Chaque écriture expose :
source · règle appliquée · TVA · compte · date · pièce · utilisateur · correction
éventuelle. Exemple : « Cette facture a généré cette écriture parce que… ».

Chaîne navigable dans la fiche opération :
`Facture → Client → Prestation → HTVA → TVA → Total → Paiement → Écriture → Journal → Période`.

« Comptabilité négative » : l'utilisateur pense « j'ai payé ceci » / « ce client
m'a payé » / « j'ai reçu cette facture » ; Dashprod transforme l'action
opérationnelle en conséquence économique. Sans jamais perdre la rigueur.

---

## 11. Multi-tenant, permissions, comptable externe

- **Multi-tenant strict** : toute table comptable référence `org_id` (RLS, comme
  partout). Aucune fuite inter-tenant. Cloison inter-sociétés déjà en place
  (migration 0079).
- **Rôle « expert-comptable »** (à créer) : lecture · validation · correction ·
  verrouillage · clôture · export · rapprochement · demande de pièce ·
  commentaire · contrôle. Pas un utilisateur administratif classique.
- **Future logique :** Entreprise ↔ Dashprod ↔ Comptable.

---

## 12. Agrément / conformité — à vérifier (jamais affirmé)

Toute affirmation réglementaire/fiscale/d'agrément doit porter un statut :
`VÉRIFIÉE` · `À VÉRIFIER` · `HYPOTHÈSE` · `DÉCISION JURIDIQUE NÉCESSAIRE`.
Dashprod n'est PAS un logiciel comptable agréé. On construit une architecture qui
**pourrait** soutenir cette trajectoire, sans le prétendre.

---

## 13. Risques et contradictions à signaler

- **Risque de sur-ingénierie.** Ne pas construire aujourd'hui une banque, un
  moteur fiscal mondial, une infrastructure financière. Construire les
  **interfaces conceptuelles** qui permettront de les ajouter sans casser le cœur.
- **Risque de dette structurelle.** Si l'on persévère avec `exports.js` comme
  seule représentation (stateless), on ne pourra jamais prouver une écriture
  passée ni réouvrir proprement une période. À signaler à Raphaël.
- **Contradiction à surveiller :** toute demande de « livrer vite une compta
  simple » qui contournerait le ledger créerait une dépendance rendant le futur
  bridge difficile. Le Mentor doit le signaler et proposer une alternative.

---

## 14. Règle des 3 horizons (obligatoire par décision)

- **H1 — maintenant :** ledger immuable + projection ventes (TVA collectée).
  Ce que Dashprod doit réellement faire pour le produit actuel (Roovers).
- **H2 — croissance :** côté achats/fournisseurs (TVA déductible), périodes,
  rapprochement, déclarations, multi-sociétés à 100/1000/10000 entreprises.
- **H3 — infrastructure :** si Dashprod devenait une plateforme comptable/
  financière de référence — sans coder prématurément cette couche.

---

## 15. Roadmap

### 15.1 Roadmap MENTOR (l'architecte veille)

| Phase | Mission du Mentor | Livrable |
|---|---|---|
| 0 | Valider la représentation canonique de l'événement économique ; arbitrer A/B/C/D ; figer les frontières de couches | ADR-009 + présente charte `LOCKED` sur l'architecture |
| 1a | Vérifier le contrat du ledger (shape, immutabilité, provenance) sur UN seul type d'événement (`facture_emise`) avant tout UI | Spec ledger + liste `DECISION` |
| 1b | Valider la figération de l'écriture (snapshot immuable, non recalculé) ; refuser qu'un changement de règle altère une écriture passée | ADR écriture figée |
| 1c | Valider la frontière du bridge (`exports.js` consommateur du ledger, pas du PDF) ; refuser tout couplage au fournisseur | ADR bridge |
| 2 | Valider la séparation TVA collectée/déductible et la figuration des taux ; challenger la périodicité | ADR TVA |
| 3 | Définir le modèle de période/clôture et le rôle comptable externe | ADR clôture |
| 4 | Définir le rapprochement et l'import bancaire | ADR rapprochement |
| 5 | Cartographier les exigences d'agrément/conformité (`À VÉRIFIER`) ; ne jamais affirmer | Note conformité |

### 15.2 Roadmap CONSTRUCTEUR (Claude construit)

> **Règle minimale viable (invariant de la Phase 1) :** *une facture client émise
devient un événement économique immuable, qui devient un jeu d'écritures du
journal des ventes équilibré et immuable.* C'est la plus petite preuve utile de
l'architecture — elle valide le sens de la flèche sans construire une plateforme.

| Phase | Ce que Claude construit | Critère de fin |
|---|---|---|
| 0 | Inspecter l'existant (fait) ; ne pas coder tant que l'ADR-009 n'est pas validé | Carte de l'existant + ADR |
| **1a** | `evenements_economiques` (trigger immuabilité) — **un seul type source : `facture_emise`**. Payload figé : `org_id`, `type`, `date_economique`, `source_type`, `source_id`, `piece_type`, `piece_id`, `partenaire_type/id`, `devise`, `montants`, `ventilation_tva`, `regle_version`, `created_at`, `created_by`, `audit_event_id` (lien `evenements`). Pas d'achats, pas de périodes, pas d'UI, pas de réécriture Peppol. | Une facture émise crée **un** événement immuable ; un avoir crée un **autre** événement, jamais une mutation. `npm test` vert. |
| **1b** | `ecritures_comptables` (immuables, figées) pour `facture_emise` uniquement. Shape miroir de `journalVentes` : `date`, `piece`, `compte`, `libelle`, `debit_centimes`, `credit_centimes`, + `event_id`, `journal`, `ligne_no`, `regle_version`. Pas de périodes complètes (`periode_id` nullable, réservé Phase 3). | Écritures équilibrées ; changer `COMPTES_DEFAUT` ou une règle plus tard **ne modifie pas** les écritures déjà persistées. |
| **1c** | Adapter `exports.js` pour consommer **soit** le modèle canonique facture (comportement actuel conservé), **soit** les écritures persistées. Le bridge reste remplaçable. | Export du journal des ventes **depuis les écritures figées** (non recalculé) — valeur livrable à Roovers. |
| 2 | Moteur TVA collectée (réutilise `referentiels`) + pièces justificatives + audit trail ; extension aux autres types d'événements (`paiement_recu`, `avoir`, `echeance`) | Tests métier sur chaque règle fiscale |
| 3 | `periodes_comptables` (ouverte/contrôle/verrouillée/réouverture) + rapprochement bancaire | Clôture testable, réouverture contrôlée |
| 4 | Rôle expert-comptable + permissions + collaboration entreprise↔comptable | Accès externes testés |
| 5 | Préparation reconnaissance/certification (conformité à vérifier, jamais affirmée) | Note conformité |

> **Commandement au Constructeur :** petites phases, **tests d'abord**, **pas
> d'interface tant que le contrat du ledger n'est pas validé**. Chaque règle
> métier importante doit être testée. Chaque fonction importante retourne une
> **décision motivée**, pas un booléen. Les commentaires expliquent le pourquoi.
> Vérifier l'existant avant de construire. Signaler les hypothèses avant de
> coder. Ne pas trancher seul les décisions commerciales. Une donnée, une
> commande. Supprimer les doublons d'interface. Le déménagement ne doit pas
> devenir la structure du cœur.

---

## 16. Ce qui peut être codé immédiatement vs ce qui ne doit surtout pas l'être

**À coder (Phase 1a→1c, après ADR-009) :**
- **1a :** le contrat du ledger `evenements_economiques` + trigger d'immutabilité, sur le seul type `facture_emise`.
- **1b :** la persistance des écritures figées `ecritures_comptables` (snapshot, non recalculé).
- **1c :** l'adaptation de `exports.js` pour consommer les écritures persistées (comportement actuel conservé par défaut).
- Les tests du contrat du ledger **avant toute interface**.

**À NE PAS coder maintenant :**
- Une UI comptable tant que le contrat 1a/1b n'est pas validé par tests.
- Le côté achats/fournisseurs, la TVA déductible (Phase 2+).
- Les périodes/clôture complètes, le rapprochement bancaire, le rôle comptable externe (Phase 3+).
- Le moteur fiscal mondial, un système bancaire, une infrastructure financière.
- Un couplage dur à un logiciel comptable tiers (le bridge reste remplaçable).
- Une deuxième source de vérité pour les montants (le ledger projette, ne duplique pas).
- Toute affirmation d'agrément/conformité (`À VÉRIFIER` uniquement).

---

## 17. Questions à trancher par Raphaël (statut `DECISION`)

1. Le ledger économique est-il **immuable par trigger** (comme `factures.emise`)
   dès la capture, ou seulement après qualification ? (impact réversibilité)
2. La qualification est-elle **synchrone** (à la capture) ou **asynchrone**
   (batch) ? (impact UX « pourquoi ? » en temps réel)
3. Le plan comptable (PCMN) est-il **paramétrable par organisation** dès la
   Phase 1, ou partagé puis spécialisé ?
4. Périmètre TVA collectée seul en Phase 2, ou ouverture simultanée du côté
   achats ? (impact temps de livraison)
5. Le comptable externe est-il un **utilisateur Dashprod** ou un **accès API
   dédié** ? (impact modèle de permissions)

---

## 18. Critère de réussite

Le chantier est réussi lorsque :

> Dashprod peut générer ses conséquences comptables à partir de ses événements
> métier sans que les verticales aient besoin de connaître la comptabilité en
> profondeur ; un tiers externe peut comprendre, vérifier, exporter et reprendre
> la chaîne économique ayant conduit à une écriture ; et si Dashprod devait un
> jour devenir un acteur officiellement reconnu dans la chaîne comptable, nous
> n'aurions pas à jeter le cœur construit aujourd'hui.

**Phrase directrice (invariant) :**

> Dashprod ne doit pas seulement savoir combien une entreprise a facturé.
> Dashprod doit savoir **pourquoi** ce montant existe, quelle opération l'a
> produit, quelle preuve le justifie, quelle règle l'a transformé en donnée
> comptable, qui l'a validé et comment un tiers peut le vérifier.

---

## 19. Maintenance de cette charte

- À mettre à jour à chaque ADR comptable, et en fin de chaque phase.
- Toute décision changée est **datée et motivée** dans un ADR ; la charte pointe
  vers l'ADR, ne le duplique pas.
- Le Mentor et le Constructeur maintiennent chacun leur roadmap (§15) à jour
  ici-même, en plus des tâches de construction assignées par le Mentor.
