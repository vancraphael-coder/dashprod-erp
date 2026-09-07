// =============================================================================
// LA FACTURATION RÉCURRENTE — le contrat qui court, période après période.
//
// LE TROU QU'ON COMBLE : `stock_contrats` et `stock_echeances` existent depuis
// longtemps, mais RIEN ne les remplit. Mesuré en production : 14 contrats de
// box, 0 échéance, 0 facture. Un garde-meubles qui ne facture pas ses mois n'est
// pas un garde-meubles.
//
// LE MODÈLE (self-storage éprouvé — Shurgard, Go Box…) :
//   · un contrat a un DÉBUT, un tarif de période, et une fin éventuelle ;
//   · chaque période échue produit UNE échéance ;
//   · une échéance facturée est FIGÉE (elle porte sa facture) ;
//   · le prorata s'applique aux périodes partielles (entrée le 12, sortie le 8) ;
//   · on ne facture JAMAIS une période qui n'a pas commencé.
//
// Ce module est PUR : il calcule les échéances dues, il ne les écrit pas.
// =============================================================================

/** Les périodicités admises. Le mois est la norme du self-storage. */
export const PERIODES = Object.freeze(["mensuel", "trimestriel", "annuel"]);

/** Nombre de mois d'une période. */
function moisDePeriode(periode) {
  if (periode === "trimestriel") return 3;
  if (periode === "annuel") return 12;
  return 1;                                  // mensuel par défaut
}

/** Date sûre depuis une valeur ISO ou Date. */
function jour(v) {
  const d = v instanceof Date ? new Date(v.getTime()) : new Date(v);
  d.setHours(0, 0, 0, 0);
  return d;
}
const iso = (d) => d.toISOString().slice(0, 10);

/** Ajoute n mois en gardant le dernier jour du mois cohérent. */
function plusMois(d, n) {
  const r = new Date(d.getTime());
  const jourDuMois = r.getDate();
  r.setMonth(r.getMonth() + n);
  // 31 janvier + 1 mois = 28/29 février, pas le 3 mars.
  if (r.getDate() < jourDuMois) r.setDate(0);
  return r;
}

/**
 * Les bornes des périodes d'un contrat, depuis son début jusqu'à une date de
 * référence (incluse si la période est échue) ou sa fin.
 *
 * @param {{debut: string, fin?: string|null, periode?: string}} contrat
 * @param {Date|string} [jusquA]  date de référence (aujourd'hui par défaut)
 * @returns {{debut: string, fin: string, complete: boolean}[]}
 */
export function periodesDues(contrat, jusquA = new Date()) {
  if (!contrat?.debut) return [];
  const pas = moisDePeriode(contrat.periode);
  const ref = jour(jusquA);
  const finContrat = contrat.fin ? jour(contrat.fin) : null;
  const out = [];
  let debut = jour(contrat.debut);

  // Garde-fou : un contrat mal saisi (début très ancien) ne doit pas produire
  // des milliers de périodes. 120 périodes = 10 ans en mensuel.
  let garde = 0;
  while (garde++ < 120) {
    if (debut > ref) break;                       // la période n'a pas commencé
    const finTheorique = plusMois(debut, pas);
    // La période s'arrête à la fin du contrat si elle tombe avant.
    const finReelle = finContrat && finContrat < finTheorique ? finContrat : finTheorique;
    if (finContrat && debut >= finContrat) break; // contrat terminé
    // Une période n'est due que si elle a COMMENCÉ. Elle peut être partielle
    // (en cours, ou coupée par la sortie) — c'est le prorata qui l'ajuste.
    out.push({
      debut: iso(debut),
      fin: iso(finReelle),
      complete: finReelle.getTime() === finTheorique.getTime() && finReelle <= ref,
    });
    debut = finTheorique;
  }
  return out;
}

/**
 * Le montant d'une période, au prorata si elle est partielle.
 * Une entrée le 12 ou une sortie le 8 ne se facturent pas un mois plein.
 *
 * @param {{debut: string, fin: string}} periode
 * @param {number} tarifCentimes  tarif d'une période COMPLÈTE
 * @param {string} periodicite
 * @returns {number} centimes
 */
export function montantPeriode(periode, tarifCentimes, periodicite = "mensuel") {
  const tarif = Number(tarifCentimes);
  if (!Number.isFinite(tarif) || tarif <= 0) return 0;
  const d = jour(periode.debut);
  const f = jour(periode.fin);
  const joursFactures = Math.max(0, Math.round((f - d) / 86400000));
  const pleine = plusMois(d, moisDePeriode(periodicite));
  const joursPleins = Math.max(1, Math.round((pleine - d) / 86400000));
  if (joursFactures >= joursPleins) return Math.round(tarif);
  return Math.round(tarif * (joursFactures / joursPleins));
}

/**
 * Les échéances À CRÉER pour un contrat : les périodes dues qui n'ont pas déjà
 * leur échéance. Idempotent — rejouer ne duplique rien.
 *
 * @param {object} contrat  { debut, fin, periode, tarif_centimes }
 * @param {Array<{periode_debut: string}>} existantes  échéances déjà en base
 * @param {Date|string} [jusquA]
 * @returns {{periode_debut, periode_fin, montant_centimes, complete}[]}
 */
export function echeancesAcreer(contrat, existantes = [], jusquA = new Date()) {
  const deja = new Set((existantes || []).map((e) => String(e.periode_debut)));
  const out = [];
  for (const p of periodesDues(contrat, jusquA)) {
    if (deja.has(p.debut)) continue;             // déjà créée : on ne double pas
    const montant = montantPeriode(p, contrat.tarif_centimes, contrat.periode);
    if (montant <= 0) continue;                  // rien à réclamer
    out.push({
      periode_debut: p.debut,
      periode_fin: p.fin,
      montant_centimes: montant,
      complete: p.complete,
    });
  }
  return out;
}

/**
 * Une échéance déjà facturée est FIGÉE : on ne la recalcule pas, on ne la
 * remplace pas. Corriger = avoir, comme pour toute pièce émise.
 */
export function echeanceModifiable(echeance) {
  return !echeance?.facture_id && !echeance?.facturee_le;
}

/**
 * Le libellé d'une échéance sur la facture. Doit dire QUOI et QUAND — un client
 * qui reçoit « Location » sans période ne peut pas rapprocher.
 */
export function libelleEcheance(echeance, nomUnite) {
  const d = String(echeance?.periode_debut || "");
  const f = String(echeance?.periode_fin || "");
  const unite = nomUnite ? ` ${nomUnite}` : "";
  return `Location${unite} — du ${d} au ${f}`;
}

/**
 * Le total dû, non encore facturé, pour une liste d'échéances.
 */
export function resteAFacturer(echeances = []) {
  return (echeances || [])
    .filter((e) => echeanceModifiable(e))
    .reduce((s, e) => s + (Number(e.montant_centimes) || 0), 0);
}
