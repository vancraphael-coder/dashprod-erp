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

import { controleSolde, utiliseCalcule } from "./stock.js";

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
export function resumeEmballage(emballage, catalogue = CATALOGUE_EMBALLAGE) {
  const src = emballage || {};
  // Le catalogue est un PARAMÈTRE : l'entreprise règle ses fournitures dans
  // Paramètres → Catalogues, et le résumé doit être calculé sur CE catalogue.
  // Calculer sur une liste et afficher l'autre produit des lignes introuvables.
  const liste = Array.isArray(catalogue) && catalogue.length ? catalogue : CATALOGUE_EMBALLAGE;
  const lignes = liste.map((a) => {
    const v = src[a.cle] || {};
    const e = Number(v.e) || 0, r = Number(v.r) || 0;
    // util. n'est plus saisi : il se déduit de enl. − rep. Le seul « écart »
    // possible est de reprendre plus qu'on a sorti (saisie incohérente).
    const u = utiliseCalcule(e, r);
    const ecart = r > e ? r - e : 0;
    return { cle: a.cle, nom: a.nom, e, u, r, ecart, coherent: ecart === 0 };
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
export function fournituresOffre(emballage, catalogue = CATALOGUE_EMBALLAGE) {
  const src = emballage || {};
  const liste = Array.isArray(catalogue) && catalogue.length ? catalogue : CATALOGUE_EMBALLAGE;
  return liste
    .map((a) => {
      const v = src[a.cle] || {};
      // Cohérent avec le résumé : l'utilisé se déduit de enl. − rep.
      return { a, u: utiliseCalcule(Number(v.e) || 0, Number(v.r) || 0) };
    })
    .filter((x) => x.u > 0)
    // pluriel est optionnel : un article ajouté par l'entreprise n'en a pas.
    .map((x) => `${x.u} ${x.u > 1 ? (x.a.pluriel || x.a.nom.toLowerCase())
                                  : x.a.nom.toLowerCase()}`);
}

/**
 * Valorise le matériel d'emballage consommé : pour chaque article utilisé
 * (util. = enl. − rep.), sa dénomination et son coût unitaire, puis le montant.
 * Le prix vient du catalogue « fournitures » (cout_centimes). C'est ce qui doit
 * être retranscrit sur l'offre / la facture : dénomination + coût, pas juste un
 * total opaque.
 *
 * @param {Object} emballage  état E/U/R par clé d'article
 * @param {{cle,nom,unite,cout_centimes}[]} fournitures  catalogue avec prix
 * @returns {{lignes: {cle,nom,unite,quantite,cout_unitaire_centimes,montant_centimes}[],
 *            total_centimes: number}}
 */
export function valoriserEmballage(emballage, fournitures) {
  const src = emballage || {};
  const prix = new Map((fournitures || []).map((f) => [f.cle, f]));
  const lignes = [];
  for (const [cle, v] of Object.entries(src)) {
    const u = utiliseCalcule(Number(v?.e) || 0, Number(v?.r) || 0);
    if (u <= 0) continue;
    const f = prix.get(cle);
    const cu = Number(f?.cout_centimes) || 0;
    lignes.push({
      cle, nom: f?.nom || cle, unite: f?.unite || "pièce",
      quantite: u, cout_unitaire_centimes: cu,
      montant_centimes: Math.round(u * cu),
    });
  }
  lignes.sort((a, b) => b.montant_centimes - a.montant_centimes);
  return { lignes, total_centimes: lignes.reduce((t, l) => t + l.montant_centimes, 0) };
}

/**
 * Valorise le matériel d'emballage consommé au PRIX CLIENT (ce qu'on facture),
 * distinct de valoriserEmballage qui rend le COÛT. Même quantités (E/U/R), même
 * articles ; seul le prix change. C'est ce que lisent Devis/Estimation et Calcul
 * définitif. Source unique : le catalogue « fournitures » (prix_client_centimes).
 *
 * @param {Object} emballage  état E/U/R par clé d'article
 * @param {{cle,nom,unite,prix_client_centimes,tva_pct}[]} fournitures
 * @returns {{lignes: object[], total_centimes: number}}
 */
export function valoriserVenteEmballage(emballage, fournitures) {
  const src = emballage || {};
  const prix = new Map((fournitures || []).map((f) => [f.cle, f]));
  const lignes = [];
  for (const [cle, v] of Object.entries(src)) {
    const u = utiliseCalcule(Number(v?.e) || 0, Number(v?.r) || 0);
    if (u <= 0) continue;
    const f = prix.get(cle);
    const pu = Number(f?.prix_client_centimes) || 0;
    lignes.push({
      cle, nom: f?.nom || cle, unite: f?.unite || "pièce",
      quantite: u, prix_unitaire_centimes: pu,
      tva_pct: Number.isFinite(Number(f?.tva_pct)) ? Number(f.tva_pct) : 21,
      montant_centimes: Math.round(u * pu),
    });
  }
  lignes.sort((a, b) => b.montant_centimes - a.montant_centimes);
  return { lignes, total_centimes: lignes.reduce((t, l) => t + l.montant_centimes, 0) };
}

/**
 * Les fournitures consommées sur un chantier, prêtes à FACTURER : chaque article
 * utilisé (E/U/R) devient une ligne de facture au PRIX CLIENT du catalogue.
 * C'est le maillon Matériel → Facture : la donnée saisie une fois (la conso)
 * remonte toute seule, valorisée au prix client, sans ressaisie.
 *
 * @param {Object} emballage  état E/U/R par clé d'article (affaire.emballage)
 * @param {object[]} fournitures  catalogue (prix_client_centimes, tva_pct)
 * @returns {object[]} lignes de facture ({type, libelle, quantite, unite,
 *   prix_unitaire_centimes, tva_pct, montant_htva_centimes})
 */
export function fournituresAFacturer(emballage, fournitures) {
  return valoriserVenteEmballage(emballage, fournitures).lignes.map((l) => ({
    type: "fourniture",
    libelle: l.nom,
    quantite: l.quantite,
    unite: l.unite,
    prix_unitaire_centimes: l.prix_unitaire_centimes,
    tva_pct: l.tva_pct,
    montant_htva_centimes: l.montant_centimes,
  }));
}
