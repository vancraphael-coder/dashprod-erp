# Les circuits de Dashprod, en quatre couches

**Rang 2.** Document de recensement, pas de décision. Établi le 29/08/2026 en
interrogeant le code ET la base de production — pas de mémoire.

---

## Pourquoi quatre couches

Un ERP de déménagement fait quatre choses de nature différente sur le même
objet. Les confondre est la source la plus fréquente de dette invisible : on
croit qu'un réglage agit parce qu'il se saisit, on croit qu'une facture est
comptabilisée parce qu'elle est émise.

| Couche | Question à laquelle elle répond | Preuve qu'elle fonctionne |
|---|---|---|
| **1. Métier réel** | Que s'est-il PASSÉ sur le terrain ? | Une trace horodatée, pas une intention |
| **2. Paramétrage** | Comment CETTE société veut-elle travailler ? | Le réglage change le comportement observé |
| **3. Facturation** | Que doit le client, et sur quel document ? | Une pièce numérotée, immuable, transmissible |
| **4. Comptabilité** | Comment cela s'écrit-il dans les comptes ? | Une écriture équilibrée, exportable |

**Règle de lecture.** Une couche ne peut pas être solide si celle du dessus ne
l'est pas. Une comptabilité juste sur une facturation fausse est une comptabilité
fausse, proprement présentée.

**Règle d'écriture.** Chaque couche a le droit de refuser. Le moteur TVA refuse
plutôt que de deviner un taux ; le surcoût interne refuse d'atteindre le facturé.
Un refus explicite vaut mieux qu'une valeur inventée.

---

# CIRCUIT 1 — Commercial (du contact à l'offre signée)

**Ce qu'il fait.** Un prospect appelle, on qualifie, on relève, on chiffre, on
propose, il signe.

| Couche | État | Modules / tables |
|---|---|---|
| **Métier réel** | ✅ solide | `crm/affaire.js`, `crm/carnet.js`, `crm/horizons.js`, `commercial/natures.js` (5 métiers), `releve/volumetrie.js`, `stocks/meubles-piece.js` — tables `affaires`, `clients`, `affaire_adresses`, `scenarios` |
| **Paramétrage** | ⚠️ partiel | `chiffrage/bareme.js`, `chiffrage/supplements.js`, coût interne, `documents/modeles.js`, `documents/cgv.js` — le barème est paramétrable ; **les textes de document le sont, les PDF ne les reprennent pas tous** |
| **Facturation** | ✅ n/a puis solide | L'offre n'est pas une facture. `documents/instances.js` + signature (`trg_instance_signee_immuable`) : une offre signée est verrouillée |
| **Comptabilité** | ⛔ hors champ (assumé) | Un devis accepté n'est pas un fait comptable — **décision en attente, mon avis : non** (voir roadmap) |

**Les 5 métiers et leur parcours réel** (`commercial/natures.js`) :

| Nature | Relevé | Matériel | Emballage | Planning | Récurrent |
|---|---|---|---|---|---|
| déménagement | ✅ | ✅ | ✅ | ✅ | — |
| sous-traitance | — | ✅ | — | ✅ | — |
| lift | — | — | — | ✅ | — |
| boxe | — | — | — | — | ✅ |
| zone | — | — | — | — | ✅ |

**Faille connue.** Boxe et zone sont *récurrents* : leur circuit facturation est
un abonnement, pas une prestation ponctuelle. Ce circuit-là n'est pas terminé
(voir CIRCUIT 6).

---

# CIRCUIT 2 — Opérationnel / terrain (la boucle qui vient d'être bouclée)

**Ce qu'il fait.** On planifie, on affecte, l'équipe part, elle pointe, elle
constate, elle rentre. Bouclé aux lots 40 → 51.

