// =============================================================================
// LES CYCLES DE VIE PAR NATURE — six métiers, trois familles de parcours.
//
// LE DÉFAUT QU'ON CORRIGE (constaté le 01/09/2026) : une seule machine à états,
// taillée pour le déménagement, s'appliquait aux six natures. Conséquences
// mesurées sur la production : 47 dossiers hors déménagement, 1 seule facture.
// Boxe, zone et sous-traitance étaient à 100 % en brouillon, parce que :
//   · « planifié » exige équipe + véhicule → un boxe n'en a pas ;
//   · « effectué » exige un chrono de chantier → une location n'en a pas ;
//   · « confirmé » exige un devis signé → personne ne fait signer pour un lift.
//
// TROIS FAMILLES suffisent à couvrir les six métiers :
//
//   CHANTIER  (déménagement, lift, sous-traitance) — on prépare, on exécute une
//             fois, on clôt. C'est le cycle historique, INCHANGÉ pour le
//             déménagement. Le lift et la sous-traitance y entrent avec un
//             ACCORD ALLÉGÉ : une confirmation tracée suffit, sans instance
//             signée (on ne fait pas signer un devis pour un lift à 150 €).
//
//   CONTRAT   (boxe, zone) — un engagement qui COURT dans le temps, facturé
//             période après période. Ni « planifié », ni « effectué » : le box
//             ne s'exécute pas, il se loue. actif → [suspendu] → terminé.
//             Modèle éprouvé du self-storage (Shurgard, Go Box…) : un contrat,
//             une unité attribuée, une facturation récurrente, une sortie.
//
//   VENTE     (vente comptoir) — pas d'état du tout. La facture EST l'événement.
//
// Ce module ne remplace pas `crm/affaire.js` : il le SPÉCIALISE par nature.
// La machine générique reste la référence du cycle CHANTIER.
// =============================================================================

import { nature } from "../commercial/natures.js";
import { verifierTransition } from "./affaire.js";

/** Les trois familles de cycles. */
export const FAMILLES = Object.freeze(["chantier", "contrat", "vente"]);

/** À quelle famille appartient chaque nature. */
const FAMILLE_PAR_NATURE = Object.freeze({
  demenagement: "chantier",
  lift: "chantier",
  sous_traitance: "chantier",
  boxe: "contrat",
  zone: "contrat",
  vente: "vente",
});

/**
 * La famille de cycle d'une nature. Une nature inconnue retombe sur CHANTIER —
 * le cycle le plus complet, donc le plus prudent (on ne débloque rien par
 * accident).
 * @param {string} cle
 * @returns {"chantier"|"contrat"|"vente"}
 */
export function familleDeNature(cle) {
  return FAMILLE_PAR_NATURE[cle] || "chantier";
}

// ── Le cycle CONTRAT (boxe, zone) ───────────────────────────────────────────
//
// proposition : on a chiffré, on propose. actif : le contrat court, la
// facturation récurrente tourne. suspendu : gelé (impayé, congé) sans rompre.
// termine : sorti, plus de facturation. annule : jamais entré en vigueur.

export const ETATS_CONTRAT = Object.freeze([
  "brouillon", "proposition", "actif", "suspendu", "termine", "annule",
]);

const TRANSITIONS_CONTRAT = Object.freeze({
  brouillon:   ["proposition", "annule"],
  proposition: ["actif", "annule"],
  actif:       ["suspendu", "termine"],
  suspendu:    ["actif", "termine"],
  termine:     [],            // terminal
  annule:      ["proposition"],
});

/**
 * Gardes du cycle CONTRAT. Volontairement peu nombreuses : un contrat n'a ni
 * équipe, ni véhicule, ni chrono. Ce qu'il exige, c'est un TARIF (sans quoi la
 * facturation récurrente n'a rien à réclamer) et une DATE DE DÉBUT.
 */
const GARDES_CONTRAT = Object.freeze({
  proposition: (ctx) => ctx.aTarif === true,
  actif:       (ctx) => ctx.aTarif === true && ctx.aDateDebut === true,
  termine:     (ctx) => ctx.aDateFin === true,
});

// ── Le cycle CHANTIER allégé (lift, sous-traitance) ─────────────────────────
//
// Mêmes états que le déménagement — mais « confirmé » n'exige PAS d'instance
// signée : un accord tracé (oral noté, mail, SMS) suffit. C'est ce qui bloquait
// 20 lifts sur 21 en brouillon.

const GARDES_CHANTIER_ALLEGE = Object.freeze({
  devis:    (ctx) => ctx.aReleve === true || ctx.aMontant === true,
  envoye:   (ctx) => ctx.instanceGeneree === true || ctx.accordTrace === true,
  // L'allègement : un accord tracé vaut confirmation. L'instance signée reste
  // acceptée (si on a fait signer, tant mieux) — elle n'est plus EXIGÉE.
  confirme: (ctx) => ctx.instanceSignee === true || ctx.accordTrace === true,
  planifie: (ctx) => ctx.aDate === true && ctx.aVehicule === true,
  effectue: (ctx) => ctx.chronoArrete === true,
});

