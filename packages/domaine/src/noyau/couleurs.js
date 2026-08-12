// =============================================================================
// Couleurs — conversions pures.
//
// L'accent de l'app se choisit sur deux molettes : une teinte (0-360°) et un
// « dégradé » (du pastel au sombre). Il faut donc traduire ces deux réglages en
// couleurs concrètes : la couleur vive, sa version foncée pour les dégradés de
// boutons, et deux voiles très pâles pour les fonds.
//
// Logique PURE, sans DOM : c'est ce qui la rend testable.
// =============================================================================

/** Borne une valeur entre deux limites. */
export function borner(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}

/**
 * HSL → hexadécimal.
 * @param {number} h teinte 0-360
 * @param {number} s saturation 0-100
 * @param {number} l luminosité 0-100
 */
export function hslVersHex(h, s, l) {
  const H = ((Number(h) % 360) + 360) % 360;
  const S = borner(s, 0, 100) / 100;
  const L = borner(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  let r = 0, g = 0, b = 0;
  if (H < 60) [r, g, b] = [c, x, 0];
  else if (H < 120) [r, g, b] = [x, c, 0];
  else if (H < 180) [r, g, b] = [0, c, x];
  else if (H < 240) [r, g, b] = [0, x, c];
  else if (H < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const s2 = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${s2(r)}${s2(g)}${s2(b)}`.toUpperCase();
}

/** Hexadécimal → HSL (pour retrouver les molettes depuis une couleur donnée). */
export function hexVersHsl(hex) {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { h: 217, s: 83, l: 53 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0, teinte = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) teinte = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) teinte = ((b - r) / d + 2) * 60;
    else teinte = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(teinte), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Le « dégradé » : une position de 0 à 100 qui va du pastel au sombre, en
 * passant par la couleur pleine. Elle pilote ensemble la saturation et la
 * luminosité — deux curseurs séparés donneraient des choix inutilisables
 * (couleurs délavées ou fluorescentes) alors qu'on cherche une gamme sûre.
 *
 * @returns {{s: number, l: number}}
 */
export function gammeDegrade(position) {
  const p = borner(position, 0, 100);
  if (p <= 50) {
    // 0 → pastel très clair ; 50 → couleur pleine
    const t = p / 50;
    return { s: Math.round(45 + t * 40), l: Math.round(88 - t * 35) };
  }
  // 50 → couleur pleine ; 100 → sombre et dense
  const t = (p - 50) / 50;
  return { s: Math.round(85 - t * 20), l: Math.round(53 - t * 33) };
}

/**
 * Construit un accent complet à partir des deux molettes.
 * @returns {{vif, fonce, voileClair, voileNuit}}
 */
export function accentDepuisMolettes(teinte, degrade) {
  const { s, l } = gammeDegrade(degrade);
  const vif = hslVersHex(teinte, s, l);
  const fonce = hslVersHex(teinte, Math.min(100, s + 6), Math.max(12, l - 11));
  return {
    vif, fonce,
    voileClair: hslVersHex(teinte, Math.min(100, s), 96),
    voileNuit: `rgba(${hexVersRgb(vif)},.18)`,
  };
}

/** Hexadécimal → « r,g,b » pour composer des rgba() en CSS. */
export function hexVersRgb(hex) {
  const h = String(hex || "").replace("#", "");
  const n = parseInt(/^[0-9a-fA-F]{6}$/.test(h) ? h : "2563EB", 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
