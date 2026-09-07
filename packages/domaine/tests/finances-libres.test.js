// =============================================================================
// PILOTAGE FINANCIER LIBRE — recettes, dépenses, % sur recettes, reste.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  pourcentDesRecettes, bilanFinancier, santeFinanciere, CATEGORIES_DEPENSE,
} from "../src/pilotage/finances-libres.js";

test("le pourcentage sur recettes est arrondi et protégé de la division par 0", () => {
  assert.equal(pourcentDesRecettes(2500, 10000), 25);
  assert.equal(pourcentDesRecettes(833, 10000), 8.3);
  assert.equal(pourcentDesRecettes(5000, 0), 0);     // recettes nulles → 0, pas ∞
  assert.equal(pourcentDesRecettes(5000, null), 0);
});

test("le bilan ventile par catégorie, du poste le plus lourd au plus léger", () => {
  const b = bilanFinancier({
    recettes_centimes: 1000000,           // 10 000 €
    depenses: [
      { categorie: "carburant", montant_centimes: 80000 },
      { categorie: "salaires", montant_centimes: 400000 },
      { categorie: "carburant", montant_centimes: 20000 },   // même cat → cumul
    ],
  });
  assert.equal(b.depenses_centimes, 500000);
  assert.equal(b.postes[0].categorie, "salaires");     // le plus lourd d'abord
  assert.equal(b.postes[0].pct_recettes, 40);
  assert.equal(b.postes[1].categorie, "carburant");
  assert.equal(b.postes[1].montant_centimes, 100000);  // cumulé
  assert.equal(b.postes[1].pct_recettes, 10);
  // Le reste : 10 000 − 5 000 = 5 000, soit 50 %.
  assert.equal(b.reste_centimes, 500000);
  assert.equal(b.pct_reste, 50);
});

test("les dettes (non réglées) sont isolées du total", () => {
  const b = bilanFinancier({
    recettes_centimes: 100000,
    depenses: [
      { categorie: "loyer", montant_centimes: 30000, regle: true },
      { categorie: "entretien", montant_centimes: 20000, regle: false },  // dette
    ],
  });
  assert.equal(b.depenses_centimes, 50000);
  assert.equal(b.dettes_centimes, 20000);              // seule la non réglée
});

test("la santé se dit sans détour quand ça va mal", () => {
  // Dépenses > recettes = critique.
  const rouge = santeFinanciere(bilanFinancier({
    recettes_centimes: 10000,
    depenses: [{ categorie: "divers", montant_centimes: 15000 }],
  }));
  assert.equal(rouge.niveau, "critique");
  assert.match(rouge.message, /dépassent/);
  // Il reste peu = attention.
  const orange = santeFinanciere(bilanFinancier({
    recettes_centimes: 100000,
    depenses: [{ categorie: "divers", montant_centimes: 95000 }],
  }));
  assert.equal(orange.niveau, "attention");
  // Sain = ok, pas de message.
  const vert = santeFinanciere(bilanFinancier({
    recettes_centimes: 100000,
    depenses: [{ categorie: "divers", montant_centimes: 40000 }],
  }));
  assert.equal(vert.niveau, "ok");
  assert.equal(vert.message, null);
});

test("une dette qui dépasse les recettes de la période est critique", () => {
  const b = bilanFinancier({
    recettes_centimes: 50000,
    depenses: [{ categorie: "materiel", montant_centimes: 60000, regle: false }],
  });
  const s = santeFinanciere(b);
  assert.equal(s.niveau, "critique");
});

test("les catégories proposées existent et « divers » est le refuge", () => {
  const cles = CATEGORIES_DEPENSE.map((c) => c.cle);
  assert.ok(cles.includes("carburant"));
  assert.ok(cles.includes("salaires"));
  assert.ok(cles.includes("divers"), "il faut toujours un refuge de catégorie");
});

/* ── La boîte à facturer est accessible (tuile de réglages) ──────────────── */

import { readFileSync as _rf } from "node:fs";
import { join as _j, dirname as _d } from "node:path";
import { fileURLToPath as _f } from "node:url";

test("la tuile « Dépenses & dettes » existe dans les réglages", () => {
  const reglages = _rf(_j(_d(_f(import.meta.url)),
    "..", "src", "organisation", "reglages.js"), "utf8");
  assert.match(reglages, /cle: "depenses"/);
  assert.match(reglages, /Dépenses & dettes/);
  // Sous le même module que la comptabilité : c'est du pilotage financier.
  assert.match(reglages, /cle: "depenses",[\s\S]*?module: "comptabilite"/);
});
