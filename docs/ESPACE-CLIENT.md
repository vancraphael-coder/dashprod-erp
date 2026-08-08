# Espace client — cartographie des pages

Ce document décrit chaque page de l'espace client (`EspaceClient.jsx`) : ce
qu'elle **montre**, ce que le client peut **y faire**, et ce qu'il **ne peut
pas** y faire. Chaque fonctionnalité est classée :

- **[Indispensable]** — sans elle, l'espace client ne tient pas sa promesse.
- **[Gadget indispensable]** — non vital, mais tellement attendu que son absence
  se remarque et déçoit (confort qui fait la différence).
- **[Gadget]** — agréable, secondaire, candidat à V2.

Principe transverse de **permission** : le client est en **lecture** sur les
données métier (dossier, meubles, offres, factures). Il n'écrit que là où le
dialogue l'exige : la **messagerie** (Mailprod). Toute donnée vient de la base,
filtrée sur son e-mail authentifié — jamais un identifiant passé côté client.

---

## 1. Mon dossier

**Information.** L'état de son déménagement chez chaque entreprise concernée :
nom du déménageur, référence, date souhaitée, date de visite technique, adresses
de chargement et de déchargement (avec étage), téléphone de contact.

**Interactions.**
- Lire l'avancement de son dossier. **[Indispensable]**
- Appeler le déménageur (numéro cliquable). **[Gadget indispensable]**
- Voir la ligne du temps (devis → confirmé → planifié → effectué). **[Gadget indispensable]** — à ajouter.

**Permissions.** Lecture seule. Le client ne modifie ni les dates, ni les
adresses (elles engagent le déménageur). S'il veut un changement, il passe par
la messagerie.

---

## 2. Mes meubles (inventaire)

**Information.** Le relevé de son déménagement transformé en liste de colisage :
récapitulatif (colis numérotés, objets, volume, poids), détail par pièce, numéro
de colis fixe, remarques par objet.

**Interactions.**
- Consulter l'inventaire pièce par pièce. **[Indispensable]**
- Télécharger la liste de colisage (CSV). **[Gadget indispensable]** — utile pour
  un déménagement international (douane) et pour se rassurer.
- Signaler un oubli / une correction. **[Gadget indispensable]** — via la
  messagerie, pas d'édition directe (le relevé engage le chiffrage).

**Permissions.** Lecture seule. L'inventaire est la base du prix : le client ne
l'édite pas. Il peut le commenter (messagerie).

---

## 3. Mes offres

**Information.** Toutes les offres reçues, quelle que soit l'entreprise :
entreprise, référence, date, montant TVAC, statut (signée ou non), contact.

**Interactions.**
- Comparer les offres reçues. **[Indispensable]**
- Voir le détail d'une offre (PDF). **[Indispensable]** — à renforcer (ouvrir le
  document).
- Signer une offre en ligne. **[Indispensable]** — le circuit signature existe
  (code + portail) ; le lien depuis l'espace est **[Gadget indispensable]**.
- Poser une question sur une offre. **[Gadget indispensable]** — messagerie.

**Permissions.** Lecture + signature (acte fort, tracé). Le client ne modifie
jamais une offre ; il l'accepte ou la refuse.

---

## 4. Mes factures

**Information.** Les factures émises : numéro, entreprise, montant TVAC, date
d'émission, échéance, communication structurée (paiement).

**Interactions.**
- Consulter ses factures. **[Indispensable]**
- Copier la communication structurée. **[Gadget indispensable]** — un tap plutôt
  qu'une recopie fautive.
- Télécharger le PDF de la facture. **[Indispensable]** — à ajouter.
- Voir le solde / ce qui reste dû. **[Gadget indispensable]**.

**Permissions.** Lecture seule. Le paiement se fait hors application (virement) ;
l'espace ne prend pas d'argent.

---

## 5. Messages (Mailprod)

**Information.** Le fil de discussion tracé avec chaque déménageur, par dossier.
Chaque message est horodaté, attribué, et **inaltérable** (registre probant).

**Interactions.**
- Lire les messages du déménageur. **[Indispensable]**
- Répondre. **[Indispensable]** — c'est le seul endroit où le client écrit.
- Joindre une photo / un PDF (état des lieux, justificatif). **[Gadget indispensable]** — à ajouter.
- Voir l'accusé de lecture. **[Gadget]**.

**Permissions.** Écriture **autorisée**, mais append-only : le client poste, il
ne peut ni modifier ni supprimer (comme le bureau). Le fil fait foi en cas de
litige.

---

## 6. Déménageurs (réseau)

**Information.** L'annuaire public des entreprises opt-in (celles qui acceptent
d'être visibles). Aucun compte requis.

**Interactions.**
- Découvrir d'autres déménageurs. **[Gadget]** — utile pour comparer, secondaire
  à la gestion de son propre dossier.
- Demander une offre à une entreprise du réseau. **[Gadget]** — V2.

**Permissions.** Lecture publique. Aucune donnée personnelle exposée.

---

## Ce qui manque (priorisé)

1. **[Indispensable]** Ouvrir/télécharger les PDF (offre, facture) depuis l'espace.
2. **[Gadget indispensable]** Pièces jointes dans la messagerie (photo, PDF).
3. **[Gadget indispensable]** Ligne du temps de l'avancement sur « Mon dossier ».
4. **[Gadget indispensable]** Copier la communication structurée d'une facture.
5. **[Gadget indispensable]** Lien direct « Signer » depuis « Mes offres ».

Les pièces jointes de la messagerie sont traitées dans le même lot que Mailprod
côté bureau (registre probant + fichiers). Les autres points sont des incréments
UI sans risque, à planifier.
