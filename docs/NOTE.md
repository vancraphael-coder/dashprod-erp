# Lot 45 — les postes/permissions, terminés

**27/08/2026.** **1170 tests verts**, build vert. **Migrations 0153, 0154**
appliquées et vérifiées.

Comme tu l'avais demandé, les permissions sont **finies avant de reprendre le
reste**. Le domaine était prêt depuis le lot 38 ; ce lot pose tout l'écran.

---

## L'écran d'attribution de poste

Dans l'équipe, en dépliant un membre, un bloc **Poste** apparaît en tête de ses
autorisations :

- **Le poste actuel** avec son résumé.
- **↑ Promouvoir / ↓ Rétrograder** d'un cran (les cinq métiers d'exécution
  montent vers chef d'équipe, etc.).
- **Choisir un autre poste** directement (repli).
- On ne coche plus 13 capacités : on choisit un poste. La grille de capacités
  détaillée reste dessous, pour les cas fins.

Côté base : `cmd_definir_poste` (migration 0153) **remplace** le poste (un
membre n'en a qu'un), et n'est ouverte qu'à qui a `confier_les_acces`.

## Visite terrain — la sélection des pages

Quand un membre est en **visite terrain**, une zone « Pages modifiables »
apparaît : on coche les écrans qu'il peut modifier (dossiers, planning, relevé,
matériel, stockage, carnet, messages). Tout le reste est en lecture.

La colonne `utilisateurs.pages_modifiables` (migration 0154) ne conserve QUE les
pages partageables — impossible d'ouvrir l'écriture sur la paie ou les
paramètres par ce biais.

## L'octroi « confier les accès » — une case à cocher

Comme tu l'as dit : **une case à cocher**. Elle n'apparaît que pour le
**fondateur/gérant** (`peutOctroyerConfiance`) et seulement sur un poste prévu
pour la recevoir (**secrétaire, responsable dépôt**). La cocher autorise ce
membre à attribuer des postes à son tour.

**Double protection** : l'écran masque la case pour tout autre acteur, et côté
base `definirCapacite` exige déjà `gerer_referentiels` — que seuls fondateur et
gérant possèdent. Une secrétaire, même octroyée, ne peut donc pas octroyer à une
autre : pas de chaîne d'élévation.

## La garde de l'écran

Si l'acteur ne peut pas confier les accès, il voit « Vous ne pouvez pas modifier
les accès de ce membre » — les commandes de poste ne s'affichent pas.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| un poste de terrain devient octroyable | 2 |
| une secrétaire peut octroyer à son tour | 2 |

(En plus des 27 assertions déjà en place sur postes, promotion, octroi.)

## À vérifier à l'œil

1. Équipe → déplier un membre : le bloc **Poste** avec Promouvoir/Rétrograder.
2. Le passer en **Visite terrain** : la sélection des pages apparaît.
3. Sur une **secrétaire**, connecté en **gérant** : la case « Peut confier les
   accès ». Connecté en secrétaire : tu ne la vois pas.
4. Un membre terrain n'a ni la case, ni (si tu n'as pas le droit) les commandes.

## Suite

Les postes/permissions sont terminés. On peut reprendre le **circuit** :
surcoût interne, puis photos sur les constats.
