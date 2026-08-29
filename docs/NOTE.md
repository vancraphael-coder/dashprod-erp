# Lot 53 — Option A complété : planning hérité + comptabilité ventilée

**28/08/2026.** **1194 tests verts**, build vert. **Migration 0159** appliquée
et vérifiée.

Ce lot complète les deux points qui manquaient à Option A.

## 1. Le planning hérite du centre (migration 0159)

J'ai trouvé un trou : une mission ne reprenait PAS le centre de son dossier. Une
mission d'un dossier d'Anvers n'apparaissait donc pas dans le planning d'Anvers.
Corrigé : à la création, **la mission hérite du centre de son affaire**. Le
planning d'un espace montre bien ses propres missions.

## 2. La comptabilité, ventilée par centre (ton point 2)

Dans la comptabilité, une barre **« Ventilation »** :
- **Tous les centres** (par défaut) : la maison mère voit **tout, consolidé** —
  c'est la vue de la tête de réseau.
- **Maison mère** : les factures rattachées à la maison mère seule.
- **Chaque centre** : sa ventilation propre.

Le filtre s'applique partout — le récapitulatif, le contrôle d'équilibre du
journal, ET les trois exports (CSV comptable, journal, FEC). Tu peux donc sortir
un fichier pour ton comptable soit consolidé, soit centre par centre.

## Option A est maintenant complet

- Dossiers/Planning : espaces cloisonnés, un centre ne montre que ses affaires.
- Création : un dossier créé dans un espace lui est rattaché (lot 52).
- Missions : héritent du centre de leur dossier (ce lot).
- Comptabilité : consolidée, ventilable par centre (ce lot).

Une seule société au-dessus, la maison mère garde la vue d'ensemble — exactement
ce que tu voulais.

## À vérifier à l'œil

1. Crée un dossier dans l'espace d'un centre, confirme-le (crée une mission) :
   la mission apparaît dans le planning de CE centre, pas ailleurs.
2. Comptabilité : la barre « Ventilation ». « Tous » = tout ; un centre = ses
   factures. Les exports suivent le filtre choisi.

## Reste (optionnel)

- Un écran d'accueil « choisir un espace » si tu le souhaites un jour. Non
  nécessaire — la bascule d'espace suffit.
