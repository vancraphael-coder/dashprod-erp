// =============================================================================
// LE CHIFFRAGE, QUELLE QUE SOIT LA NATURE.
//
// Trois moteurs cohabitent désormais : le déménagement (volume, heures,
// suppléments), la sous-traitance (hommes, camion, km, remise) et le lift
// (couronne, temps inclus, homme supplémentaire).
//
// Sans point d'entrée commun, le devis ET l'offre devraient chacun savoir
// lequel appeler, avec quelles entrées, et comment lire la sortie. La règle
// « un lift se chiffre par couronne » finirait écrite à trois endroits et
// divergerait au premier changement.
//
// Ce module aiguille, et rend TOUJOURS la même forme — celle que produisait
// déjà `calculerScenario`, pour que les écrans existants n'aient rien à
// réapprendre : htva_centimes, tva_centimes, tvac_centimes, marge…
// =============================================================================

import { calculerScenario, zoneMarge } from "./moteur.js";
import { chiffrer as chiffrerSousTraitance } from "./sous-traitance.js";
import { chiffrer as chiffrerLift } from "./lift.js";
import { nature as natureDe } from "../commercial/natures.js";
import { ouDefaut } from "../noyau/nombres.js";

const TVA_REPLI = 21;

/**
 * Le chiffrage d'une affaire selon sa nature.
 *
 * @param {string} cle nature de l'affaire
 * @param {object} entrees
 *   · déménagement  : { faits, couts, ref }
 *   · sous-traitance: { mission, grille, couts, ref }
 *   · lift          : { mission, reglages, centreId, supplements, couts, ref }
 * @returns {object|null} même forme que calculerScenario, plus `lignes`
 */
export function chiffrerAffaire(cle, entrees = {}) {
  const n = natureDe(cle) || natureDe("demenagement");

  if (n.chiffrage === "volume") {
    // Le déménagement garde son moteur, inchangé. On ne le réécrit pas :
    // il est éprouvé et porte les suppléments, les remises et les marges.
    try {
      return { ...calculerScenario(entrees.faits || {}, entrees.couts || {},
                                   entrees.ref || {}), lignes: null };
    } catch { return null; }
  }

  if (n.chiffrage === "main_doeuvre") {
    const r = chiffrerSousTraitance(entrees.mission, entrees.grille);
    if (!r.complet) return null;   // sans homme, il n'y a rien à facturer
    return habiller(r.total_centimes, r.lignes, entrees, {
      remise_centimes: r.remise_centimes,
      remise_pct: r.remise_pct,
      heures_facturees: r.heures_facturees,
    });
  }

  if (n.chiffrage === "couronne") {
    const r = chiffrerLift(entrees.mission, entrees.reglages,
                           entrees.centreId, entrees.supplements);
    if (r.grille_absente) return null;
    return habiller(r.total_centimes, r.lignes, entrees, {
      origine: r.origine,
      hors_couronne: r.hors_couronne,
      heures_incluses: r.heures_incluses,
    });
  }

  // Boxe et zone sont RÉCURRENTS : ils ne se chiffrent pas en une fois mais
  // période après période. On rend `null` plutôt qu'un total trompeur — leur
  // montant vit sur le contrat, pas sur un devis ponctuel.
  return null;
}

/** Ce qu'un écran doit afficher avant de chiffrer : ce qui manque. */
export function manqueAuChiffrage(cle, entrees = {}) {
  const n = natureDe(cle);
  if (!n) return ["Nature inconnue"];
  const m = entrees.mission || {};
  const out = [];

  if (n.chiffrage === "main_doeuvre") {
    if (!(ouDefaut(m.hommes, 0) > 0)) out.push("Le nombre d'hommes");
    if (!(ouDefaut(m.heures, 0) > 0)) out.push("Les heures prestées");
  }
  if (n.chiffrage === "couronne") {
    if (m.km === null || m.km === undefined || m.km === "") {
      out.push("La distance depuis le centre");
    }
  }
  return out;
}

/**
 * Habille un total en scénario complet : TVA, coûts, marge. Le calcul de TVA
 * et de marge est le même pour toutes les natures — seul le total change.
 */
function habiller(htva, lignes, entrees, extra) {
  const tvaPct = Number.isFinite(entrees?.ref?.tvaPct) ? entrees.ref.tvaPct : TVA_REPLI;
  const tva = Math.round(htva * tvaPct / 100);
  const couts = totalCouts(entrees.couts);
  const marge = htva - couts;
  // Diviser par zéro donnerait Infinity, qui traverserait jusqu'à l'affichage.
  const pct = htva > 0 ? Math.round((marge / htva) * 100) : 0;

  return {
    formule: "forfait",
    htva_centimes: htva,
    tva_centimes: tva,
    tvac_centimes: htva + tva,
    couts_centimes: couts,
    marge_centimes: marge,
    // `marge_pct` se calcule sur le HTVA. Diviser par zéro donnerait Infinity,
    // qui traverserait jusqu'à l'affichage : on rend 0.
    marge_pct: pct,
    // `zoneMarge` du moteur historique, et non un second jeu de seuils : la
    // marge doit se lire de la même façon quelle que soit la nature, et les
    // couleurs de l'écran sont indexées sur SES noms de zones.
    zone: zoneMarge(pct),
    lignes,
    ...extra,
  };
}

function totalCouts(couts) {
  if (!couts) return 0;
  if (typeof couts === "number") return Math.round(couts);
  return Object.values(couts).reduce((s, v) => s + Math.round(ouDefaut(v, 0)), 0);
}
