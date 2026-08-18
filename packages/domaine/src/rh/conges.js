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

/**
 * Valide une demande de congé AVANT de l'envoyer. Règle métier pure : ni base,
 * ni fuseau — on compare des chaînes AAAA-MM-JJ, qui s'ordonnent
 * lexicographiquement, donc pas de piège de `Date` selon l'heure locale.
 *
 * On rend un {ok, motif} motivé plutôt qu'un booléen : le terrain doit pouvoir
 * DIRE pourquoi la demande est refusée, pas juste griser un bouton. Et le motif
 * s'affiche tel quel — c'est pour ça qu'il est rédigé, pas codé.
 *
 * @param {{debut: string, fin: string}} demande
 * @param {string} aujourdhui AAAA-MM-JJ (injecté : le domaine ne lit pas l'horloge)
 */
export function validerDemandeConge({ debut, fin } = {}, aujourdhui) {
  if (!debut || !fin) {
    return { ok: false, motif: "Choisissez une date de début et une date de fin." };
  }
  if (fin < debut) {
    return { ok: false, motif: "La date de fin précède la date de début." };
  }
  // On peut demander pour aujourd'hui (un imprévu du matin), pas pour hier :
  // un congé rétroactif n'a pas de sens, et masquerait une absence déjà passée.
  if (aujourdhui && debut < aujourdhui) {
    return { ok: false, motif: "On ne demande pas un congé pour une date passée." };
  }
  return { ok: true };
}

/** Nombre de jours COUVERTS par une période, bornes incluses (1 jour minimum). */
export function joursCouverts({ debut, fin } = {}) {
  if (!debut || !fin || fin < debut) return 0;
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  return Math.round(ms / 86400000) + 1;
}
