# Les paramètres de Dashprod — cartographie et cap

**Rang 2.** Audit établi le 31/08/2026 en lisant le code ET la base de production
(org test `5de63170…`). Répond à la demande : *vérifier les paramètres avant
tout, car beaucoup en dépend pour synchroniser l'interface.*

---

## 1. Le constat qui déclenche tout : le carton standard

Un seul article — le carton standard — est défini **quatre fois**, à des valeurs
qui **se contredisent** :

| Où | Champ | Valeur | Édité dans |
|---|---|---|---|
| `parametres_catalogues.fournitures` | cout_centimes | **150** (1,50 €) | Coûts internes |
| `parametres_prix.couts` | carton_standard | **1** (1 €) | Barème |
| `parametres_prix.tarifs` | carton_standard | **1** (1 €) | Barème |
| `CATALOGUE_EMBALLAGE` (domaine) | cout_centimes | **150** (défaut) | code |
| `stock_articles.prix_unitaire` | (vide) | — | lot E |

**Le coût d'un carton vaut 1,50 € à un endroit et 1 € à un autre.** Personne ne
peut dire lequel fait foi. C'est exactement le symptôme que tu décris : « 3
paramètres dans 3 pages différentes ou plus », « même prix client » qu'on
n'arrive pas à faire circuler simplement.

---

## 2. La carte actuelle des paramètres

Quatre coffres `jsonb` sur `organisations`, écrits par des écrans différents,
lus par d'autres. Aucun n'est la source unique de quoi que ce soit.

| Coffre | Écrit par | Contient | Lu par |
|---|---|---|---|
| **parametres_prix** | Barème, Coûts internes | `tarifs` (prix client), `couts` (coût org), `supplements`, `bareme_horaire`, `lift_couronnes`, `sous_traitance`, `stockage_boxes`, `lift_supplements` | Devis, moteur de chiffrage |
| **parametres_catalogues** | Paramètres, Coûts internes | `pieces`, `fournitures` (coût), `materiel_terrain` (coût), `meubles_par_piece` | Matériel, Relevé |
| **parametres_facturation** | Identité | `echeance_jours`, `tva_taux`, `prefixe_numero`, `mention_legale`, `communication_structuree` | cmd_emettre_facture, FactureDoc |
| **parametres_textes** | *(via adaptateur)* | textes de documents (brief, courriers) | brief.js (communication) |

**Trois défauts structurels sautent aux yeux :**

1. **Un même concept est éclaté sur deux coffres.** Le carton a un coût dans
   `parametres_catalogues` ET dans `parametres_prix.couts`. Son prix client est
   dans `parametres_prix.tarifs`. Rien ne les relie.
2. **Un écran écrit dans deux coffres.** « Coûts internes » écrit à la fois
   `parametres_prix` et `parametres_catalogues`. On ne sait plus quelle page est
   maîtresse de quoi.
3. **Le prix client des fournitures n'a pas de vraie place.** Le devis facture
   l'emballage à l'heure (`emballage_horaire`) et au km (`emballage_km`) ; le
   prix client PAR ARTICLE (`tarifs.carton_standard`) existe mais n'est presque
   pas lu. C'est le trou de R3.

---

## 3. Ce que tu veux, traduit simplement

- **Le coût total pour l'organisation** → visible dans **Matériel**.
- **Le prix à facturer au client** → dans **Devis/Estimation** et **Calcul
  définitif**.
- **Une seule saisie** par article, qui alimente tout.

Aujourd'hui c'est impossible **non pas parce que le code est faux**, mais parce
qu'il n'existe **aucune source unique** : chaque page lit un coffre différent, et
les coffres se contredisent.

---

## 4. Mon avis sur la « map + map connecteur »

Tu ne t'égares pas : ton intuition de fond est juste, et importante.

> « Les métiers sont un regroupement de paramètres. Un paramétrage parfait et
> simple à configurer, et le client vient de lui-même. »

**C'est exact, et c'est le vrai avantage concurrentiel du produit.** Un ERP
métier se gagne sur la qualité du paramétrage, pas sur le nombre d'écrans.

Là où je te propose d'infléchir la méthode — et c'est le seul point :

**Ne construis pas d'abord une map. Construis d'abord une source unique.**

Trois raisons, dans l'ordre d'importance :

1. **Cartographier un désordre ne fait que le documenter.** Dessiner
   aujourd'hui la carte du carton (4 endroits, 2 valeurs différentes) donnerait
   une belle map… d'une contradiction. On range avant de photographier, pas
   l'inverse.

