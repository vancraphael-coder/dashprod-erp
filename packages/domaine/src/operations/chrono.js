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
    const debut = new Date(s.debut).getTime();
    const fin = s.fin ? new Date(s.fin).getTime() : ref.getTime();
    if (fin > debut) total += Math.floor((fin - debut) / 1000);
  }
  return total;
}

/**
 * Indique si le chrono tourne (au moins une session ouverte).
 * @param {Session[]} sessions
 * @returns {boolean}
 */
export function chronoEnCours(sessions) {
  return (sessions || []).some((s) => s.debut && !s.fin);
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
