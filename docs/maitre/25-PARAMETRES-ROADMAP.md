# Paramètres — ce qui se saisit sans effet, et ce qu'il faut pour le brancher

**Rang 4.** Ce document liste des CHANTIERS, pas des décisions. Rien ici n'est
tranché : chaque chantier dit ce qui manque, ce dont il dépend, et **qui doit
décider**.

Établi le 23/08/2026 en interrogeant la base de production, pas en lisant le
code. Un réglage « présent dans le code » n'est pas un réglage qui agit.

---

## Méthode — et pourquoi elle compte

Pour chaque réglage : **qui l'écrit**, **qui le lit**, **ce qu'on observe en
base**. Le troisième point est le seul qui prouve quelque chose. Deux fois sur
trois, la chaîne semblait juste et rien n'arrivait au bout — c'est le piège
déjà consigné dans `40-METHODE.md` (« vérifier que la donnée arrive »).

Requêtes de contrôle, rejouables :

```sql
-- Ce que l'entreprise a saisi
select nom, parametres_facturation from organisations;

-- Ce que les factures émises portent réellement
select count(*) filter (where emise)                            as emises,
       count(*) filter (where emise and echeance is null)       as sans_echeance,
       count(*) filter (where emise and communication is null)  as sans_ogm
  from factures;
```

Au 23/08/2026 : **16 factures émises, 16 sans échéance, 16 sans communication.**

---

## Tableau de bord

| # | Chantier | Gravité | Bloque |
|---|---|---|---|
| I | Échéance de paiement jamais posée | **haute** | suivi des retards, rappels |
| II | Communication structurée (OGM) absente en base | **haute** | rapprochement bancaire, Peppol |
| III | Préfixe de numérotation sans effet | moyenne | rien aujourd'hui |
| IV | Mention légale jamais imprimée | moyenne | recouvrement des intérêts |
| V | Vente de fournitures sans document | **haute** | encaissement des cartons |
| VI | Prix client des cartons non lus | **haute** | dépend de V |
| VII | `forfait_base` écrit, jamais lu | basse | rien |
| VIII | `communication_structuree` sans champ | basse | dépend de II |

---

## I — L'échéance de paiement n'est jamais posée

**Qui écrit.** `Identite.jsx`, page facturation → `parametres_facturation.echeance_jours`.
Roovers a saisi **10 jours**.

**Qui lit.** `identite.js:facturation()` sait rendre la valeur. **Personne ne
s'en sert pour écrire `factures.echeance`.**

**Observé.** 16 factures émises, `echeance` à NULL sur les 16.

**Conséquence.** Aucune facture ne porte de date d'échéance. Le suivi des
retards ne peut pas exister : rien ne dit à partir de quand une facture est en
retard. Le client saisit une valeur et croit qu'elle s'applique.

**Dépendances complètes.**

1. `cmd_emettre_facture` doit poser `echeance = date_emission + echeance_jours`.
   Elle lit déjà `jwt_org()` ; il lui faut un `select` sur
   `organisations.parametres_facturation`.
2. L'échéance se **fige à l'émission**, comme le numéro. Une facture est
   immuable : changer le réglage plus tard ne doit pas réécrire les factures
   passées. Les triggers d'immuabilité existent — vérifier qu'ils couvrent
   `echeance`, sinon l'ajouter.
3. Le PDF (`FactureDoc.jsx`) doit l'afficher.
4. `factures_fournisseur` (0139) a déjà une colonne `echeance` : ne pas
   inventer une seconde convention.

**Qui décide.** Personne — c'est mécanique. Sauf un point : **une facture déjà
émise sans échéance se rattrape-t-elle ?** Les réécrire violerait l'immuabilité.
Recommandation : ne rien réécrire, appliquer aux suivantes. → **Raphaël**.

---

## II — La communication structurée n'existe qu'à l'écran

**Le plus sérieux du lot : deux vérités sur un document de paiement.**

**Qui écrit.** Personne. `factures.communication` existe et reste NULL.

**Qui lit.** `FactureDoc.jsx` **recalcule un OGM à l'affichage** à partir du
numéro (`genererOGM(num.sequence, num.annee)`). Le PDF montre donc une
communication que la base ignore.

