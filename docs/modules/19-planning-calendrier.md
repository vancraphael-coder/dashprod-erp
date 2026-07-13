# Module 19 — Mission à la confirmation & calendrier (P0 n°2 et n°3)

## P0 n°2 — Le pont vente → exécution (0021)

### Le problème structurel
Dashprod sépare la VENTE (affaire, date souhaitée) de l'EXÉCUTION (mission,
date réelle) — plus juste que le modèle, où le dossier EST l'agenda (C-04).
Mais **rien ne créait jamais la mission** : le Planning restait vide À VIE,
quel que soit le nombre de dossiers signés. C'était un trou d'architecture,
pas un écran manquant.

### La solution
Trigger `creer_missions_a_la_confirmation` sur `affaires` : au PASSAGE à
« confirmé » (qui exige une signature, C-02), la mission de déménagement est
créée à la date souhaitée. Une date d'emballage (nouvelles colonnes
`date_emballage`/`heure_emballage`) génère une SECONDE mission de type
`emballage` — la journée d'emballage est un chantier distinct, souvent facturé
à part.

**Pourquoi un trigger et non du code dans `cmd_transition_affaire`** : la règle
vaut pour TOUT chemin menant à « confirmé », présent ou futur. Un trigger ne
peut pas être contourné par une commande qu'on oublierait de câbler.

Idempotent (re-confirmer ne duplique pas). Rattrapage inclus : les affaires
déjà confirmées avant la migration reçoivent leur mission.

## P0 n°3 — Calendrier mensuel

- **Domaine** (`operations/agenda.js`) : `grilleMois(annee, mois, missions)` —
  décalage de la première case (semaine au LUNDI : `(getDay()+6)%7`, le piège
  classique du dimanche = 0), nombre de jours (bissextiles compris), et
  **densité** (nb de missions par date). `missionsDuJour(missions, date)`.
- **Écran** (`Planning.jsx`) : navigation ← Mois Année → ; grille 7 colonnes ;
  aujourd'hui en bleu plein, jour sélectionné bordé ; **pastille ambre** sous
  les jours chargés. Toucher un jour ouvre ses missions (liseré indigo pour
  l'emballage, bleu pour le déménagement), avec alerte « Aucune équipe
  affectée », panneau d'affectation et conflits en rouge (C-20). Toucher une
  mission ouvre son dossier.

## Correction d'une erreur de ma cartographie
`docs/alignement/01` affirmait que Dashprod n'avait pas d'état « en cours ».
**Faux** : l'enum `etat_affaire` (0005) contient bien `planifie`, `en_cours`,
`clos`. La décision §3 de la synthèse reste ouverte (dériver l'affichage de la
mission plutôt que gérer un état de plus), mais l'état existe.

## Tests
5 cas ajoutés (`agenda.test.js`) : décalage lundi, piège du mois commençant un
dimanche, densité, février bissextile, tri du jour. Total **146/146** verts.
