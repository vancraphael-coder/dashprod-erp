// =============================================================================
// DÉCOMPTE DE FIN DE CHANTIER — les heures facturées au client, calculées sur
// le terrain et validées au bureau.
//
// LE GESTE MÉTIER. Sur un déménagement facturé à l'heure, le montant se calcule
// AVANT la fin réelle, à l'un de deux moments :
//   — avant le déchargement : le client règle avant qu'on vide le camion ;
//     on compte donc le temps écoulé + le déchargement restant + le retour ;
//   — avant le retour au dépôt : le déchargement est fait ; on compte le temps
//     écoulé + le seul trajet retour.
// Le chef d'équipe fait ce calcul sur place et le valide. Le bureau le relit,
// l'ajuste si besoin, donne la validation finale. Le montant est annoncé au
// client par téléphone.
//
// UNE SEULE RÈGLE DE PRIX. Le montant n'est pas recalculé ici : il passe par
// `calculerScenario`, le moteur du devis, avec les entrées du scénario retenu
// dont seules les HEURES changent. Terrain et bureau affichent donc le même
// chiffre que l'onglet Estimation l'aurait donné pour ces heures — c'est la
// garantie qu'ils sont synchronisés, et non deux calculs qui se ressemblent.
//
// CE QUI N'EST JAMAIS DEVINÉ. Un temps restant non renseigné n'est pas
// remplacé par une moyenne : le décompte le signale et refuse de conclure.
// Un montant faux annoncé à un client coûte plus qu'un champ à remplir.
// =============================================================================

import { calculerScenario } from "../chiffrage/moteur.js";

/** Les deux moments où se fait le calcul, et ce qu'il reste à compter. */
export const MOMENTS = Object.freeze({
  avant_dechargement: {
    libelle: "Avant le déchargement",
    court: "Avant déchargement",
    reste: ["dechargement", "retour"],
    explication: "Temps écoulé + déchargement restant + retour au dépôt.",
  },
  avant_retour_depot: {
    libelle: "Avant le retour au dépôt",
    court: "Avant retour dépôt",
    reste: ["retour"],
    explication: "Temps écoulé + trajet retour au dépôt.",
  },
});

/** Pas d'arrondi par défaut : le quart d'heure entamé est dû. */
export const PAS_ARRONDI_MINUTES = 15;

// -----------------------------------------------------------------------------
// LES RÈGLES DE L'ENTREPRISE (Paramètres → Barème → Décompte de fin de chantier).
//
// Trois réglages seulement, parce que ce sont les trois sur lesquels deux
// déménageurs honnêtes facturent différemment : le pas d'arrondi (quart d'heure,
// demi-heure, heure entamée), le minimum facturé, et le temps de retour au
// dépôt habituel (pré-rempli sur le terrain, toujours modifiable). Le reste —
// taux, suppléments, TVA — vient déjà du barème : on ne le duplique pas.
// Stockés dans organisations.parametres_prix.decompte (jsonb) : aucun schéma à
// migrer, et une entreprise qui n'a rien réglé garde les valeurs ci-dessous.
// -----------------------------------------------------------------------------
export const PAS_POSSIBLES = Object.freeze([
  { minutes: 15, libelle: "Quart d'heure entamé" },
  { minutes: 30, libelle: "Demi-heure entamée" },
  { minutes: 60, libelle: "Heure entamée" },
  { minutes: 1,  libelle: "À la minute" },
]);

export const REGLES_DECOMPTE_DEFAUT = Object.freeze({
  pas_minutes: PAS_ARRONDI_MINUTES,
  minimum_heures: 0,
  retour_defaut_minutes: null,
});

/** Lit les règles de l'entreprise ; toute valeur absente ou invalide → défaut. */
export function reglesDecompte(parametres) {
  const r = parametres?.decompte || parametres || {};
  const pas = Number(r.pas_minutes);
  const min = Number(r.minimum_heures);
  const ret = r.retour_defaut_minutes;
  return {
    pas_minutes: PAS_POSSIBLES.some((p) => p.minutes === pas) ? pas : PAS_ARRONDI_MINUTES,
    minimum_heures: Number.isFinite(min) && min > 0 ? Math.round(min * 4) / 4 : 0,
    retour_defaut_minutes: ret === "" || ret == null || !(Number(ret) >= 0)
      ? null : Math.round(Number(ret)),
  };
}

/** La règle en une phrase, telle qu'on la lit au client. */
export function decrireRegles(regles) {
  const r = reglesDecompte(regles);
  const pas = PAS_POSSIBLES.find((p) => p.minutes === r.pas_minutes)?.libelle || "";
  const txt = r.pas_minutes === 1 ? "Facturé à la minute" : `${pas} compté${pas.endsWith("e") ? "e" : ""}`;
  return r.minimum_heures > 0
    ? `${txt} · minimum ${formaterDureeInterne(r.minimum_heures * 60)}` : txt;
}