**Observé.** 16 factures émises, `communication` NULL sur les 16.

**Conséquence.** Le client vire avec un OGM qu'aucune requête ne retrouve : le
rapprochement bancaire ne peut pas se faire automatiquement. Et le modèle
canonique (`modele.js`) transmet `communication: null` — donc **la facture
Peppol part sans communication structurée** alors que le papier en affiche une.

**Dépendances complètes.**

1. `cmd_emettre_facture` doit **écrire** l'OGM au moment où elle attribue le
   numéro — c'est le seul instant où la séquence est connue et définitive.
2. La logique existe et est testée (`facturation/ogm.js`, `ogm.test.js`,
   déterministe et rejouable). Il faut la porter en PL/pgSQL **ou** faire
   écrire l'appelant. Porter la même règle deux fois est un risque de
   divergence : préférer un seul lieu.
3. `FactureDoc.jsx` doit alors **lire** `facture.communication` au lieu de le
   recalculer. Tant que les deux coexistent, une facture ancienne affichera un
   OGM que la base n'a pas.
4. Immuabilité : l'OGM se fige comme le numéro.
5. `communication_structuree` (chantier VIII) devient le commutateur.

**Qui décide.** **Raphaël** : les 16 factures déjà émises reçoivent-elles leur
OGM rétroactivement ? Techniquement possible (déterministe à partir du numéro),
mais c'est écrire dans une pièce close. Avis de l'assistant : non — et prévenir
le comptable que les factures antérieures n'en portent pas.

---

## III — Le préfixe de numérotation n'a aucun effet

**Qui écrit.** `Identite.jsx` → `parametres_facturation.prefixe_numero`.
Roovers a saisi **« GG »**.

**Qui lit.** Personne. `cmd_emettre_facture` rend `AAAA-NNNNNN` en dur.

**Conséquence.** Un champ qui accepte une valeur et ne fait rien.

**Dépendances complètes.**

1. La numérotation est **continue et sans trou** (contrainte légale, C-03).
   Changer le format en cours d'année crée deux formats dans une même
   séquence : `2026-000014` puis `GG2026-000015`. Est-ce acceptable pour un
   contrôle ? **Question pour l'expert-comptable**, pas pour nous.
