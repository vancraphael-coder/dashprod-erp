# Module 30 — App terrain (l'app des équipes sur le chantier)

Alignement page 11. Le plus gros morceau restant — mais le domaine et les
commandes SQL préexistaient (missionsDuMembre, chrono, cmd_chrono_*,
signaler_materiel, machine à états brouillon). C'était surtout de l'assemblage.

## Le cloisonnement est RÉEL

Un membre dont le rôle S3 est `chef_equipe` ou `demenageur` n'a AUCUNE capacité
bureau (ni `voir_prix`, ni `creer_affaire`, ni `gerer_planning`, ni
`emettre_facture`). `main.jsx` le détecte et lui sert `AppTerrain` — une
sous-application distincte, avec sa propre barre (Chantiers / Outils / Compte),
sans aucun accès aux écrans bureau. Ce n'est pas du CSS qui masque : la RLS
empêche l'accès aux données de prix, l'app ne les affiche nulle part.

## Écrans

### Mes chantiers (`Terrain.jsx`)
- `mesMissionsTerrain(utilisateurId)` : missions affectées au membre, enrichies
  (adresses, coéquipiers, camions, articles à démonter, sessions de chrono) —
  JAMAIS de prix. Triées avec aujourd'hui en tête.
- Fiche chantier repliable : **chrono sur sessions serveur** (démarrer/arrêter
  via `cmd_chrono_demarrer`/`cmd_chrono_arreter`, affichage en direct via
  `dureeSecondes`/`chronoEnCours`/`formaterDuree` du domaine — supérieur au
  chrono navigateur du modèle, qui se perd si l'app se ferme), adresses +
  itinéraire Maps, équipe & camions, à démonter (du relevé), remarques, et
  **brief WhatsApp** (le même `composerBrief` que le bureau).
- Bandeau violet « en attente de validation » sur un dossier encore brouillon.

### Outils terrain (`TerrainOutils.jsx`)
- **Création rapide** : « le bureau complétera le prix » — client, téléphone,
  chargement, déchargement, date, notes → dossier `brouillon`
  (`creerDossierTerrain`). Machine à états : brouillon est le point d'entrée.
- **Signaler un souci** : véhicule + état mécanique (OK/surveiller/urgent) +
  détail → met à jour le véhicule (constat horodaté). Capacité
  `signaler_materiel` (que tous les rôles terrain possèdent).

## Côté bureau : validation

- **Dossier** : un dossier `brouillon` (venu du terrain) affiche un bandeau
  « à valider » + bouton « Valider ce dossier » → `validerDossierTerrain`
  (transition brouillon → devis via `cmd_transition_affaire`, gardée
  `valider_intake`).
- **Liste** : badge violet « à valider » sur les dossiers brouillon.

## Tests

Le domaine (chrono, missionsDuMembre) est déjà couvert (Modules 6-7). Pas de
logique nouvelle testable côté domaine. 169/169, build vert, audit imports OK.

## Reste (documenté)
- Devis terrain complet pour un membre `canQuote` (capacité `creer_affaire` +
  `faire_signer`) : router le parcours relevé→devis→offre en mode terrain.
- Marge live du chrono réservée au chef d'équipe (décision fine, page 11 §3).
