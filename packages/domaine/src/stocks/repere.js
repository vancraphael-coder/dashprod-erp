// =============================================================================
// Repère de localisation dans le dépôt — x / y / z.
//
// À quoi ça sert : retrouver physiquement une zone ou un box sans lire une
// fiche. Le magasinier a besoin d'un repère qu'on lit d'un coup d'œil, pas
// de trois nombres à recomposer mentalement.
//
// LES AXES APPARTIENNENT À L'ORGANISATION. Par défaut x = allée, y = rangée,
// z = étage, mais chaque entreprise déclare ses propres libellés ET ce qui
// existe réellement chez elle (6 allées, 40 rangées, 4 étages). Ce module ne
// décide de rien : il reçoit les axes et s'y conforme. Les constantes ci-
// dessous ne sont qu'un REPLI quand l'organisation n'a rien déclaré.
//
// ASYMÉTRIE ASSUMÉE (migration 0112) : un BOX porte déjà `niveau`, sur lequel
// l'écran groupe — son z est donc `niveau`, il n'a pas de `pos_z`. Une ZONE a
// `niveaux` = un NOMBRE de niveaux, pas une position : elle a un `pos_z` à
// part. Ce module est le seul endroit qui connaît cette différence.
// =============================================================================

import { nombre } from "../noyau/nombres.js";

/** Le repli quand l'organisation n'a pas encore défini ses axes. */
export const AXES_DEFAUT = Object.freeze({
  x: { libelle: "Allée", format: "lettre", min: 1, max: 12 },
  y: { libelle: "Rangée", format: "nombre", min: 1, max: 40 },
  z: { libelle: "Étage", format: "nombre", min: 0, max: 4 },
});

/** Au-delà de 26, une lettre ne suffit plus à nommer une position. */
export const LETTRES_MAX = 26;

/**
 * Normalise ce qui vient de la base : on complète les trous avec le repli
 * plutôt que de laisser un `undefined` traverser jusqu'à l'affichage.
 */
export function axes(reglage) {
  const sortie = {};
  for (const a of ["x", "y", "z"]) {
    const d = AXES_DEFAUT[a];
    const v = reglage?.[a] || {};
    const min = entierOuNull(v.min) ?? d.min;
    const max = entierOuNull(v.max) ?? d.max;
    sortie[a] = {
      libelle: String(v.libelle || d.libelle).trim() || d.libelle,
      format: v.format === "lettre" ? "lettre"
            : v.format === "nombre" ? "nombre" : d.format,
      min,
      // Un max sous le min rendrait l'axe inutilisable : on retombe sur le min.
      max: max < min ? min : max,
    };
  }
  return sortie;
}

/**
 * Le repère d'une entité, quelle que soit sa forme en base.
 * Renvoie TOUJOURS {x, y, z} avec `null` pour ce qui n'est pas renseigné —
 * jamais 0 par défaut : l'étage 0 (au sol) est une position VALIDE et
 * distincte de « pas renseigné ». C'est le piège Number(null) === 0.
 */
export function repereDe(e, genre = "zone") {
  if (!e) return { x: null, y: null, z: null };
  const z = genre === "box" ? e.niveau : e.pos_z;
  return { x: entierOuNull(e.pos_x), y: entierOuNull(e.pos_y), z: entierOuNull(z) };
}

/** L'inverse : le repère vers les champs attendus par la commande SQL. */
export function repereVersChamps({ x, y, z } = {}, genre = "zone") {
  const base = { pos_x: entierOuNull(x), pos_y: entierOuNull(y) };
  return genre === "box"
    ? { ...base, niveau: entierOuNull(z) ?? 0 }   // colonne NOT NULL
    : { ...base, pos_z: entierOuNull(z) };        // colonne nullable
}

/** Un repère sans aucune coordonnée n'a rien à afficher. */
export function repereVide(r) {
  return !r || (r.x == null && r.y == null && r.z == null);
}