2. Si oui : le préfixe se fige sur la facture à l'émission, jamais recalculé.
3. `decomposerNumero()` (utilisé pour l'OGM) doit continuer à retrouver
   séquence et année malgré le préfixe — sinon le chantier II casse.

**Qui décide.** **Expert-comptable** sur la légalité, **Raphaël** sur
l'opportunité. Une piste plus sûre : n'autoriser le changement qu'au 1ᵉʳ janvier.

---

## IV — La mention légale n'est jamais imprimée

**Qui écrit.** `Identite.jsx` → `parametres_facturation.mention_legale`.
**Qui lit.** Personne.

**Conséquence.** L'entreprise croit avoir posé ses conditions d'intérêts de
retard. Sans mention au pied de la facture, **réclamer des intérêts est
fragile**.

**Dépendances.** Faible : afficher le texte au pied de `FactureDoc.jsx`. Deux
précautions : figer la mention sur la facture émise (elle fait partie de la
pièce, pas du réglage courant) ; et ne rien pré-remplir — le contenu d'une
mention légale ne s'invente pas.

**Qui décide.** **Expert-comptable ou avocat** pour le texte type. Dashprod
fournit le champ, pas le contenu.

---

## V — Les fournitures n'ont pas de document de vente

**Décision de Raphaël, redite deux fois : les fournitures ne s'ajoutent ni au
devis ni à la facture. C'est une vente de biens, distincte de la manutention.**

**État.** Retiré de `lignesFacturePour` le 23/08/2026, verrouillé par un test.
`lignesFournitures` est conservée — elle porte la qualification `vente_biens`
et la dénomination ligne à ligne, c'est la brique du futur document.

**Conséquence actuelle.** Les cartons livrés ne sont facturés **nulle part**.
Le retrait corrige la pièce, pas l'encaissement.

**Dépendances complètes — aucune ne se devine.**

1. **Quelle séquence légale numérote ce document ?** La numérotation est
   continue et sans trou (C-03). Deux flux dans une seule séquence, ou deux
   séquences distinctes, ne se choisit pas par confort : cela engage la
   présentation des livres. → **Expert-comptable.**
2. **Quel taux de TVA ?** Vente de biens intérieure. Le moteur
   `facturation/tva.js` a l'emplacement et **refuse** en attendant. → **Conseiller TVA.**
3. **Quel prix client ?** Voir chantier VI.
4. **Le stock est-il valorisé ?** Déjà ouvert dans `20-OUVERT.md`.
   `stock_mouvements.mission_id` devra être nullable pour une vente sans
   chantier.
5. **Rejoint P2 (module boutique)** : `stock_articles` / `stock_mouvements`
   forment déjà un point de vente autonome. Ne pas construire deux fois.

**Qui décide.** **Raphaël** sur le périmètre, **expert-comptable** sur 1,
**conseiller TVA** sur 2.

---

## VI — Le prix client des cartons n'est lu par personne

**Le défaut qui se cachait derrière le précédent.**

**Qui écrit.** `Bareme.jsx`, section « Matériel facturé (cartons & fournitures) »
→ `parametres_prix.tarifs.{carton_standard, carton_penderie, carton_livres,
papier_bulle, ruban}`.

**Qui lit.** **Personne.** Vérifié clé par clé.

**Ce qui servait à la place.** `valoriserEmballage` valorise au
`cout_centimes` du **catalogue** — c'est-à-dire au **prix d'achat**. Tant que
les fournitures étaient sur la facture, elles partaient donc à prix coûtant.

**Deux vérités pour un même carton** : un prix client dans le Barème, un coût
dans le Catalogue, et c'est le mauvais qui gagnait.

**Dépendances.**

1. Trancher **où vit le prix client** : dans le barème (par clé) ou dans le
   catalogue (une colonne `prix_client_centimes` à côté de `cout_centimes`).
   Avis de l'assistant : **dans le catalogue**, à côté du coût — c'est là que
   l'article est défini, et la marge se lit alors d'un coup d'œil. Le barème
   garderait les prestations, le catalogue les biens.
2. Le choix retenu, la section morte du Barème doit **disparaître** ou devenir
   la seule vérité. La laisser en double garantit la divergence.
3. Un prix client absent ne vaut **pas** zéro et ne vaut **pas** le coût :
   il se signale (règle `noyau/nombres.js`).

**Qui décide.** **Raphaël.** C'est une règle commerciale.

---

## VII — `forfait_base`, écrit et jamais lu

`Bareme.jsx` écrit `tarifs.forfait_base`. Le moteur de chiffrage ne le lit pas
(il lit `elevateur`, `km_facture`, `emballage_horaire`, `emballage_km`).

Soit le forfait de base a un sens dans le chiffrage et il faut l'y brancher,
soit il n'en a pas et le champ doit partir. **Raphaël** tranche.

---

## VIII — `communication_structuree` n'a pas de champ

Le booléen figure dans `FACTURATION_DEFAUT` et dans le commentaire de la
migration 0042. Aucun champ de saisie, aucun lecteur. Il n'a de sens qu'une
fois le chantier II fait — il en devient le commutateur.

---

## Ce que l'écran dit en attendant

Ces réglages **restent saisissables** et portent une mention « Pas encore
appliqué » qui dit précisément ce qui ne se produit pas.

C'est la règle « signaler, ne pas interdire ». On ne retire pas le champ : on
retire l'illusion. Un champ qui accepte une valeur sans effet est pire qu'un
champ absent — il fait croire au client que sa facture porte une échéance.

Ces mentions **doivent disparaître** à mesure que les chantiers se ferment.
Une mention qui survit à sa cause redevient un mensonge.

---

## Ordre suggéré

**II puis I** d'abord : ils touchent l'argent qui rentre, ils sont mécaniques,
et ils ne demandent qu'une décision de Raphaël (rétroactivité) déjà instruite.

**V et VI ensemble**, jamais séparés : brancher un document de vente sans avoir
tranché le prix client ferait refacturer au coût. Ils attendent l'expert-comptable
et le conseiller TVA — les solliciter **maintenant**, l'attente est le chemin
critique.

**III, IV, VII, VIII** ensuite. Aucun ne bloque un encaissement.
