# PLAN 1.0 — Dashprod

> Le chemin du lancement, découpé en **lots livrables un par un**. Rien n'est
> construit « en un coup » : chaque lot est une livraison, un `npm test`, un
> build, et une manipulation réelle avant de passer au suivant. C'est ce qui
> évite les erreurs en chaîne — et ce qui garantit que rien de ce qui est écrit
> ici ne se perd.
>
> Registre de traçabilité en §3 : **chaque demande de Raphaël y figure**, avec
> son lot. Une idée sans ligne dans ce tableau est une idée perdue ; on n'en
> retire aucune sans la barrer explicitement.
>
> Documents liés : `PRODUCT_TRUTH.md` (la vérité produit, EX-xx) ·
> `analyse-mecanique.md` (le code, INC-xx) · `LAUNCH_TRUTH.md` (le circuit et
> sa checklist) · `TODO-claude.md` (l'exécution courante).

Établi le 2026-07-29, après audit du circuit complet d'un dossier.

---

## 1. Le critère 1.0

> Roovers fait tourner **deux semaines réelles** sans Excel ni papier, et un
> dossier ne peut jamais afficher un état incohérent.

Le second point est nouveau, et c'est l'audit qui l'impose : aujourd'hui un
dossier peut être « confirmé » **et** payé en même temps. Un ERP qui se
contredit sur l'état d'un dossier n'est pas lançable, quel que soit le nombre
de fonctionnalités présentes.

## 2. Les lots

Ordre non négociable pour les trois premiers : l'intégrité avant le confort,
le quotidien avant l'exceptionnel, le nouveau en dernier.

### LOT 0 — Les deux crashs ✅ FAIT le 2026-07-29
Livré dans le même tour que ce plan, parce qu'un écran blanc ne se planifie
pas.
- Écran blanc du planning : `hhmm` / `resumeHoraires` / `verifierHoraires` /
  `HEURE_DEFAUT` étaient **utilisés sans être importés** dans `Planning.jsx`
  (INC-15). Ni les tests ni le build ne l'attrapaient — seulement l'ouverture
  de la page. Un **test statique** garde désormais cette classe d'erreur
  (`imports-ecrans.test.js`).
- Heures de départ invisibles : `heure_depart_prevue` / `heure_arrivee_prevue`
  étaient **sélectionnées mais jamais mappées** dans `listerMissions`
  (INC-16) → le bureau ne voyait jamais ce qu'il enregistrait.

### LOT 1 — Intégrité du cycle de vie ✅ FAIT le 2026-07-29
Le cœur du problème : deux commandes échouent **en silence** parce que
`transition_interne` est tolérante et que personne ne lit son verdict.
- **Facturer depuis « confirmé »** (INC-17) : `Dossier.jsx` autorise la
  facturation dès `confirme`, alors que la machine d'états n'accepte que
  `effectue → facture`. La transition échoue sans bruit : la facture existe,
  le dossier reste « confirmé », le paiement s'enregistre. → **D1 tranchée : séparer les cycles.**
- **Annuler une annulation** (INC-18) : `cmd_reprendre_affaire` appelle
  `transition_interne(affaire, 'confirme')` depuis l'état `annule`, or
  `transition_permise` n'a **aucune** transition au départ de `annule`. Rien
  ne se passe, et l'écran annonce une réussite.
- **Règle générale** à poser dans ce lot : tout appel à `transition_interne`
  lit son booléen et échoue franchement s'il est faux. C'est la cause commune
  des deux bugs, et de ceux qu'on n'a pas encore vus.

**Livré** (0064 + 0065) : le cycle opérationnel s'arrête à `effectue → clos`
et ne mène plus à la facturation ; l'état de l'argent est **dérivé** des
factures et paiements (`etat_facturation`), donc impossible à désynchroniser ;
`transition_exigee` échoue franchement là où `transition_interne` reste
tolérante pour les cascades ; l'annulation **mémorise** l'état d'avant et la
reprise y retourne. Deux badges distincts dans le dossier. Effet voulu : la
facture d'acompte sur un dossier confirmé devient possible.

**Trouvé au passage** : le bouton « Clore le dossier » attendait l'état
`paye`, que rien n'atteignait — il était donc **invisible en permanence**
(INC-21). Rattaché au solde réel + dossier effectué.

### LOT 2 — Le relevé *(l'outil du quotidien)*
- Espace **remarque par article** (EX-04, partie manquante).
- **Deux boutons distincts** : démonter (bleu) et remonter (vertical/vert),
  aujourd'hui fondus dans un seul indicateur `demont`.
- **Articles pré-remplis par pièce** dans Paramètres → pièces du relevé, avec
  ajout dans une pièce existante ou nouvelle (EX-05).

*Terminé quand* : une visite chez un client se relève sans taper un nom
d'article deux fois, et chaque article porte sa remarque et ses deux
indicateurs.

### LOT 3 — Offre, signature et mail *(la chaîne commerciale)*
- **Validité de l'offre paramétrable** (aujourd'hui `VALIDITE_JOURS_OUVRABLES
  = 10` en constante du domaine, invisible du bureau).