2. **Une map en document se périme au premier changement de code.** Elle ment
   dès qu'on touche à un écran. Ce que tu veux vraiment n'est pas un document,
   c'est un **registre des paramètres** : un endroit unique où chaque paramètre
   est déclaré **une fois** — sa clé, son libellé, son unité, son type (coût ou
   prix client), sa valeur par défaut, et les métiers qui l'utilisent. L'interface
   se **dessine à partir du registre**. Le registre EST la map — mais exécutable,
   donc elle ne peut pas dériver, puisqu'elle est la réalité.

3. **Le connecteur tombe alors tout seul.** Si les paramètres sont
   auto-décrits dans un registre, les exposer à un connecteur MCP est une couche
   mince : le registre dit déjà quoi exposer, avec quel libellé et quel type.
   Construire une « map connecteur » séparée maintenant, ce serait dupliquer ce
   que le registre donne gratuitement — et créer un troisième endroit à tenir à
   jour.

**En une phrase :** *registre unique → l'UI le lit → le connecteur le lit.* Même
destination que ta map + connecteur, mais posée sur une fondation qui ne ment
jamais.

---

## 5. Le plan que je propose

### Étape 1 — Consolider l'emballage (le pilote, la preuve) ✅ FAIT (31/08)

Un seul catalogue d'articles, chaque article portant **tout** :

```
{ cle, nom, unite,
  cout_centimes,          // ce que ça coûte à l'organisation
  prix_client_centimes,   // ce qu'on facture au client
  tva_pct }               // le taux (déjà posé au lot E sur stock_articles)
```

Édité à **un seul endroit**. Lu par :
- **Matériel** → `cout_centimes` (coût total org).
- **Devis/Estimation** + **Calcul définitif** → `prix_client_centimes`.
- **Vente rapide / fournitures jointes** (lots F, G) → `prix_client_centimes` +
  `tva_pct`.

On supprime la double définition du coût (on tranche : 1,50 € ou 1 €), et le prix
client devient une vraie donnée de premier plan. **R3 et R12 se referment pour de
bon**, et l'emballage devient le modèle de tous les autres paramètres.

### Étape 2 — Généraliser en registre

Une fois l'emballage prouvé, décrire chaque paramètre dans un **registre**
(clé, libellé, unité, type, défaut, métiers concernés). Migrer les quatre
coffres actuels vers ce registre, un domaine à la fois (fournitures, tarifs
horaires, suppléments, boxes, lift…). L'interface Paramètres se génère à partir
du registre : ajouter un paramètre = une ligne de registre, pas un écran.

### Étape 3 — Exposer au connecteur

Le registre étant auto-décrit, le connecteur MCP lit la même source. La « map
connecteur » que tu imaginais existe déjà — c'est le registre, vu de l'extérieur.

---

## 6. Les paramètres indispensables encore absents (repérage)

En parcourant l'existant, ce qui manque et qu'un paramétrage complet exigera :

- **Prix client par article de fourniture** — aujourd'hui bricolé (heure/km),
  pas par article. *Le plus urgent, c'est l'objet de l'étape 1.*
- **TVA par article** — posée au lot E sur `stock_articles`, absente du catalogue
  d'emballage. À unifier.
- **Prix client du matériel terrain** (diable, monte-meuble…) — il n'a qu'un
  coût. S'il se refacture (monte-meuble en supplément), il lui faut un prix
  client.
- **Plan comptable par société** — `COMPTES_DEFAUT` est en dur (vu dans la carte
  des circuits, lot G comptable de la vague 3).
- **Séquence(s) de numérotation** — une seule série aujourd'hui ; si la boutique
  doit avoir la sienne (question P2), c'est un paramètre.

---

## 7. Ce que je te recommande, concrètement

1. **Ne pas** commencer par la map ni par le connecteur.
2. **Commencer** par consolider l'emballage (étape 1) — ça résout ta douleur
   immédiate (un coût, un prix client, qui circulent) et ça prouve le registre.
3. **Puis** généraliser en registre (étape 2), domaine par domaine.
4. **Enfin** exposer au connecteur (étape 3), quand le registre est stable.

C'est ta vision, avec une fondation qui ne se contredira pas. Si tu valides ce
cap, le prochain lot est la **consolidation de l'emballage** — je le poserai
comme le premier paramètre à source unique, et il servira de patron à tous les
autres.
