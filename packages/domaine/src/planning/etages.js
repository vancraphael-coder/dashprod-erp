// =============================================================================
// LES ÉTAGES d'une adresse.
//
// L'étage était un champ LIBRE (« RDC / 2e »). Pratique à saisir, inutilisable
// à confronter : on ne compare pas « 2e » à l'étage maximal d'un lift. Or
// c'est exactement ce qu'il faut faire pour refuser une échelle trop courte.
//
// D'où une sélection rapide qui produit un NOMBRE. Mais les dossiers existants
// portent du texte, et le perdre en silence serait pire que le garder : ce
// module sait relire l'ancien format et n'efface jamais ce qu'il ne comprend
// pas.
// =============================================================================

import { nombre } from "../noyau/nombres.js";

/** Ce qu'on propose d'un doigt. Au-delà, on tape le nombre. */
export const ETAGES_RAPIDES = Object.freeze([0, 1, 2, 3, 4, 5]);

/** Le rez s'écrit « RDC », pas « 0e » — personne ne dit « zéroième ». */
export function libelleEtage(n) {
  const v = niveau(n);
  if (v === null) return "";
  if (v < 0) return v === -1 ? "Sous-sol" : `Sous-sol ${Math.abs(v)}`;
  if (v === 0) return "RDC";
  if (v === 1) return "1er";
  return `${v}e`;
}

/**
 * Relit une valeur d'étage, nombre ou texte hérité.
 * Rend `null` quand rien ne se comprend — JAMAIS 0, qui voudrait dire « rez ».
 * Confondre les deux placerait au rez-de-chaussée tout ce qui n'a pas été
 * saisi, et un lift passerait alors pour suffisant partout.
 */
export function niveau(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;

  const t = String(v).trim().toLowerCase();
  if (!t) return null;
  if (/^(rdc|rez|rez-de-chauss[ée]e?|0)$/.test(t)) return 0;
  if (/sous.?sol|^ss$|^-1$/.test(t)) return -1;

  // « 2e », « 3ème », « étage 4 », « 5 » → le premier nombre rencontré.
  const m = t.match(/-?\d+/);
  if (!m) return null;
  const n = nombre(m[0]);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** La saisie est-elle relisible ? Sinon on la conserve telle quelle. */
export function estRelisible(v) {
  return v === null || v === undefined || v === "" || niveau(v) !== null;
}

/**
 * L'étage le plus haut d'une liste d'adresses — c'est lui qui commande le
 * choix du lift. Les adresses non relisibles sont ignorées du calcul, mais
 * signalées à part : on ne prétend pas savoir.
 */
export function etageMaxDemande(adresses) {
  let max = null;
  let incertain = false;
  for (const a of adresses || []) {
    const n = niveau(a?.etage);
    if (n === null) {
      if (a?.etage) incertain = true;
      continue;
    }
    max = max === null ? n : Math.max(max, n);
  }
  return { etage: max, incertain };
}

/**
 * Un lift suffit-il pour ces adresses ? Décision MOTIVÉE — c'est le motif
 * qu'on affiche, pas un booléen.
 *
 * @param {{etage_max?: number|null}} lift
 * @param {Array} adresses
 */
export function liftSuffit(lift, adresses) {
  const { etage, incertain } = etageMaxDemande(adresses);

  if (!lift) return { ok: true, motif: null };
  const max = lift.etage_max;
  if (max === null || max === undefined || max === "") {
    return { ok: true, inconnu: true,
             motif: "Étage maximal non renseigné pour ce lift." };
  }
  if (etage === null) {
    return { ok: true, inconnu: incertain,
             motif: incertain ? "Étage des adresses illisible : à vérifier." : null };
  }
  if (etage > Number(max)) {
    return {
      ok: false,
      motif: `Ce lift monte au ${libelleEtage(Number(max))} — `
           + `le chantier est au ${libelleEtage(etage)}.`,
    };
  }
  return { ok: true, motif: incertain
    ? "Une adresse a un étage illisible : à vérifier." : null };
}
