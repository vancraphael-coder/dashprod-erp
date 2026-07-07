// =============================================================================
// RH — Workflow des congés
// Source : Réf. 2 (C-25 : les congés n'ont pas de workflow → demande, approbation,
// visibilité planning). Logique PURE : les transitions d'état d'une demande de
// congé et la règle de chevauchement. Un congé approuvé alimente les conflits
// d'affectation (module Opérations, estEnConge).
// =============================================================================

/** États d'une demande de congé. */
export const ETATS_CONGE = Object.freeze(["demande", "approuve", "refuse", "annule"]);

const TRANSITIONS_CONGE = Object.freeze({
  demande:  ["approuve", "refuse", "annule"],
  approuve: ["annule"],   // un congé approuvé peut être annulé (ex. retour anticipé)
  refuse:   [],
  annule:   [],
});

/**
 * Indique si une transition de congé est permise.
 * @param {string} source
 * @param {string} cible
 * @returns {boolean}
 */
export function transitionCongePermise(source, cible) {
  const cibles = TRANSITIONS_CONGE[source];
  return Array.isArray(cibles) && cibles.includes(cible);
}

/**
 * Vérifie qu'une transition est permise ET que l'acteur a le droit requis :
 * demander est ouvert à tous (capacité demander_conge) ; approuver/refuser
 * exige approuver_conge (matrice S3). L'appelant fournit le booléen de droit.
 * @param {string} source
 * @param {string} cible
 * @param {boolean} peutApprouver  l'acteur détient-il approuver_conge
 * @returns {{autorise: boolean, raison: string|null}}
 */
export function verifierTransitionConge(source, cible, peutApprouver) {
  if (!transitionCongePermise(source, cible)) {
    return { autorise: false, raison: "transition_interdite" };
  }
  if ((cible === "approuve" || cible === "refuse") && !peutApprouver) {
    return { autorise: false, raison: "approbation_non_autorisee" };
  }
  return { autorise: true, raison: null };
}

/**
 * Détecte si deux périodes se chevauchent (pour signaler des demandes
 * concurrentes sur la même personne, ou informer le planning).
 * @param {{debut: string, fin: string}} a
 * @param {{debut: string, fin: string}} b
 * @returns {boolean}
 */
export function periodesSeChevauchent(a, b) {
  const da = new Date(a.debut).getTime(), fa = new Date(a.fin).getTime();
  const db = new Date(b.debut).getTime(), fb = new Date(b.fin).getTime();
  return da <= fb && db <= fa;
}

/**
 * Parmi les congés approuvés d'une personne, ceux qui chevauchent une période
 * demandée — pour alerter avant approbation d'un doublon.
 * @param {{debut: string, fin: string}} demande
 * @param {{debut: string, fin: string, etat: string}[]} congesExistants
 * @returns {number} nombre de chevauchements approuvés
 */
export function chevauchementsApprouves(demande, congesExistants) {
  return (congesExistants || [])
    .filter((c) => c.etat === "approuve")
    .filter((c) => periodesSeChevauchent(demande, c))
    .length;
}
