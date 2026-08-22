// =============================================================================
// LE MONTANT D'UN ABONNEMENT.
//
// POURQUOI DANS LE DOMAINE
// ------------------------
// Le cadrage l'a tranché après un incident : « la logique métier se place dans
// un étage pur, testable sans muter quoi que ce soit ». Un barème qui ne vit
// qu'en base ne se vérifie qu'en écrivant dans la base — et une rétrogradation
// de test avait déjà été committée en production sur Roovers.
//
// Ce module ne lit rien et n'écrit rien. On lui donne une offre et une mesure,
// il rend un montant décomposé.
//
// LA RÈGLE DES PRIX
// -----------------
// Les prix sont DONNÉS, jamais recalculés. L'offre porte son prix mensuel ET
// son prix annuel (remise déjà appliquée), y compris pour les suppléments.
// On ne multiplie pas le mensuel par douze en appliquant une remise : si le
// taux changeait, les montants passés seraient réécrits en silence. Une facture
// référence un prix figé.
//
// `remise_annuelle_pct` existe pour EXPLIQUER (« vous économisez 108 € »),
// jamais pour calculer.
// =============================================================================

import { nombre, estFourni } from "../noyau/nombres.js";

/** Les périodicités reconnues. */
export const PERIODICITES = Object.freeze({
  mensuel: { libelle: "Mensuel", mois: 1 },
  annuel: { libelle: "Annuel", mois: 12 },
});

const cents = (v) => Math.round(nombre(v) * 100);

function refus(motif) {
  return { ok: false, motif };
}

/**
 * Le prix de base et le prix d'un supplément, pour une périodicité donnée.
 * Rend `null` si l'offre ne porte pas ce prix — jamais un zéro, qui ferait
 * passer une donnée manquante pour une gratuité.
 */
function prixDe(offre, periodicite) {
  if (periodicite === "annuel") {
    return {
      base: offre?.prix_base_htva_annuel,
      membre: offre?.prix_membre_supp_htva_annuel,
      centre: offre?.prix_centre_supp_htva_annuel,
    };
  }
  return {
    base: offre?.prix_base_htva_mensuel,
    membre: offre?.prix_membre_supp_htva,
    centre: offre?.prix_centre_supp_htva,
  };
}

/**
 * Calcule le montant HTVA d'un abonnement.
 *
 * @param {object} offre ligne du référentiel `offres`
 * @param {object} mesure  { membres, centres } — les compteurs figés à
 *                         l'émission (membres désactivés et centres archivés
 *                         déjà exclus : ce module ne les connaît pas)
 * @param {string} periodicite "mensuel" | "annuel"
 * @returns {{ok: true, montant: object} | {ok: false, motif: string}}
 */
export function montantAbonnement(offre, mesure = {}, periodicite = "mensuel") {
  if (!offre) return refus("Aucune offre : montant incalculable.");
  if (!PERIODICITES[periodicite]) {
    return refus(`Périodicité inconnue : ${periodicite}.`);
  }

  const p = prixDe(offre, periodicite);
  if (!estFourni(p.base)) {
    return refus(`L'offre « ${offre.libelle || offre.code} » n'a pas de prix `
      + `${PERIODICITES[periodicite].libelle.toLowerCase()} publié. Aucune `
      + "facture ne peut être émise tant qu'il manque.");
  }

  const inclusM = nombre(offre.membres_inclus) || 0;
  const inclusC = nombre(offre.centres_inclus) || 0;
  // Un compteur en dessous du seuil ne rend PAS de crédit : on ne facture
  // jamais un montant négatif pour une équipe plus petite que prévu.
  const suppM = Math.max(0, (nombre(mesure.membres) || 0) - inclusM);
  const suppC = Math.max(0, (nombre(mesure.centres) || 0) - inclusC);

  // Un supplément dû sans prix publié est une erreur, pas une gratuité : mieux
  // vaut refuser d'émettre que de facturer 0 € une place vendue.
  if (suppM > 0 && !estFourni(p.membre)) {
    return refus("Des membres supplémentaires sont dus, mais l'offre ne publie "
      + "aucun prix pour eux.");
  }
  if (suppC > 0 && !estFourni(p.centre)) {
    return refus("Des centres supplémentaires sont dus, mais l'offre ne publie "
      + "aucun prix pour eux — cette offre n'en propose peut-être pas.");
  }

  const baseC = cents(p.base);
  const membresC = suppM * cents(p.membre || 0);
  const centresC = suppC * cents(p.centre || 0);

  return {
    ok: true,
    montant: {
      periodicite,
      base_centimes: baseC,
      membres_supp: suppM,
      membres_supp_centimes: membresC,
      centres_supp: suppC,
      centres_supp_centimes: centresC,
      total_htva_centimes: baseC + membresC + centresC,
    },
  };
}

/**
 * Ce que l'annuel fait économiser, pour l'ANNONCER — jamais pour calculer.
 *
 * Rend la différence réelle entre douze mensualités et l'annuel, suppléments
 * compris. On la mesure sur les deux montants publiés plutôt que d'appliquer le
 * pourcentage : si un prix annuel était saisi à part, l'économie affichée
 * resterait vraie.
 */
export function economieAnnuelle(offre, mesure = {}) {
  const m = montantAbonnement(offre, mesure, "mensuel");
  const a = montantAbonnement(offre, mesure, "annuel");
  if (!m.ok || !a.ok) return null;
  const douzeMois = m.montant.total_htva_centimes * 12;
  const economie = douzeMois - a.montant.total_htva_centimes;
  return {
    douze_mois_centimes: douzeMois,
    annuel_centimes: a.montant.total_htva_centimes,
    economie_centimes: economie,
    // Le pourcentage RÉEL constaté, pas celui annoncé : s'ils divergeaient,
    // c'est le constat qui a raison.
    pourcentage: douzeMois > 0
      ? Math.round((economie / douzeMois) * 1000) / 10 : 0,
  };
}
