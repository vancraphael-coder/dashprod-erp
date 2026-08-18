// =============================================================================
// L'ARCHITECTURE — l'horizontal et les verticaux.
//
// La règle, dite par Raphaël : « le déménagement est un VERTICAL qui doit
// utiliser l'HORIZONTAL Dashprod ». Autrement dit, la flèche va toujours dans
// le même sens : un métier peut s'appuyer sur le socle, le socle ne peut
// jamais s'appuyer sur un métier. Le jour où le noyau importe le déménagement,
// Dashprod n'est plus un ERP horizontal qui sert cinq métiers : c'est un
// logiciel de déménagement avec des options — et on ne s'en aperçoit qu'en
// essayant de vendre à un garde-meubles.
//
// CE FICHIER N'EST PAS DU CODE D'EXÉCUTION. Il vit hors de `src/` exprès :
// aucun module ne peut l'importer, il ne sert qu'au test qui l'applique. Une
// arborescence ne garantit rien — rien n'empêche `crm/` d'importer
// `releve/`. Ce qui fait tenir l'architecture, c'est le test.
//
// POUR AJOUTER UN MÉTIER : déclarer ses modules ici. Tout ce qui n'est pas
// déclaré est HORIZONTAL, donc soumis à l'interdiction — l'oubli penche du
// côté sûr.
// =============================================================================

/**
 * Les VERTICAUX : ce qui n'a de sens que dans un métier.
 * Chemins relatifs à `packages/domaine/src`.
 */
export const VERTICAUX = Object.freeze({
  demenagement: {
    nom: "Déménagement",
    // Le relevé volumétrique, les meubles par pièce et le matériel d'emballage
    // ne veulent rien dire pour un lift ni pour un garde-meubles.
    modules: [
      "releve/volumetrie.js",
      "releve/inventaire-export.js",
      "stocks/emballage.js",
      "stocks/meubles-piece.js",
    ],
  },
  lift: {
    nom: "Lift",
    // Les couronnes et leur temps sur place : un modèle de prix à lui seul.
    modules: ["chiffrage/lift.js"],
  },
  sous_traitance: {
    nom: "Sous-traitance",
    modules: ["chiffrage/sous-traitance.js"],
  },
  garde_meubles: {
    nom: "Garde-meubles et logistique",
    // Zones, boxes, contrats récurrents et leurs échéances.
    modules: ["stocks/stockage.js"],
  },
});

/**
 * L'AIGUILLAGE : les rares modules qui ont le DROIT de connaître tous les
 * verticaux, parce que leur travail est justement de choisir entre eux.
 * `chiffrerAffaire()` en est l'exemple : ni le devis ni l'offre n'ont à savoir
 * quel moteur de prix appeler — c'est lui qui sait.
 *
 * Ils sont au SOMMET de l'édifice, jamais dans ses fondations : l'horizontal
 * ne peut pas les importer non plus, sinon l'interdiction se contourne en une
 * ligne.
 */
/**
 * L'AIGUILLAGE : les rares modules qui ont le DROIT de connaître tous les
 * verticaux, parce que leur travail est justement de choisir entre eux.
 *
 * Deux familles, parce qu'elles n'ont pas le même appelant :
 *
 *   · `chiffrage` — choisit le moteur de PRIX (`chiffrerAffaire`). Il importe
 *     plusieurs métiers (lift, sous-traitance), donc la plomberie web ne peut
 *     PAS l'appeler sans les hériter : il reste INTERNE au domaine.
 *   · `composition` — choisit les RUBRIQUES d'un document selon la nature.
 *     Chacun n'importe qu'UN métier (celui qui a des rubriques propres), donc
 *     l'appeler n'entraîne aucun autre métier : la plomberie PEUT l'appeler.
 *
 * Dans les deux cas, le socle interne ne les importe jamais — ils sont au
 * sommet de l'édifice.
 */
export const AIGUILLAGE = Object.freeze({
  chiffrage: ["chiffrage/scenario-nature.js"],
  composition: ["releve/rubriques-offre.js"],
});

/** Tous les aiguillages confondus — pour les règles internes au domaine. */
export const TOUS_AIGUILLAGES = Object.freeze([
  ...AIGUILLAGE.chiffrage, ...AIGUILLAGE.composition,
]);

/**
 * La plomberie HORIZONTALE de l'application web : les fichiers qui servent
 * tous les métiers et ne doivent donc en connaître aucun.
 */
export const PLOMBERIE_WEB = Object.freeze(["lib"]);

/**
 * LES DÉROGATIONS — une dette, pas une permission.
 *
 * Chacune est datée et motivée. Le test vérifie qu'elles sont toujours RÉELLES :
 * une dérogation devenue inutile fait échouer la suite, pour qu'on la retire.
 * Cette liste ne peut donc que rétrécir. C'est tout l'intérêt d'un cliquet.
 */
export const DEROGATIONS = Object.freeze([
  // Plus aucune dérogation. Celle de `lib/adaptateur.js → releve/volumetrie.js`
  // (2026-08-17) a été levée : le composeur d'offre passe désormais par
  // `releve/rubriques-offre.js`, un module du vertical déménagement qui assemble
  // les rubriques. La flèche est repartie dans le bon sens. Le test refuse
  // qu'on rouvre une dérogation morte, et il refuserait aussi que la fuite
  // revienne.
]);
