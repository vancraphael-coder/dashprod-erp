// =============================================================================
// Stocks — Matériel d'emballage (Enlevé / Utilisé / Repris)
// Source : modèle validé roovers-mobile.jsx (EMB, section « chargement ») —
// alignement page 06. S'appuie sur le domaine Stocks du Module 8
// (controleSolde) : AUCUNE règle d'équilibre réécrite ici.
//
// Pourquoi ce suivi : le matériel qui part et ne revient pas est une fuite de
// marge invisible. Trois colonnes par article — ce qui quitte le dépôt, ce qui
// est consommé chez le client, ce qui revient — et l'écart saute aux yeux.
//
// Note (prix) : la VALORISATION du consommé (valoriserConsomme, Module 8)
// exige des prix unitaires, qui sont un RÉFÉRENTIEL à faire valider par le
// fondateur (C-07 : versionné, jamais inventé). Elle est donc délibérément
// hors de ce module — le catalogue ne porte que des noms, tous issus du
// modèle validé.
// =============================================================================

import { controleSolde } from "./stock.js";

/** Catalogue du matériel d'emballage (noms issus du modèle validé). */
export const CATALOGUE_EMBALLAGE = Object.freeze([
  { cle: "std",     nom: "Carton standard",  pluriel: "cartons standard" },
  { cle: "livre",   nom: "Carton livre",     pluriel: "cartons livre" },
  { cle: "penderie", nom: "Carton penderie", pluriel: "cartons penderie" },
  { cle: "tape",    nom: "Tape",             pluriel: "rouleaux de tape" },
  { cle: "papier",  nom: "Rame papier",      pluriel: "rames de papier" },
  { cle: "bulle",   nom: "Papier bulle",     pluriel: "rouleaux de papier bulle" },
  { cle: "coins",   nom: "Coins mousse",     pluriel: "coins mousse" },
]);

/**
 * Résume l'état du matériel d'un dossier.
 * @param {Object<string, {e?: number, u?: number, r?: number}>} emballage
 * @returns {{
 *   lignes: {cle: string, nom: string, e: number, u: number, r: number,
 *            ecart: number, coherent: boolean}[],
 *   totalUtilise: number,
 *   ecarts: {cle: string, nom: string, ecart: number}[]
 * }}
 */
export function resumeEmballage(emballage) {
  const src = emballage || {};
  const lignes = CATALOGUE_EMBALLAGE.map((a) => {
    const v = src[a.cle] || {};
    const e = Number(v.e) || 0, u = Number(v.u) || 0, r = Number(v.r) || 0;
    // L'équilibre vient du domaine Stocks (Module 8) : une seule règle.
    const { coherent, ecart } = controleSolde({ enleve: e, utilise: u, repris: r });
    return { cle: a.cle, nom: a.nom, e, u, r, ecart, coherent };
  });
  return {
    lignes,
    totalUtilise: lignes.reduce((s, l) => s + l.u, 0),
    // Un écart n'a de sens que si du matériel est sorti (sinon tout est à zéro).
    ecarts: lignes
      .filter((l) => l.e > 0 && !l.coherent)
      .map((l) => ({ cle: l.cle, nom: l.nom, ecart: l.ecart })),
  };
}

/**
 * Liste des fournitures à mentionner sur l'offre (« 20 cartons standard,
 * 5 cartons livre »). Seul le matériel UTILISÉ chez le client est fourni.
 * @param {Object} emballage
 * @returns {string[]}
 */
export function fournituresOffre(emballage) {
  const src = emballage || {};
  return CATALOGUE_EMBALLAGE
    .map((a) => ({ a, u: Number((src[a.cle] || {}).u) || 0 }))
    .filter((x) => x.u > 0)
    .map((x) => `${x.u} ${x.u > 1 ? x.a.pluriel : x.a.nom.toLowerCase()}`);
}
