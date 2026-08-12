import test from "node:test";
import assert from "node:assert/strict";
import {
  hslVersHex, hexVersHsl, gammeDegrade, accentDepuisMolettes, hexVersRgb,
} from "../src/noyau/couleurs.js";

test("hslVersHex : repères connus", () => {
  assert.equal(hslVersHex(0, 100, 50), "#FF0000");
  assert.equal(hslVersHex(120, 100, 50), "#00FF00");
  assert.equal(hslVersHex(240, 100, 50), "#0000FF");
  assert.equal(hslVersHex(0, 0, 100), "#FFFFFF");
  assert.equal(hslVersHex(0, 0, 0), "#000000");
});

test("hslVersHex : la teinte boucle sans casser", () => {
  assert.equal(hslVersHex(360, 100, 50), hslVersHex(0, 100, 50));
  assert.equal(hslVersHex(-120, 100, 50), hslVersHex(240, 100, 50));
});

test("hexVersHsl puis hslVersHex : aller-retour fidèle à l'œil", () => {
  // HSL est stocké en entiers : l'aller-retour dévie d'un ou deux points par
  // composante. C'est inhérent à la conversion, pas un défaut — on vérifie donc
  // que la couleur retrouvée est indiscernable, pas qu'elle est identique.
  for (const hex of ["#2563EB", "#D97706", "#059669", "#7C3AED"]) {
    const { h, s, l } = hexVersHsl(hex);
    const retour = hslVersHex(h, s, l);
    const comp = (v, i) => parseInt(v.slice(1 + i * 2, 3 + i * 2), 16);
    for (let i = 0; i < 3; i++) {
      const ecart = Math.abs(comp(hex.toUpperCase(), i) - comp(retour, i));
      assert.ok(ecart <= 3,
        `${hex} → ${retour} : écart de ${ecart} sur la composante ${i}`);
    }
  }
});

test("hexVersHsl : une entrée invalide retombe sur le bleu, sans planter", () => {
  const r = hexVersHsl("pas une couleur");
  assert.equal(typeof r.h, "number");
  assert.ok(r.s >= 0 && r.s <= 100);
});

test("gammeDegrade : du pastel au sombre, en passant par la couleur pleine", () => {
  const clair = gammeDegrade(0);
  const plein = gammeDegrade(50);
  const sombre = gammeDegrade(100);
  assert.ok(clair.l > plein.l, "le pastel est plus clair que la couleur pleine");
  assert.ok(plein.l > sombre.l, "la couleur pleine est plus claire que le sombre");
  assert.ok(sombre.l >= 12, "on ne descend jamais jusqu'au noir illisible");
});

test("accentDepuisMolettes : la version foncée l'est vraiment", () => {
  const a = accentDepuisMolettes(217, 50);
  assert.match(a.vif, /^#[0-9A-F]{6}$/);
  assert.equal(hexVersHsl(a.fonce).l < hexVersHsl(a.vif).l, true);
  assert.match(a.voileClair, /^#[0-9A-F]{6}$/);
  assert.match(a.voileNuit, /^rgba\(\d+,\d+,\d+,\.18\)$/);
});

test("hexVersRgb : composantes exploitables en CSS", () => {
  assert.equal(hexVersRgb("#2563EB"), "37,99,235");
  assert.equal(hexVersRgb("#000000"), "0,0,0");
});
