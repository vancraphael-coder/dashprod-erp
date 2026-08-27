// =============================================================================
// Opérations — Missions et affectations
// Source : Réf. 2 (C-04 : mission séparée de l'affaire ; C-13 : affectation =
// source unique de l'effectif ; C-20 : conflits et remplaçants ; agenda).
// Logique PURE : sous-cycle d'état de la mission, et détection des conflits
// d'affectation (congé, double affectation le même jour).
// =============================================================================

/**
 * Type de chantier → couleur et libellé. Une lecture immédiate sur l'agenda du
 * terrain : un déménagement (le gros œuvre) en vert, une visite (l'évaluation)
 * en bleu, l'emballage en violet. Couleurs alignées sur le thème.
 */
const TYPES_MISSION = {
  demenagement: { libelle: "Déménagement", couleur: "#16A34A" },
  lift: { libelle: "Lift", couleur: "#D97706" },
  sous_traitance: { libelle: "Sous-traitance", couleur: "#DC2626" },
  visite: { libelle: "Visite", couleur: "#2563EB" },
  emballage: { libelle: "Emballage", couleur: "#7C3AED" },
};

export function couleurTypeMission(type) {
  return (TYPES_MISSION[type] || { couleur: "#64748B" }).couleur;
}

export function libelleTypeMission(type) {
  return (TYPES_MISSION[type] || { libelle: type || "Chantier" }).libelle;
}

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
export function disponibiliteRessource({ date, missionId, affectations, conges, equipeCourante = null }) {
  const enConge = estEnConge(conges, date);
  // On exclut la mission courante : être affecté ICI n'est pas un doublon.
  // On exclut AUSSI les missions du même jour qui relèvent de la MÊME équipe :
  // une équipe peut porter plusieurs missions (déménagement + emballage le même
  // jour), et être sur deux missions d'UNE SEULE équipe n'est pas être pris
  // deux fois — c'est la même présence. Le vrai doublon, c'est deux ÉQUIPES
  // distinctes. (Précision de Raphaël.)
  const ailleurs = (affectations || []).filter((a) => {
    if (a.missionId === missionId) return false;
    if (!memeJour(a.date, date)) return false;
    // Même équipe que la mission courante ? Alors ce n'est pas un doublon.
    if (equipeCourante != null && a.equipeId != null
        && a.equipeId === equipeCourante) return false;
    return true;
  });

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

/**
 * LE LECTEUR DE DISPONIBILITÉ — la composition, faite une seule fois.
 *
 * `disponibiliteRessource` est pur et ne connaît que sa ressource ; encore
 * faut-il lui rassembler les engagements et les congés. Cette composition
 * vivait en double, en closures dans l'écran Planning — et il aurait fallu la
 * recopier une troisième fois pour l'afficher sur les cartes de date. Trois
 * copies d'une règle de conflit, c'est trois occasions de diverger, et la
 * divergence ne se voit pas : elle se traduit par un doublon non signalé.
 *
 * On rend un lecteur plutôt qu'un résultat : l'écran interroge ressource par
 * ressource, au moment où il dessine chaque nom.
 *
 * @param {object} p
 * @param {object[]} p.missions toutes les missions connues, avec `affectations`
 *   (`{utilisateur_id}`) et `camions` (identifiants)
 * @param {object[]} p.conges congés, avec `utilisateur_id`, `etat`, `debut`, `fin`
 */
export function lecteurDisponibilite({ missions = [], conges = [], equipeParMission = {} } = {}) {
  // L'équipe du jour à laquelle une mission est affiliée, s'il y en a une.
  // Deux missions de la MÊME équipe ne sont pas un doublon : c'est la même
  // présence. `equipeParMission` : { [missionId]: equipeId }.
  const equipeDe = (mid) => equipeParMission[mid] ?? null;

  const engagementsMembre = (id) => missions
    .filter((m) => (m.affectations || []).some((a) => a.utilisateur_id === id))
    .map((m) => ({ missionId: m.id, date: m.date, equipeId: equipeDe(m.id) }));

  const engagementsVehicule = (id) => missions
    .filter((m) => (m.camions || []).includes(id))
    .map((m) => ({ missionId: m.id, date: m.date, equipeId: equipeDe(m.id) }));

  // SEULS les congés ACCORDÉS rendent indisponible. Une demande en attente
  // n'est pas une absence : bloquer dessus laisserait le membre décider seul
  // de son planning, alors que la décision revient au bureau.
  const congesDe = (id) => conges
    .filter((c) => c.utilisateur_id === id && c.etat !== "demande")
    .map((c) => ({ debut: c.debut, fin: c.fin }));

  return {
    membre: (id, { date, missionId } = {}) => disponibiliteRessource({
      date, missionId, equipeCourante: equipeDe(missionId),
      affectations: engagementsMembre(id), conges: congesDe(id),
    }),
    // Un véhicule ne prend pas de congé : seule la double réservation le
    // concerne. Aucun contrôle n'existait avant — un camion pouvait être posé
    // sur deux chantiers le même jour sans que rien ne le signale.
    vehicule: (id, { date, missionId } = {}) => disponibiliteRessource({
      date, missionId, equipeCourante: equipeDe(missionId),
      affectations: engagementsVehicule(id), conges: [],
    }),
  };
}
