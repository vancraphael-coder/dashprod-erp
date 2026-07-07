// =============================================================================
// Chiffrage — Moteur de tarification
// Source : Réf. 2 (tarification selon formule, effectif, heures, km) et
// Réf. 3 (T2 : moteur pur, sans base ni réseau).
// Logique PURE : prend des faits + barème, retourne un scénario chiffré.
// =============================================================================

import { calcTVA, calcTVAC } from "../commun/monnaie.js";
import { BAREME_DEFAUT, resoudreTauxHoraire } from "./bareme.js";

/**
 * Calcule un scénario complet (recette, coûts, marge, zone).
 * @param {{
 *   formule: string,
 *   effectif: number,
 *   heures: number,
 *   km: number,
 *   camions: number,
 *   emballage: boolean,
 *   elevateur: boolean,
 *   remise_pct: number
 * }} faits entrées du calcul
 * @param {{devise: string, coutes: number}} [couts] coûts réels pour la marge réelle (opt.)
 * @param {typeof BAREME_DEFAUT} [bareme=BAREME_DEFAUT]
 * @returns {{
 *   nom: string,
 *   entrees: object,
 *   recette_htva_centimes: number,
 *   tva_centimes: number,
 *   recette_tvac_centimes: number,
 *   coutes_centimes: number,
 *   marge_htva_centimes: number,
 *   marge_pct: number,
 *   zone: string,
 *   devise: string
 * }}
 */
export function calculerScenario(faits, couts, bareme = BAREME_DEFAUT) {
  const {
    formule = "tarifaire",
    effectif = 2,
    heures = 8,
    km = 100,
    camions = 1,
    emballage = false,
    elevateur = false,
    remise_pct = 0,
  } = faits || {};

  // Résoudre le taux horaire selon l'effectif
  const taux = resoudreTauxHoraire(effectif, bareme);

  // Recette brute (avant remise)
  let recetteBrute = 0;

  if (formule === "tarifaire") {
    // Tarif horaire + km + élévateur
    recetteBrute = taux * heures * 100; // en centimes
    recetteBrute += km * camions * bareme.taux_km * 100;
    if (elevateur) recetteBrute += Math.round(recetteBrute * (bareme.elevateurPct / 100));
  } else if (formule === "tarifaire_emballage") {
    // Tarif horaire + supplément emballage + km
    recetteBrute = (taux + bareme.supplement_emballage_horaire) * heures * 100;
    recetteBrute += (km * camions * (bareme.taux_km + bareme.supplement_emballage_km)) * 100;
    if (elevateur) recetteBrute += Math.round(recetteBrute * (bareme.elevateurPct / 100));
  } else if (formule === "forfait") {
    // TVAC déduit fourni (ex. 10 000 € = 1 000 000 centimes)
    // On calcule HTVA depuis TVAC en assumant 21% TVA EUR
    recetteBrute = faits.tvac_centimes ? 
      Math.round((faits.tvac_centimes * 100) / 121) : 0;
  }

  // Appliquer la remise (%)
  const recetteHTVA = Math.round(recetteBrute * (1 - remise_pct / 100));
  const tva = calcTVA(recetteHTVA, bareme.devise);
  const recetteTVAC = calcTVAC(recetteHTVA, tva);

  // Coûts et marge
  const coutsCentimes = (couts?.centimes || faits.couts_centimes || 0);
  const margeHTVA = recetteHTVA - coutsCentimes;
  const margePct = coutsCentimes > 0 ? 
    Math.round((margeHTVA / recetteHTVA) * 1000) / 10 : 0;

  const zone = zoneMarge(margePct, bareme);

  return {
    nom: faits.nom || "Scénario",
    entrees: { formule, effectif, heures, km, camions, emballage, elevateur, remise_pct },
    recette_htva_centimes: recetteHTVA,
    tva_centimes: tva,
    recette_tvac_centimes: recetteTVAC,
    coutes_centimes: coutsCentimes,
    marge_htva_centimes: margeHTVA,
    marge_pct: margePct,
    zone,
    devise: bareme.devise,
  };
}

/**
 * Détermine la zone de marge (sous_cible, dans_cible, premium).
 * @param {number} marge_pct pourcentage de marge
 * @param {typeof BAREME_DEFAUT} [bareme=BAREME_DEFAUT]
 * @returns {string} "sous_cible" | "dans_cible" | "premium"
 */
export function zoneMarge(marge_pct, bareme = BAREME_DEFAUT) {
  const { sous_cible, dans_cible, premium } = bareme.zones_marge;
  if (marge_pct < sous_cible) return "sous_cible";
  if (marge_pct >= dans_cible[0] && marge_pct <= dans_cible[1]) return "dans_cible";
  if (marge_pct > premium) return "premium";
  return "sous_cible"; // fallback
}

/**
 * Compare plusieurs scénarios.
 * @param {Array<{nom: string, faits: object, couts?: object}>} scenarios
 * @param {typeof BAREME_DEFAUT} [bareme=BAREME_DEFAUT]
 * @returns {Array<{nom: string, scenario: ReturnType<typeof calculerScenario>}>}
 */
export function comparerScenarios(scenarios, bareme = BAREME_DEFAUT) {
  return (scenarios || []).map((s) => ({
    nom: s.nom,
    scenario: calculerScenario(s.faits, s.couts, bareme),
  }));
}

/**
 * Calcule une indemnité (report ou annulation).
 * @param {number} recetteTVACCentimes montant TVAC
 * @param {number} joursAvant jours avant la date
 * @param {"report"|"annulation"} type type d'indemnité
 * @param {typeof BAREME_DEFAUT} [bareme=BAREME_DEFAUT]
 * @returns {{pct: number, montant_centimes: number}}
 */
export function indemnite(recetteTVACCentimes, joursAvant, type, bareme = BAREME_DEFAUT) {
  const paliers = bareme.indemnites[type] || [0, 0, 0];
  let pct = 0;
  if (joursAvant < 7) pct = paliers[0];
  else if (joursAvant < 15) pct = paliers[1];
  else pct = paliers[2];

  const montant = Math.round((recetteTVACCentimes * pct) / 100);
  return { pct, montant_centimes: montant };
}