/**
 * Une nature exige-t-elle une instance SIGNÉE pour être confirmée ?
 * Le déménagement : oui (invariant C-02, un déménagement complet s'engage par
 * écrit). Le lift et la sous-traitance : non (accord tracé suffisant).
 */
export function exigeSignature(cle) {
  return cle === "demenagement";
}

/**
 * Une nature exige-t-elle une ÉQUIPE pour être planifiée ?
 * Un lift part avec un véhicule et son opérateur, pas une équipe constituée.
 */
export function exigeEquipe(cle) {
  return cle === "demenagement" || cle === "sous_traitance";
}

/**
 * Les états du cycle d'une nature.
 * @param {string} cle
 * @returns {string[]}
 */
export function etatsDeNature(cle) {
  const f = familleDeNature(cle);
  if (f === "contrat") return [...ETATS_CONTRAT];
  if (f === "vente") return [];            // pas de cycle : la facture fait foi
  return ["brouillon", "devis", "envoye", "confirme", "planifie",
          "en_cours", "effectue", "clos", "reporte", "annule"];
}

/**
 * Les transitions permises depuis un état, pour une nature donnée.
 * @returns {string[]}
 */
export function transitionsDeNature(cle, source) {
  const f = familleDeNature(cle);
  if (f === "vente") return [];
  if (f === "contrat") return [...(TRANSITIONS_CONTRAT[source] || [])];
  // CHANTIER : la table historique fait référence.
  const T = {
    brouillon: ["devis", "annule"],
    devis: ["envoye", "annule"],
    envoye: ["confirme", "reporte", "annule"],
    confirme: ["planifie", "reporte", "annule"],
    planifie: ["en_cours", "reporte", "annule"],
    en_cours: ["effectue", "annule"],
    effectue: ["clos", "annule"],
    reporte: ["planifie", "annule"],
    annule: ["devis", "envoye", "confirme", "planifie"],
    clos: [],
  };
  return [...(T[source] || [])];
}

/**
 * Vérifie une transition POUR UNE NATURE. C'est le point d'entrée qui remplace
 * l'usage aveugle de la machine générique.
 *
 * @param {string} cle       nature de l'affaire
 * @param {string} source    état courant
 * @param {string} cible     état visé
 * @param {object} ctx       faits connus
 * @returns {{ok: boolean, motif?: string}}
 */
export function verifierTransitionNature(cle, source, cible, ctx = {}) {
  const f = familleDeNature(cle);
  if (f === "vente") {
    return { ok: false, motif: "Une vente n'a pas de cycle : la facture fait foi." };
  }
  const permises = transitionsDeNature(cle, source);
  if (!permises.includes(cible)) {
    return { ok: false, motif: `Transition ${source} → ${cible} non permise pour « ${nature(cle)?.titre || cle} ».` };
  }
  const gardes = f === "contrat"
    ? GARDES_CONTRAT
    : (exigeSignature(cle) ? null : GARDES_CHANTIER_ALLEGE);

  // Déménagement : AUCUN allègement. On délègue vraiment à la machine générique
  // — renvoyer « ok » ici relâcherait l'invariant C-02 (instance signée) pour
  // tout appelant qui n'utiliserait que cette fonction.
  if (gardes === null) {
    const g = verifierTransition(source, cible, ctx);
    return g.autorise
      ? { ok: true }
      : { ok: false, motif: cible === "confirme"
            ? "Un déménagement se confirme sur une offre SIGNÉE (invariant C-02)."
            : manqueDe("chantier", cible) };
  }

  const garde = gardes[cible];
  if (!garde) return { ok: true };
  if (!garde(ctx)) {
    return { ok: false, motif: manqueDe(f, cible) };
  }
  return { ok: true };
}

/** Ce qui manque, en clair, pour entrer dans un état. */
function manqueDe(famille, cible) {
  if (famille === "contrat") {
    if (cible === "proposition") return "Il manque le tarif du contrat.";
    if (cible === "actif") return "Il manque le tarif ou la date de début.";
    if (cible === "termine") return "Il manque la date de sortie.";
  }
  if (cible === "devis") return "Il manque un relevé ou un montant.";
  if (cible === "envoye") return "Il manque un document ou un accord tracé.";
  if (cible === "confirme") return "Il manque l'accord du client (signé ou tracé).";
  if (cible === "planifie") return "Il manque la date ou le véhicule.";
  if (cible === "effectue") return "Le chantier n'est pas terminé.";
  return "Condition non remplie.";
}
