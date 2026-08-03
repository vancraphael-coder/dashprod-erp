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

// =============================================================================
// DISPONIBILITÉ D'UNE RESSOURCE — hommes et camions, même grammaire.
//
// Trois niveaux, et il faut les distinguer : les confondre a fait qu'un homme
// posé sur deux chantiers le même jour ne se voyait nulle part.
//
//   libre         → rien à signaler
//   double        → déjà pris sur un AUTRE chantier ce jour-là.
//                   AVERTISSEMENT, pas interdiction : deux missions courtes
//                   dans la même journée sont parfois voulues. Le bureau
//                   décide, le système signale. (Orange.)
//   indisponible  → en congé. Le bureau peut passer outre, mais c'est une
//                   autre nature de problème : la personne n'est pas là.
//                   (Rouge.)
//
// Un point qui coûtait cher : le verdict se calcule AUSSI pour une ressource
// déjà affectée à la mission courante. Sinon un doublon devient invisible dès
// qu'on l'a créé — exactement le symptôme constaté.
// =============================================================================

/** Niveaux, du plus anodin au plus grave. */
export const NIVEAUX_DISPO = Object.freeze(["libre", "double", "indisponible"]);

/**
 * Disponibilité d'une ressource (membre ou véhicule) pour une mission.
 *
 * @param {object} p
 * @param {string} p.date        jour de la mission
 * @param {string} p.missionId   mission en cours d'édition (exclue du calcul)
 * @param {{missionId: string, date: string}[]} [p.affectations]
 *        les autres missions où cette ressource est engagée
 * @param {{debut: string, fin: string}[]} [p.conges]
 *        congés de la personne — vide pour un véhicule
 */
export function disponibiliteRessource({ date, missionId, affectations, conges }) {
  const enConge = estEnConge(conges, date);
  // On exclut la mission courante : être affecté ICI n'est pas un doublon.
  const ailleurs = (affectations || []).filter(
    (a) => a.missionId !== missionId && memeJour(a.date, date));

  const niveau = enConge ? "indisponible" : ailleurs.length > 0 ? "double" : "libre";
  return {
    niveau,
    enConge,
    doubleAffectation: ailleurs.length > 0,
    nbAutresMissions: ailleurs.length,
    conflit: niveau !== "libre",
    // Le libellé court affiché à côté du nom, ou null si rien à dire.
    raison: enConge ? "congé"
          : ailleurs.length > 1 ? `${ailleurs.length} autres chantiers`
          : ailleurs.length === 1 ? "déjà pris"
          : null,
  };
}

/**
 * Le verdict d'ensemble d'une mission : ce que le bureau doit voir avant de
 * partager. On remonte le pire niveau rencontré, plus le détail.
 */
export function verdictMission({ date, missionId, membres, vehicules }) {
  const problemes = [];
  for (const r of [...(membres || []), ...(vehicules || [])]) {
    const d = disponibiliteRessource({
      date, missionId, affectations: r.affectations, conges: r.conges,
    });
    if (d.conflit) problemes.push({ nom: r.nom, type: r.type || "membre", ...d });
  }
  const pire = problemes.some((p) => p.niveau === "indisponible") ? "indisponible"
             : problemes.length > 0 ? "double" : "libre";
  return { niveau: pire, problemes, ok: pire === "libre" };
}
