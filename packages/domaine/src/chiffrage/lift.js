// =============================================================================
// CHIFFRAGE — LIFT (monte-meubles vendu seul).
//
// Ni relevé de meubles, ni emballage, ni fournitures. On amène le lift, on
// monte ou on descend, on repart.
//
// LE MODÈLE, tel que le bureau le pratique :
//
//   1. LA COURONNE. Le prix de base suit la distance depuis le centre, par
//      anneaux : 0–15 km, 15–30 km, 30–60 km… Chaque anneau a son prix.
//
//   2. LE TEMPS INCLUS EST PROPRE À LA COURONNE. Un anneau ne vend pas qu'un
//      déplacement : il comprend un temps sur place. Aller à 40 km suppose
//      d'y rester, et l'anneau lointain inclut donc davantage.
//
//   3. LE DÉPASSEMENT se facture à l'heure, au-delà du temps inclus.
//
//   4. L'HOMME SUPPLÉMENTAIRE REPREND LE TEMPS, MAIS NE DOUBLE PAS LE PRIX.
//      Il est présent toute la durée sur place, mais le lift, le déplacement
//      et la machine sont déjà payés : seul son travail s'ajoute, à un
//      supplément horaire que le BUREAU fixe. C'est le point qui distingue ce
//      modèle d'une simple main-d'œuvre — doubler le total serait facturer
//      deux fois le déplacement.
//
// LA GRILLE APPARTIENT AU CENTRE, avec REPLI SUR LA MAISON MÈRE, et le
// résultat dit toujours d'où elle vient : savoir quelle grille a servi est
// indispensable quand un client discute un prix.
// =============================================================================

import { nombre, ouDefaut } from "../noyau/nombres.js";

/**
 * Repli quand rien n'est déclaré. `heures_incluses` monte avec la distance :
 * on ne se déplace pas à 60 km pour une demi-heure.
 */
export const COURONNES_DEFAUT = Object.freeze([
  { jusqua_km: 15, prix_centimes: 18000, heures_incluses: 1 },
  { jusqua_km: 30, prix_centimes: 24000, heures_incluses: 1.5 },
  { jusqua_km: 60, prix_centimes: 32000, heures_incluses: 2 },
]);

/** Ce que le bureau fixe, au-delà des anneaux. */
export const SUPPLEMENTS_DEFAUT = Object.freeze({
  heure_centimes: 6500,          // l'heure au-delà du temps inclus
  homme_heure_centimes: 4000,    // l'homme EN PLUS, par heure sur place
  km_centimes: 150,              // le km au-delà du dernier anneau
});

export function supplements(reglage) {
  const r = reglage || {};
  return {
    heure_centimes: entierPositif(r.heure_centimes, SUPPLEMENTS_DEFAUT.heure_centimes),
    homme_heure_centimes: entierPositif(r.homme_heure_centimes,
                                       SUPPLEMENTS_DEFAUT.homme_heure_centimes),
    km_centimes: entierPositif(r.km_centimes, SUPPLEMENTS_DEFAUT.km_centimes),
  };
}

/**
 * Les couronnes triées et nettoyées. Une couronne sans distance ou sans prix
 * n'est pas une couronne : on l'écarte plutôt que de la laisser fausser le tri.
 *
 * `heures_incluses` absent vaut 0 — un anneau qui ne déclare aucun temps
 * inclus ne vend que le déplacement, ce qui est un choix légitime.
 */
export function couronnes(grille) {
  return (Array.isArray(grille) ? grille : [])
    .map((c) => ({
      jusqua_km: nombre(c?.jusqua_km),
      prix_centimes: nombre(c?.prix_centimes),
      heures_incluses: Math.max(0, ouDefaut(c?.heures_incluses, 0)),
    }))
    .filter((c) => Number.isFinite(c.jusqua_km) && c.jusqua_km > 0
                && Number.isFinite(c.prix_centimes) && c.prix_centimes >= 0)
    .sort((a, b) => a.jusqua_km - b.jusqua_km);
}

/**
 * La grille applicable à un centre, et D'OÙ elle vient.
 * @param {object} reglages { parCentre: {<id>: couronnes[]}, maisonMere: couronnes[] }
 */
export function grilleDuCentre(reglages, centreId) {
  const propre = couronnes(reglages?.parCentre?.[centreId]);
  if (propre.length > 0) return { couronnes: propre, origine: "centre" };
  const siege = couronnes(reglages?.maisonMere);
  if (siege.length > 0) return { couronnes: siege, origine: "maison_mere" };
  return { couronnes: couronnes(COURONNES_DEFAUT), origine: "defaut" };
}

