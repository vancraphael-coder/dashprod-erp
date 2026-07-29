// =============================================================================
// Pointage déclaré — double minuteur départ / arrivée.
//
// Remplace le chronomètre. Un chronomètre suppose que le système mesure ; or
// sur un chantier le téléphone reste dans le camion, le travail commence avant
// que quiconque ouvre l'application, et une pause s'étire. Le chef d'équipe,
// lui, SAIT à quelle heure on est parti et à quelle heure on est rentré.
//
// On enregistre donc deux instants DÉCLARÉS. Chacun se pose d'un geste
// (« maintenant ») ou se corrige à la main — c'est le point : une heure fausse
// doit pouvoir être rectifiée, sinon le terrain contourne l'outil.
//
// Le stockage ne change pas : départ = début d'une session `travail`,
// arrivée = sa fin, pauses = sessions `pause`. La paie continue de lire les
// mêmes sessions.
// =============================================================================

const MINUTE = 60_000;

/** Combine la date d'une mission (AAAA-MM-JJ) et une heure saisie (HH:MM). */
export function instant(dateIso, heure) {
  const d = String(dateIso || "").slice(0, 10);
  const h = String(heure || "").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(h)) return null;
  const t = new Date(`${d}T${h}:00`);
  return Number.isNaN(t.getTime()) ? null : t;
}

/** Heure locale HH:MM d'un instant, pour préremplir un champ. */
export function heureDe(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Une arrivée peut légitimement tomber le lendemain (départ 22:00, retour
 * 01:30). Si l'arrivée précède le départ de plus d'une heure, on considère
 * qu'on a franchi minuit plutôt que de rejeter une saisie correcte.
 */
export function corrigerJourSuivant(depart, arrivee) {
  if (!depart || !arrivee) return arrivee;
  if (arrivee >= depart) return arrivee;
  const lendemain = new Date(arrivee.getTime() + 24 * 60 * MINUTE);
  return lendemain - depart < 18 * 60 * MINUTE ? lendemain : arrivee;
}

/** Les pauses retenues : bornées, positives, et à l'intérieur du chantier. */
export function pausesValides(pauses, depart, arrivee) {
  return (pauses || [])
    .map((p) => ({
      id: p.id ?? null,
      debut: p.debut ? new Date(p.debut) : null,
      fin: p.fin ? new Date(p.fin) : null,
    }))
    .filter((p) => p.debut && p.fin && p.fin > p.debut)
    .filter((p) => !depart || p.fin > depart)
    .filter((p) => !arrivee || p.debut < arrivee);
}

/** Total des pauses, en secondes. */
export function secondesPause(pauses, depart, arrivee) {
  return pausesValides(pauses, depart, arrivee)
    .reduce((t, p) => t + Math.round((p.fin - p.debut) / 1000), 0);
}

/**
 * Durée nette travaillée, en secondes : de l'arrivée moins les pauses.
 * Tant qu'aucune arrivée n'est déclarée, on compte jusqu'à `maintenant` —
 * c'est ce qui fait « tourner » le minuteur à l'écran, sans que le système
 * prétende mesurer quoi que ce soit : il projette simplement l'heure courante.
 */
export function secondesTravail(depart, arrivee, pauses = [], maintenant = new Date()) {
  if (!depart) return 0;
  const fin = arrivee || maintenant;
  const brut = Math.max(0, Math.round((fin - depart) / 1000));
  return Math.max(0, brut - secondesPause(pauses, depart, arrivee));
}

/** Heures décimales, arrondies à la minute — la base du brut de paie. */
export function heuresTravail(depart, arrivee, pauses = [], maintenant = new Date()) {
  return Math.round(secondesTravail(depart, arrivee, pauses, maintenant) / 60) / 60;
}

/** « 7 h 25 » — lisible d'un coup d'œil sur un téléphone, en plein soleil. */
export function formaterDuree(secondes) {
  const s = Math.max(0, Math.round(Number(secondes) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/**
 * État du pointage, tel que l'écran doit le présenter.
 * Trois situations, et une seule action évidente à chaque fois.
 */
export function etatPointage(depart, arrivee, pauses = [], maintenant = new Date()) {
  if (!depart) {
    return { phase: "avant", libelle: "Pas encore parti",
             action: "Déclarer le départ", secondes: 0, encours: false };
  }
  if (!arrivee) {
    return { phase: "encours", libelle: "En chantier",
             action: "Déclarer l'arrivée",
             secondes: secondesTravail(depart, null, pauses, maintenant),
             encours: true };
  }
  return { phase: "termine", libelle: "Chantier terminé", action: null,
           secondes: secondesTravail(depart, arrivee, pauses), encours: false };
}

/** Contrôles avant enregistrement. Message unique, actionnable. */
export function verifierPointage(depart, arrivee, pauses = []) {
  if (!depart) return { ok: false, message: "Indiquez l'heure de départ." };
  if (arrivee && arrivee < depart) {
    return { ok: false, message: "L'arrivée ne peut pas précéder le départ." };
  }
  if (arrivee) {
    const secondes = Math.round((arrivee - depart) / 1000);
    if (secondes > 18 * 3600) {
      return { ok: false,
        message: "Plus de 18 h entre départ et arrivée : vérifiez les heures." };
    }
    if (secondesPause(pauses, depart, arrivee) > secondes) {
      return { ok: false, message: "Les pauses dépassent la durée du chantier." };
    }
  }
  return { ok: true, message: null };
}
