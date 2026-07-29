// =============================================================================
// Temps de trajet dépôt → premier chantier, et heure de départ conseillée.
//
// La question réelle du matin n'est pas « combien de temps de route ? » mais
// « à quelle heure faut-il partir pour être chez le client à 8 h ? ». On
// calcule donc à l'envers, depuis l'heure de rendez-vous.
//
//   heure de départ = rendez-vous − trajet − chargement du camion − marge
//
// DEUX QUALITÉS DE RÉPONSE, jamais confondues :
//   - `mesure`   : durée renvoyée par un service de routage. Fiable.
//   - `estime`   : durée déduite d'une distance et d'une vitesse moyenne.
//                  Utile, mais c'est une approximation, et l'écran doit le dire.
// Sans distance ni service, on ne répond RIEN plutôt qu'un chiffre inventé —
// une heure de départ fausse fait arriver une équipe en retard chez un client.
// =============================================================================

/**
 * Vitesse moyenne d'un camion de déménagement, en km/h, trajet mixte belge
 * (sortie d'agglomération, ring, nationales). Volontairement prudente : mieux
 * vaut arriver en avance qu'annoncer une heure intenable.
 */
export const VITESSE_MOYENNE_KMH = 50;

/** Marge par défaut avant le départ : chargement, briefing, carburant. */
export const MARGE_PREPARATION_MIN = 15;

const num = (v) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };

/** Durée estimée d'un trajet, en minutes, depuis une distance en km. */
export function minutesDepuisKm(km, vitesseKmh = VITESSE_MOYENNE_KMH) {
  const d = num(km), v = num(vitesseKmh) || VITESSE_MOYENNE_KMH;
  return d === 0 ? 0 : Math.round((d / v) * 60);
}

/**
 * Normalise ce qu'on sait du trajet, quelle que soit sa provenance.
 * `source` : "mesure" (service de routage) ou "estime" (vitesse moyenne).
 */
export function trajet({ minutes, km, source } = {}) {
  const m = num(minutes);
  if (m > 0) return { ok: true, minutes: Math.round(m), km: num(km) || null,
                      source: source === "mesure" ? "mesure" : "estime" };
  const d = num(km);
  if (d > 0) return { ok: true, minutes: minutesDepuisKm(d), km: d, source: "estime" };
  return { ok: false, minutes: null, km: null, source: null,
           raison: "Aucune distance connue pour ce trajet." };
}

/**
 * Heure de départ conseillée pour un rendez-vous donné.
 * `rendezVous` est un Date ; renvoie null si le trajet est inconnu — on ne
 * conseille pas une heure qu'on ne sait pas calculer.
 */
export function heureDepartConseillee(rendezVous, infoTrajet,
                                      margeMin = MARGE_PREPARATION_MIN) {
  if (!(rendezVous instanceof Date) || Number.isNaN(rendezVous.getTime())) return null;
  if (!infoTrajet?.ok) return null;
  const recul = (infoTrajet.minutes + Math.max(0, num(margeMin) || 0)) * 60_000;
  return new Date(rendezVous.getTime() - recul);
}

/** Heure d'arrivée prévue si l'on part maintenant (ou à une heure donnée). */
export function heureArriveePrevue(depart, infoTrajet) {
  if (!(depart instanceof Date) || Number.isNaN(depart.getTime())) return null;
  if (!infoTrajet?.ok) return null;
  return new Date(depart.getTime() + infoTrajet.minutes * 60_000);
}

/** « 1 h 05 » / « 25 min » — la durée, telle qu'on la dit à voix haute. */
export function formaterTrajet(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`;
}

/**
 * Phrase prête à afficher. Elle porte TOUJOURS la qualité de la réponse :
 * un chiffre estimé ne doit pas se lire comme un horaire garanti.
 */
export function conseilDepart(rendezVous, infoTrajet,
                              margeMin = MARGE_PREPARATION_MIN) {
  if (!infoTrajet?.ok) {
    return { ok: false,
      texte: infoTrajet?.raison || "Temps de trajet inconnu.",
      detail: "Renseignez la distance dans le devis, ou ouvrez l'itinéraire." };
  }
  const depart = heureDepartConseillee(rendezVous, infoTrajet, margeMin);
  const hhmm = (d) => d
    ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    : "—";
  const qualite = infoTrajet.source === "mesure" ? "" : " (estimation)";
  if (!depart) {
    return { ok: true, texte: `Trajet ${formaterTrajet(infoTrajet.minutes)}${qualite}`,
             detail: null, depart: null };
  }
  return {
    ok: true,
    texte: `Partez à ${hhmm(depart)}`,
    detail: `Trajet ${formaterTrajet(infoTrajet.minutes)}${qualite}`
          + ` + ${margeMin} min de préparation`,
    depart,
  };
}
