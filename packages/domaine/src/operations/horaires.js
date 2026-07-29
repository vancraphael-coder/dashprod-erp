// =============================================================================
// Horaires prévus d'une mission — les trois heures du matin.
//
// On ne CALCULE pas le temps de trajet : le bureau sait à quelle heure il fait
// partir ses hommes, et une estimation de routage n'aurait fait que déguiser
// une décision humaine en mesure. Trois heures sont posées explicitement :
//
//   départ    → les hommes quittent le dépôt
//   heure     → heure prévue du déménagement, liée à la date (souvent 08:00)
//   arrivée   → arrivée prévue à la première adresse (chargement)
//
// Le temps de route n'est jamais stocké : il se déduit du départ et de
// l'arrivée. Une donnée dérivable ne se stocke pas — sinon les deux finissent
// par se contredire.
// =============================================================================

/** Heure prévue par défaut d'un déménagement, en Belgique. */
export const HEURE_DEFAUT = "08:00";

const RE = /^([01]\d|2[0-3]):([0-5]\d)/;

/** Minutes depuis minuit, ou null si l'heure n'est pas lisible. */
export function minutesDe(heure) {
  const m = RE.exec(String(heure ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Normalise en HH:MM (les colonnes `time` reviennent en HH:MM:SS). */
export function hhmm(heure) {
  const m = RE.exec(String(heure ?? ""));
  return m ? `${m[1]}:${m[2]}` : "";
}

/**
 * Temps de route déduit, en minutes. null si l'une des deux heures manque —
 * on n'affiche pas une durée qu'on ne connaît pas.
 */
export function minutesRoute(depart, arrivee) {
  const d = minutesDe(depart), a = minutesDe(arrivee);
  if (d === null || a === null) return null;
  return a - d;
}

/** « 25 min » / « 1 h 05 ». */
export function formaterMinutes(minutes) {
  if (minutes == null) return "";
  const m = Math.round(minutes);
  const signe = m < 0 ? "-" : "";
  const v = Math.abs(m);
  if (v < 60) return `${signe}${v} min`;
  const h = Math.floor(v / 60), r = v % 60;
  return r === 0 ? `${signe}${h} h` : `${signe}${h} h ${String(r).padStart(2, "0")}`;
}

/**
 * Contrôle des trois heures. Une incohérence se dit clairement plutôt que de
 * s'enregistrer en silence : une équipe se règle sur ces heures.
 */
export function verifierHoraires({ depart, heure, arrivee } = {}) {
  const d = minutesDe(depart), a = minutesDe(arrivee);
  if (d !== null && a !== null && a < d) {
    return { ok: false, message: "L'arrivée prévue est antérieure au départ." };
  }
  if (d !== null && a !== null && a - d > 8 * 60) {
    return { ok: false,
      message: "Plus de 8 h de route jusqu'au chargement : vérifiez les heures." };
  }
  return { ok: true, message: null };
}

/**
 * Résumé lisible pour le terrain. Chaque heure absente est annoncée comme
 * telle — jamais remplacée par une valeur plausible.
 */
export function resumeHoraires({ depart, heure, arrivee } = {}) {
  const route = minutesRoute(depart, arrivee);
  return {
    depart: hhmm(depart) || null,
    heure: hhmm(heure) || null,
    arrivee: hhmm(arrivee) || null,
    route_minutes: route,
    route: route == null ? null : formaterMinutes(route),
    complet: !!(hhmm(depart) && hhmm(arrivee)),
  };
}