| Couche | État | Modules / tables |
|---|---|---|
| **Métier réel** | ✅ **complet** | `planning/affectation.js`, `planning/equipes.js`, `operations/missions.js`, `operations/chrono.js` (pointage individuel), `operations/rapport-chantier.js`, `operations/photos-constat.js`, `pilotage/surcout-interne.js` — tables `missions`, `chrono_sessions`, `constats_chantier`, `constat_photos`, `surcouts_internes` |
| **Paramétrage** | ✅ bon | Coût interne par membre, niveaux d'équipe (avertissement, pas blocage), jours fériés, horaires, natures de constat facturables ou non |
| **Facturation** | ✅ **la jonction tient** | `pilotage/calcul-definitif.js` : Prévu / Réel / Facturé. Main-d'œuvre réelle (heures pointées × coût interne) remplace l'estimation. Les constats facturables remontent ; **le surcoût interne ne remonte JAMAIS** (`effetSurCalcul` → `ajouteAuFacture: 0`, verrouillé par sabotage) |
| **Comptabilité** | ⚠️ indirect | Rien ne descend directement : le terrain nourrit le *coût réel*, qui informe la marge. Les heures réelles n'alimentent PAS la paie (qui agrège au jour) — **écart assumé et documenté** |

**Invariants acquis.** Le terrain déclare et fige ; le bureau corrige. On signale,
on n'interdit pas — sauf véhicule en panne et membre dans deux équipes sur la
même mission.

---

# CIRCUIT 3 — Facturation (le maillon le plus faible aujourd'hui)

**Ce qu'il fait.** Transformer une prestation faite en une pièce due, transmise,
puis payée.

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ✅ | `factures`, `facture_lignes`, `sequences` (numérotation continue), immuabilité par triggers |
| **Paramétrage** | ⛔ **saisi, non appliqué** | Roovers a saisi : échéance 10 j, préfixe `GG`, TVA 21 %, mention légale vide, communication structurée *désactivée*. **Trois de ces quatre réglages n'agissent pas** |
| **Facturation** | ⚠️ **incomplète** | **16 factures émises : 16 sans échéance en base, 16 sans communication en base.** L'OGM est *calculé à l'affichage du PDF* (`FactureDoc.jsx` appelle `genererOGM`) mais **jamais stocké**. Le client voit une communication que le système ne connaît pas |
| **Comptabilité** | ⚠️ dépend du dessus | Les exports partent des factures ; sans échéance ni communication, ni suivi de retard ni rapprochement bancaire |

**La conséquence concrète, en une phrase.** Roovers ne peut pas savoir quelle
facture est en retard, ni rapprocher un virement reçu de la facture qui
l'attendait — alors que 23 paiements sont déjà enregistrés.

**Ce qui est solide dans ce circuit :** `facturation/tva.js` (qualification qui
**refuse** au lieu de supposer 21 %), `facturation/ubl.js` + `peppol.js` (16
tests sur `versXmlUBL`, `BuyerReference`, `InvoicePeriod`, `BillingReference`
pour les avoirs), `facturation/reception.js` (machine à états append-only,
idempotence par empreinte), `factures_fournisseur` (double verrou : domaine +
trigger, aucune approbation sans décision humaine nommée).

---

# CIRCUIT 4 — Comptabilité

**Ce qu'il fait.** Traduire les pièces en écritures qu'un cabinet accepte.

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ✅ | `paiements` (23 enregistrés), `factures_fournisseur`, `transmissions` |
| **Paramétrage** | ⚠️ minimal | `COMPTES_DEFAUT` / `COMPTES_ACHAT_DEFAUT` en dur dans `facturation/exports.js` — **aucun plan comptable paramétrable par société** |
| **Facturation** | ✅ dérivé | `journalVentes`, `journalAchats`, contrôle `equilibre()` avant proposition du fichier |
| **Comptabilité** | ✅ **bonne base, ventilée** | Cinq familles d'export ; CSV, journal, FEC, tiers, paiements ; écran de transparence dans Paramètres ; **ventilation par centre** (lot 53 : Tous / Maison mère / chaque centre, appliquée au récap, à l'équilibre ET aux trois exports) |

