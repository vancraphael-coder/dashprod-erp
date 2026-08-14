// =============================================================================
// CHIFFRAGE — SOUS-TRAITANCE.
//
// Le cas réel : un vendeur de mobilier, ou un transporteur, ne sait pas
// assurer une livraison simple et vous la confie. VOUS ÊTES LE PRESTATAIRE —
// c'est une recette, pas un coût. Le prix est négocié, généralement sous le
// tarif public : c'est un volume régulier, sans prospection ni relevé.
//
// Ce qui se facture : des HOMMES pendant des heures, un CAMION si le donneur
// d'ordre n'en fournit pas, et des KILOMÈTRES. Rien d'autre — ni emballage,
// ni fournitures, ni relevé.
//
// Une heure entamée est due : on ne facture pas au quart d'heure une équipe
// déjà déplacée. Le minimum d'heures est la protection contre le déplacement
// d'une équipe pour trente minutes de travail.
// =============================================================================

import { nombre, ouDefaut } from "../noyau/nombres.js";

/** Repli quand l'entreprise n'a pas encore négocié sa grille. */
export const TARIF_DEFAUT = Object.freeze({
  homme_heure_centimes: 4500,      // 45 € / homme / heure
  camion_jour_centimes: 12000,     // 120 € / camion / jour
  km_centimes: 90,                 // 0,90 € / km
  heures_minimum: 2,
  remise_pct: 0,                   // la remise négociée, en pourcentage
});

export function tarif(grille) {
  const g = grille || {};
  return {
    homme_heure_centimes: entierPositif(g.homme_heure_centimes, TARIF_DEFAUT.homme_heure_centimes),
    camion_jour_centimes: entierPositif(g.camion_jour_centimes, TARIF_DEFAUT.camion_jour_centimes),
    km_centimes: entierPositif(g.km_centimes, TARIF_DEFAUT.km_centimes),
    heures_minimum: entierPositif(g.heures_minimum, TARIF_DEFAUT.heures_minimum),
    // Une remise de 100 % serait une prestation gratuite : on borne, sans
    // interdire 0 (pas de remise) qui est une valeur légitime.
    remise_pct: Math.min(90, Math.max(0, ouDefaut(g.remise_pct, 0))),
  };
}

/**
 * Les heures facturées : le maximum entre le minimum contractuel et les
 * heures réellement prestées, toute heure entamée étant due.
 */
export function heuresFacturees(heures, grille) {
  const t = tarif(grille);
  const h = ouDefaut(heures, 0);
  return Math.max(t.heures_minimum, Math.ceil(h));
}

/**
 * Le détail chiffré d'une sous-traitance. On rend le DÉTAIL et pas seulement
 * un total : le donneur d'ordre discute toujours une ligne, jamais la somme.
 *
 * @param {{hommes, heures, camions, jours, km}} mission
 * @param {object} grille tarif négocié
 */
export function chiffrer(mission = {}, grille) {
  const t = tarif(grille);
  const hommes = Math.max(0, Math.trunc(ouDefaut(mission.hommes, 0)));
  const camions = Math.max(0, Math.trunc(ouDefaut(mission.camions, 0)));
  const jours = Math.max(1, Math.trunc(ouDefaut(mission.jours, 1)));
  const km = Math.max(0, ouDefaut(mission.km, 0));
  const heures = heuresFacturees(mission.heures, grille);

  const lignes = [];

  if (hommes > 0) {
    lignes.push({
      cle: "main_doeuvre",
      libelle: `${hommes} homme${hommes > 1 ? "s" : ""} × ${heures} h`,
      centimes: hommes * heures * t.homme_heure_centimes,
    });
  }
  // Le camion n'est facturé que si VOUS le fournissez. Quand le donneur
  // d'ordre livre avec le sien, `camions` vaut 0 — et zéro camion doit
  // produire zéro ligne, pas une ligne à 0 €.
  if (camions > 0) {
    lignes.push({
      cle: "camion",
      libelle: `${camions} camion${camions > 1 ? "s" : ""}`
             + (jours > 1 ? ` × ${jours} jours` : ""),
      centimes: camions * jours * t.camion_jour_centimes,
    });
  }
  if (km > 0) {
    lignes.push({
      cle: "km",
      libelle: `${arrondi(km, 1)} km`,
      centimes: Math.round(km * t.km_centimes),
    });
  }

  const brut = lignes.reduce((s, l) => s + l.centimes, 0);
  const remise = Math.round(brut * t.remise_pct / 100);

  return {
    lignes,
    heures_facturees: heures,
    brut_centimes: brut,
    remise_pct: t.remise_pct,
    remise_centimes: remise,
    total_centimes: brut - remise,
    // Sans homme, il n'y a pas de prestation : on le dit plutôt que de rendre
    // un total de 0 € qui passerait pour un chiffrage valide.
    complet: hommes > 0,
  };
}

/** Le prix moyen de l'heure-homme réellement obtenu, remise comprise. */
export function tauxHoraireEffectif(mission, grille) {
  const r = chiffrer(mission, grille);
  const hommes = Math.max(0, Math.trunc(ouDefaut(mission?.hommes, 0)));
  const unites = hommes * r.heures_facturees;
  if (unites <= 0) return null;
  return Math.round(r.total_centimes / unites);
}

function entierPositif(v, defaut) {
  const n = nombre(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : defaut;
}

function arrondi(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
