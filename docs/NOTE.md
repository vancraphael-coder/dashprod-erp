# Lot 37a — réservation des ressources d'équipe, sélections partout, couleur du groupe

**25/08/2026.** **1107 tests verts** (1100 avant), build vert.
**Aucune migration** — lot entièrement pur.

Trois demandes, et une préparation directe du lot 37 (le pressenti).

---

## 1. Les ressources d'une équipe sont réservées pour ses missions

Enregistrer une équipe du jour pousse désormais ses **membres et véhicules**
sur l'affectation de chaque mission qu'elle vise — sans ressaisir mission par
mission. Donner un camion à une équipe, c'est le mettre sur ses chantiers.

**Le piège évité.** Plusieurs équipes peuvent viser la même mission — celle du
matin et celle de l'après-midi sur un gros déménagement. Écraser l'affectation
à chaque enregistrement effacerait le travail de l'autre équipe. On fait donc
l'**union** de ce que toutes les équipes du jour apportent à la mission, jamais
un remplacement. Les doublons fondent : une personne dans deux équipes n'est
pas affectée deux fois.

Et l'on recalcule aussi les missions qu'une équipe **quitte** — sinon un camion
retiré resterait collé à l'ancienne mission. La propagation passe par
`cmd_mission_affecter`, qui existait déjà, et tolère une mission close (elle
refuse l'affectation par RLS sans faire échouer l'enregistrement de l'équipe).

## 2. Les deux sélections sur toute carte, la visite comprise

La visite avait `véhicule: "aucun"`, ce qui **masquait** le choix de véhicule.
Elle passe à `"facultatif"` : la voiture de service qui emmène l'estimateur
peut être notée. La nuance est dans le verdict — un véhicule facultatif n'est
**jamais réclamé**, il reste seulement disponible. Aucune carte n'interdit plus
le véhicule.

## 3. La 2ᵉ bille prend la couleur du groupe de travail

La bille du bandeau « Qui la fait » prend le ton de l'**équipe du jour** qui
porte la mission. Sur un planning chargé, la couleur dit d'un coup d'œil « ces
chantiers, c'est la même équipe » — là où relire des noms demande de
l'attention.

La couleur est **déduite du rang** de l'équipe dans la journée, pas stockée :

- pas de colonne à migrer, pas de valeur à maintenir cohérente ;
- une équipe supprimée ne laisse pas un trou de couleur ;
- surtout, la couleur est **stable** — un tirage au hasard changerait à chaque
  rechargement, transformant le repère en kaléidoscope ;
- deux équipes d'une même journée ont des couleurs distinctes tant qu'elles
  tiennent dans la palette.

Le **bleu de marque est réservé** à « pas encore d'équipe » : équipe n° 1 en
bleu se confondrait avec l'absence d'équipe.

---

## Éprouvé par sabotage

| Sabotage | Tests rouges |
|---|---|
| l'union redevient un écrasement | 1 |
| le bleu de marque entre dans la palette d'équipe | 2 |
| la visite réinterdit le véhicule | 1 |

Vérifié aussi par **rendu réel** : les trois cartes (visite avec véhicules,
mission colorée, carte sans équipe) rendent sans erreur, et la mention « groupe
du jour » est bien présente sur la mission colorée.

---

## Ce qui n'a PAS été fait

- **Aucune migration.** La couleur se déduit, l'affectation réutilise
  `cmd_mission_affecter`. Rien à ajouter en base.
- **Les modèles d'équipe ne retiennent toujours que les personnes** — un modèle
  qui figerait un camion le réserverait pour toutes les journées où on
  l'applique.
- **La bille n'affiche qu'UNE couleur.** Si deux équipes se partagent une
  mission, la bille prend celle de la première ; l'appartenance fine se lit en
  dépliant. Une bille bicolore compliquerait le repère au lieu de l'aider.

## À vérifier à l'œil

1. Planning → une journée → créer deux équipes, chacune sur une mission :
   ouvrir le dossier, **les deux billets « Qui la fait » ont des couleurs
   différentes**.
2. Mettre un camion dans une équipe : il apparaît sur l'affectation de la
   mission (carte dépliée).
3. Deux équipes sur la **même** mission : leurs membres et véhicules
   **s'additionnent** sur la mission, aucun n'écrase l'autre.
4. Carte **Visite** dépliée : le bloc **Véhicules** est là, mais partir sans
   véhicule ne déclenche aucun avertissement.

---

## Suite

**37** — le pressenti translucide au planning : `etat_mission` n'a aucun état
avant `planifiee`, et `listerMissions()` ne lit que la table `missions` — une
date promise au client est invisible au planning. **36bis** — emballage sorti
des formules exclusives.
