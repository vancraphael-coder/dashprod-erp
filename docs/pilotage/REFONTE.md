# Refonte de la mécanique — journal des lots

État : à jour
Dernière revue : 2026-09-19

> Où en est la refonte, lot par lot. Le plus récent en haut. Chaque lot dit
> ce qu'il a changé, ce qu'il a trouvé en route, et ce qu'il laisse ouvert.

---

## Lot 4 — Étapes de la journée : jauge et commandes du chef · livré

Terrain (carte de mission, visible même fermée) et bureau (Planning → journée) :
une jauge étapée — trois vagues translucides, un camion sur le front — et deux
commandes pour le chef d'équipe : ◀ reculer, « Étape suivante » avancer. Le
bureau peut corriger ; l'espace client ne voit rien. Relecture toutes les 15 s.
Séquences par type (déménagement 6 étapes, emballage 4, lift 5, visite 3) dans
`operations/etapes-journee.js`. Base : 0204 (`mission_etapes`), appliquée en
production le 2026-09-24 ; refuse les sauts et les écrasements entre deux chefs.
L'étape pré-choisit le moment du décompte (déchargement → « avant
déchargement », retour → « avant retour dépôt »).

**Ce que la jauge ne fait PAS** : elle ne pointe pas les heures et ne touche ni
à la paie ni au décompte.

## Lot 3 — Décompte de fin de chantier, barre alignée · livré

**Décompte.** Le chef d'équipe calcule le montant avant le déchargement ou
avant le retour au dépôt, valide ; le bureau voit la proposition dans
Devis → Calcul définitif, ajuste, donne la validation finale ; le montant
validé revient sur le terrain en 10 s ; le bureau note l'annonce au client
(téléphone). Montant calculé par le moteur du devis, identique des deux côtés.
Base : 0202 (table `decomptes_chantier`, 7 commandes) et 0203, appliquées en
production le 2026-09-24, circuit complet essayé puis annulé.

**Paramètres de l'entreprise.** Barème → « Décompte de fin de chantier » :
arrondi (¼ h, ½ h, heure entamée, minute), minimum facturé, retour au dépôt
habituel (pré-rempli sur le terrain). Stocké dans `parametres_prix.decompte`.

**Barre du bas.** Les animations se dessinaient à côté des icônes (3 px, 7 px
sur la barre dense) depuis la hauteur fixe du Lot 2. Calques superposés dans
une seule cellule : 0 px sur 12 cas mesurés.

**Ouvert.** Le montant validé n'alimente pas encore la facture (annonce par
téléphone pour l'instant). `.github/` jamais arrivé sur GitHub (dossier masqué
par macOS) : CI et photo nocturne inactives.

## Lot 2 — Socle de production, sauvegarde nocturne, barre du bas · livré

**Socle (A).** Workflow `schema-production.yml`, mode « socle », lancé une
fois à la main : extrait la structure de production vers
`supabase/migrations/0000_socle.sql`, range les 207 migrations historiques
dans `supabase/migrations-historique/`. Rejoué sur un PostgreSQL 17 vierge
AVANT tout commit. Après lui, le rejeu en CI est strict : tout doit passer.
Prochaine migration : **0202**.

**Sauvegarde (B).** Même workflow, mode « photo », chaque nuit à 02:17 UTC :
`supabase/schema-production.sql`. Un changement fait en production sans
migration apparaît dans Git le lendemain.

**Barre du bas.** Cause racine : `overflow-x: hidden` sur html ET body
faisait de body un conteneur de défilement sur Safari iOS — la barre fixe
sautait au repli de la barre d'adresse et au rebond. Plus : quatre barres à
géométrie recopiée, un bouton + qui empiétait sur la barre sur iPhone, une
barre à z-index 10 sous les éléments de l'écran, des onglets qui ne
rétrécissaient pas (les derniers sortaient de l'écran). Une géométrie unique
(`--dp-barre`, classe `.dp-barre`), des couches nommées, des paliers xs → 2xl.
Vérifiée dans Chromium sur 9 formats (320 → 1920 px).

**Ouvert.** Le test de la barre tourne dans la sandbox, pas encore en CI.

## Lot 1 — Migrations · livré

Rejeu des migrations sur base vierge, en CI, à cliquet (repère 149 / 207).
Trouvé : conflit de fusion dans 0021 ; 0062, 0075, 0086 appliquées en
production mais jamais commitées (restaurées depuis le registre Supabase) ;
doublon 0046 ; `utilisateur_capacites` créée par aucune migration
(reconstituée) ; **63 migrations sur 207 sont des stubs sans SQL**.

## Lot 0 — Socle de build · livré

`node_modules`, `dist` (et sa carte de sources publique), 7 correctifs et un
doublon retirés du dépôt. CI : 1 487 tests, build, budget de poids. Écrans en
chargement différé : 374 → 174 ko compressés au premier chargement. Centre de
pilotage des offres généré depuis le code.

---

## À décider

- **`docs/OFFRES.md`** contredit le code (Pro, essai). Le retirer au profit
  de `docs/pilotage/`, ou le réconcilier.
- **Données de référence.** Le socle ne contient que la STRUCTURE : les
  lignes de référence (capacités, rôles par défaut, catalogues) ne sont pas
  extraites, parce que le dépôt est public et qu'aucune donnée n'en sort sans
  tri. Une base reconstruite aurait ses tables, pas encore son contenu de
  base. Prochain lot : les identifier et les semer dans `supabase/seed/`.