/** La couronne qui contient cette distance, ou null si elle les dépasse toutes. */
export function couronnePour(liste, km) {
  const d = ouDefaut(km, 0);
  return couronnes(liste).find((c) => d <= c.jusqua_km) || null;
}

/**
 * Le prix d'un lift.
 *
 * @param {{km, heures, hommes_supp}} mission
 *        `heures` = temps sur place. `hommes_supp` = hommes EN PLUS de celui
 *        qui est compris dans la couronne.
 * @param {object} reglages grilles par centre + maison mère
 * @param {string} centreId
 * @param {object} regleSupp suppléments fixés par le bureau
 */
export function chiffrer(mission, reglages, centreId, regleSupp) {
  const m = mission || {};
  const s = supplements(regleSupp);
  const { couronnes: liste, origine } = grilleDuCentre(reglages, centreId);
  const km = Math.max(0, ouDefaut(m.km, 0));
  const heures = Math.max(0, ouDefaut(m.heures, 0));
  const hommesSupp = Math.max(0, Math.trunc(ouDefaut(m.hommes_supp, 0)));

  const dans = couronnePour(liste, km);
  const derniere = liste[liste.length - 1] || null;

  if (!dans && !derniere) {
    return { total_centimes: 0, lignes: [], origine, grille_absente: true,
             couronne: null, hors_couronne: true, heures_incluses: 0,
             heures_supplementaires: 0, km_supplementaires: 0 };
  }

  const couronne = dans || derniere;
  const lignes = [];

  lignes.push({
    cle: "lift",
    libelle: `Lift jusqu'à ${couronne.jusqua_km} km`
           + (couronne.heures_incluses > 0
              ? `, ${formaterHeures(couronne.heures_incluses)} sur place comprises`
              : ""),
    centimes: couronne.prix_centimes,
  });

  // Au-delà du dernier anneau, on prolonge au km : un client hors zone reste
  // un client. On ne refuse pas de chiffrer.
  const kmSupp = dans ? 0 : Math.max(0, km - couronne.jusqua_km);
  if (kmSupp > 0) {
    lignes.push({ cle: "km_supp", libelle: `${arrondi(kmSupp, 1)} km au-delà`,
                  centimes: Math.round(kmSupp * s.km_centimes) });
  }

  // Le dépassement de temps. Toute heure entamée est due : une équipe déjà
  // sur place ne se facture pas au quart d'heure.
  const heuresSupp = Math.max(0, Math.ceil(heures - couronne.heures_incluses));
  if (heuresSupp > 0) {
    lignes.push({
      cle: "heures_supp",
      libelle: `${heuresSupp} h au-delà des ${formaterHeures(couronne.heures_incluses)} comprises`,
      centimes: heuresSupp * s.heure_centimes,
    });
  }

  // L'homme supplémentaire reprend TOUT le temps sur place — pas seulement le
  // dépassement : il est là du début à la fin. Mais il ne paie que son
  // travail, jamais une deuxième fois le déplacement ni la machine.
  if (hommesSupp > 0) {
    const heuresPresence = Math.max(1, Math.ceil(heures || couronne.heures_incluses));
    lignes.push({
      cle: "hommes_supp",
      libelle: `${hommesSupp} homme${hommesSupp > 1 ? "s" : ""} en plus × ${heuresPresence} h`,
      centimes: hommesSupp * heuresPresence * s.homme_heure_centimes,
    });
  }

  return {
    total_centimes: lignes.reduce((t, l) => t + l.centimes, 0),
    lignes,
    couronne,
    origine,
    hors_couronne: !dans,
    heures_incluses: couronne.heures_incluses,
    heures_supplementaires: heuresSupp,
    km_supplementaires: arrondi(kmSupp, 1),
    hommes_supp: hommesSupp,
  };
}

/** De quoi afficher la grille : les bornes de chaque anneau et son temps. */
export function decrireGrille(liste) {
  const cs = couronnes(liste);
  let bas = 0;
  return cs.map((c) => {
    const ligne = {
      de_km: bas, jusqua_km: c.jusqua_km, prix_centimes: c.prix_centimes,
      heures_incluses: c.heures_incluses,
      libelle: `${bas} – ${c.jusqua_km} km`,
    };
    bas = c.jusqua_km;
    return ligne;
  });
}

/** « 1 h 30 », « 2 h ». Une durée se lit, elle ne se calcule pas de tête. */
export function formaterHeures(h) {
  const v = ouDefaut(h, 0);
  if (v <= 0) return "0 h";
  const entier = Math.floor(v);
  const minutes = Math.round((v - entier) * 60);
  if (!minutes) return `${entier} h`;
  return entier ? `${entier} h ${minutes}` : `${minutes} min`;
}

function entierPositif(v, defaut) {
  const n = nombre(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : defaut;
}

function arrondi(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
