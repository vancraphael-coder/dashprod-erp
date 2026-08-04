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

### LOT 2 — Le relevé ✅ FAIT le 2026-07-29
- Espace **remarque par article** (EX-04, partie manquante).
- **Deux boutons distincts** : démonter (bleu) et remonter (vertical/vert),
  aujourd'hui fondus dans un seul indicateur `demont`.
- **Articles pré-remplis par pièce** dans Paramètres → pièces du relevé, avec
  ajout dans une pièce existante ou nouvelle (EX-05).

**Livré** : chaque article se déplie d'un chevron sur **Démonter** (bleu),
**Remonter** (vert) et une **remarque** libre. Démonter et remonter sont deux
drapeaux indépendants en base comme dans le domaine — une armoire part démontée
au garde-meuble sans être remontée, un lit neuf se remonte sans avoir été
démonté ; les confondre faussait le temps annoncé. Les trois remontent
jusqu'à l'offre que le client signe (blocs « Démontage prévu », « Remontage
prévu », « Points d'attention ») et jusqu'au brief d'équipe.

Les **meubles par pièce** se règlent dans Paramètres → Pièces du relevé
(bouton 🛋 sur chaque pièce) et s'affichent en boutons pendant le relevé.

**Trouvé au passage** (INC-22) : l'écran Relevé portait un `CATALOGUE` codé en
dur — une seconde source de vérité, invisible du paramétrage et divergente des
volumes de référence. Supprimé : les suggestions viennent désormais du
catalogue, avec un socle par défaut pour qu'une entreprise neuve soit
utilisable immédiatement.

### LOT 3 — Offre, signature et mail ✅ FAIT le 2026-07-29
- **Validité de l'offre paramétrable** (aujourd'hui `VALIDITE_JOURS_OUVRABLES
  = 10` en constante du domaine, invisible du bureau).
- **PDF = copie exacte de l'offre** : `lib/pdfOffre.js` **supprimé** (D2).
  Le navigateur imprime le composant `Contrat` — ce qui s'imprime EST ce qui
  s'affiche, plus aucune divergence possible (INC-20 clos).
- **Offre signée = signée définitivement** dans dossier/offre (le badge
  existe et lit `statut === 'signee'`, que la 0058 alimente enfin — à
  vérifier en manipulation, puis verrouiller l'écran contre toute
  régénération).
- **Un seul bouton de code** : retirer celui de dossier/offre, garder celui
  de dossier/mail.
- **Code de signature vivant** : durée choisie par l'émetteur (D3) — 1 jour,
  1 semaine, 15 jours ou 1 mois, au moment de générer le code.
- **Pièces jointes dans le mail** : offre et conditions générales rétablies,
  **à côté** du code. Rappel de la limite réelle : le protocole `mailto` ne
  peut pas porter de fichier — l'écran ouvre les documents pour que le bureau
  les joigne, il ne fait pas semblant de les attacher.

**Trouvé au passage** (INC-23) : `cmd_instancier_offre` ne vérifiait rien — on
pouvait regénérer une offre sur un dossier déjà signé, et la signature
disparaissait de l'affichage. Verrouillé à deux niveaux (0066), testé en base.
Et `obtenirInstance` prenait la dernière instance plutôt que la signée : une
signature pouvait être masquée par un document régénéré. Corrigé.

### LOT 4 — Planning ✅ FAIT le 2026-07-29
**Livré** — trois niveaux, une seule grammaire pour les hommes et les camions :

| Niveau | Sens | Couleur |
|---|---|---|
| `libre` | rien à signaler | neutre |
| `double` | déjà pris sur un autre chantier ce jour-là | **orange** ⚠ |
| `indisponible` | en congé — la personne n'est pas là | **rouge** ⛔ |

Le doublon est un **avertissement, pas une interdiction** : deux missions
courtes dans la même journée sont parfois voulues. Le système signale, le
bureau décide.