const minutes = (a, b) => Math.max(0, Math.round((b - a) / 60000));
const date = (v) => (v instanceof Date ? v : v ? new Date(v) : null);
const entierOuNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Arrondit au pas supérieur (15 → le quart d'heure entamé est compté). */
export function arrondirAuPas(min, pas = PAS_ARRONDI_MINUTES) {
  if (!(min > 0)) return 0;
  if (!(pas > 0)) return Math.round(min);
  return Math.ceil(min / pas) * pas;
}

/** Durée des pauses comprise dans [debut, fin] — une pause hors plage ne compte pas. */
export function minutesDePause(pauses, debut, fin) {
  if (!debut || !fin) return 0;
  let total = 0;
  for (const p of pauses || []) {
    const d = date(p.debut), f = date(p.fin);
    if (!d || !f || f <= d) continue;
    const a = Math.max(d.getTime(), debut.getTime());
    const b = Math.min(f.getTime(), fin.getTime());
    if (b > a) total += Math.round((b - a) / 60000);
  }
  return total;
}

/** « 4 h 15 » — lisible au téléphone, sans virgule décimale ambiguë. */
export function formaterDuree(min) { return formaterDureeInterne(min); }
function formaterDureeInterne(min) {
  if (min == null || !Number.isFinite(min)) return "—";
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Heures décimales (4,25) depuis des minutes, arrondies au centième. */
export const heuresDepuisMinutes = (min) => Math.round((min / 60) * 100) / 100;

/**
 * Montant client pour un nombre d'heures donné, par le moteur du devis.
 * @returns {{htva_centimes:number, tva_centimes:number, tvac_centimes:number}|null}
 */
export function montantPourHeures(entrees, heures, ref = {}) {
  if (!entrees || !entrees.formule) return null;
  const faits = entrees.formule === "forfait" ? { ...entrees } : { ...entrees, heures };
  const s = calculerScenario(faits, {}, ref);
  return { htva_centimes: s.htva_centimes, tva_centimes: s.tva_centimes,
           tvac_centimes: s.tvac_centimes };
}

/**
 * Le décompte complet, tel que le chef d'équipe le voit avant de valider.
 *
 * @param {object} p
 * @param {Date|string} p.depart            départ pointé (début de facturation)
 * @param {Date|string} [p.instant]         moment du calcul (défaut : maintenant)
 * @param {Array<{debut,fin}>} [p.pauses]   pauses déclarées, non facturées
 * @param {"avant_dechargement"|"avant_retour_depot"} p.moment
 * @param {number|null} [p.minutesDechargement]  estimation du chef
 * @param {number|null} [p.minutesRetour]        trajet retour au dépôt
 * @param {number} [p.ajustementMinutes]    correction manuelle (+/−), tracée
 * @param {object} p.entrees                entrées du scénario retenu (devis)
 * @param {object} [p.ref]                  barème et tarifs de l'organisation
 * @param {number} [p.pas]                  pas d'arrondi en minutes
 */
export function decompterChantier({
  depart, instant = new Date(), pauses = [], moment,
  minutesDechargement = null, minutesRetour = null, ajustementMinutes = 0,
  entrees, ref = {}, regles = null, pas = null,
} = {}) {
  const r = reglesDecompte(regles);
  const pasEffectif = pas ?? r.pas_minutes;
  const d = date(depart), t = date(instant);
  const def = MOMENTS[moment];
  const manques = [];

  if (!entrees || !entrees.formule) {
    return { pret: false, manques: ["Le dossier n'a pas de devis retenu."] };
  }
  if (entrees.formule === "forfait") {
    const m = montantPourHeures(entrees, null, ref);
    return {
      pret: true, forfait: true, manques: [],
      montant: m, heuresDevis: null,
      explication: "Prix ferme : le montant ne dépend pas des heures.",
    };
  }
  if (!d) manques.push("Le départ n'est pas pointé.");
  if (!def) manques.push("Choisissez le moment du calcul.");

  const dech = entierOuNull(minutesDechargement);
  const ret = entierOuNull(minutesRetour);
  if (def?.reste.includes("dechargement") && dech == null) {
    manques.push("Estimez la durée du déchargement.");
  }
  if (def && ret == null) manques.push("Indiquez la durée du trajet retour.");

  const travaillees = d && t ? minutes(d, t) : 0;
  const enPause = d && t ? minutesDePause(pauses, d, t) : 0;
  const restantes = def
    ? (def.reste.includes("dechargement") ? dech || 0 : 0) + (ret || 0)
    : 0;
  const ajust = Math.round(Number(ajustementMinutes) || 0);
  const brutes = Math.max(0, travaillees - enPause + restantes + ajust);
  const arrondies = arrondirAuPas(brutes, pasEffectif);
  // Le minimum facturé s'applique APRÈS l'arrondi, et se voit : un client
  // qui paie 3 h pour 2 h 20 doit pouvoir entendre pourquoi.
  const minimum = r.minimum_heures * 60;
  const minimumApplique = minimum > 0 && arrondies < minimum;
  const facturables = minimumApplique ? minimum : arrondies;
  const heures = heuresDepuisMinutes(facturables);

  const heuresDevis = Number(entrees.heures) || 0;
  const pret = manques.length === 0;

  return {
    pret, forfait: false, manques,
    moment, explication: def?.explication || "",
    lignes: {
      travaillees, pauses: enPause,
      dechargement: def?.reste.includes("dechargement") ? dech : null,
      retour: ret, ajustement: ajust, brutes, arrondies, facturables,
    },
    pas: pasEffectif, minimumApplique, regles: r, heures, heuresDevis,
    ecartDevisHeures: Math.round((heures - heuresDevis) * 100) / 100,
    nbDemenageurs: entrees.nbDemenageurs ?? null,
    tauxHoraire: ref?.bareme?.[entrees.nbDemenageurs] ?? null,
    montant: pret ? montantPourHeures(entrees, heures, ref) : null,
  };
}

/**
 * Les trois étapes du circuit, pour l'affichage (terrain et bureau lisent la
 * même chose).
 *   null / propose → 1 · validé chef → 2 · validé bureau → 3 · communiqué
 */
export const ETAPES = Object.freeze([
  { statut: "valide_chef",   libelle: "Heures validées par le chef" },
  { statut: "valide_bureau", libelle: "Validation finale du bureau" },
  { statut: "communique",    libelle: "Montant annoncé au client" },
]);

export function rangEtape(statut) {
  const i = ETAPES.findIndex((e) => e.statut === statut);
  return i < 0 ? 0 : i + 1;
}
