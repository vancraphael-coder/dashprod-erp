# Lot 49 — photos sur les constats (dernier élément du circuit)

**28/08/2026.** **1189 tests verts**, build vert. **Migration 0158** appliquée
et vérifiée.

Le circuit terrain → bureau est maintenant complet : le terrain peut joindre la
**preuve visuelle** à ses constats, et le bureau décide sur pièce.

## Ce que ça fait

- **Terrain** (rapport de chantier) : sous chaque constat, un bouton
  **« + Ajouter une photo »**. Le chef d'équipe prend une photo (l'appareil
  s'ouvre directement sur mobile), elle apparaît en vignette. Jusqu'à 6 par
  constat.
- **Bureau** (Rapports du dossier) : les photos s'affichent sous chaque constat
  au moment de trancher. Le bureau (gérer le planning) peut en ajouter ou en
  retirer. Clic sur une vignette → aperçu plein écran.

## Sous le capot

- Les fichiers vont dans le **bucket privé** `documents`, jamais public.
  Chaque affichage passe par une **URL signée courte** (5 min) — pas de lien
  permanent qui fuiterait.
- La validation est **pure et testée** : seules les images (JPEG/PNG/WebP),
  12 Mo max, 6 photos max par constat. Ce qui déborde est écarté proprement,
  avec un message.

## Un piège attrapé (important)

La policy de sécurité du bucket exige que le chemin commence par
`org/{votre_org}/…`. Mon premier chemin ne respectait pas ça — **l'upload aurait
échoué en silence sur le terrain**. Corrigé : le chemin est cloisonné par
organisation, comme les CGV. C'est le genre de détail qui ne casse pas le build
mais casse l'usage réel.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| accepter les PDF comme photos | 3 |
| pas de limite de nombre | 2 |

## À vérifier à l'œil

1. **Terrain** : sur un constat, ajouter une photo depuis le téléphone — elle
   apparaît, on peut la retirer.
2. **Bureau** (Rapports du dossier) : la photo est visible sous le constat, clic
   → plein écran.
3. Une photo trop lourde ou un PDF est refusé avec un message clair.

## Le circuit est bouclé

Pointage individuel → main-d'œuvre réelle → surcoût interne → constats
facturables/non → **photos**. La boucle terrain → bureau est complète.

## Rappel pour un lot à venir (consigné dans 20-OUVERT.md)

Les CENTRES : Raphaël veut qu'un nouveau centre ouvre des **écrans vierges**
(comme une organisation à part sous une seule société), PAS le tri actuel sur
liste partagée dans Dossiers/Planning. Le tri/centres, lui, ira dans la
**COMPTABILITÉ**. À reprendre : transformer le cloisonnement Dossiers/Planning
et amener le tri en compta.
