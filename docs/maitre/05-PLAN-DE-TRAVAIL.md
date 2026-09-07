# Le plan de travail — roadmap consolidée

**Rang 1.** Établi le 01/09/2026. **C'est LE document de pilotage** : il fusionne
tout ce qui reste à faire (roadmap des vagues, remarques d'atelier R1→R16,
analyse des six secteurs, plan PWA) en **une seule liste ordonnée**.

Les autres documents restent la matière (le pourquoi, le détail) ; celui-ci dit
**quoi faire, dans quel ordre, et comment savoir que c'est fini.**

---

## La méthode — cinq règles qui évitent de se perdre

Ce sont les règles d'un développeur qui reprend un projet long sans en perdre le
fil. Elles sont contraignantes exprès.

**R1. Un seul chantier ouvert à la fois.** On ne commence pas B tant que A n'est
pas *terminé au sens de la définition ci-dessous*. Un tiers qui marche vaut mieux
que trois bancals.

**R2. Chaque lot a une porte d'entrée et une porte de sortie écrites.** Avant de
coder : qu'est-ce qui doit être vrai pour commencer (dépendances), et qu'est-ce
qui sera vrai à la fin (critère d'acceptation observable). Si l'un des deux ne
s'écrit pas en une phrase, le lot est mal découpé.

**R3. « Terminé » a une définition unique** (voir plus bas). Pas de lot « fini à
90 % ».

**R4. Toute décision produit est prise AVANT le lot qui en dépend.** Les
décisions en attente sont listées en fin de document. Un lot bloqué par une
décision ne se commence pas « en attendant ».

**R5. On met à jour ce document à la fin de chaque lot.** Coche, date, et note ce
qui a changé d'avis. Un plan qu'on ne met pas à jour est un plan qui ment.

### Définition de « terminé »

Un lot est terminé quand **tout** ceci est vrai :

1. La logique métier est dans `packages/domaine` (pur, sans accès base).
2. Elle est **éprouvée par sabotage** : casser le code fait rougir un test.
3. `npm test` et le build passent **sur un arbre propre issu d'`origin/main`**.
4. Les migrations sont appliquées **et vérifiées** par une requête de contrôle.
5. La NOTE dit ce qui a changé, ce qu'il faut vérifier à l'œil, et **ce qui n'est
   pas fait** (réserves d'honnêteté).
6. Le document de décision (`10-DECISIONS-PRODUIT.md`) est mis à jour.
7. Ce fichier est coché.

---

## L'état des lieux au 01/09/2026

**Acquis** (ne pas y revenir) : circuit terrain complet (pointage, rapports,
photos), permissions et postes, centres = espaces de travail (Option A complète),
**vague 1 « boucle de l'argent » complète** (échéance, communication, rapprochement,
relances, mention légale, préfixe), fournitures à source unique et interconnectées
de Matériel à la Facture, vente rapide, barres de navigation animées.

**Le problème central non résolu** : cinq métiers sur six ne produisent aucune
facture, parce qu'une seule machine à états sert six parcours. 47 dossiers
bloqués. *C'est la priorité absolue.*

---

# PHASE A — Débloquer les métiers *(le cœur)*

> **Pourquoi d'abord :** tant que boxe, zone, lift et transport ne peuvent pas
> avancer, tout le reste (KPI, espace client, design) décore un produit qui ne
> vend qu'un métier sur six.

### A1 — Le cycle de vie par nature ⭐ *le lot qui débloque tout*

**Entrée :** rien (aucune dépendance).
**Sortie observable :** un dossier boxe peut atteindre l'état « actif » ; un lift
peut être confirmé sans devis signé ; le déménagement se comporte exactement
comme avant.

- Introduire **trois familles de cycles** : CHANTIER (déménagement, lift,
  transport), CONTRAT (boxe, zone), VENTE (déjà sans état).
- Les gardes deviennent **fonction de la nature** — aujourd'hui `crm/affaire.js`
  ne contient pas une seule fois le mot « nature ».
- **Accord allégé** pour le cycle CHANTIER court (lift) : confirmation tracée
  sans instance signée.
- Le cycle CONTRAT : `proposition → actif → [suspendu] → terminé`. Ni planifié,
  ni effectué.
- Un **test-témoin existe déjà** et rougira à ce moment (`dossier-maitre.test.js`)
  → il faudra mettre à jour `95-SCENARIOS-SECTEURS.md`.

**Risque :** toucher la machine à états touche tout. Mitigation : le déménagement
garde exactement son cycle actuel ; les tests existants sont le filet.

### A2 — Les cartes manquantes (boxe, zone)

**Entrée :** A1.
**Sortie :** `cartePrincipale("boxe")` ne renvoie plus `null` ; un contrat de box
a une unité identifiable.

Aujourd'hui `cartesDeNature("boxe")` = 0, idem zone et vente.

### A3 — Le contrat récurrent : chiffrage + échéancier

**Entrée :** A1 + A2.
**Sortie :** un contrat de box génère une **facture mensuelle** ; `stock_echeances`
est enfin alimenté.

- Chiffrage boxe par **palier de volume**, zone au **forfait** (le code dit
  aujourd'hui « ils ne se chiffrent pas en une fois » et renvoie `null`).
- Échéancier mensuel + génération des factures récurrentes (réutilise toute la
  vague 1 : numéro, échéance, communication).
- **Où est l'argent non facturé** : 14 contrats de box dorment.

### A4 — Boxe : établissement et entrée en boxe *(ex-boxe-1/boxe-2)*

**Entrée :** A3.
**Sortie :** un contrat ne peut être établi que depuis le bon centre ou la maison
mère (**barrière réelle en base**, pas un affichage) ; « entrée en boxe » est
réservable et archivée au planning ; les boxes libres sont visibles depuis tout
centre en lecture seule. Retirer « Enlèvement » du plan d'adresses boxe.

### A5 — Renommer le transport, créer la vraie sous-traitance

**Entrée :** A1 + **décision D1** (périmètre transport).
**Sortie :** l'actuel « Sous-traitance » s'appelle ce qu'il est ; la
sous-traitance **de déménagement** existe comme nature.

---

# PHASE B — Voir et piloter

### B1 — Terrain : la journée en grille 5h30 → 20h00

**Entrée :** rien (autonome). **Peut se faire en parallèle si besoin d'un lot
court.**
**Sortie :** l'écran Chantiers montre **le jour uniquement**, en grille horaire,
chaque mission à sa place. Ni semaine, ni mois.

Les heures existent déjà (`missions.heure`, `heure_depart_prevue`,
`heure_arrivee_prevue`) — c'est de l'affichage, pas de la donnée.

### B2 — L'onglet « Pilotage » (bureau)

**Entrée :** A1 à A3 (sinon les KPI affichent « boxe : 0 » sans expliquer).
**Sortie :** un onglet qui montre, en un écran : l'argent (CA émis / encaissé /
en retard, marge), l'activité **par nature et par état**, le terrain du jour.

- **La barre de progression** (camion + drapeau, 5 jalons) y montre l'avancement
  d'un chantier, nourrie par le pointage déjà collecté.
- Source : vague 1 pour l'argent, `pilotage/finances.js` pour la marge,
  `rapport-centre.js` comme embryon.

### B3 — L'espace client cohérent par nature

**Entrée :** A1.
**Sortie :** les onglets client se dérivent de la nature ; pas de suivi de convoi
pour un box ; **aucun espace client pour une vente comptoir**.

Aujourd'hui les 8 onglets sont fixes (une seule occurrence de « nature » dans
tout l'écran).

---

# PHASE C — Finir les métiers

### C1 — R11 : l'estimation en temps par adresse

**Entrée :** A1. **Structurant.**
**Sortie :** l'estimation se saisit en **temps par point de chargement/
déchargement** (fini les km dépôt-dépôt), agrégé en un compteur unique ; les
heures réelles du calcul définitif font seules foi.

### C2 — R10 (reste) : tarifaire vs forfait

**Entrée :** C1 (les deux se croisent).
**Sortie :** une facture de devis **tarifaire** ne bouge qu'avec le calcul
définitif ; un **forfait** suit l'estimation. Jamais figée par le code client.

### C3 — R13 + R14 : onglets de la liste et audit des états

**Entrée :** A1 (les onglets reflètent les états — autant les réorganiser après).
**Sortie :** onglets envoyé / planifié / à clôturer (litiges, heures à confirmer,
à facturer, impayé) / clos ; et **la boucle brouillon → clos vérifiée**.

### C4 — R15 : les centres dans l'équipe

**Sortie :** tri par centre + vue consolidée dans Équipe ; déplacer un membre
d'un centre à l'autre depuis sa carte.

### C5 — R4 : matériel embarqué par véhicule

**Sortie :** une carte véhicule porte son matériel (diable, sangles…), avec ajout.

### C6 — Vente : décrémenter le stock

**Sortie :** une vente rapide alimente `stock_mouvements` ; la livraison devient
une mission planifiable si demandé.

---

# PHASE O — L'écosystème et les offres *(après A, voir `15-MOTEUR-OFFRES.md`)*

> **Règle absolue :** rien ne se vend avant d'exister. Une offre reste
> `souscriptible = false` tant que son parcours n'est pas démontrable de bout en
> bout. La landing peut dire « bientôt », jamais « disponible ».

### O1 — Frontières d'écran par secteur ⭐ *EN TRAVAUX — le socle*
**Sortie :** les écrans visibles ET leur contenu se dérivent du secteur, pas
seulement les modules. Un liftier ne voit pas un relevé volumétrique.
Sans ce lot, chaque nouvelle offre livre l'écran d'un déménageur.

### O2 — Offre garde-meubles
**Entrée :** A3. Presque gratuite à produire une fois le contrat récurrent posé.
Meilleur rapport valeur/effort du catalogue.

### O3 — Offre Indépendant manutention (60 €/mois)
Produits à créer : 1 manutentionnaire, équipe joignable, demi-journée, journée,
taux horaire, intervention ponctuelle. + contrôle BCE à l'inscription (O4 juridique).

### O4 — Offre Donneur d'ordre *(la clé de voûte)*
**Bloqué par la décision juridique d'intermédiation.** Sans ce côté, le réseau
tourne à vide : les exécutants n'ont rien à recevoir.

### O5 — Offre Groupe liftier (600 €/mois, pack 20, plafond dur)
**Entrée :** le lift doit être un métier de plein exercice (A1 fait, A2/A3 aidant).

### O6 — Offre Groupe logistique mobilier à débit industriel
La plus lourde : quais (objet neuf), arrivages, zones de chargement, débit.

### O7 — Le réseau : envoyer/recevoir une mission entre organisations
Aucune brique n'existe. C'est le cœur technique de l'écosystème.

# PHASE D — La comptabilité *(bloquée par une décision)*

### D0 — **Poser les deux questions au comptable** *(hors code, 1 heure)*

**Engagement ou trésorerie ?** et **la vente consomme-t-elle la même séquence
légale ?** → **Rien de la phase D ne commence avant ces réponses.**

### D1 — Plan comptable paramétrable
`COMPTES_DEFAUT` est en dur ; chaque cabinet a ses comptes.

### D2 — Le pont paie → comptabilité
`donnees_paie` et `paie_periodes` existent, rien ne descend au journal.

### D3 — R5 + R6 : coûts internes (indépendants, mensualités)
Onglet indépendants + frais pré-enregistrés ; section mensualités (check-list
puis rapprochement bancaire).

### D4 — Le premier connecteur comptable
**Mon avis :** un export propre pour un comptable humain avant toute API.

---

# PHASE E — Délimitation, design, distribution

### E1 — Délimitation (phase 2 du cadrage)
Cartes visibles par abonnement, paramétrage complet de chaque page, PDF alimentés,
volets légers, **balisage des zones exploitables par un connecteur**.

### E2 — Le registre des paramètres (étape 2 de `90-PARAMETRES`)
Généraliser le patron de l'emballage : chaque paramètre déclaré une fois,
l'interface se dessine à partir du registre.

### E3 — Design (phase 3)
Figé et réglementé, une fois A à C stables.

### E4 — PWA *(plan détaillé dans `70-ROADMAP.md`)*
P1 installable → P2 hors-ligne par degrés → P3 stores. **Après E1/E3** : on ne met
pas en cache une coquille qui bouge encore.

### E5 — Connecteur MCP de pilotage
Après E1 (balisage) et E2 (registre) : le connecteur lit le registre.

---

# PHASE F — Conformité *(en parallèle, sans code)*

### F1 — RGPD sous-traitance ⚠️ **exigible maintenant**
Roovers saisit des données réelles : les obligations de l'article 28 sont **déjà
nées**. Contrat de sous-traitance, registre des traitements, durées, procédure de
violation. → avocat / DPO.

### F2 — Facturation belge et Peppol
Conservation, immuabilité, numérotation continue : vérifier l'adéquation au droit
belge. Rôle Peppol (opérateur agréé vs point d'accès).

---

# Les décisions qui bloquent des lots

| # | Décision | Bloque | Mon avis |
|---|---|---|---|
| **D1** | Viser le TMS (ordres de transport, e-CMR) ? | A5 | **Non** — Dashdoc occupe ce terrain. Prendre le CMR si le métier l'exige, pas la plateforme. |
| **D2** | Comptabilité d'engagement ou de trésorerie ? | toute la phase D | à poser au comptable |
| **D3** | La vente consomme-t-elle la même séquence légale ? | D, C6 | à poser au comptable |
| **D4** | Le lift exige-t-il un document signé ? | A1 | **Non** — accord tracé suffit |
| **D5** | Le boxe passe-t-il par planifié/effectué ? | A1 | **Non** — cycle contrat |
| **D6** | Un client « vente comptoir » a-t-il un espace ? | B3 | **Non** — rien à suivre |
| **D7** | Grille tarifaire non monotone : assumer, plafonner, ou proposer la bascule ? | offre | **Assumer** — vendre sur les modules |
| **D8** | CMR : générer ou attacher ? | A5 | **Attacher** d'abord |
| **D9** | Le stock est-il valorisé ? | C6 | **Pas au départ** |

*Les décisions D4, D5, D6 sont nécessaires pour A1 et B3 : elles sont tranchées
dans mon avis et n'attendent qu'un mot de confirmation.*

---

# L'ordre d'exécution, en une ligne

**F1 (aujourd'hui, hors code) ‖ A1 → A2 → A3 → A4 → B1 → B2 → B3 → C1 → C2 →
C3 → C4 → C5 → C6 → [D0 puis D] → E**

A1 est le verrou de tout. B1 peut s'intercaler n'importe quand (lot court,
autonome, valeur immédiate pour les équipes).

---

# Suivi

| Lot | État | Terminé le |
|---|---|---|
| A1 cycle par nature | ⬜ à faire | |
| A2 cartes boxe/zone | ⬜ | |
| A3 contrat récurrent | ⬜ | |
| A4 boxe établissement | ⬜ | |
| A5 transport / sous-traitance | ⬜ bloqué D1 | |
| B1 terrain journalier | ⬜ | |
| B2 onglet Pilotage | ⬜ | |
| B3 espace client par nature | ⬜ | |
| C1 estimation en temps | ⬜ | |
| C2 tarifaire/forfait | ⬜ | |
| C3 onglets liste + audit états | ⬜ | |
| C4 centres dans l'équipe | ⬜ | |
| C5 matériel par véhicule | ⬜ | |
| C6 vente → stock | ⬜ | |
| D0 questions comptable | ⬜ **hors code** | |
| D1–D4 comptabilité | ⬜ bloqué D0 | |
| E1–E5 délimitation → PWA | ⬜ | |
| F1 RGPD | ⬜ **urgent, hors code** | |
| O1 frontières d'écran par secteur | 🔨 en travaux | |
| O2 offre garde-meubles | ⬜ après A3 | |
| O3 offre indépendant manutention | ⬜ | |
| O4 offre donneur d'ordre | ⬜ bloqué juridique | |
| O5 offre groupe liftier | ⬜ | |
| O6 offre logistique mobilier | ⬜ | |
| O7 réseau inter-organisations | ⬜ | |