/** Une coordonnée écrite selon le format de son axe : 2 → « B », ou « 2 ». */
export function valeurAxe(v, axe) {
  const n = entierOuNull(v);
  if (n == null) return "";
  if (axe?.format === "lettre") {
    return n >= 1 && n <= LETTRES_MAX ? String.fromCharCode(64 + n) : String(n);
  }
  return String(n);
}

/**
 * Le repère écrit court, pour un badge : « B12 · É2 ».
 * Ce qui manque est omis — on n'écrit pas « ?12 ».
 */
export function formaterRepere(r, reglage) {
  if (repereVide(r)) return "";
  const A = axes(reglage);
  const tete = `${valeurAxe(r.x, A.x)}${valeurAxe(r.y, A.y)}`;
  // La 3e coordonnée est préfixée par l'initiale de son libellé (É pour
  // Étage, N pour Niveau) : sans ça « B12 3 » ne se lit pas.
  const initiale = A.z.libelle.trim().charAt(0).toUpperCase();
  const bas = r.z == null ? "" : `${initiale}${valeurAxe(r.z, A.z)}`;
  return [tete, bas].filter(Boolean).join(" · ");
}

/** Le repère en toutes lettres, pour une infobulle ou un document. */
export function decrireRepere(r, reglage) {
  if (repereVide(r)) return "Pas de repère";
  const A = axes(reglage);
  const bouts = [];
  for (const a of ["x", "y", "z"]) {
    if (r[a] == null) continue;
    bouts.push(`${A[a].libelle.toLowerCase()} ${valeurAxe(r[a], A[a])}`);
  }
  return bouts.join(", ");
}

/**
 * Le repère tient-il dans ce que l'organisation a déclaré ? On répond par une
 * DÉCISION et un message : c'est le message que verra la personne.
 */
export function repereRecevable(r, reglage) {
  if (repereVide(r)) return { ok: true, message: null };
  const A = axes(reglage);
  for (const a of ["x", "y", "z"]) {
    const v = r[a];
    if (v == null) continue;
    const axe = A[a];
    if (!Number.isInteger(v) || v < axe.min || v > axe.max) {
      return {
        ok: false,
        message: `${axe.libelle} : de ${valeurAxe(axe.min, axe)} `
               + `à ${valeurAxe(axe.max, axe)} dans votre dépôt.`,
      };
    }
  }
  return { ok: true, message: null };
}

/** Les valeurs proposables sur un axe — pour offrir un choix réel. */
export function valeursAxe(axe) {
  const out = [];
  for (let v = axe.min; v <= axe.max; v++) {
    out.push({ valeur: v, libelle: valeurAxe(v, axe) });
  }
  return out;
}

/**
 * Deux entités ne peuvent pas occuper le même repère dans un même centre.
 * On renvoie les collisions plutôt qu'un booléen : l'écran doit dire QUI est
 * déjà là.
 */
export function collisions(entites, genre = "zone") {
  const vus = new Map();
  const doublons = [];
  for (const e of entites || []) {
    const r = repereDe(e, genre);
    if (repereVide(r)) continue;
    const cle = `${e.centre_id || ""}|${r.x}|${r.y}|${r.z}`;
    if (vus.has(cle)) doublons.push({ repere: r, entites: [vus.get(cle), e] });
    else vus.set(cle, e);
  }
  return doublons;
}

/**
 * Les bornes du plan à dessiner : ce que l'organisation a déclaré, élargi si
 * des données existantes sortent du cadre (un dépôt réduit ses allées sans
 * déplacer ses boxes — mieux vaut les montrer hors cadre que les cacher).
 */
export function etendue(entites, genre = "zone", reglage) {
  const A = axes(reglage);
  let xMax = A.x.max, yMax = A.y.max;
  for (const e of entites || []) {
    const r = repereDe(e, genre);
    if (r.x != null) xMax = Math.max(xMax, r.x);
    if (r.y != null) yMax = Math.max(yMax, r.y);
  }
  return { xMax, yMax };
}

/** Entier strict, ou null. `null`/""/NaN ne deviennent JAMAIS 0. */
function entierOuNull(v) {
  const n = nombre(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
