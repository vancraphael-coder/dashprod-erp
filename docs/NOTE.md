# Lot 35 — le socle des cartes métier

**23/08/2026.** **1089 tests verts** (1067 avant), build vert.
**Aucune migration** — lot entièrement pur.

---

## Ce qui change à l'écran

1. Chaque carte affiche **« 2 membres / 4 »**, et le 4 est **l'effectif vendu**.
2. Les jetons de membres et de véhicules ne bougent plus de place.
3. Le verdict dit **d'où vient** le nombre attendu : « (effectif du devis) ».

---

## 1. Le défaut principal — le dénominateur était une constante

`EXIGENCES.demenagement.membres_min` valait **2, écrit en dur**. Le prix, lui,
vient de `BAREME_HORAIRE[nbDemenageurs]`, effectif choisi au devis **entre 2 et
6**.

**Conséquence : un dossier vendu à quatre déménageurs affichait une carte qui
passait au vert à deux.** Le voyant certifiait « pourvu » sur un chantier
sous-staffé — et sous-facturé, puisque le client paie quatre personnes.

Le dénominateur vient désormais de `affaire.faits.nbDemenageurs`. Trois règles,
toutes testées :

- **le devis prime** — 4 vendus, 4 attendus ;
- **le plancher du métier rattrape** quand le devis est absent : `Number(null)`
  vaut 0, et « 0 personne attendue » aurait rendu **toute carte verte à vide**.
  Septième occurrence de ce piège dans le dépôt ;
- **un devis SOUS le plancher ne fait pas descendre la carte** — un
  déménagement chiffré à une personne est un devis à revoir, pas une consigne
  de terrain.

Le motif affiché dit l'origine : « 4 personnes attendues (effectif du devis) ».
Sans ça, « 4 » passe pour une règle du logiciel et on corrigerait la carte au
lieu du devis.

La visite reste à une personne quel que soit le devis. L'emballage a son propre
effectif : il se fait souvent à deux quand le camion part à quatre.

## 2. Un catalogue unique, pour les métiers à venir

`packages/domaine/src/metiers/cartes.js` remplace **trois listes qui ne se
parlaient pas** :

- `EXIGENCES` dans `planning/affectation.js` — cinq types figés ;
- `typesAvecCarte = [principale, visite, emballage]` codé en dur dans
  `Dossier.jsx` — une liste qui ignorait `lift` et `sous_traitance` ;
- les étapes de `commercial/natures.js`.

`EXIGENCES` en est maintenant **dérivé**, plus recopié.

**Pour ajouter un métier demain : une entrée dans `CARTES_METIER`.** Un test
vérifie que toute nature passant par le planning possède une carte principale —
l'oubli ne peut plus produire un dossier sans aucune carte de date, panne qui
ne se voit qu'en ouvrant un dossier de cette nature.

Le fichier est **horizontal** : il décrit la *forme* d'une carte, jamais le prix
ni le contenu d'un métier. Aucun import de `releve/`, `stocks/` ou
`chiffrage/lift.js` — vérifié par `architecture.test.js`.

## 3. Le tri des catalogues

`listerMembresSimples()` n'a **aucun `order by`**. PostgREST rend alors les
lignes dans l'ordre physique de la table, qui **change après une mise à jour** :
les mêmes noms changeaient de place entre deux visites du même écran.

Ce n'est pas qu'inélégant. On coche une équipe en visant une position
mémorisée : un jeton qui se déplace **se coche à la place d'un autre**, et
l'erreur ne se voit qu'au départ du camion.

`trierMembres` / `trierVehicules` vivent dans le domaine — trois écrans qui
trient « à peu près pareil » finissent par afficher trois ordres. Les affectés
remontent (on les relit pour vérifier, pas pour les chercher), les indisponibles
descendent **sans disparaître** : on signale, on n'interdit pas. Collateur
`fr-BE` — accents ignorés, et « Camion 2 » avant « Camion 10 ».

## 4. Éprouvé par sabotage

Vingt-deux tests verts du premier coup ne prouvent rien. J'ai donc cassé le
code exprès, trois fois :

| Sabotage | Tests rouges |
|---|---|
| l'effectif revient à une constante | 4 |
| le tri rend l'ordre reçu | 2 |
| `Number(null)` laissé passer | 4 |

Code remis, 22 verts.

---

## Ce qui n'a PAS été fait

- **Aucune migration.** Rien dans ce lot n'en demandait.
- **`VoletAffectation` et `CarteDate` restent deux composants.** Ils partagent
  maintenant la même source d'effectif et le même tri, mais leur fusion est un
  autre chantier — le faire ici aurait mêlé deux risques.
- **Le tri n'est pas ajouté côté SQL.** Un `order by` dans
  `listerMembresSimples()` serait utile, mais le tri métier (affectés en tête)
  ne peut vivre qu'ici : deux tris concurrents rouvriraient la divergence.

## À vérifier à l'œil

1. Ouvrir un dossier chiffré à **4 déménageurs** : la carte doit dire
   « 2 membres / 4 » et rester orange jusqu'à quatre.
2. Un dossier **sans devis** : le dénominateur retombe à 2, sans « (devis) ».
3. Recharger deux fois le même dossier : **les jetons ne bougent plus**.
4. Un membre en congé : il reste **cliquable**, en fin de liste.

---

## Décisions consignées au dossier maître

Tes deux réponses sont inscrites dans `docs/maitre/10-DECISIONS-PRODUIT.md` :

- **mission pressentie → on signale, on n'interdit pas** ;
- **mission multi-jours → un seul document**, détaillant par jour les heures et
  le nombre de membres, prévus puis exacts. Vue d'ensemble instantanée, pas de
  recollement entre pièces. Correspond exactement à `InvoicePeriod` côté Peppol.

⚠ Fondation manquante pour ce dernier point, constatée en base : `ubl.js` émet
déjà `<cac:InvoicePeriod>`, mais **`prestation_debut` et `prestation_fin`
n'existent pas dans `factures`** — la période part toujours vide. Et
`missions.date` est une date simple, sans plage. C'est le lot 38.

## Suite proposée

**36** — sortir `emballage` des formules exclusives (aujourd'hui un forfait ne
peut **jamais** porter d'emballage). **37** — le pressenti translucide au
planning. **38** — multi-jours et période de facturation.
