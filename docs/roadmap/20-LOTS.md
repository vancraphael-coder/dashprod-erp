# 20 — LES LOTS, DANS L'ORDRE

Chaque lot ferme selon les cinq conditions de `00-SYSTEME.md`. L'ordre n'est
pas une préférence : chaque lot lève un blocage du suivant. Les motifs de
dépendance sont écrits — c'est ce qui permet de contester l'ordre plutôt que de
le subir.

**La priorité posée : éprouver l'indépendant, et la relation entre cette offre
et Pro.** Tout ce qui précède cet objectif dans la liste n'y est que parce
qu'il le bloque.

---

## Lot 1 — Le registre des écrans devient une donnée

**Pourquoi en premier.** L'audit de ce dossier est du texte. Un texte se
périme en silence : c'est exactement ce qui est arrivé au test qui figeait la
grille de modules de la migration 0075 et verrouillait une version périmée.
Un inventaire qui n'est pas exécutable ne protège de rien.

**Ce qu'on construit.** `packages/domaine/src/produit/ecrans.js` : chaque écran
déclaré avec sa clé, sa posture, le module qui l'ouvre, les entrées de
paramètres dont il dépend, et son état (`livre` / `esquisse` / `manquant`).

**Les invariants tenus par des tests.**
1. Tout fichier de `apps/web/src/ecrans/` est déclaré — un écran ajouté sans
   déclaration casse l'arbre. Un écran orphelin se voit (`Societes.jsx`).
2. Le module qui ouvre un écran est porté par au moins une offre.
3. **Chaque paramètre dont un écran dépend existe dans la taxonomie des
   réglages.** C'est le troisième angle qui devient mécanique : un écran qui
   consomme une configuration inexistante ne compile plus.
4. Chaque écran cité dans un `parcours-offres` est déclaré et livré, ou l'offre
   n'est pas souscriptible.

**Coût réel : faible.** L'inventaire est déjà fait, ce lot le rend exécutable.

---

## Lot 2 — Les dix entrées de paramètres manquantes

**Pourquoi avant les écrans.** Construire « Ma disponibilité » avant que
« Disponibilités et tarifs » existe dans les réglages, c'est se garantir de
refaire l'écran. Un écran construit sur un paramètre absent code sa
configuration en dur — trois précédents dans ce projet, tous corrigés à perte.

**Ordre à l'intérieur du lot**, du plus structurant au moins :

1. **Rôles et capacités** — la pyramide dit `RÔLES → MODULES → LIMITES` et le
   point de vérité ne l'expose pas. `Equipe.jsx` gère les rôles depuis
   `Ressources` : qui peut quoi n'est pas un réglage d'équipe, c'est la
   définition de l'entreprise. Rien d'autre ne se conçoit proprement avant.
2. **Identité vérifiée** — le moteur `bce.js` produit un `statutConfiance` que
   rien n'affiche. Bloque l'inscription de l'indépendant (contrôle BCE).
3. **Séquences de numérotation** — contrainte légale, table existante, aucune
   surface. Bloque les PDF du lot 6.
4. **Espace client** — ce que le client voit doit être un réglage, pas un
   effet du code. Bloque le lot 5.
5. **Mentions obligatoires et assurance** — bloque le lot 6.
6. **Disponibilités et tarifs** — bloque le lot 4.
7. **Prestataires externes et commissions** — bloque le lot 3.
8. **Peppol / point d'accès** — pas bloquant, mais le module se vend déjà.
9. **Mail sortant et notifications** — pas bloquant.
10. **Conservation et purge** — pas bloquant techniquement, mais P6 court déjà
    (voir `docs/maitre` : les obligations naissent dès la première donnée
    réelle saisie, pas à la facturation).

---

## Lot 3 — La frontière Pro ↔ indépendant

**Pourquoi ici.** C'est le point dur de toute la priorité. Un indépendant et
un Pro sont deux organisations distinctes, et le cloisonnement RLS est fait
pour interdire qu'une organisation lise l'autre. Une mission confiée traverse
cette frontière. Aucun écran ne se conçoit avant de savoir comment.

