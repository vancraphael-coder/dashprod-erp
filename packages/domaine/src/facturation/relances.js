// =============================================================================
// LES RELANCES — les factures échues et non soldées, à réclamer.
//
// À partir de l'échéance figée à l'émission (lot A) et des paiements reçus, on
// liste ce qui est EN RETARD. Pur : on ne décide pas d'envoyer, on ne modifie
// rien. On SIGNALE — la décision de relancer reste humaine (règle du projet :
// on signale, on n'interdit pas, et on n'envoie rien tout seul).
// =============================================================================

import { qualifierEcheance } from "../commun/echeances.js";

/**
 * Le solde d'une facture = son total TVAC moins les paiements qui la visent.
 * @param {object} facture  { id, total?, tvac_centimes? }
 * @param {Array<{facture_id, montant_centimes}>} paiements
 * @returns {number} centimes restant dus (>= 0)
 */
export function soldeFacture(facture, paiements = []) {
  const total = facture?.total?.tvac_centimes ?? facture?.tvac_centimes ?? 0;
  const paye = (paiements || [])
    .filter((p) => p.facture_id === facture.id)
    .reduce((s, p) => s + (Number(p.montant_centimes) || 0), 0);
  return Math.max(0, total - paye);
}

/**
 * Les factures à relancer : émises, échues (échéance passée), et non soldées.
 * Triées de la plus en retard à la moins en retard.
 *
 * @param {object[]} factures  factures canoniques (avec echeance, total)
 * @param {Array} paiements
 * @param {Date} [aujourdhui]
 * @returns {Array<{facture, solde_centimes, jours_retard}>}
 */
export function facturesARelancer(factures = [], paiements = [], aujourdhui = new Date()) {
  const out = [];
  for (const f of factures || []) {
    if (!f.echeance) continue;                       // pas d'échéance → pas de retard
    const q = qualifierEcheance(f.echeance, aujourdhui);
    if (q.etat !== "expiree") continue;              // pas encore échue
    const solde = soldeFacture(f, paiements);
    if (solde <= 0) continue;                         // déjà soldée
    out.push({ facture: f, solde_centimes: solde, jours_retard: Math.abs(q.jours) });
  }
  out.sort((a, b) => b.jours_retard - a.jours_retard);
  return out;
}
