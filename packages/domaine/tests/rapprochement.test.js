// =============================================================================
// LE RAPPROCHEMENT (vague 1, lot C) — d'une communication à sa facture.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { genererOGM } from "../src/facturation/ogm.js";
import {
  decomposerOGM, cleDepuisCommunication, rapprocherCommunication,
} from "../src/facturation/rapprochement.js";

test("decomposerOGM est l'inverse exact de genererOGM", () => {
  for (const [a, s] of [[2026, 1], [2026, 42], [2025, 123456], [2026, 97]]) {
    const ogm = genererOGM(s, a);
    assert.deepEqual(decomposerOGM(ogm), { annee: a, sequence: s });
  }
});

test("decomposerOGM refuse une OGM corrompue", () => {
  assert.equal(decomposerOGM("+++202/6000/00193+++"), null); // clé fausse
  assert.equal(decomposerOGM("n'importe quoi"), null);
  assert.equal(decomposerOGM(""), null);
});

test("cleDepuisCommunication lit l'OGM ET le numéro libre", () => {
  assert.deepEqual(cleDepuisCommunication(genererOGM(42, 2026)), { annee: 2026, sequence: 42 });
  assert.deepEqual(cleDepuisCommunication("2026-000042"), { annee: 2026, sequence: 42 });
  assert.equal(cleDepuisCommunication("bricole"), null);
});

test("rapprocher trouve la facture par communication stockée (cas normal)", () => {
  const ogm = genererOGM(7, 2026);
  const factures = [
    { id: "a", numero: "2026-000007", communication: ogm },
    { id: "b", numero: "2026-000008", communication: genererOGM(8, 2026) },
  ];
  const r = rapprocherCommunication(ogm, factures);
  assert.equal(r.facture.id, "a");
  assert.equal(r.motif, "communication");
});

test("rapprocher rattrape une ancienne facture par le numéro", () => {
  // Facture émise avant le lot B : pas de communication stockée. On retombe sur
  // la reconstruction depuis le numéro.
  const ogm = genererOGM(7, 2026);
  const factures = [{ id: "a", numero: "2026-000007", communication: null }];
  const r = rapprocherCommunication(ogm, factures);
  assert.equal(r.facture.id, "a");
  assert.equal(r.motif, "numero");
});

test("rapprocher signale introuvable et illisible sans se tromper", () => {
  const factures = [{ id: "a", numero: "2026-000007", communication: genererOGM(7, 2026) }];
  assert.equal(rapprocherCommunication(genererOGM(999, 2026), factures).motif, "introuvable");
  assert.equal(rapprocherCommunication("", factures).motif, "illisible");
  assert.equal(rapprocherCommunication("xyz", factures).motif, "illisible");
});

test("rapprocher ne devine JAMAIS en cas d'ambiguïté", () => {
  // Deux factures avec la même communication (ne devrait pas arriver, mais on
  // refuse plutôt que de rapprocher au hasard).
  const ogm = genererOGM(7, 2026);
  const factures = [
    { id: "a", numero: "2026-000007", communication: ogm },
    { id: "b", numero: "2026-000009", communication: ogm },
  ];
  assert.equal(rapprocherCommunication(ogm, factures).motif, "ambigu");
});
