// =============================================================================
// Jours fériés légaux belges + fermetures de l'entreprise.
//
// Les 10 jours fériés légaux belges sont calculables : 7 à date fixe, 3 mobiles
// calés sur Pâques. On les calcule plutôt que de les stocker — une table de
// dates se périme, un algorithme non.
//
// Un jour férié tombant un dimanche est légalement reporté (souvent au lundi
// suivant), mais le report exact dépend de la CP et de l'entreprise : on
// signale le férié à sa date réelle et on laisse l'entreprise gérer le report.
//
// Les fermetures propres à l'entreprise (congé annuel collectif, pont) sont un
// PARAMÈTRE, pas un calcul : elles vivent en base, réglées par le déménageur.
// =============================================================================

/**
 * Dimanche de Pâques d'une année donnée (algorithme de Butcher, grégorien).
 * Base des trois fériés mobiles belges : lundi de Pâques, Ascension, lundi de
 * Pentecôte.
 */
export function paques(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

const iso = (d) => d.toISOString().slice(0, 10);
const ajouter = (d, n) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};

/**
 * Les 10 jours fériés légaux belges d'une année, à leur date réelle.
 * Renvoie [{ date: 'AAAA-MM-JJ', nom }] trié.
 */
export function joursFeriesBelges(annee) {
  const p = paques(annee);
  const fixes = [
    [`${annee}-01-01`, "Nouvel An"],
    [`${annee}-05-01`, "Fête du Travail"],
    [`${annee}-07-21`, "Fête nationale"],
    [`${annee}-08-15`, "Assomption"],
    [`${annee}-11-01`, "Toussaint"],
    [`${annee}-11-11`, "Armistice"],
    [`${annee}-12-25`, "Noël"],
  ];
  const mobiles = [
    [iso(ajouter(p, 1)), "Lundi de Pâques"],
    [iso(ajouter(p, 39)), "Ascension"],
    [iso(ajouter(p, 50)), "Lundi de Pentecôte"],
  ];
  return [...fixes, ...mobiles]
    .map(([date, nom]) => ({ date, nom }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Index rapide date → nom, pour une plage d'années. */
export function feriesSurPlage(anneeDebut, anneeFin) {
  const map = new Map();
  for (let a = anneeDebut; a <= anneeFin; a++) {
    for (const f of joursFeriesBelges(a)) map.set(f.date, f.nom);
  }
  return map;
}

/** Une date (AAAA-MM-JJ) est-elle un férié légal belge ? Renvoie le nom ou null. */
export function nomFerie(dateIso) {
  const annee = Number(String(dateIso).slice(0, 4));
  if (!annee) return null;
  return joursFeriesBelges(annee).find((f) => f.date === dateIso)?.nom ?? null;
}

/**
 * Qualifie une date pour le planning en croisant les trois couches.
 *
 * `fermetures` : périodes de fermeture de l'entreprise, au format
 *   [{ debut, fin, motif }] — le congé annuel collectif, un pont.
 *
 * Renvoie ce qui s'applique à cette date : férié légal, fermeture entreprise,
 * ou rien. Le planning s'en sert pour griser la case et afficher la raison.
 */
export function qualifierJour(dateIso, fermetures = []) {
  const ferie = nomFerie(dateIso);
  const fermeture = (fermetures || []).find((f) =>
    f.debut && f.fin && dateIso >= f.debut && dateIso <= f.fin);
  return {
    date: dateIso,
    ferie: ferie || null,
    ferme: !!fermeture,
    motif_fermeture: fermeture?.motif || null,
    // Un jour ni férié ni fermé est ouvrable ; la case reste normale.
    ouvrable: !ferie && !fermeture,
  };
}
