// Tests — suppléments variables du barème.
import test from "node:test";
import assert from "node:assert/strict";
import {
  supplement, catalogueSupplements, ajouterSupplement, retirerSupplement,
  supplementsRetenus, totalSupplements, libelleLigne, UNITES_SUPPLEMENT,
} from "../src/chiffrage/supplements.js";
import { calculerScenario } from "../src/chiffrage/moteur.js";

const CATALOGUE = [
  { cle: "piano", libelle: "Piano droit", montant_centimes: 15000, unite: "unite" },
  { cle: "cave", libelle: "Cave difficile", montant_centimes: 8000, unite: "forfait" },
  { cle: "etage_sans_asc", libelle: "Étage sans ascenseur", montant_centimes: 3000, unite: "etage" },
  { cle: "vieux", libelle: "Ancien supplément", montant_centimes: 5000, unite: "forfait", actif: false },
];

test("un supplément se normalise avec une clé et une unité valides", () => {
  const s = supplement({ libelle: "Test", montant_centimes: 1000, unite: "n'importe quoi" });
  assert.ok(s.cle);
  assert.equal(s.unite, "forfait", "unité inconnue → forfait");
  assert.equal(s.actif, true);
});

test("ajouter et retirer un supplément", () => {
  let cat = catalogueSupplements([]);
  cat = ajouterSupplement(cat, "Garde-meuble");
  assert.equal(cat.length, 1);
  assert.equal(cat[0].libelle, "Garde-meuble");
  cat = retirerSupplement(cat, cat[0].cle);
  assert.equal(cat.length, 0);
});

test("seuls les suppléments cochés (quantité > 0) sont retenus", () => {
  const retenus = supplementsRetenus(CATALOGUE, { piano: 1, cave: 0 });
  assert.equal(retenus.length, 1);
  assert.equal(retenus[0].cle, "piano");
});

test("un supplément inactif n'est jamais retenu, même coché", () => {
  const retenus = supplementsRetenus(CATALOGUE, { vieux: 2 });
  assert.equal(retenus.length, 0, "un supplément retiré du catalogue ne s'applique plus");
});

test("la quantité multiplie le montant", () => {
  const retenus = supplementsRetenus(CATALOGUE, { piano: 2, etage_sans_asc: 3 });
  const piano = retenus.find((s) => s.cle === "piano");
  assert.equal(piano.total_centimes, 30000, "2 pianos");
  const etage = retenus.find((s) => s.cle === "etage_sans_asc");
  assert.equal(etage.total_centimes, 9000, "3 étages");
});

test("total des suppléments retenus", () => {
  assert.equal(totalSupplements(CATALOGUE, { piano: 1, cave: 1 }), 23000);
  assert.equal(totalSupplements(CATALOGUE, {}), 0);
});

test("le libellé de ligne mentionne la quantité quand c'est pertinent", () => {
  const [piano] = supplementsRetenus(CATALOGUE, { piano: 2 });
  assert.match(libelleLigne(piano), /2/);
  const [cave] = supplementsRetenus(CATALOGUE, { cave: 1 });
  assert.equal(libelleLigne(cave), "Cave difficile", "forfait : pas de quantité affichée");
});

// — Intégration avec le moteur de chiffrage —
test("le moteur additionne les suppléments retenus au prix", () => {
  const faits = { formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 20 };
  const bareme = { 3: 130 };
  const tarifs = { elevateur: 150, km_facture: 1, emballage_horaire: 75, emballage_km: 0.75 };

  const sans = calculerScenario(faits, {}, { bareme, tarifs });
  const avec = calculerScenario(
    { ...faits, supplements: supplementsRetenus(CATALOGUE, { piano: 1 }) },
    {}, { bareme, tarifs });
  // Le prix HTVA augmente exactement du montant du supplément (150 €).
  assert.equal(avec.htva_centimes - sans.htva_centimes, 15000);
});

test("un montant de supplément absent ne casse pas le chiffrage (jamais NaN)", () => {
  const faits = { formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 0,
                  supplements: [{ libelle: "Cassé", quantite: 1 }] };
  const r = calculerScenario(faits, {}, { bareme: { 3: 130 }, tarifs: { km_facture: 1 } });
  assert.ok(Number.isFinite(r.htva_centimes));
});

test("les unités pluralisables sont marquées comme telles", () => {
  assert.equal(UNITES_SUPPLEMENT.find((u) => u.cle === "forfait").pluralisable, false);
  assert.equal(UNITES_SUPPLEMENT.find((u) => u.cle === "unite").pluralisable, true);
});
