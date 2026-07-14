# Module 24 — Congés & métier terrain (P1)

Alignement page 10 §1/§3 et synthèse §4. Le maillon qui rend les conflits du
Planning complets : « pris » ET « congé ».

## Métier terrain ≠ rôle d'accès (décision §4 actée)

Le MÉTIER (chef d'équipe / chauffeur / déménageur) est un attribut d'affichage
et d'affectation. Les PERMISSIONS restent les rôles S3 — un chauffeur peut
avoir l'accès « commercial » s'il chiffre. Deux axes, deux colonnes.
- **SQL** (`0023`) : `utilisateurs.metier` + `cmd_definir_metier` (commande
  gardée `gerer_referentiels`) — la RLS d'utilisateurs est SELECT-only (0003),
  c'est voulu : toute écriture d'identité passe par une commande. Événement
  `Utilisateur.MetierDefini`.

## Congés

- **Saisie directe par la direction** : créés directement `approuve` — le
  workflow demande→approbation du Module 8 RESTE disponible pour le terrain.
  Deux portes, une seule table (`conges`, RLS tenant en écriture : OK).
- **Fiches membres** (Ressources → Membres) : fiche dépliable — accès S3
  (informatif), métier (3 boutons colorés), congés (liste + suppression +
  ajout deux dates), badge « N congés » sur la ligne.
- **Planning** : `conflitsAffectation` reçoit enfin les congés approuvés ; les
  chips affichent la RAISON : « ⚠ Yassine · congé » vs « ⚠ Marco · pris ».
  Toujours sélectionnable — le système signale, l'humain décide (C-20).

## Incident évité en session

Mon premier câblage lisait `verdict.raisons` — le contrat réel de
`conflitsAffectation` (Module 7) retourne `{enConge, doubleAffectation,
conflit}`. Vérifié à la source avant livraison : un congé aurait été étiqueté
« pris ». Corrigé.

## Tests

Aucune nouvelle logique de domaine (estEnConge/conflitsAffectation déjà testés
au Module 7). 164/164 inchangés, build vert.