**Décision structurante non prise :** comptabilité **d'engagement ou de
trésorerie**. Elle commande la date de l'écriture (émission vs encaissement) et
donc toute l'architecture. Rien de sérieux ne se construit au-dessus tant qu'elle
n'est pas tranchée.

---

# CIRCUIT 5 — RH, paie et permissions

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ✅ **complet** | 12 postes (`rh/postes.js`), promotion/rétrogradation, pages visite-terrain, octroi « confier les accès », gardes anti-verrouillage (0155). `conges`, `equipements_rh`, `documents_rh`, `chrono_sessions` |
| **Paramétrage** | ✅ | Coût interne par membre, capacités par poste + individuelles, rattachement à un centre |
| **Facturation** | ✅ n/a | La paie ne se facture pas au client. Le coût interne, lui, informe la marge |
| **Comptabilité** | ⛔ **absent** | `donnees_paie`, `paie_periodes` existent ; **aucun pont vers le journal**. Salaires et charges n'apparaissent nulle part dans les exports |

**Écart assumé.** Les heures pointées (mission) et les heures de paie (jour) ne
sont pas la même donnée. Ne jamais les réconcilier automatiquement.

---

# CIRCUIT 6 — Stockage : garde-meubles (boxe) et logistique (zone)

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ⚠️ partiel | `stock_boxes`, `stock_zones`, `stock_contrats`, `stock_contrat_lignes`, `stock_echeances`, `stocks/stockage.js`, `stocks/repere.js` (allée/rangée/étage), inventaire privé côté client |
| **Paramétrage** | ✅ **volontairement nu** | Aucune grille tarifaire : le tarif se saisit **au contrat** (`stock_contrats.tarif_centimes`). *Invariant, pas manque* |
| **Facturation** | ⛔ **le trou** | Boxe et zone sont **récurrents**. `stock_echeances` existe, mais **aucune facture périodique n'est générée**. Un garde-meubles qui ne facture pas ses mois n'est pas un garde-meubles |
| **Comptabilité** | ⛔ suit le trou | Rien à écrire tant que rien n'est facturé |

**Fondations désormais disponibles** (elles bloquaient boxe-2, lot 41→53) :
création de centre ✅ (2 centres existent), rattachement membre↔centre ✅,
permissions par membre ✅, rôle maison mère ✅.

---

# CIRCUIT 7 — Fournitures (cartons, boutique)

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ⛔ **jamais utilisé** | `stock_articles` : **0 ligne**. `stock_mouvements` : **0 ligne** |
| **Paramétrage** | ⚠️ incomplet | `stock_articles.prix_unitaire` **n'a pas de taux de TVA** ; `stock_mouvements.mission_id` devra être **nullable** pour une vente sans chantier |
| **Facturation** | ⛔ absent | Aucun document de vente de fournitures. Les cartons livrés ne s'encaissent pas |
| **Comptabilité** | ⛔ absent | Question ouverte : la vente boutique consomme-t-elle la **même séquence légale** que les déménagements (contrainte C-03) ? |

**Coût du report : nul aujourd'hui** (tables vides). Mais chaque carton livré et
non facturé est une perte sèche.

---

# CIRCUIT 8 — Organisation, offres et abonnement (le modèle d'affaires)

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ✅ | `organisations`, `centres_logistiques` (2), `offres` versionnées, `releves_abonnement` (mesure figée, immuabilité vérifiée) |
| **Paramétrage** | ✅ **résolu** | Prix en vigueur : **starter 180 / regular 360 / pro 720 € HTVA** mensuel, annuel remisé (2052 / 4104 / 8208). Membre supplémentaire 13 € toutes offres ; centre supplémentaire 50 € (pro). *Le bloqueur P1 des anciennes notes n'en est plus un* |
| **Facturation** | ⚠️ manque le déclencheur | `cmd_emettre_releve_abonnement` s'appelle **à la demande** — aucun ordonnanceur. Volontaire, mais rien ne facture tout seul |
| **Comptabilité** | ⛔ hors champ | C'est le chiffre d'affaires de **l'éditeur**, pas du client. À ne pas mélanger |

