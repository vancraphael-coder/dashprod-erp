// =============================================================================
// VENTE DE FOURNITURES — transformer un article de stock en ligne de facture.
//
// Un carton, du papier bulle : ça se vend, joint à un déménagement ou au
// comptoir. Ce module PUR fait le pont entre stock_articles (prix en euros, taux
// de TVA) et une ligne de facture (prix en centimes, tva_pct). Il valide qu'un
// article est vendable AVANT de le facturer — un prix nul ou un taux absent
// doivent être refusés, pas devinés (le moteur TVA refuse plutôt que supposer).
//
// Piège du projet : Number(null) === 0. Un taux de TVA absent ne vaut pas 0 % —
// il vaut « inconnu », et on refuse.
// =============================================================================

/** Convertit un prix en euros (numeric de la base) en centimes entiers. */
export function euxCentimes(prixEuros) {
  const n = Number(prixEuros);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Un article est-il vendable ? Nom, prix >= 0, taux de TVA présent et valide.
 * @param {{nom?, prix_unitaire?, tva_pct?, actif?}} article
 * @returns {{ok: boolean, message?: string}}
 */
export function articleVendable(article = {}) {
  if (!article.nom || !String(article.nom).trim()) {
    return { ok: false, message: "Article sans nom." };
  }
  if (article.actif === false) {
    return { ok: false, message: "Article inactif." };
  }
  const cents = euxCentimes(article.prix_unitaire);
  if (cents === null) {
    return { ok: false, message: "Prix invalide." };
  }
  // Taux de TVA : présent et dans [0, 100]. Absent = inconnu = refus (jamais 0
  // par défaut — c'est le piège Number(null) et la règle « refuser, pas deviner »).
  const t = article.tva_pct;
  if (t === null || t === undefined || t === "") {
    return { ok: false, message: "Taux de TVA manquant sur l'article." };
  }
  const taux = Number(t);
  if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
    return { ok: false, message: "Taux de TVA incohérent." };
  }
  return { ok: true };
}

/**
 * Transforme un article + une quantité en LIGNE de facture (centimes, TVA).
 * Renvoie null si l'article n'est pas vendable ou la quantité invalide — au
 * lieu d'émettre une ligne fausse.
 *
 * @param {object} article  { nom, prix_unitaire, tva_pct }
 * @param {number} quantite
 * @returns {{libelle, quantite, unite, prix_unitaire_centimes, tva_pct,
 *            type, montant_htva_centimes}|null}
 */
export function ligneVente(article = {}, quantite = 1) {
  if (!articleVendable(article).ok) return null;
  const q = Math.max(0, Math.round(Number(quantite) || 0));
  if (q <= 0) return null;
  const pu = euxCentimes(article.prix_unitaire);
  const tva = Number(article.tva_pct);
  return {
    libelle: String(article.nom).trim(),
    quantite: q,
    unite: "pièce",
    prix_unitaire_centimes: pu,
    tva_pct: tva,
    type: "fourniture",
    montant_htva_centimes: q * pu,
  };
}

/**
 * Le total HTVA d'un panier de fournitures (pour un aperçu avant facturation).
 * Ignore silencieusement les lignes invalides — mais ne les facture pas.
 * @param {Array<{article, quantite}>} panier
 * @returns {{lignes: object[], total_htva_centimes: number, rejets: number}}
 */
export function composerVente(panier = []) {
  const lignes = [];
  let rejets = 0;
  for (const { article, quantite } of panier || []) {
    const l = ligneVente(article, quantite);
    if (l) lignes.push(l); else rejets += 1;
  }
  const total = lignes.reduce((s, l) => s + l.montant_htva_centimes, 0);
  return { lignes, total_htva_centimes: total, rejets };
}
