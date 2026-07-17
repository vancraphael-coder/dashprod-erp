// =============================================================================
// Opérations — Chrono de mission
// Source : Réf. 2 (chapitre 17 « Le chrono de mission » ; C-13 : coût réel).
// Le temps réel d'une mission est la SOMME des sessions démarrage→arrêt ; les
// pauses ne comptent pas. Logique PURE : accumulation, coût d'équipe, et
// proposition de passage à « effectué ». Alimente le Pilotage (dérive de marge).
// =============================================================================

/**
 * @typedef {Object} Session
 * @property {string} debut  ISO 8601
 * @property {string} [fin]  ISO 8601 ; absent si session en cours
 */

/**
 * Durée cumulée des sessions en secondes. Une session sans fin est comptée
 * jusqu'à `maintenant` (permet l'affichage en direct).
 * @param {Session[]} sessions
 * @param {string|Date} [maintenant] instant de référence (défaut : now)
 * @returns {number} secondes
 */
export function dureeSecondes(sessions, maintenant = new Date()) {
  const ref = maintenant instanceof Date ? maintenant : new Date(maintenant);
  let total = 0;
  for (const s of sessions || []) {
    if (!s.debut) continue;
    // Seules les sessions de travail comptent ; les pauses sont informatives.
    if (s.type === "pause") continue;
    const debut = new Date(s.debut).getTime();
    const fin = s.fin ? new Date(s.fin).getTime() : ref.getTime();
    if (fin > debut) total += Math.floor((fin - debut) / 1000);
  }
  return total;
}

/**
 * Durée cumulée des pauses (informatif — temps où l'équipe s'est arrêtée).
 * @param {Session[]} sessions
 * @param {Date} [maintenant]
 * @returns {number} secondes
 */
export function dureePause(sessions, maintenant = new Date()) {
  const ref = maintenant instanceof Date ? maintenant : new Date(maintenant);
  let total = 0;
  for (const s of sessions || []) {
    if (!s.debut || s.type !== "pause") continue;
    const debut = new Date(s.debut).getTime();
    const fin = s.fin ? new Date(s.fin).getTime() : ref.getTime();
    if (fin > debut) total += Math.floor((fin - debut) / 1000);
  }
  return total;
}

/** Une pause est-elle en cours ? */
export function enPause(sessions) {
  return (sessions || []).some((s) => s.type === "pause" && s.debut && !s.fin);
}

/**
 * Indique si le chrono tourne (au moins une session ouverte).
 * @param {Session[]} sessions
 * @returns {boolean}
 */
export function chronoEnCours(sessions) {
  return (sessions || []).some((s) => s.type !== "pause" && s.debut && !s.fin);
}

/**
 * Coût d'équipe pour une durée, à partir des taux horaires réels des membres
 * affectés (Réf. 2 ch.17). Si aucun taux n'est fourni, applique une base
 * prudente (effectif × tauxDefaut) — jamais dans un document client.
 * @param {number} secondes durée écoulée
 * @param {number[]} tauxHoraires taux (€/h) des membres affectés
 * @param {{effectif?: number, tauxDefaut?: number}} [prudent] base de repli
 * @returns {number} coût en centimes
 */
export function coutEquipeCentimes(secondes, tauxHoraires, prudent = {}) {
  const heures = secondes / 3600;
  let sommeTaux;
  if (Array.isArray(tauxHoraires) && tauxHoraires.length > 0) {
    sommeTaux = tauxHoraires.reduce((a, t) => a + (Number(t) || 0), 0);
  } else {
    const effectif = prudent.effectif || 0;
    const tauxDefaut = prudent.tauxDefaut || 32; // base prudente (Réf. 2 ch.17)
    sommeTaux = effectif * tauxDefaut;
  }
  return Math.round(heures * sommeTaux * 100);
}

/**
 * Formate une durée en secondes vers « HhMM » pour l'affichage.
 * @param {number} secondes
 * @returns {string}
 */
export function formaterDuree(secondes) {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Format hh:mm:ss pour l'affichage temps réel du chrono (les secondes défilent).
 * @param {number} secondes
 * @returns {string}
 */
export function formaterChrono(secondes) {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.floor(secondes % 60);
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

/**
 * Agrège les heures travaillées par membre à partir des missions et de leurs
 * sessions de chrono. Le temps d'une mission est réparti sur ses membres
 * affectés (chacun a fait le chantier). Les pauses sont exclues (dureeSecondes).
 * @param {{sessions: Session[], affectations: {utilisateur_id: string}[]}[]} missions
 * @returns {Object<string, number>} secondes travaillées par utilisateur_id
 */
export function heuresParMembre(missions) {
  const total = {};
  for (const m of missions || []) {
    const sec = dureeSecondes(m.sessions);
    if (sec <= 0) continue;
    const membres = (m.affectations || []).map((a) => a.utilisateur_id || a.utilisateurId || a);
    for (const id of membres) {
      if (!id) continue;
      total[id] = (total[id] || 0) + sec;
    }
  }
  return total;
}

/**
 * Total global des heures travaillées (toutes missions). Compte le temps
 * chantier UNE fois (pas multiplié par l'effectif) — c'est le temps réel
 * mobilisé sur le terrain.
 * @param {{sessions: Session[]}[]} missions
 * @returns {number} secondes
 */
export function heuresGlobales(missions) {
  return (missions || []).reduce((s, m) => s + dureeSecondes(m.sessions), 0);
}

/**
 * Pauses numérotées d'une mission : Pause 1, Pause 2, … avec la durée de
 * chacune (celle en cours continue de courir).
 * @param {Session[]} sessions
 * @param {Date} [maintenant]
 * @returns {{n: number, secondes: number, enCours: boolean}[]}
 */
export function listePauses(sessions, maintenant = new Date()) {
  const ref = maintenant instanceof Date ? maintenant : new Date(maintenant);
  return (sessions || [])
    .filter((s) => s.type === "pause" && s.debut)
    .sort((a, b) => new Date(a.debut) - new Date(b.debut))
    .map((s, i) => {
      const fin = s.fin ? new Date(s.fin).getTime() : ref.getTime();
      const debut = new Date(s.debut).getTime();
      return { n: i + 1, secondes: Math.max(0, Math.floor((fin - debut) / 1000)),
               enCours: !s.fin };
    });
}
