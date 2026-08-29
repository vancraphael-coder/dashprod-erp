# Ce qui n'est PAS tranché

**Rien ici n'est oublié. Rien ici n'est en cours.**

Ne décidez aucun de ces points seul : ce sont des décisions de Raphaël, ou
elles exigent un professionnel. Un assistant qui tranche à sa place crée une
dette invisible.

---

## Exige un professionnel

**Qualification TVA hors Belgique intérieure.** Intra-UE, hors UE, exonérations
intérieures. La règle dépend de la **nature** de la prestation : déménagement,
lift et sous-traitance ne suivent pas forcément la même règle de lieu. Le moteur
`facturation/tva.js` a l'emplacement prêt et **refuse** en attendant.
→ *Conseiller TVA / expert-comptable.*

**Conformité RGPD comme sous-traitant.** Dès qu'une société cliente saisit des
données réelles, l'exploitant devient sous-traitant (art. 28). Contrat, registre,
bases légales, durées, procédure de violation.
→ *Avocat ou DPO.*

**Peppol : obligations du rôle assumé.** Passer par un opérateur agréé ou
devenir point d'accès n'entraîne pas les mêmes obligations.
→ *Spécialiste Peppol / avocat.*

**Conservation et immuabilité des pièces.** La base applique déjà des
contraintes ; leur adéquation au droit belge reste à confirmer.
→ *Expert-comptable.*

## Décisions produit en attente

**Le devis accepté est-il un fait économique ?** (avis de l'assistant : non — un
engagement commercial sans conséquence comptable tant qu'il n'y a ni prestation
ni facture).

**Comptabilité d'engagement ou de trésorerie** pour l'horizon 1 ? Commande toute
l'architecture comptable.

**`comptabilite` reste-t-elle en Regular** maintenant qu'on sait ce qu'elle
implique ?

**Le stock est-il valorisé ?** Conditionne un flux entier.
`stock_articles.prix_unitaire` n'a pas de taux de TVA ;
`stock_mouvements.mission_id` devra être nullable pour une vente sans chantier.

**Premier connecteur du bridge comptable** ? (avis : un export propre pour un
comptable humain, avant toute API).

**Modules sans garde en base** : `peppol`, `international`,
`gestionnaire_depot`. Le mécanisme existe, ils n'y sont pas branchés. Faut-il
les fermer, et à quel tier appartiennent-ils vraiment ?

## Technique en attente

**Nom exact de l'événement Peppol entrant** chez Digiteal. Quatre variantes
plausibles sont acceptées, un type non listé tombe en « inconnu » et ne
déclenche rien. À confirmer auprès de Digiteal.

**Ordonnanceur des relevés d'abonnement.** `cmd_emettre_releve_abonnement`
s'appelle à la demande. Volontaire : la table ne présume d'aucun cycle.

**PWA et distribution multi-store.** Non instruit.

**Connecteur MCP de pilotage.** Après le balisage des zones exploitables.

## LOT À VENIR — Centres : écrans vierges, pas un tri (décision du 28/08/2026)

**Correction de cap.** Les lots 43/44 ont posé un **tri par centre** (SelecteurCentre
+ filtrerParCentre) sur une liste partagée dans DOSSIERS et PLANNING. Ce n'est PAS
ce que Raphaël veut pour ces écrans.

**Ce qu'il veut vraiment :**
- **Un nouveau centre = de nouveaux écrans VIERGES.** Chaque centre fonctionne
  comme une organisation à part — ses propres dossiers, son propre planning,
  repartant de zéro — le tout **sous le contrôle d'une seule société** (la maison
  mère garde la vue d'ensemble et l'administration).
- Ce n'est donc pas « filtrer une liste commune » mais « ouvrir un espace de
  travail propre au centre ».

**Où le tri/centres reste pertinent :** dans la **COMPTABILITÉ**. Là, on veut bien
un tri par centre sur des données consolidées (la maison mère voit tout, ventilé
par centre). Le SelecteurCentre + filtrerParCentre y ont leur place.

**À faire, prochain lot centres :**
1. Dossiers/Planning : passer du tri à un vrai cloisonnement par centre (espace de
   travail propre, écrans vierges à la création d'un centre). Réutiliser la portée
   (porteeCentres) pour choisir QUEL espace on ouvre, pas pour filtrer.
2. Comptabilité : y amener le tri/centres (SelecteurCentre + filtrerParCentre),
   consolidé maison mère.
3. Le SelecteurCentre actuel dans Dossiers/Planning est à retirer ou à retransformer
   en sélecteur d'ESPACE (pas de filtre).