- **PDF = copie exacte de l'offre** : il existe aujourd'hui **deux rendus
  distincts** — `Contrat.jsx` (238 lignes, à l'écran) et `pdfOffre.js`
  (180 lignes, au téléchargement). Deux rendus divergent par construction ;
  un seul doit faire foi. → **Décision D2** sur la technique d'impression.
- **Offre signée = signée définitivement** dans dossier/offre (le badge
  existe et lit `statut === 'signee'`, que la 0058 alimente enfin — à
  vérifier en manipulation, puis verrouiller l'écran contre toute
  régénération).
- **Un seul bouton de code** : retirer celui de dossier/offre, garder celui
  de dossier/mail.
- **Code de signature vivant** : il est aujourd'hui consommé à la signature
  et l'ancien est révoqué dès qu'on en génère un nouveau. → **Décision D3**
  sur la durée de vie voulue.
- **Pièces jointes dans le mail** : rétablir l'offre et les CGV en pièces,
  **à côté** du code de signature (les deux, pas l'un ou l'autre).

### LOT 4 — Planning *(la fiabilité de l'affectation)*
- **Doublons en orange** : le verdict de conflit est calculé
  `estAffecte ? null : conflitPour(...)` — donc **jamais** pour un membre déjà
  affecté. Un homme sur deux chantiers le même jour n'est signalé nulle part
  (INC-19). Et la couleur actuelle est rouge, pas orange.
- **Conflit de véhicule** : aucun contrôle n'existe pour les camions.
- Distinguer visuellement *indisponible* (congé, rouge) de *déjà pris*
  (double affectation, orange).

### LOT 5 — Membres et permissions
- Recenser les **actions réellement utiles au terrain**, et lesquelles le
  bureau autorise.
- Les **rattacher à la page ressources/membre** : chaque membre montre ce
  qu'il peut faire, et le bureau l'ouvre ou le ferme depuis là.
- S'appuie sur l'existant (`utilisateur_capacites`, `role_capacites`,
  `acteur_a_capacite`) — pas de nouveau mécanisme, un écran qui le rend
  lisible. Prépare l'étage « plan » de l'horizon B sans le construire.

### LOT 6 — Comptabilité *(nouvelle page)*
Le moteur existe et est testé (CSV BOM Excel, journal des ventes PCMN belge,
FEC français) mais **aucun écran ne l'appelle** (INC-04) : le livrable
comptable est inatteignable.
- Page **Comptabilité** : factures émises par période, totaux, TVA.
- **Export compta pro** : CSV, journal des ventes, FEC.
- Branche `listerFactures`, aujourd'hui orphelin.

### LOT 7 — Journal des décisions *(nouvelle page, à concevoir avec soin)*
Page de notes et d'archive des modifications et décisions. Raphaël le signale
lui-même : **possiblement plusieurs associés** — donc ce n'est pas un bloc-
notes.
Principes à tenir (à valider avant de coder) : **ajout seulement**, jamais de
réécriture ; chaque entrée **attribuée** à son auteur et horodatée ; une
décision peut être *remplacée* par une nouvelle qui la cite, pas effacée ;
lecture par tous les associés. C'est le même esprit que le journal
`evenements` — la traçabilité vaut par son caractère non réinscriptible.
→ **Décision D4** sur le périmètre v1.

### LOT 8 — Rapport chef d'équipe *(nouvelle page, liée à un dossier)*
Ce que le chef remonte du chantier, rattaché au dossier : déroulé, écarts
constatés, incidents, réserves. C'est la brique **EX-10** (boucle d'écart
planifié → observé → validation bureau) sous sa forme concrète. À faire après
le LOT 5, dont il consomme les permissions.

