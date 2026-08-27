# Lot 42 — portée par centre + rapports texte tri-cadence

**27/08/2026.** **1167 tests verts**, build vert. **Migrations 0150, 0151**
appliquées et vérifiées.

Ce lot pose deux des trois pièces que tu as cadrées : la **portée par centre**
(qui voit quoi) et les **rapports texte jour/semaine/mois + historique**. La
troisième — la bascule de centre dans les écrans de travail pour secrétaire+ —
a sa logique prête et son câblage d'écran est le lot suivant (je dis pourquoi
plus bas).

---

## 1. La portée par centre (domaine, éprouvé)

`organisation/centres.js` décide, selon le poste et le centre de l'acteur, ce
qu'il voit :

- **Responsable dépôt → SON centre uniquement**, sans bascule. Il ne peut pas
  ouvrir un autre centre ni remonter à la maison mère.
- **Secrétaire, gérant, fondateur → TOUS les centres + la maison mère**, avec
  bascule. Ils atterrissent sur leur propre centre s'ils en ont un.
- **Le terrain reste dans son centre.**
- `filtrerParCentre` **ne mélange jamais deux centres** dans une même liste —
  c'est ton « sans interférer », garanti par construction.

Éprouvé par sabotage (responsable dépôt qui verrait tout → rouge ; filtre qui
laisse fuiter un autre centre → rouge).

## 2. Les rapports texte jour / semaine / mois (complet)

- **Domaine** (`organisation/rapport-centre.js`) : les fenêtres des trois
  cadences — jour, semaine (qui commence bien un **lundi**, semaine belge),
  mois — avec borne de fin **exclusive** (pas de double comptage). Éprouvé par
  sabotage (semaine qui démarrerait le dimanche → rouge).
- **Base** : table `centre_rapports` (migration 0150) avec `org_id DEFAULT
  jwt_org()` — j'ai vu au passage que `rapports_chantier` ne l'avait PAS, c'est
  le piège des écritures front qui échouent en silence ; je ne l'ai pas répété.
  RPC `cmd_centre_rapport_ecrire` / `cmd_centre_rapports` (0151), écriture
  réservée à `gerer_depot` ou `gerer_referentiels`.
- **Écran** : une carte « Rapport du responsable » sous les KPI de chaque
  centre dans `RapportCentres.jsx`. Choix de cadence, zone de texte, et
  historique du plus récent au plus ancien. **Les KPI ne sont pas touchés** —
  la carte texte vit à côté, comme tu l'as demandé.

---

## Pourquoi la bascule de centre est le lot suivant

Le troisième point — secrétaire+ qui **bascule d'un centre à l'autre dans les
écrans de travail** (dossiers, planning, stockage filtrés sur le centre choisi)
— a sa **logique prête** (`porteeCentres` donne les centres visibles et le
droit de bascule). Mais le câblage touche plusieurs écrans, et je préfère le
faire proprement d'un bloc plutôt que d'en livrer une moitié. Un sélecteur de
centre en tête, chaque écran filtré via `filtrerParCentre` : c'est net, mais
c'est un lot en soi.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| responsable dépôt voit tous les centres | 2 |
| filtrerParCentre laisse passer les autres centres | 1 |
| la semaine commence le dimanche | 2 |
| fin de fenêtre inclusive (double comptage) | 1 |

## À vérifier à l'œil

1. Compte → Compte rendu hebdomadaire : sous les chiffres de chaque centre, une
   carte **« Rapport du responsable »** dépliable, avec Jour / Semaine / Mois,
   une zone de texte, et l'historique.
2. Les KPI du haut sont inchangés.

## Suite

- **Bascule de centre** pour secrétaire+ dans les écrans de travail.
- Puis le circuit reprend : **surcoût interne**, puis **photos** sur constats.
