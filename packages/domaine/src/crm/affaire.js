// =============================================================================
// CRM — Machine à états de l'affaire
// Source : Réf. 2 (S4 « Le cycle de vie de l'affaire »).
// Le statut n'est pas une étiquette qu'on choisit : c'est un état qu'on atteint
// par une transition autorisée, sous conditions (gardes). Logique PURE : la
// fonction SQL de transition (migration 0006) applique EXACTEMENT cette table.
// Résout C-06 (cycle de vie éclaté).
// =============================================================================

/**
 * Les états du CYCLE OPÉRATIONNEL (S4) — où en est le déménagement.
 *
 * Depuis la séparation des cycles (migration 0064), « facture » et « paye » ne
 * sont plus des états du déménagement : l'argent a son propre cycle, dérivé
 * des factures et des paiements (voir etat_facturation en base). Ils restent
 * dans cette liste pour lire d'anciens dossiers, mais aucune transition n'y
 * mène plus.
 */
export const ETATS = Object.freeze([
  "brouillon", "devis", "envoye", "confirme", "planifie",
  "en_cours", "effectue", "clos",
  "reporte", "annule",
  "facture", "paye",   // hérités — plus atteignables
]);

/** Les états du CYCLE DE FACTURATION — où en est l'argent. Toujours dérivés. */
export const ETATS_FACTURATION = Object.freeze([
  "non_facture", "facture", "partiellement_paye", "paye",
]);

/**
 * Transitions autorisées : état source → états cibles possibles.
 * Toute transition hors de cette table est refusée.
 */
const TRANSITIONS = Object.freeze({
  brouillon: ["devis", "annule"],
  devis:     ["envoye", "annule"],
  envoye:    ["confirme", "reporte", "annule"],
  confirme:  ["planifie", "reporte", "annule"],
  planifie:  ["en_cours", "reporte", "annule"],
  en_cours:  ["effectue", "annule"],
  // Fin du parcours opérationnel : le dossier se clôt une fois exécuté.
  // La facturation ne passe plus par ici.
  effectue:  ["clos", "annule"],
  reporte:   ["planifie", "annule"],   // une affaire reportée se replanifie
  // Une annulation se reprend : on revient à l'état mémorisé avant elle.
  annule:    ["devis", "envoye", "confirme", "planifie"],
  clos:      [],                        // état terminal
  facture:   [],                        // hérité — plus atteignable
  paye:      [],                        // hérité — plus atteignable
});

/**
 * Gardes par état cible : conditions à satisfaire pour ENTRER dans l'état.
 * Chaque garde reçoit un contexte (faits connus de l'affaire) et renvoie
 * true si la condition est remplie. Les deux invariants absolus de S4 :
 *  - "confirme" exige une instance de document signée et figée (C-02).
 * La garde "facture" a disparu avec la séparation des cycles : une facture
 * s'émet désormais sur un dossier engagé, sans changer son état opérationnel.
 * @type {Object<string, (ctx: Object) => boolean>}
 */
const GARDES = Object.freeze({
  devis:    (ctx) => ctx.aReleve || ctx.aMontant,
  envoye:   (ctx) => ctx.instanceGeneree === true,
  confirme: (ctx) => ctx.instanceSignee === true,       // invariant absolu (C-02)
  planifie: (ctx) => ctx.aDate && ctx.aEquipe && ctx.aVehicule,
  effectue: (ctx) => ctx.chronoArrete === true,
  paye:     (ctx) => ctx.soldeRegle === true,
});

/**
 * Indique si une transition d'un état vers un autre est structurellement permise.
 * @param {string} source
 * @param {string} cible
 * @returns {boolean}
 */
export function transitionPermise(source, cible) {
  const cibles = TRANSITIONS[source];
  return Array.isArray(cibles) && cibles.includes(cible);
}

/**
 * Vérifie une transition complète : permise ET garde satisfaite.
 * Renvoie un résultat typé pour l'audit et les messages d'interface.
 * @param {string} source état actuel
 * @param {string} cible état visé
 * @param {Object} [ctx] faits connus de l'affaire (pour les gardes)
 * @returns {{autorise: boolean, raison: string|null}}
 */
export function verifierTransition(source, cible, ctx = {}) {
  if (!ETATS.includes(source) || !ETATS.includes(cible)) {
    return { autorise: false, raison: "etat_inconnu" };
  }
  if (!transitionPermise(source, cible)) {
    return { autorise: false, raison: "transition_interdite" };
  }
  const garde = GARDES[cible];
  if (garde && !garde(ctx)) {
    return { autorise: false, raison: "garde_non_satisfaite" };
  }
  return { autorise: true, raison: null };
}

/**
 * Liste les transitions possibles depuis un état (pour projeter les actions
 * offertes à l'écran, S9), en tenant compte des gardes si un contexte est fourni.
 * @param {string} source
 * @param {Object} [ctx]
 * @returns {string[]} états cibles atteignables
 */
export function transitionsPossibles(source, ctx = {}) {
  return (TRANSITIONS[source] || []).filter(
    (cible) => verifierTransition(source, cible, ctx).autorise
  );
}