### LOT 9 — Verrouillage 1.0
Manipulation complète (`LAUNCH_TRUTH` §3) sans aucun `✗`, puis gel : plus de
nouvelle fonctionnalité avant le premier client payant, seulement des
correctifs.

## 3. Registre de traçabilité — rien ne se perd

| # | Demande de Raphaël | Lot | État |
|---|---|---|---|
| 1 | Un dossier peut être confirmé et payé en même temps | 1 | ✅ corrigé (INC-17) |
| 2 | Le bureau ne sait pas définir l'heure de départ des hommes | 0 | ✅ corrigé (INC-16) |
| 3 | Conflits planning → écran blanc | 0 | ✅ corrigé (INC-15) |
| 4 | Hommes/camions sélectionnés plusieurs fois pas en orange | 4 | vérifié (INC-19) |
| 5 | Annuler une annulation ne fonctionne pas | 1 | ✅ corrigé (INC-18) |
| 6 | Espace remarque sur les articles du relevé | 2 | à faire |
| 7 | 2ᵉ bouton remontage (démonter bleu / remonter vertical) | 2 | à faire |
| 8 | Modifier la durée de validité de l'offre | 3 | à faire |
| 9 | PDF = copie exacte de l'offre | 3 | vérifié : deux rendus distincts |
| 10 | Offre signée apparaît signée définitivement | 3 | à vérifier puis verrouiller |
| 11 | Supprimer le bouton code dans offre, garder dans mail | 3 | à faire |
| 12 | Garder vivant un code de signature | 3 | à faire (D3) |
| 13 | Lancer les pièces jointes dans le mail | 3 | à faire |
| 14 | Articles dans chaque pièce du relevé (paramètres) | 2 | à faire (EX-05) |
| 15 | Page comptabilité + export compta pro | 6 | à faire (INC-04) |
| 16 | Page notes/archive des modifications et décisions | 7 | à concevoir (D4) |
| 17 | Rapport chef d'équipe lié à un dossier | 8 | à faire (EX-10) |
| 18 | Actions du terrain utiles + autorisées, liées à ressources/membre | 5 | à faire |

## 4. Décisions attendues de Raphaël

Elles bloquent le début de leur lot — je ne les tranche pas à sa place.

**D1 · Facturation et cycle de vie** — ✅ **TRANCHÉE : séparer les cycles.**
Livrée dans le LOT 1 (0064).

**D2 · Impression de l'offre** — ✅ **TRANCHÉE : impression navigateur.**
Le composant `Contrat` devient la source unique ; `lib/pdfOffre.js` sera
supprimé (INC-20). À exécuter au LOT 3.

**D3 · Durée de vie du code de signature** — ✅ **TRANCHÉE : une clé par offre
de prix, durée fixée par l'émetteur du devis, de J-1 à un mois.** À exécuter au
LOT 3 : la durée devient un champ saisi à la génération (aujourd'hui figée à
30 jours), et le code reste valide tant qu'il n'a pas expiré ou été signé.

**D4 · Journal des décisions** — ✅ **TRANCHÉE : journal d'ENREGISTREMENTS.**
Pas un bloc-notes : la trace de tous les mouvements — ressources sur l'agenda
(affectations, véhicules, partages), modifications de dossiers, décisions.
Bonne nouvelle : la table `evenements` capte DÉJÀ tout cela en insertion seule
depuis l'origine. Le LOT 7 devient donc surtout un **écran de lecture**
(filtres par dossier, par personne, par période) plus quelques événements
manquants à émettre — pas une nouvelle architecture.

## 5. Discipline de livraison

Pour chaque lot, dans cet ordre, sans sauter d'étape :

1. je vérifie l'état réel du code et de la base sur le périmètre du lot ;
2. je code le lot **entier**, rien d'autre ;
3. `npm test` + build, et le test statique d'imports doit passer ;
4. je livre un zip et j'applique les migrations moi-même ;
5. Raphaël **manipule** le lot en réel et note `✓ / ⚠ / ✗ / ?` ;
6. je mets à jour ce plan, le registre §3 et le registre INC/EX ;
7. seulement alors, lot suivant.

Toute découverte faite en route s'ajoute au registre §3 avant d'être traitée —
jamais traitée à la volée dans un autre lot.
