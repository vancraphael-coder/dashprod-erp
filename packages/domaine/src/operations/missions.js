// =============================================================================
// Opérations — Missions et affectations
// Source : Réf. 2 (C-04 : mission séparée de l'affaire ; C-13 : affectation =
// source unique de l'effectif ; C-20 : conflits et remplaçants ; agenda).
// Logique PURE : sous-cycle d'état de la mission, et détection des conflits
// d'affectation (congé, double affectation le même jour).
// =============================================================================

/** Sous-cycle d'état d'une mission (S4, section mission). */
export const ETATS_MISSION = Object.freeze([
  "planifiee", "en_cours", "effectuee", "annulee",
]);

const TRANSITIONS_MISSION = Object.freeze({
  planifiee: ["en_cours", "annulee"],
  en_cours:  ["effectuee", "annulee"],
  effectuee: [],
  annulee:   [],
});

/**
 * Indique si une transition de mission est permise.
 * @param {string} source
 * @param {string} cible
 * @returns {boolean}
 */
export function transitionMissionPermise(source, cible) {
  const cibles = TRANSITIONS_MISSION[source];
  return Array.isArray(cibles) && cibles.includes(cible);
}

/**
 * Vérifie si une personne est en congé à une date donnée.
 * @param {{debut: string, fin: string}[]} conges périodes approuvées
 * @param {string} date  ISO (jour)
 * @returns {boolean}
 */
export function estEnConge(conges, date) {
  const j = new Date(date).getTime();
  return (conges || []).some((c) => {
    const d = new Date(c.debut).getTime();
    const f = new Date(c.fin).getTime();
    return j >= d && j <= f;
  });
}

/**
 * Détecte les conflits d'affectation d'une personne pour une mission donnée.
 * Deux causes (Réf. 2, onglet Contact / agenda) :
 *  - congé : une période de congé couvre la date de la mission ;
 *  - double : la personne est déjà affectée à une autre mission le même jour.
 * @param {Object} params
 * @param {string} params.date              date de la mission visée
 * @param {string} params.missionId         id de la mission visée (exclue du calcul de doublon)
 * @param {{debut: string, fin: string}[]} params.conges  congés approuvés de la personne
 * @param {{missionId: string, date: string}[]} params.affectations autres affectations de la personne
 * @returns {{enConge: boolean, doubleAffectation: boolean, conflit: boolean}}
 */
export function conflitsAffectation({ date, missionId, conges, affectations }) {
  const enConge = estEnConge(conges, date);
  const doubleAffectation = (affectations || []).some(
    (a) => a.missionId !== missionId && memeJour(a.date, date)
  );
  return { enConge, doubleAffectation, conflit: enConge || doubleAffectation };
}

/**
 * Propose les remplaçants disponibles pour une mission (C-20) : les membres
 * actifs sans conflit à la date. La décision reste humaine (l'IA/le système
 * propose, n'affecte pas).
 * @param {Object} params
 * @param {string} params.date
 * @param {string} params.missionId
 * @param {{id: string, actif: boolean, conges: any[], affectations: any[]}[]} params.membres
 * @returns {string[]} identifiants des membres disponibles
 */
export function remplacantsDisponibles({ date, missionId, membres }) {
  return (membres || [])
    .filter((m) => m.actif)
    .filter((m) => !conflitsAffectation({
      date, missionId, conges: m.conges, affectations: m.affectations,
    }).conflit)
    .map((m) => m.id);
}

/** Compare deux dates au jour près (ignore l'heure). */
function memeJour(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear()
      && da.getUTCMonth() === db.getUTCMonth()
      && da.getUTCDate() === db.getUTCDate();
}
