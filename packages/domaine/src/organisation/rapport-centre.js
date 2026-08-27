// =============================================================================
// LE RAPPORT D'UN CENTRE — jour / semaine / mois, en texte + historique.
//
// Raphaël : le responsable dépôt fait ses rapports sur trois cadences, SANS
// casser les KPI de la carte déjà présente. Deux choses distinctes, à ne pas
// mélanger :
//   · les KPI (chiffres calculés en base par cmd_rapport_hebdo) — on n'y touche
//     PAS, ils restent la carte du haut ;
//   · le RAPPORT TEXTE — ce que le responsable écrit lui-même sur la période,
//     conservé en HISTORIQUE. C'est neuf, et ça vit à côté des KPI.
//
// Ce module calcule les FENÊTRES de date des trois cadences et met en forme
// l'historique. Il ne lit aucune base : il borne le temps, le reste est du
// stockage.
// =============================================================================

/** Les trois cadences, dans l'ordre du plus fin au plus large. */
export const CADENCES = Object.freeze([
  { cle: "jour", titre: "Jour", jours: 1 },
  { cle: "semaine", titre: "Semaine", jours: 7 },
  { cle: "mois", titre: "Mois", jours: null },   // le mois n'a pas 7 jours fixes
]);

export function cadence(cle) {
  return CADENCES.find((c) => c.cle === cle) || null;
}

const D = (v) => (v instanceof Date ? new Date(v.getTime()) : new Date(v));
const iso = (d) => d.toISOString().slice(0, 10);

/**
 * La fenêtre [debut, fin] d'une cadence contenant `reference`.
 *
 *   jour    → ce jour-là, du 00:00 au lendemain 00:00.
 *   semaine → du LUNDI (la semaine belge commence lundi) au lundi suivant.
 *   mois    → du 1er du mois au 1er du mois suivant.
 *
 * Bornes en dates ISO (yyyy-mm-dd), `fin` EXCLUSIVE — la convention la plus sûre
 * pour filtrer sans compter deux fois le jour charnière.
 *
 * @param {string} cadenceCle "jour" | "semaine" | "mois"
 * @param {Date|string} [reference] par défaut aujourd'hui
 * @returns {{ cle, debut, fin, titre }}
 */
export function fenetre(cadenceCle, reference = new Date()) {
  const c = cadence(cadenceCle) || cadence("semaine");
  const ref = D(reference);
  ref.setHours(0, 0, 0, 0);

  if (c.cle === "jour") {
    const fin = D(ref); fin.setDate(fin.getDate() + 1);
    return { cle: "jour", debut: iso(ref), fin: iso(fin),
             titre: `Journée du ${labelJour(ref)}` };
  }

  if (c.cle === "mois") {
    const debut = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    return { cle: "mois", debut: iso(debut), fin: iso(fin),
             titre: `${MOIS[debut.getMonth()]} ${debut.getFullYear()}` };
  }

  // Semaine : reculer jusqu'au lundi. getDay() : 0 = dimanche, 1 = lundi.
  const debut = D(ref);
  const jour = (debut.getDay() + 6) % 7;   // 0 = lundi … 6 = dimanche
  debut.setDate(debut.getDate() - jour);
  const fin = D(debut); fin.setDate(fin.getDate() + 7);
  return { cle: "semaine", debut: iso(debut), fin: iso(fin),
           titre: `Semaine du ${labelJour(debut)}` };
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
  "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function labelJour(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Un objet daté (par sa `date` ISO) tombe-t-il dans la fenêtre ?
 * `fin` exclusive.
 */
export function dansFenetre(dateIso, f) {
  if (!dateIso || !f) return false;
  const j = String(dateIso).slice(0, 10);
  return j >= f.debut && j < f.fin;
}

/**
 * Valide un rapport texte avant enregistrement.
 * Un rapport vide n'a pas à encombrer l'historique.
 */
export function rapportTexteValide(texte) {
  const t = String(texte ?? "").trim();
  if (t.length < 3) {
    return { ok: false, message: "Écrivez au moins quelques mots." };
  }
  return { ok: true, texte: t };
}

/**
 * Range l'historique du plus récent au plus ancien, la période courante en
 * tête. Chaque entrée : { cadence, debut, fin, texte, redige_le, redige_par }.
 */
export function historiqueRange(entrees = []) {
  return (entrees || []).slice().sort((a, b) => {
    const da = a.redige_le || a.debut || "";
    const db = b.redige_le || b.debut || "";
    return db.localeCompare(da);
  });
}
