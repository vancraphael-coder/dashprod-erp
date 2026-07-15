# Alignement Dashprod ↔ modèle validé (roovers-mobile.jsx) — Synthèse

> Objectif : cartographier EXACTEMENT les manques de la vraie app par rapport au
> modèle validé sur le terrain, pour ne plus revenir trois fois sur la même
> modification. Un document par page, chaque élément décrit : design, logique,
> pourquoi, priorité, et l'état réel de Dashprod en face.

## Légende

**Priorités**
- **P0** — bloquant pour l'usage quotidien chez Roovers. Sans ça, l'app ne
  remplace pas le modèle. À faire en premier.
- **P1** — forte valeur métier, à faire juste après la vague P0.
- **P2** — confort, design avancé, ou différable sans douleur.

**État Dashprod**
- ✅ existe et fonctionne · 🟡 partiel · ❌ absent
- 🏗️ = le DOMAINE (logique/SQL) existe déjà, seul l'ÉCRAN manque — coût faible.

## Vue d'ensemble des pages

| # | Page | Fichier | Parité actuelle |
|---|------|---------|-----------------|
| 01 | Liste des dossiers (Bureau) | claude-alignement-01 | 🟡 ~60 % |
| 02 | Dossier · Contact | claude-alignement-02 | 🟡 ~55 % |
| 03 | Relevé volumétrique | claude-alignement-03 | 🟡 ~70 % |
| 04 | Devis (prix + coûts) | claude-alignement-04 | 🟡 ~60 % |
| 05 | Offre / Contrat + signature | claude-alignement-05 | 🟡 ~40 % |
| 06 | Matériel (E/U/R) | claude-alignement-06 | ❌ 0 % (domaine 🏗️ prêt) |
| 07 | Mail | claude-alignement-07 | ❌ 0 % |
| 08 | Facture | claude-alignement-08 | 🟡 ~55 % (mécanique supérieure, rendu absent) |
| 09 | Planning / Agenda | claude-alignement-09 | 🟡 ~35 % |
| 10 | Équipe & Flotte (RH) | claude-alignement-10 | 🟡 ~15 % (domaine 🏗️ largement prêt) |
| 11 | Mode Terrain | claude-alignement-11 | ❌ ~5 % |
| 12 | Connexion / Compte / Accueil | claude-alignement-12 | ✅ ~85 % (supérieur au modèle) |

## Les P0 globaux (l'ordre de bataille proposé)

1. **Rendu de l'offre lisible et imprimable** (page 05) — le client doit LIRE
   ce qu'il signe : adresses, prestations, prix, CGV, zone de signature. C'est
   le cœur commercial. Aujourd'hui Dashprod affiche un montant et une empreinte.
2. **Création de mission à la confirmation** (page 09) — la signature doit
   créer la mission à la date souhaitée, sinon le Planning reste vide à vie.
3. **Vue calendrier mensuelle** (page 09) — la grille avec pastilles est LA vue
   de pilotage quotidienne du modèle.
4. **Flotte minimale : les camions** (page 10) — le dossier, le relevé
   (capacité) et le planning y font tous référence. Table `vehicules` déjà en base.
5. **Rendu de facture lisible** (page 08) — même besoin que l'offre : un
   document qu'on peut montrer/imprimer, avec IBAN et mentions légales.
6. **Relevé : article libre + démontage** (page 03) — deux petits manques qui
   bloquent l'usage réel du relevé (meubles hors catalogue ; le démontage
   alimente l'offre et le terrain).
7. **Date de déménagement sur les cartes + tri** (page 01) — le bureau pense
   par date d'exécution, pas par date de création.
8. **Champs coûts manquants au devis + marge en €** (page 04).
9. **Confidentialité des coûts par capacité `voir_prix`** (page 04) — le
   domaine l'a, l'écran ne le respecte pas encore.

## Les P1 majeurs

- Brief équipe WhatsApp/copier (09, 11) — quick win énorme au quotidien.
- Itinéraire Google Maps multi-arrêts (02, 11) — une URL, zéro backend.
- Écran Mail (07) — template + mailto, gain quotidien.
- Matériel E/U/R par dossier (06) — domaine Stocks prêt.
- Fiches membres : congés, métier terrain, taux (10) — nourrit les conflits
  du planning et le coût MO.
- Réduction % + motif, MO multi-lignes, péages/divers (04).
- TVA/société/adresse de facturation sur le client (02, 08).
- Paramètres organisation : IBAN, adresse, tél, email (08, 05, 07).
- Mode terrain : mes missions, chrono, signalement matériel (11) — domaine prêt.
- OGM (communication structurée) sur la facture (08) — convention belge.

## Points à trancher par Raphaël (divergences modèle ↔ décisions actées)

1. **Monte-meubles** : le modèle affiche **125 €/jour** ; l'ADR-008 validé dit
   **150 € forfait**. → Je garde ADR-008 sauf contrordre. (page 04)
2. **Estimation camions au relevé** : le modèle divise le volume par **30 m³**
   par camion ; mon domaine actuel utilise **12 m³**. La vraie réponse est la
   capacité réelle des camions sélectionnés (le modèle fait les deux). →
   Proposition : jauge sur capacité réelle + estimation par défaut ~20 m³. (03)
3. **Statut « En cours »** : le modèle a devis→confirmé→en cours→effectué.
   Dashprod n'a pas « en cours » (c'est l'état de la MISSION le jour J). →
   Proposition : dériver l'affichage depuis la mission, pas un nouvel état. (01)
4. **Rôles terrain** (Chef d'équipe/Chauffeur/Déménageur) ≠ rôles d'ACCÈS S3.
   Deux concepts distincts. → Proposition : champ `metier` sur utilisateurs,
   les rôles S3 restent la sécurité. (10)

## Ce que Dashprod fait MIEUX que le modèle (à ne surtout pas régresser)

- Authentification réelle (OAuth Google sur invitation) vs liste de noms.
- Offre FIGÉE avec empreinte + C.B.D. jointe : le modèle réédite librement
  après signature — juridiquement fragile. Dashprod scelle.
- Numérotation de facture légale séquentielle automatique vs saisie manuelle.
- Paiements multiples avec solde (acompte 30 % → solde) vs simple « payée ».
- Multi-tenant RLS, journal d'audit, capacités — le modèle n'a rien de tout ça.
- Le chrono du modèle vit dans le navigateur ; Dashprod a des sessions en base.
