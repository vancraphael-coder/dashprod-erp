// =============================================================================
// Commun — Monnaie
// Source : Réf. 3 (T2 : montants ; I-2 : tout montant porte sa devise).
// Les montants sont manipulés en CENTIMES entiers pour éviter les erreurs de
// virgule flottante, puis présentés en euros. TVA belge par défaut : 21 %.
// =============================================================================

/** Convertit des euros (nombre) en centimes entiers. */
export function versCentimes(euros) {
  return Math.round(Number(euros) * 100);
}

/** Convertit des centimes entiers en euros (nombre à 2 décimales). */
export function versEuros(centimes) {
  return Math.round(centimes) / 100;
}

/**
 * Applique un taux de TVA à un montant HTVA en centimes.
 * @param {number} htvaCentimes
 * @param {number} tauxPct ex. 21 pour 21 %
 * @returns {number} montant de TVA en centimes (arrondi)
 */
export function tva(htvaCentimes, tauxPct) {
  return Math.round(htvaCentimes * tauxPct / 100);
}

/**
 * Déduit le HTVA d'un montant TVAC (cas du forfait : prix TVAC ferme donné).
 * @param {number} tvacCentimes
 * @param {number} tauxPct
 * @returns {number} HTVA en centimes (arrondi)
 */
export function htvaDepuisTvac(tvacCentimes, tauxPct) {
  return Math.round(tvacCentimes / (1 + tauxPct / 100));
}
