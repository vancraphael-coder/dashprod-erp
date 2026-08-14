// =============================================================================
// CHIFFRAGE — LIFT (monte-meubles).
//
// Un service seul : ni relevé de meubles, ni emballage, ni fournitures. On
// amène le lift, on monte ou on descend, on repart.
//
// LE PRIX SUIT LA DISTANCE, PAR COURONNES. Une couronne est un anneau autour
// du centre : 0–15 km, 15–30 km, 30–60 km… Chaque couronne a son prix, et le
// dernier anneau peut être ouvert (au-delà de 60 km) avec un prix au km en
// supplément — sinon un client à 200 km tomberait dans le vide tarifaire.
//
// LA GRILLE APPARTIENT AU CENTRE, avec REPLI SUR LA MAISON MÈRE. Un dépôt qui
// n'a pas négocié sa propre grille applique celle du siège ; celui qui en a
// une l'applique. Le repli est explicite dans le résultat (`origine`) : savoir
// quelle grille a servi est indispensable quand on discute un prix.
// =============================================================================

import { nombre, ouDefaut } from "../noyau/nombres.js";

/** Repli quand rien n'est déclaré, ni au centre ni au siège. */
export const COURONNES_DEFAUT = Object.freeze([
  { jusqua_km: 15, prix_centimes: 18000 },
  { jusqua_km: 30, prix_centimes: 24000 },
  { jusqua_km: 60, prix_centimes: 32000 },
]);

/** Au-delà de la dernière couronne, ce qu'on ajoute par kilomètre. */
export const KM_SUPP_DEFAUT = 150;   // 1,50 € / km

/**
 * Les couronnes triées et nettoyées. Une couronne sans distance ou sans prix
 * n'est pas une couronne : on l'écarte au lieu de la laisser fausser le tri.
 */
export function couronnes(grille) {
  return (Array.isArray(grille) ? grille : [])
    .map((c) => ({
      jusqua_km: nombre(c?.jusqua_km),
      prix_centimes: nombre(c?.prix_centimes),
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
  if (propre.length > 0) {
    return { couronnes: propre, origine: "centre" };
  }
  const siege = couronnes(reglages?.maisonMere);
  if (siege.length > 0) {
    return { couronnes: siege, origine: "maison_mere" };
  }
  return { couronnes: couronnes(COURONNES_DEFAUT), origine: "defaut" };
}

/** La couronne qui contient cette distance, ou null si elle les dépasse toutes. */
export function couronnePour(liste, km) {
  const d = ouDefaut(km, 0);
  return couronnes(liste).find((c) => d <= c.jusqua_km) || null;
}

/**
 * Le prix d'un lift à une distance donnée, depuis un centre.
 *
 * @param {number} km distance depuis le centre
 * @param {object} reglages grilles par centre + maison mère
 * @param {string} centreId
 * @param {object} options { km_supp_centimes }
 */
export function chiffrer(km, reglages, centreId, options = {}) {
  const { couronnes: liste, origine } = grilleDuCentre(reglages, centreId);
  const d = Math.max(0, ouDefaut(km, 0));
  const dans = couronnePour(liste, d);

  if (dans) {
    return {
      total_centimes: dans.prix_centimes,
      couronne: dans,
      hors_couronne: false,
      km_supplementaires: 0,
      supplement_centimes: 0,
      origine,
      lignes: [{
        cle: "lift",
        libelle: `Lift jusqu'à ${dans.jusqua_km} km`,
        centimes: dans.prix_centimes,
      }],
    };
  }

  // Au-delà de la dernière couronne : on prolonge au kilomètre plutôt que de
  // refuser de chiffrer. Un client hors zone reste un client.
  const derniere = liste[liste.length - 1] || null;
  if (!derniere) {
    return {
      total_centimes: 0, couronne: null, hors_couronne: true,
      km_supplementaires: 0, supplement_centimes: 0, origine,
      lignes: [], grille_absente: true,
    };
  }

  const kmSupp = Math.max(0, d - derniere.jusqua_km);
  const parKm = entierPositif(options.km_supp_centimes, KM_SUPP_DEFAUT);
  const supplement = Math.round(kmSupp * parKm);

  return {
    total_centimes: derniere.prix_centimes + supplement,
    couronne: derniere,
    hors_couronne: true,
    km_supplementaires: arrondi(kmSupp, 1),
    supplement_centimes: supplement,
    origine,
    lignes: [
      { cle: "lift", libelle: `Lift jusqu'à ${derniere.jusqua_km} km`,
        centimes: derniere.prix_centimes },
      { cle: "km_supp", libelle: `${arrondi(kmSupp, 1)} km au-delà`,
        centimes: supplement },
    ],
  };
}

/** De quoi afficher la grille : les bornes basses et hautes de chaque anneau. */
export function decrireGrille(liste) {
  const cs = couronnes(liste);
  let bas = 0;
  return cs.map((c) => {
    const ligne = { de_km: bas, jusqua_km: c.jusqua_km,
                    prix_centimes: c.prix_centimes,
                    libelle: `${bas} – ${c.jusqua_km} km` };
    bas = c.jusqua_km;
    return ligne;
  });
}

function entierPositif(v, defaut) {
  const n = nombre(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : defaut;
}

function arrondi(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