**Première étape, une heure : vérifier ce qui existe.** Les tables
`demandes_reseau` et la colonne `visible_reseau` sont déjà en base. Trois fois
sur trois dans ce projet, l'infrastructure était là et le défaut était
ailleurs. On regarde avant de construire.

**Ensuite, trancher entre trois voies** (détaillées dans
`10-AUDIT-ECRANS.md` §4) : objet-frontière avec sa propre RLS, invitation d'un
externe, ou réutilisation du réseau existant. La voie « invitation » est déjà
écartée sur le fond : un indépendant travaille pour plusieurs donneurs
d'ordre.

**Livrable de conception, pas d'écran.** Un lot qui décide et qui pose la
table, éprouvé par sabotage : une organisation tierce ne doit RIEN voir de la
mission confiée.

---

## Lot 4 — Les deux écrans de l'indépendant

Ma disponibilité, Mes missions. Plus la reprise de « Mes encours », en
esquisse.

Dépend du lot 2 (§6) pour les tarifs, du lot 3 pour la réception des missions.

**Ce lot ne rend pas l'offre souscriptible.** L'offre passe `disponible`
quand le parcours entier tourne, donneur d'ordre compris — donc après le
lot 5. La contrainte en base l'interdit d'ici là, et c'est voulu.

---

## Lot 5 — Le miroir côté Pro

Mes prestataires, Confier une mission, Suivi des missions confiées, Réception
de la preuve, Facture entrante.

C'est ici que l'offre indépendant devient vendable, parce que c'est ici
qu'elle a une contrepartie qui paie. **Une offre gratuite pour l'indépendant
sans donneur d'ordre en face ne vaut rien ; l'inverse non plus.**

À la fin de ce lot, et seulement là : republier
`independant_manutention` en `disponible`, avec un test de bout en bout.

---

## Lot 6 — Les PDF, écrits depuis le lecteur

Reprise des cinq documents existants + les quatre manquants (rapport de
chantier, relevé d'heures, attestation de fin de chantier, facture
d'indépendant sur personne physique).

Dépend du lot 2 (§3 et §5) : les mentions et la numérotation doivent venir
d'un réglage. Sans quoi on réécrit les gabarits deux fois.

**Règle de conception :** un PDF est lu par quelqu'un qui n'a pas Dashprod. Il
se comprend seul.

---

## Lot 7 — L'écran d'arrivée par posture

Ma journée (exécution), la vue du matin (dépôt), la vue de l'argent
(direction), la vue des trous (coordination).

**Pourquoi si tard alors que c'est le trou le plus large.** Parce que ces
écrans n'ajoutent aucune capacité : ils réordonnent ce qui existe déjà. Ils
sont énormes en valeur perçue et faibles en risque technique — donc ils ne
bloquent rien, et les faire d'abord retarderait tout ce qui bloque. Le seul
argument pour les avancer serait commercial : un déménageur qui essaie
Dashprod juge sur cet écran-là.

**À rediscuter si un vrai essai client arrive avant le lot 5.**

---

## Lot 8 — Le client, réordonné

Compte à rebours, liste à faire, état de paiement. Les huit onglets se
réduisent à trois questions.

Dépend du lot 2 (§4).

---

## Lot 9 — Coûts : les vignettes

Levier suivant après la résolution des images (voir
`docs/maitre/17-COUTS-STOCKAGE.md`). Agit sur un coût qui se répète à chaque
consultation, contrairement au stockage qui se paie une fois.

Indépendant de tout le reste. Peut se glisser entre deux lots.

---

## Ce qui reste hors roadmap, volontairement

- **Accès ponctuel** (`visite_terrain`) : le rôle existe en base sans parcours.
  À trancher comme décision produit — le garder ou le retirer — plutôt qu'à
  construire par réflexe.
- **`Societes.jsx`** : écran éditeur orphelin. À monter ou à supprimer. Le
  lot 1 le fera apparaître comme une erreur, ce qui forcera la décision.
- **P6 / P7 (conformité)** : hors code. Le calendrier ne suit pas celui des
  lots, et le repérage existe déjà dans le dossier maître.
