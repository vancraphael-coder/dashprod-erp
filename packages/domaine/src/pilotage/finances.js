// =============================================================================
// Pilotage — Indicateurs financiers
// Source : Réf. 2 (indicateur CA signé de la liste ; carte de marge ; Ressources
// Heures ; S5 : marge devisée vs réelle → rentabilité par chantier).
// Logique PURE : agrège ce que les autres modules produisent. N'invente aucune
// donnée : consomme affaires, scénarios, chronos, coûts réels.
// Montants en centimes.
// =============================================================================

/**
 * États d'affaire qui comptent dans le carnet signé (Réf. 2, liste des
 * dossiers) : le travail engagé, hors devis en cours et hors annulés/archivés.
 */
const ETATS_CA_SIGNE = Object.freeze([
  "confirme", "planifie", "en_cours", "effectue", "facture", "paye",
]);

/**
 * Calcule le CA signé (somme des montants TVAC des affaires engagées).
 * @param {{etat: string, tvac_centimes: number}[]} affaires
 * @returns {number} centimes
 */
export function caSigne(affaires) {
  return (affaires || [])
    .filter((a) => ETATS_CA_SIGNE.includes(a.etat))
    .reduce((total, a) => total + (a.tvac_centimes || 0), 0);
}

/**
 * Ventile le CA par état (pour un tableau de bord).
 * @param {{etat: string, tvac_centimes: number}[]} affaires
 * @returns {Object<string, number>} centimes par état (états signés seulement)
 */
export function caParEtat(affaires) {
  const out = {};
  for (const a of affaires || []) {
    if (!ETATS_CA_SIGNE.includes(a.etat)) continue;
    out[a.etat] = (out[a.etat] || 0) + (a.tvac_centimes || 0);
  }
  return out;
}

/**
 * Calcule la dérive de marge d'un chantier : marge devisée (au chiffrage) vs
 * marge réelle (coûts réels constatés). C'est le socle de la rentabilité par
 * job (S5). Un écart négatif = chantier moins rentable que prévu.
 * @param {number} recetteHtvaCentimes  recette HTVA (identique devis/réel)
 * @param {number} coutDeviseCentimes   coûts estimés au chiffrage
 * @param {number} coutReelCentimes     coûts réellement constatés
 * @returns {{marge_devisee_centimes: number, marge_reelle_centimes: number,
 *            derive_centimes: number, derive_pct: number}}
 */
export function deriveMarge(recetteHtvaCentimes, coutDeviseCentimes, coutReelCentimes) {
  const margeDevisee = recetteHtvaCentimes - coutDeviseCentimes;
  const margeReelle = recetteHtvaCentimes - coutReelCentimes;
  const derive = margeReelle - margeDevisee; // négatif si le réel coûte plus
  const derivePct = margeDevisee !== 0
    ? Math.round((derive / Math.abs(margeDevisee)) * 1000) / 10
    : 0;
  return {
    marge_devisee_centimes: margeDevisee,
    marge_reelle_centimes: margeReelle,
    derive_centimes: derive,
    derive_pct: derivePct,
  };
}

/**
 * Indique si un chantier mérite une alerte de dérive (réel sensiblement au-delà
 * du devisé). Seuil par défaut : 10 % de marge perdue.
 * @param {ReturnType<typeof deriveMarge>} d
 * @param {number} [seuilPct=-10]
 * @returns {boolean}
 */
export function alerteDerive(d, seuilPct = -10) {
  return d.derive_pct <= seuilPct;
}
