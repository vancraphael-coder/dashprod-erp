// =============================================================================
// Relevé — Volumétrie
// Source : Réf. 2 (relevé volumétrique) et modèle validé roovers-mobile.jsx
// (table VOL, structure d'inventaire). Logique PURE : calcul du volume total
// d'un inventaire et suggestion de composition (déménageurs, camions) dérivée
// du volume. La suggestion PROPOSE, ne décide pas (le chiffrage reste souverain).
// =============================================================================

/** Pièces types d'un logement (roovers-mobile.jsx, PIECES). */
export const PIECES = Object.freeze([
  "Salon", "Chambre", "Cuisine", "Salle de bain", "Bureau", "Cave/Garage", "Autre",
]);

/**
 * Volume unitaire de référence en m³ par type de meuble (table VOL validée).
 * Les clés sont normalisées (minuscules) ; la résolution est tolérante
 * (correspondance par préfixe, puis valeur par défaut).
 */
export const VOLUMES = Object.freeze({
  "canapé 3": 1.2, "canapé 2": 0.9, "canapé": 1, "fauteuil": 0.5, "table basse": 0.3,
  "meuble tv": 0.4, "bibliothèque": 0.8, "buffet": 0.9, "tv": 0.2,
  "armoire 3": 1.8, "armoire 2": 1.2, "armoire": 1.4,
  "lit 160": 0.9, "lit 140": 0.8, "lit 90": 0.5, "sommier": 0.6, "matelas": 0.4,
  "commode": 0.5, "chevet": 0.15, "frigo": 0.6, "congélateur": 0.5,
  "lave-linge": 0.5, "lave-vaisselle": 0.5, "four": 0.15,
  "table": 0.6, "chaise": 0.15, "bureau": 0.7, "étagère": 0.4,
  "vélo": 0.5, "tondeuse": 0.4, "caisse": 0.1, "piano": 1.5, "coffre": 0.8, "miroir": 0.2,
});
const VOLUME_DEFAUT = 0.3;

/**
 * Résout le volume unitaire d'un article par son nom (tolérant : casse,
 * correspondance par préfixe le plus long, défaut sinon).
 * @param {string} nom
 * @returns {number} m³
 */
export function volumeUnitaire(nom) {
  const n = String(nom || "").toLowerCase().trim();
  if (VOLUMES[n] != null) return VOLUMES[n];
  // correspondance par préfixe la plus spécifique (ex. "canapé 3pl" → "canapé 3")
  let meilleur = null;
  for (const cle of Object.keys(VOLUMES)) {
    if (n.startsWith(cle) && (meilleur === null || cle.length > meilleur.length)) meilleur = cle;
  }
  return meilleur ? VOLUMES[meilleur] : VOLUME_DEFAUT;
}

/**
 * Calcule le volume total d'un inventaire. Chaque ligne : {nom, quantite, vol?}.
 * Un volume explicite (ajusté à la main) prime sur le volume de référence.
 * @param {{nom: string, quantite?: number, vol?: number}[]} inventaire
 * @returns {number} m³ (arrondi au centième)
 */
export function volumeTotal(inventaire) {
  const total = (inventaire || []).reduce((s, it) => {
    const unit = (it.vol != null) ? it.vol : volumeUnitaire(it.nom);
    return s + unit * (it.quantite || 1);
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Suggère une composition à partir du volume (PROPOSE, ne décide pas).
 * Heuristique métier (déménagement standard) : ~12 m³ utiles par camion,
 * et un déménageur pour ~8 m³ (min. 2). Ces seuils sont des points de départ
 * ajustables, pas des règles tarifaires (le barème reste la source des prix).
 * @param {number} volumeM3
 * @returns {{camions: number, demenageurs: number}}
 */
export function suggererComposition(volumeM3) {
  const v = Math.max(0, volumeM3 || 0);
  const camions = Math.max(1, Math.ceil(v / 12));
  const demenageurs = Math.min(6, Math.max(2, Math.ceil(v / 8)));
  return { camions, demenageurs };
}

/**
 * Regroupe l'inventaire par pièce avec sous-total de volume (pour l'affichage).
 * @param {{nom: string, piece?: string, quantite?: number, vol?: number}[]} inventaire
 * @returns {{piece: string, articles: any[], volume: number}[]}
 */
export function grouperParPiece(inventaire) {
  const map = new Map();
  for (const it of inventaire || []) {
    const p = it.piece || "Autre";
    if (!map.has(p)) map.set(p, []);
    map.get(p).push(it);
  }
  return [...map.entries()].map(([piece, articles]) => ({
    piece, articles, volume: volumeTotal(articles),
  }));
}
