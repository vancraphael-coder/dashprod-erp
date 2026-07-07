// Tests — Documents & Signature : instances immuables (C-02) et C.B.D. (S6).
// Parties critiques : intégrité prouvable des documents et protection juridique.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  serialiserStable, empreinte, figerInstance, instanceIntacte,
} from "../src/documents/instances.js";
import {
  versionModeleActive, exigeCbd, resoudreCbd,
} from "../src/documents/modeles.js";

// --- Empreinte déterministe --------------------------------------------------

test("serialiserStable est insensible à l'ordre des clés", () => {
  const a = serialiserStable({ x: 1, y: 2 });
  const b = serialiserStable({ y: 2, x: 1 });
  assert.equal(a, b);
});

test("même contenu → même empreinte ; contenu différent → empreinte différente", () => {
  const c1 = { client: "Roovers", montant: 94380 };
  const c2 = { montant: 94380, client: "Roovers" }; // ordre inversé
  const c3 = { client: "Roovers", montant: 94381 }; // 1 centime de plus
  assert.equal(empreinte(c1), empreinte(c2));
  assert.notEqual(empreinte(c1), empreinte(c3));
});

test("l'empreinte est une chaîne hexadécimale stable", () => {
  const e = empreinte({ a: 1 });
  assert.match(e, /^[0-9a-f]{8}$/);
  assert.equal(e, empreinte({ a: 1 })); // reproductible
});

// --- Instance immuable (C-02) ------------------------------------------------

test("figerInstance produit une instance gelée avec empreinte", () => {
  const inst = figerInstance({
    modeleVersionId: "m1", contenu: { total: 94380 }, horodatage: "2026-07-05T10:00:00Z",
  });
  assert.equal(inst.statut, "generee");
  assert.equal(inst.modeleVersionId, "m1");
  assert.equal(typeof inst.empreinte, "string");
  assert.equal(instanceIntacte(inst), true);
});

test("INVARIANT : une instance figée ne peut plus être mutée (C-02)", () => {
  "use strict";
  const inst = figerInstance({
    modeleVersionId: "m1", contenu: { total: 94380 }, horodatage: "2026-07-05T10:00:00Z",
  });
  // Object.freeze : toute écriture échoue silencieusement (ou lève en strict).
  assert.throws(() => { inst.statut = "modifie"; }, TypeError);
  assert.equal(inst.statut, "generee");
});

test("instanceIntacte détecte une altération du contenu", () => {
  const inst = figerInstance({
    modeleVersionId: "m1", contenu: { total: 94380 }, horodatage: "2026-07-05T10:00:00Z",
  });
  // On simule une instance trafiquée (empreinte ne correspondant plus).
  const trafiquee = { ...inst, contenu: { total: 99999 } };
  assert.equal(instanceIntacte(trafiquee), false);
});

test("figerInstance exige modèle et horodatage", () => {
  assert.throws(() => figerInstance({ contenu: {}, horodatage: "x" }), /modeleVersionId requis/);
  assert.throws(() => figerInstance({ modeleVersionId: "m1", contenu: {} }), /horodatage requis/);
});

test("une offre fige la version C.B.D. jointe", () => {
  const inst = figerInstance({
    modeleVersionId: "offre_v2", cbdVersionId: "cbd_v3",
    contenu: { total: 94380 }, horodatage: "2026-07-05T10:00:00Z",
  });
  assert.equal(inst.cbdVersionId, "cbd_v3");
});

// --- Modèles versionnés ------------------------------------------------------

const MODELES = [
  { id: "of1", type: "offre_tarifaire", version: 1, actif: false, langue: "fr", juridiction: "BE", publie_le: "2026-01-01" },
  { id: "of2", type: "offre_tarifaire", version: 2, actif: true,  langue: "fr", juridiction: "BE", publie_le: "2026-06-01" },
  { id: "cbd2", type: "cbd", version: 2, actif: false, langue: "fr", juridiction: "BE", publie_le: "2026-01-01" },
  { id: "cbd3", type: "cbd", version: 3, actif: true,  langue: "fr", juridiction: "BE", publie_le: "2026-06-01" },
];

test("versionModeleActive prend la version active la plus haute", () => {
  assert.equal(versionModeleActive(MODELES, "offre_tarifaire").id, "of2");
});

// --- C.B.D. : protection juridique (S6) --------------------------------------

test("exigeCbd : les offres oui, la facture non", () => {
  assert.equal(exigeCbd("offre_tarifaire"), true);
  assert.equal(exigeCbd("offre_emballage"), true);
  assert.equal(exigeCbd("offre_forfait"), true);
  assert.equal(exigeCbd("facture"), false);
});

test("resoudreCbd joint la C.B.D. active à une offre", () => {
  const r = resoudreCbd(MODELES, "offre_tarifaire");
  assert.equal(r.requise, true);
  assert.equal(r.cbdVersionId, "cbd3"); // version active
  assert.equal(r.erreur, null);
});

test("INVARIANT : une offre sans C.B.D. active est refusée (protection juridique)", () => {
  const sansCbd = MODELES.filter((m) => m.type !== "cbd");
  const r = resoudreCbd(sansCbd, "offre_tarifaire");
  assert.equal(r.requise, true);
  assert.equal(r.cbdVersionId, null);
  assert.equal(r.erreur, "cbd_active_absente");
});

test("resoudreCbd n'impose rien à une facture", () => {
  const r = resoudreCbd(MODELES, "facture");
  assert.equal(r.requise, false);
  assert.equal(r.cbdVersionId, null);
});
