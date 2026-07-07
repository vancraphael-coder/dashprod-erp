// =============================================================================
// Facturation — Facture, lignes et paiements
// Source : Réf. 2 (C-24 : acomptes et paiements partiels ; la facture émise est
// immuable, une correction = note de crédit). Logique PURE : composer les
// lignes typées d'une facture, calculer le total, et déterminer le solde et le
// statut à partir de paiements datés. Montants en centimes.
// =============================================================================

import { tva as calcTva } from "../commun/monnaie.js";

/**
 * @typedef {Object} LigneFacture
 * @property {"prestation"|"materiel"|"indemnite"} type
 * @property {string} libelle
 * @property {number} montant_htva_centimes
 */

/**
 * Compose le total d'une facture à partir de ses lignes typées.
 * Les lignes proviennent du chiffrage (prestation), du stock valorisé
 * (materiel, C-18) et d'un éventuel décompte d'annulation (indemnite, C-23).
 * @param {LigneFacture[]} lignes
 * @param {number} [tauxTva=21]
 * @returns {{htva_centimes: number, tva_centimes: number, tvac_centimes: number}}
 */
export function composerTotal(lignes, tauxTva = 21) {
  const htva = (lignes || []).reduce((a, l) => a + (l.montant_htva_centimes || 0), 0);
  const tvaC = calcTva(htva, tauxTva);
  return { htva_centimes: htva, tva_centimes: tvaC, tvac_centimes: htva + tvaC };
}

/**
 * Calcule le solde et le statut d'une facture d'après ses paiements.
 * Résout C-24 : une facture n'est plus « payée ou non » ; elle a un solde.
 *  - total payé = somme des paiements ;
 *  - statut : 'a_payer' (0 reçu), 'partiel' (0 < payé < total), 'paye' (>= total).
 * @param {number} totalTvacCentimes
 * @param {{montant_centimes: number, date: string}[]} paiements
 * @returns {{paye_centimes: number, solde_centimes: number, statut: "a_payer"|"partiel"|"paye"}}
 */
export function etatPaiement(totalTvacCentimes, paiements) {
  const paye = (paiements || []).reduce((a, p) => a + (p.montant_centimes || 0), 0);
  const solde = totalTvacCentimes - paye;
  let statut;
  if (paye <= 0) statut = "a_payer";
  else if (paye < totalTvacCentimes) statut = "partiel";
  else statut = "paye";
  return { paye_centimes: paye, solde_centimes: solde, statut };
}

/**
 * Construit une note de crédit corrigeant une facture (C-24 : une facture émise
 * ne se rature pas). La note reprend les lignes en négatif ; son propre numéro
 * de séquence est attribué à l'émission (hors de cette fonction pure).
 * @param {LigneFacture[]} lignesOriginales
 * @param {number} [tauxTva=21]
 * @returns {{lignes: LigneFacture[], total: ReturnType<typeof composerTotal>}}
 */
export function noteDeCredit(lignesOriginales, tauxTva = 21) {
  const lignes = (lignesOriginales || []).map((l) => ({
    type: l.type,
    libelle: `Avoir — ${l.libelle}`,
    montant_htva_centimes: -(l.montant_htva_centimes || 0),
  }));
  return { lignes, total: composerTotal(lignes, tauxTva) };
}