Corrections de fond :
- le verdict se calcule **aussi pour une ressource déjà affectée** — c'était la
  cause d'INC-19 : un doublon devenait invisible à l'instant où on le créait ;
- **conflit de véhicule** ajouté (aucun contrôle n'existait) : un camion ne
  peut pas être à deux chantiers à la fois ;
- **alerte au niveau de la carte** : sans ouvrir le panneau d'affectation, un
  conflit ne se voyait jamais une fois l'équipe posée.

### LOT 5 — Membres et permissions ✅ FAIT le 2026-07-29
**Ce que l'audit a trouvé — et c'était plus grave que prévu (INC-25)** :
**aucune** commande terrain ne vérifiait de capacité. `cmd_pointage_definir`,
`cmd_pause_ajouter`, `cmd_pause_retirer` et `cmd_terminer_chantier` se
contentaient de vérifier l'appartenance à l'organisation. N'importe quel
membre pouvait donc déclarer des heures sur une mission où il n'était pas
affecté, et **clôturer le chantier de quelqu'un d'autre** — donc arrêter le
décompte de toute une équipe. Et `chef_equipe` avait exactement les mêmes
capacités qu'un déménageur : le rôle existait sans rien signifier.

**Livré** (0067 + 0068) :
- deux capacités terrain nommées — `pointer_chantier` (déclarer SES heures) et
  `cloturer_chantier` (le geste du chef : il arrête le décompte de tous) ;
- la règle « on pointe là où l'on est affecté », le bureau (`gerer_planning`)
  gardant la main partout pour corriger les oublis ;
- le chef d'équipe se distingue enfin du déménageur ;
- **catalogue lisible** (`packages/domaine/src/rh/capacites.js`) : chaque
  autorisation porte une phrase de patron, pas une clé technique, et un
  marqueur « sensible » pour celles qui touchent à l'argent ou aux données de
  tous ;
- **fiche membre** (Ressources → Équipe) : les autorisations s'affichent
  groupées *sur le chantier* / *au bureau*, avec l'origine de chacune. Ce qui
  vient du rôle est visible mais non décochable — le retirer demande de
  changer le rôle, un geste qui doit rester explicite.

Deux garde-fous : personne ne modifie ses **propres** droits (un compte
compromis s'auto-promouvrait ; un administrateur pourrait se verrouiller
dehors), et le bouton « Terminer le chantier » est masqué pour qui n'a pas la
capacité — plutôt que de le laisser se heurter à un refus après coup.

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
| 4 | Hommes/camions sélectionnés plusieurs fois pas en orange | 4 | ✅ fait |
| 5 | Annuler une annulation ne fonctionne pas | 1 | ✅ corrigé (INC-18) |
| 6 | Espace remarque sur les articles du relevé | 2 | ✅ fait |
| 7 | 2ᵉ bouton remontage (démonter bleu / remonter vert) | 2 | ✅ fait |
| 8 | Modifier la durée de validité de l'offre | 3 | ✅ fait |
| 9 | PDF = copie exacte de l'offre | 3 | ✅ fait |
| 10 | Offre signée apparaît signée définitivement | 3 | ✅ fait |
| 11 | Supprimer le bouton code dans offre, garder dans mail | 3 | ✅ fait |
| 12 | Garder vivant un code de signature | 3 | ✅ fait |
| 13 | Lancer les pièces jointes dans le mail | 3 | ✅ fait |
| 14 | Articles dans chaque pièce du relevé (paramètres) | 2 | ✅ fait (EX-05) |
| 15 | Page comptabilité + export compta pro | 6 | à faire (INC-04) |
| 16 | Page notes/archive des modifications et décisions | 7 | à concevoir (D4) |
| 17 | Rapport chef d'équipe lié à un dossier | 8 | à faire (EX-10) |
| 18 | Actions du terrain utiles + autorisées, liées à ressources/membre | 5 | ✅ fait |

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
