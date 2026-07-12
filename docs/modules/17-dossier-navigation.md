# Module 17 — Dossier complet & navigation

Fiche de module (gabarit Référence 3 · T11). Réponse directe au premier retour
d'usage réel du fondateur : « le reste de la création comme sur roovers-mobile
n'existe pas », « la barre de menu n'est pas en bas ».

## Objectif

Donner à l'app sa structure de navigation (barre inférieure : Dossiers,
Planning, Équipe, Compte) et faire du Dossier le hub central du parcours, avec
le volet Contact complet du modèle validé : adresses multiples de chargement et
déchargement (type, étage, ascenseur, monte-meubles), date et heure souhaitées,
remarques.

## Architecture

- **SQL** (`0019`) : colonnes `affaires.date_souhaitee` / `heure_souhaitee`.
  La date SOUHAITÉE est commerciale (affaire) ; la date d'EXÉCUTION reste sur la
  mission (C-04). Les adresses n'exigent AUCUN changement : `affaire_adresses`
  (étage, ascenseur, monte-meubles) existe depuis le Module 3 — elle est enfin
  projetée à l'écran.
- **Écran `Dossier.jsx`** (hub) : en-tête client + état + montant ; chips de
  sections (Relevé, Devis, Offre si chiffré, Facture si confirmé/effectué) ;
  volet Contact inline (adresses ± , date/heure, remarques) ; enregistrement
  par `sauverContact` (remplacement delete+insert, volumes minuscules).
- **Navigation (`main.jsx`)** : barre inférieure fixe sur les écrans racine
  (safe-area iOS) ; Équipe visible selon la capacité `gerer_referentiels` ;
  écran Compte (identité, diagnostic, déconnexion). Les écrans d'un dossier
  reviennent au Dossier, plus à la liste — fin des culs-de-sac.
- **Recâblage** : cliquer une carte ouvre le Dossier (plus le Devis) ; la
  création mène au Dossier pour compléter contact/adresses ; les liens
  d'en-tête redondants de la liste sont retirés (portés par la barre).

## Dépendances

CRM (affaire, affaire_adresses — Module 3), tous les écrans du parcours
(Modules 11, 13, 14, 16), Identité (capacités pour la barre).

## Interfaces (contrat)

- Adaptateur : `obtenirContact(affaireId)`, `sauverContact(affaireId, {...})`.

## Tests

Aucune nouvelle logique de domaine (module d'écran et de câblage) : 135/135
inchangés, build Vite vert. Vérification : parcours manuel création → dossier →
adresses → relevé → devis → offre, et navigation par la barre.

## Évolutions futures (accueillies, non construites)

- Bouton itinéraire Google Maps depuis les adresses (présent dans le modèle).
- Partage WhatsApp du brief de mission (présent dans le modèle).
- Fiche membre complète dans Équipe (congés, documents, équipements — le
  domaine RH du Module 8 attend son écran).

## Écarts avec la documentation

Aucun. Reproduit la structure validée de roovers-mobile.jsx sur l'architecture
Dashprod (une seule implémentation des règles, adresses en table dédiée).
