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
export const AIGUILLAGE = Object.freeze([
  "chiffrage/scenario-nature.js",
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
  {
    fichier: "lib/adaptateur.js",
    module: "releve/volumetrie.js",
    depuis: "2026-08-17",
    motif:
      "L'instantané d'offre (`figerInstance`) compose lui-même les rubriques "
      + "du déménagement : volume, articles à démonter, à remonter, remarques. "
      + "Sortie prévue : chaque nature contribue SES rubriques au document, au "
      + "lieu que le composeur les connaisse. Non fait ici parce qu'une offre "
      + "signée est opposable et figée (§4.7) — ce chemin ne se retouche pas "
      + "en marge d'un autre lot.",
  },
]);
