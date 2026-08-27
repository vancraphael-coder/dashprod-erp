# Lot 41 — responsable dépôt + bouton d'ajout de centre réparé

**27/08/2026.** **1154 tests verts**, build vert. **Migration 0149** appliquée
et vérifiée.

Ce lot débloque deux choses concrètes : tu peux enfin **créer un centre**, et
tu as un poste **responsable dépôt**. Le gros du travail sur les centres (accès
par centre, rapports tri-cadence) est le lot suivant, cadré ci-dessous.

---

## 1. Le bouton d'ajout de centre — réparé

**Le bug :** dans `Centres.jsx`, tout le bloc de gestion (dont
« + Ajouter un centre ») était conditionné à `maisonMere = rep != null`, où
`rep` vient de `repartitionCentres()`. Or cette répartition **n'aboutit qu'une
fois qu'on est déjà multi-centres** — donc **impossible de créer le premier
centre**. Un cercle vicieux.

**La correction :** le droit d'ajouter/modifier un centre dépend maintenant de
la capacité (`gerer_referentiels`, portée par `peutGererCentres`), pas de
l'existence d'une répartition. Le bouton apparaît dès qu'on a le droit —
premier centre compris.

## 2. Le poste « responsable dépôt »

Tu l'avais oublié. Il a **les attributions d'une secrétaire + la gestion du
dépôt** (`gerer_depot` : boxes, zones, contrats de garde-meubles). Comme la
secrétaire, il ne touche ni à la paie, ni à la facturation, ni aux réglages de
l'entreprise.

C'est le douzième poste. Migration 0149, additive et vérifiée (5 orgs ×
10 capacités). J'ai aussi ajouté la capacité `gerer_depot` au domaine
(`capacites.js`) : elle existait en base mais manquait côté code.

## Vérifié

- Grille des postes : le responsable dépôt garde tout ce qu'a la secrétaire,
  plus `gerer_depot` ; la secrétaire, elle, ne l'a pas.
- Il ne gagne aucun accès à l'argent (paie, facture, réglages).

---

## Le lot suivant — les centres, cadré avec tes réponses

Tu as tranché :

- **Responsable dépôt ne voit QUE son centre.** Scoping sur le `centre_id` de
  l'acteur, sur chaque écran qu'il ouvre.
- **Secrétaire+ accède à TOUS les centres et leurs écrans**, sans interférer
  avec la maison mère ni les autres centres — une bascule de centre.
- **Rapports jour / semaine / mois**, en **carte texte + historique**, SANS
  casser les KPI de la carte déjà présente. Le rapport actuel
  (`cmd_rapport_hebdo`) est figé sur 7 jours ; je le généralise par période.

C'est un vrai lot ; je l'attaque maintenant.

## À vérifier à l'œil

1. Compte → Paramètres → Centres logistiques : le bouton **« + Ajouter un
   centre »** est là, même sans aucun centre existant.
2. Attribuer le poste **Responsable dépôt** à quelqu'un (l'écran d'attribution
   arrive avec le lot permissions) : il aura les droits secrétaire + le dépôt.
