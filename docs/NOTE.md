# Lot 11 — couleurs par type et filtres du planning

`npm test` : **912/912 ✓** — build `apps/web` ✓ — 8 fichiers.
**Aucune migration.** Se pose par-dessus le paquet `dashprod-lot-10`.

## Ce que j'ai trouvé avant de coder

L'essentiel du lot 11 **était déjà fait** : l'édition des couleurs par type
existe dans Apparence depuis longtemps (molette + réinitialisation, moteur
`UTILITES` / `couleurUtilite` / `ecrireCouleur`). Le vrai périmètre restant
était plus étroit — et deux bugs traînaient.

## Ce qui change

**Lift et sous-traitance ajoutés aux types de mission.** Ce sont des types
réels (0130), mais ils n'avaient pas de couleur propre : ils tombaient sur le
défaut gris, illisibles au planning. Ajoutés dans Apparence (réglables) ET dans
le domaine (`TYPES_MISSION`), avec les **mêmes défauts** — un écart ferait
clignoter la couleur au rechargement entre le planning bureau et la fiche
terrain.

**Le liseré du planning suivait `emballage → violet, sinon bleu` en dur.** Il
ignorait purement le réglage d'Apparence, et lift comme sous-traitance
tombaient tous deux sur le même bleu — indistinguables. Remplacé par
`couleurMission(type)`, et le libellé brut capitalisé par
`libelleTypeMission(type)`.

**Filtre par type au planning.** Des puces colorées, sous la journée
sélectionnée. Elles n'apparaissent que s'il y a **plusieurs** types ce jour-là
— un seul type ne se filtre pas, la barre serait un bouton qui cache la seule
chose à voir. La puce active porte la couleur du type : elle dit quelle couleur
elle commande sur les cartes en dessous.

**Masquer un membre.** Un panneau replié (« Membres affichés — N masqués »),
qui liste les membres actifs. Besoin ponctuel — sortir un intérimaire, se
concentrer sur une équipe — d'où le repli par défaut.

## La décision qui compte : masquer n'est pas supprimer

`filtrerMissions()` (domaine) applique deux logiques distinctes :
- un TYPE masqué retire la mission entière ;
- un MEMBRE masqué retire ses **affectations**, pas les missions — une mission
  faite par l'équipe qu'on cache reste du travail réel, elle doit rester
  visible.

Et surtout : **le filtre n'entre jamais dans le calcul de conflit.** Il agit
sur `duJourComplet`, après que la disponibilité a été calculée sur `missions`
complètes. S'il retirait un membre du calcul, masquer quelqu'un effacerait ses
doublons et on réserverait par-dessus. C'est verrouillé par un test qui vérifie
l'ordre des deux opérations dans l'écran.

Les préférences vivent dans `lib/preferences-planning.js`, **sur l'appareil** —
comme l'apparence. Un confort de lecture n'a pas à s'imposer à toute
l'entreprise via la base.

## À vérifier à l'œil

1. Un jour avec déménagement + visite + emballage : trois puces colorées ;
   cliquer « Visite » fait disparaître les visites, la puce s'éteint (barrée).
2. Un lift au planning : liseré ambre, plus le même bleu qu'un déménagement.
3. Masquer un membre affecté à une mission : la mission reste, son nom
   disparaît de la liste des affectés — et son éventuel conflit sur une AUTRE
   mission reste signalé.
4. Recharger la page : les filtres masqués sont conservés.
