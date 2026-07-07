// =============================================================================
// Utilitaires — Montants en centimes entiers (anti-virgule-flottante)
// Source : Réf. 3 (I-2 : montants en centimes).
// =============================================================================

/**
 * Détermine la TVA à partir d'une devise.
 * @param {string} [devise="EUR"] code devise (EUR|...)
 * @returns {number} TVA en pourcentage (21 pour EUR)
 */
export function tauxTVA(devise = "EUR") {
  const taux = { EUR: 21, USD: 0, GBP: 20 };
  return taux[devise] || 21;
}

/**
 * Calcule la TVA sur un montant HTVA.
 * @param {number} htvaCentimes montant HTVA en centimes
 * @param {string} [devise="EUR"] devise
 * @returns {number} TVA en centimes
 */
export function calcTVA(htvaCentimes, devise = "EUR") {
  const taux = tauxTVA(devise);
  return Math.round((htvaCentimes * taux) / 100);
}

/**
 * Calcule le montant TVAC (TTC).
 * @param {number} htvaCentimes montant HTVA en centimes
 * @param {number} [tvaCentimes] TVA en centimes (calculée si absent)
 * @returns {number} TVAC en centimes
 */
export function calcTVAC(htvaCentimes, tvaCentimes) {
  const tva = tvaCentimes !== undefined ? tvaCentimes : calcTVA(htvaCentimes);
  return htvaCentimes + tva;
}

/**
 * Décode un montant HTVA depuis un montant TVAC connu.
 * Formule : HTVA = TVAC / (1 + taux/100)
 * @param {number} tvacCentimes montant TVAC en centimes
 * @param {string} [devise="EUR"] devise
 * @returns {number} HTVA en centimes
 */
export function decodeTVAC(tvacCentimes, devise = "EUR") {
  const taux = tauxTVA(devise);
  return Math.round((tvacCentimes * 100) / (100 + taux));
}

/**
 * Formate un montant en centimes vers chaîne EUR avec symbole €.
 * @param {number} centimes montant en centimes
 * @returns {string} ex. « 1 234,56 € »
 */
export function formatterEuros(centimes) {
  const euros = Math.floor(centimes / 100);
  const cents = centimes % 100;
  return `${euros.toLocaleString("fr-FR")} €${cents ? ` ${String(cents).padStart(2, "0")} c` : ""}`;
}