**Fragilité arithmétique connue.** Grille non monotone : 30 personnes en Basique
= 180 + 28×13 = **544 €** contre **720 €** en Pro, à taille d'équipe égale. Les
offres se vendent sur les modules, pas sur les sièges — position tenable, mais
elle doit être **choisie**, pas subie.

---

# CIRCUIT 9 — Client (portail, avis, litiges)

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ✅ | `acces_client`, `portail/acces.js`, espace client (refonte nocturne), inventaire de box privé — **zéro lecture bureau**, `avis_clients`, `litiges` |
| **Paramétrage** | ✅ | Portail ouvert à **toutes** les offres (décision arrêtée) |
| **Facturation** | ⚠️ | Le client voit ses documents ; **le paiement en ligne n'existe pas** |
| **Comptabilité** | ⛔ n/a | — |

---

# CIRCUIT 10 — Conformité et traçabilité (transverse)

| Couche | État | Détail |
|---|---|---|
| **Métier réel** | ✅ | `evenements` (journal d'audit — **donnée jamais verrouillée**, une société doit pouvoir tracer), `consentements`, `demandes_rgpd`, `registre_traitements`, `incidents_securite`, `rgpd/retention.js` |
| **Paramétrage** | ⚠️ | Durées de conservation présentes ; leur **adéquation au droit belge n'est pas confirmée** |
| **Facturation** | ✅ | Immuabilité, numérotation continue, conservation |
| **Comptabilité** | ⚠️ | Idem — contraintes en place, conformité à faire valider |

**Le point le plus exposé du projet.** Dès qu'une société cliente saisit des
données réelles — c'est **déjà le cas** avec Roovers — l'exploitant devient
sous-traitant au sens de l'article 28 RGPD. Les obligations naissent à cet
instant, pas à la sortie de bêta.

---

# Tableau de synthèse — où ça tient, où ça casse

| Circuit | Métier | Paramétrage | Facturation | Comptabilité |
|---|:--:|:--:|:--:|:--:|
| 1. Commercial | ✅ | ⚠️ | ✅ | ⛔ assumé |
| 2. Terrain | ✅ | ✅ | ✅ | ⚠️ |
| 3. Facturation | ✅ | ⛔ | ⚠️ | ⚠️ |
| 4. Comptabilité | ✅ | ⚠️ | ✅ | ✅ |
| 5. RH / paie | ✅ | ✅ | ✅ n/a | ⛔ |
| 6. Boxe / zone | ⚠️ | ✅ | ⛔ | ⛔ |
| 7. Fournitures | ⛔ | ⚠️ | ⛔ | ⛔ |
| 8. Abonnement | ✅ | ✅ | ⚠️ | ⛔ n/a |
| 9. Client | ✅ | ✅ | ⚠️ | — |
| 10. Conformité | ✅ | ⚠️ | ✅ | ⚠️ |

**Lecture en une ligne.** Le métier réel est solide presque partout — c'est
l'acquis de ces cinquante lots. **Ce qui casse est en aval : la couche 3 sur le
circuit 3.** Des prestations justes produisent des factures incomplètes.

---

# Les quatre invariants inter-couches (à ne jamais enfreindre)

1. **Une couche refuse plutôt que de deviner.** TVA non qualifiée → refus, pas
   21 % par défaut.
2. **Le surcoût interne ne franchit jamais la frontière 2→3.** Il alourdit le
   réel, jamais le facturé. Le client ne paie pas nos aléas.
3. **Une pièce émise est immuable.** Changer un réglage ne réécrit jamais le
   passé. Corollaire : un réglage qu'on branche tard ne rattrape pas les
   anciennes pièces — et c'est correct.
4. **Le paramétrage ne vaut que lu.** Un réglage saisi et non lu est pire
   qu'absent : il ment à celui qui l'a saisi. Trois le font aujourd'hui.
