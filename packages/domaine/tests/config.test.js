// Tests — Garde de configuration d'environnement.
// Critique : sans config, l'app doit rester stable et le dire clairement
// (prévention du bug d'écran blanc rencontré dans les prototypes).

import { test } from "node:test";
import assert from "node:assert/strict";

import { configPresente, interpreterEtatConnexion } from "../src/commun/config.js";

test("configPresente exige les deux variables non vides", () => {
  assert.equal(configPresente("https://x.supabase.co", "cle"), true);
  assert.equal(configPresente("https://x.supabase.co", ""), false);
  assert.equal(configPresente("", "cle"), false);
  assert.equal(configPresente(undefined, undefined), false);
  assert.equal(configPresente(null, "cle"), false);
});

test("état non configuré : message clair, ok=false", () => {
  const r = interpreterEtatConnexion({ configuree: false });
  assert.equal(r.ok, false);
  assert.match(r.message, /non configuré/);
});

test("état configuré mais requête refusée : ok=false avec la raison", () => {
  const r = interpreterEtatConnexion({ configuree: true, erreur: "permission denied" });
  assert.equal(r.ok, false);
  assert.match(r.message, /permission denied/);
});

test("état configuré, base joignable, aucune ligne : ok=true (connexion requise)", () => {
  const r = interpreterEtatConnexion({ configuree: true, lignes: 0 });
  assert.equal(r.ok, true);
  assert.match(r.message, /connexion requise/);
});

test("état configuré, base joignable avec données : ok=true", () => {
  const r = interpreterEtatConnexion({ configuree: true, lignes: 1 });
  assert.equal(r.ok, true);
  assert.match(r.message, /joignable/);
});
