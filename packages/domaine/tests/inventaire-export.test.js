// Tests — inventaire d'export maritime et aérien.
import test from "node:test";
import assert from "node:assert/strict";
import {
  volumeM3, numeroColis, colis, manifeste, uniteTaxable, controler,
  manifestePret, packingListCsv, designationAcceptable,
  RATIO_AERIEN_KG_M3, RATIO_MARITIME_KG_M3,
} from "../src/releve/inventaire-export.js";

const OBJ = (d, extra = {}) => ({ designation: d, quantite: 1,
  valeur_declaree_centimes: 10000, ...extra });

test("volume calculé depuis des centimètres", () => {
  assert.equal(volumeM3({ longueur_cm: 100, largeur_cm: 50, hauteur_cm: 40 }), 0.2);
  assert.equal(volumeM3({}), 0);
});

test("numérotation à largeur fixe, triable", () => {
  assert.equal(numeroColis(3, 25), "003/025");
  assert.equal(numeroColis(1, 4), "001/004");
  assert.equal(numeroColis(120, 1250), "0120/1250");
});

test("une désignation vague est refusée — la douane retiendrait l'envoi", () => {
  for (const mauvais of ["divers", "Cartons", "effets", "objets", "misc", "  ", "ab"]) {
    assert.equal(designationAcceptable(mauvais), false, `« ${mauvais} » accepté à tort`);
  }
  assert.equal(designationAcceptable("Table en chêne massif 180x90"), true);
});

// ── Tarification du fret ───────────────────────────────────────────────────
test("maritime : un envoi volumineux et léger se paie au volume", () => {
  const u = uniteTaxable(10, 2000, "maritime");
  assert.equal(u.taxable_wm, 10);
  assert.equal(u.base, "volume");
});

test("maritime : un envoi lourd et compact se paie au POIDS", () => {
  // 2 m³ mais 3 tonnes : c'est le poids qui commande. Ignorer cette règle
  // sous-facture le fret.
  const u = uniteTaxable(2, 3000, "maritime");
  assert.equal(u.poids_tonnes, 3);
  assert.equal(u.taxable_wm, 3);
  assert.equal(u.base, "poids");
});

test("aérien : le poids volumétrique l'emporte sur un envoi léger", () => {
  const u = uniteTaxable(10, 500, "aerien");
  assert.equal(u.poids_volumetrique_kg, 10 * RATIO_AERIEN_KG_M3);
  assert.equal(u.taxable_kg, 1670);
  assert.equal(u.base, "volume");
});

test("aérien : un envoi dense se paie au poids réel", () => {
  const u = uniteTaxable(1, 500, "aerien");
  assert.equal(u.taxable_kg, 500);
  assert.equal(u.base, "poids");
});

test("les deux ratios ne sont pas interchangeables", () => {
  assert.notEqual(RATIO_AERIEN_KG_M3, RATIO_MARITIME_KG_M3);
  const m = uniteTaxable(5, 1000, "maritime");
  const a = uniteTaxable(5, 1000, "aerien");
  assert.notDeepEqual(m, a);
});

// ── Manifeste ──────────────────────────────────────────────────────────────
const COLIS_OK = [
  { type: "carton", piece: "Salon", longueur_cm: 60, largeur_cm: 40,
    hauteur_cm: 40, poids_kg: 18,
    objets: [OBJ("Livres reliés, lot de 30"), OBJ("Lampe de bureau laiton")] },
  { type: "caisse_bois", piece: "Salon", longueur_cm: 120, largeur_cm: 80,
    hauteur_cm: 100, poids_kg: 95,
    objets: [OBJ("Buffet en chêne massif 2 portes")] },
];

test("le manifeste numérote et totalise", () => {
  const m = manifeste(COLIS_OK, { mode: "maritime" });
  assert.equal(m.colis[0].numero, "001/002");
  assert.equal(m.totaux.colis, 2);
  assert.equal(m.totaux.objets, 3);
  assert.equal(m.totaux.poids_kg, 113);
  assert.ok(m.totaux.volume_m3 > 1);
});

test("la valeur déclarée remonte au niveau du colis et du total", () => {
  const m = manifeste(COLIS_OK);
  assert.equal(m.colis[0].valeur_declaree_centimes, 20000);
  assert.equal(m.totaux.valeur_declaree_centimes, 30000);
});

test("un colis bois est repéré : la norme ISPM 15 s'applique", () => {
  const m = manifeste(COLIS_OK);
  assert.equal(m.colis[1].bois, true);
  assert.equal(m.totaux.colis_bois, 1);
  assert.ok(m.anomalies.some((a) => /ISPM 15/.test(a.message)));
});

test("une désignation vague BLOQUE le manifeste", () => {
  const m = manifeste([{ type: "carton", piece: "Cave", poids_kg: 10,
    objets: [OBJ("divers")] }]);
  const p = manifestePret(m);
  assert.equal(p.pret, false);
  assert.ok(p.bloquantes.some((a) => /vague/.test(a.message)));
});

test("un colis vide bloque", () => {
  const m = manifeste([{ type: "carton", piece: "X", poids_kg: 5, objets: [] }]);
  assert.equal(manifestePret(m).pret, false);
});

test("un manifeste complet passe, avec avertissements non bloquants", () => {
  const p = manifestePret(manifeste(COLIS_OK));
  assert.equal(p.pret, true);
  assert.ok(p.avertissements.length > 0, "le bois reste signalé");
});

test("poids ou dimensions manquants avertissent sans bloquer", () => {
  const m = manifeste([{ type: "carton", piece: "X",
    objets: [OBJ("Vaisselle en porcelaine, service 12 pièces")] }]);
  const p = manifestePret(m);
  assert.equal(p.pret, true);
  assert.ok(p.avertissements.some((a) => /poids/.test(a.message)));
  assert.ok(p.avertissements.some((a) => /dimensions/.test(a.message)));
});

test("un manifeste vide est bloqué", () => {
  assert.equal(manifestePret(manifeste([])).pret, false);
});

// ── Liste de colisage ──────────────────────────────────────────────────────
test("le CSV a une ligne par objet, pas par colis", () => {
  const csv = packingListCsv(manifeste(COLIS_OK));
  const lignes = csv.split("\r\n");
  assert.equal(lignes.length, 4, "en-tête + 3 objets");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("001/002"));
  assert.ok(csv.includes("Buffet en chêne massif 2 portes"));
});

test("les codes d'état accompagnent l'objet", () => {
  const m = manifeste([{ type: "carton", piece: "Salon", poids_kg: 5,
    objets: [OBJ("Table basse en verre", { etat: ["R", "E", "ZZZ"] })] }]);
  assert.deepEqual(m.colis[0].objets[0].etat, ["R", "E"], "un code inconnu est écarté");
  assert.ok(packingListCsv(m).includes("RE"));
});
