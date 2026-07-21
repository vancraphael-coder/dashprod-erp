// =============================================================================
// Chiffrage — Moteur de tarification
// Source : Réf. 2 (S5 : entrées, règles, sorties ; onglets Devis/Offre) et les
// trois modèles d'offre validés.
// Logique PURE : (faits + barème) → scénario chiffré comparable. Une seule
// implémentation, consommée par le front (onglet Devis) et le serveur (offre).
// Tous les montants internes sont en CENTIMES ; la sortie expose aussi l'euro.
// =============================================================================

import { versCentimes, versEuros, tva, htvaDepuisTvac } from "../commun/monnaie.js";
import { BAREME_HORAIRE, TARIFS, TVA_PCT, MARGE_CIBLE, REPORT, ANNULATION } from "./bareme.js";

/**
 * @typedef {Object} Faits
 * @property {"tarifaire"|"emballage"|"forfait"} formule
 * @property {number} nbDemenageurs   effectif (clé du barème horaire)
 * @property {number} heures          heures facturées (régimes horaires)
 * @property {number} nbCamions       nombre de camions (multiplie les km)
 * @property {number} km              kilomètres facturés dépôt→dépôt
 * @property {boolean} elevateur      option élévateur
 * @property {number} [remisePct]     remise commerciale en % (0 par défaut)
 * @property {number} [heuresEmballage] régime +emballage
 * @property {number} [kmEmballage]     régime +emballage
 * @property {number} [forfaitTvacEuros] prix TVAC ferme (régime forfait)
 */

/**
 * @typedef {Object} Couts
 * @property {number} [mainOeuvreEuros] coût réel de main-d'œuvre
 * @property {number} [carburantEuros]
 * @property {number} [materielEuros]
 * @property {number} [diversEuros]
 * @property {number} [peagesEuros]
 */

/**
 * Calcule la recette HTVA (en centimes) selon la formule.
 * Règles (S5 / documents validés) :
 *  - horaire : heures × taux(effectif) + élévateur + km×1×camions [+ emballage régie] − remise
 *  - forfait : HTVA déduit du prix TVAC ferme
 */
function recetteHtvaCentimes(f, bareme = BAREME_HORAIRE, tarifs = TARIFS, tvaPct = TVA_PCT) {
  if (f.formule === "forfait") {
    const tvac = versCentimes(f.forfaitTvacEuros || 0);
    return htvaDepuisTvac(tvac, tvaPct);
  }
  const taux = bareme[f.nbDemenageurs];
  if (taux == null) {
    throw new Error(`Barème absent pour ${f.nbDemenageurs} déménageurs`);
  }
  let c = versCentimes((f.heures || 0) * taux);
  if (f.elevateur) c += versCentimes(tarifs.elevateur);
  c += versCentimes((f.km || 0) * tarifs.km_facture * Math.max(1, f.nbCamions || 1));
  if (f.formule === "emballage") {
    c += versCentimes((f.heuresEmballage || 0) * tarifs.emballage_horaire);
    c += versCentimes((f.kmEmballage || 0) * tarifs.emballage_km);
  }
  const remise = f.remisePct ? Math.round(c * f.remisePct / 100) : 0;
  return c - remise;
}

/** Somme des coûts réels (centimes). */
function coutsTotalCentimes(couts = {}) {
  const p = (v) => versCentimes(v || 0);
  return p(couts.mainOeuvreEuros) + p(couts.carburantEuros) + p(couts.materielEuros)
       + p(couts.diversEuros) + p(couts.peagesEuros);
}

/** Qualifie la zone de marge (S5 : rouge / vert / premium). */
export function zoneMarge(margePct) {
  if (margePct < MARGE_CIBLE.min) return "sous_cible";
  if (margePct > MARGE_CIBLE.max) return "premium";
  return "dans_cible";
}

/**
 * Calcule un scénario complet : recette, TVA, TVAC, coûts, marge, zone.
 * @param {Faits} faits
 * @param {Couts} [couts]
 * @param {{bareme?: Object, tarifs?: Object}} [ref] barème/tarifs (défaut : référence)
 * @returns {Object} scénario chiffré (montants en euros + centimes)
 */
export function calculerScenario(faits, couts = {}, ref = {}) {
  const bareme = ref.bareme || BAREME_HORAIRE;
  const tarifs = ref.tarifs || TARIFS;

  // Le taux de TVA vient de l'organisation (ref.tvaPct), pas d'une constante.
  // TVA_PCT ne reste que comme repli si l'appelant ne fournit rien.
  const tvaPct = Number.isFinite(ref.tvaPct) ? ref.tvaPct : TVA_PCT;

  const htva = recetteHtvaCentimes(faits, bareme, tarifs, tvaPct);
  const tvaC = tva(htva, tvaPct);
  const tvac = htva + tvaC;

  const coutC = coutsTotalCentimes(couts);
  const margeC = htva - coutC;
  const margePct = htva > 0 ? Math.round((margeC / htva) * 1000) / 10 : 0;

  return {
    formule: faits.formule,
    htva_centimes: htva,
    tva_centimes: tvaC,
    tvac_centimes: tvac,
    couts_centimes: coutC,
    marge_centimes: margeC,
    htva: versEuros(htva),
    tva: versEuros(tvaC),
    tvac: versEuros(tvac),
    couts: versEuros(coutC),
    marge: versEuros(margeC),
    marge_pct: margePct,
    zone: zoneMarge(margePct),
  };
}

/**
 * Compare plusieurs scénarios nommés (S5 : scénarios côte à côte).
 * @param {{nom: string, faits: Faits, couts?: Couts}[]} entrees
 * @param {{bareme?: Object, tarifs?: Object}} [ref]
 * @returns {{nom: string, scenario: Object}[]}
 */
export function comparerScenarios(entrees, ref = {}) {
  return (entrees || []).map((e) => ({
    nom: e.nom,
    scenario: calculerScenario(e.faits, e.couts || {}, ref),
  }));
}

/**
 * Calcule l'indemnité de report ou d'annulation (résout C-23).
 * Applique le barème (% du TVAC) selon le nombre de jours avant la date.
 *
 * Lecture métier des documents validés (report) :
 *   « 25 % jusqu'à 5 jours » → 5 jours avant ou plus : 25 %
 *   « 50 % jusqu'à 2 jours » → de 2 à 4 jours avant : 50 %
 *   « 75 % la veille ou le jour même » → 0 ou 1 jour avant : 75 %
 * (annulation : mêmes seuils, 50 / 70 / 100 %.)
 *
 * On retient donc le palier de seuil le plus élevé qui reste <= joursAvant :
 * plus la date est proche (joursAvant petit), plus le pourcentage monte.
 * @param {number} tvacCentimes total TVAC de l'affaire
 * @param {number} joursAvant   jours entre aujourd'hui et la date de mission
 * @param {"report"|"annulation"} type
 * @returns {{pct: number, montant_centimes: number, montant: number}}
 */
export function indemnite(tvacCentimes, joursAvant, type) {
  const bareme = type === "annulation" ? ANNULATION : REPORT;
  // bareme trié par seuil décroissant (5, 2, 0). On prend le premier palier
  // dont le seuil est atteint (joursAvant >= seuil) ; sinon, le plus proche.
  let choisi = bareme[bareme.length - 1]; // seuil 0, pct max — la veille/jour même
  for (const palier of bareme) {
    if (joursAvant >= palier.seuil_jours) { choisi = palier; break; }
  }
  const montant = Math.round(tvacCentimes * choisi.pct / 100);
  return { pct: choisi.pct, montant_centimes: montant, montant: versEuros(montant) };
}
