# Lot 51 — photos : le HEIC des iPhone, réglé pour de bon

**29/08/2026.** **1191 tests verts**, build vert.

## Le diagnostic (fait sur tes données réelles, sans retour sur place)

Sur le rapport du 31/07, j'ai comparé les deux photos en base :
- `1000025472.jpg` → **image/jpeg** → s'affiche ✓
- `1000024551.heic` → **image/heic** (8,5 Mo) → reste blanche ✗

Le coupable : le **HEIC**, le format natif des iPhone. Les navigateurs hors
Safari **ne savent pas l'afficher** dans une image. Ce n'était donc ni l'upload
ni les droits — le fichier était bien là — mais l'affichage d'un format que le
navigateur refuse. Mon erreur : j'avais accepté le HEIC sans le convertir.

## La correction — pour TOUTES les futures photos

- **Conversion en JPEG à l'envoi.** Avant l'upload, chaque photo est redessinée
  et ré-encodée en **JPEG** (lib/image.js). Résultat : elle s'affiche partout,
  et au passage elle s'allège (ton HEIC de 8,5 Mo serait tombé à quelques
  centaines de Ko). Fini les photos fantômes.
- **Refus propre si indécodable.** Si un navigateur ne sait vraiment pas lire le
  fichier, on ne stocke PAS une photo invisible : message clair, et les autres
  photos du lot passent quand même.
- Le domaine distingue maintenant les formats **affichables partout**
  (JPEG/PNG/WebP) de ceux **à convertir** (HEIC/HEIF). Verrouillé par test +
  sabotage.

## Pour la photo HEIC DÉJÀ envoyée (celle du 31/07)

Je ne peux pas la convertir à distance (pas de décodeur HEIC côté serveur).
Mais tu n'es plus devant un carré blanc muet : la vignette devient un bouton
**« 🖼️ ouvrir »** — un clic télécharge/ouvre le fichier, que ton système saura
sans doute lire. Le plus simple reste de **la reprendre depuis le dossier** : la
nouvelle sera convertie en JPEG et s'affichera normalement. (Ou supprime-la et
renvoie-la — l'ancienne n'est pas récupérable en vignette, elle est en HEIC.)

## À vérifier à l'œil

1. Envoie une photo (même depuis un iPhone / un fichier HEIC) : elle doit
   maintenant s'afficher en vignette, et le message « photo envoyée » apparaît.
2. Sur le 31/07 : l'ancienne HEIC montre « ouvrir » au lieu du blanc. Renvoie-la
   pour l'avoir en vignette.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| le HEIC compté comme affichable | 2 |
