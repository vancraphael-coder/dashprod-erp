// =============================================================================
// LE RAPPORT TRI-CADENCE — fenêtres jour/semaine/mois, historique.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  CADENCES, cadence, fenetre, dansFenetre, rapportTexteValide, historiqueRange,
} from "../src/organisation/rapport-centre.js";

test("les trois cadences existent, du plus fin au plus large", () => {
  assert.deepEqual(CADENCES.map((c) => c.cle), ["jour", "semaine", "mois"]);
  assert.equal(cadence("mois").titre, "Mois");
  assert.equal(cadence("inconnue"), null);
});

test("la fenêtre JOUR couvre exactement un jour, fin exclusive", () => {
  const f = fenetre("jour", "2026-08-27");
  assert.equal(f.debut, "2026-08-27");
  assert.equal(f.fin, "2026-08-28");
});

test("la fenêtre SEMAINE commence un LUNDI (semaine belge)", () => {
  // CE QUI CASSE SANS CE TEST : une semaine qui démarre le dimanche décalerait
  // tout le rapport hebdo d'un jour. 27/08/2026 est un jeudi → lundi = 24/08.
  const f = fenetre("semaine", "2026-08-27");
  assert.equal(f.debut, "2026-08-24", "lundi");
  assert.equal(f.fin, "2026-08-31", "lundi suivant, exclusif");
  // Un lundi doit rester le début de sa propre semaine, pas reculer de 7 jours.
  assert.equal(fenetre("semaine", "2026-08-24").debut, "2026-08-24");
  // Un dimanche appartient à la semaine qui a commencé le lundi d'avant.
  assert.equal(fenetre("semaine", "2026-08-30").debut, "2026-08-24");
});

test("la fenêtre MOIS couvre du 1er au 1er suivant", () => {
  const f = fenetre("mois", "2026-08-27");
  assert.equal(f.debut, "2026-08-01");
  assert.equal(f.fin, "2026-09-01");
  assert.match(f.titre, /Août 2026/);
  // Décembre bascule bien sur janvier de l'année suivante.
  assert.equal(fenetre("mois", "2026-12-15").fin, "2027-01-01");
});

test("dansFenetre : borne de fin EXCLUSIVE, pas de double comptage", () => {
  const f = fenetre("semaine", "2026-08-27");   // 24/08 → 31/08
  assert.equal(dansFenetre("2026-08-24", f), true, "le lundi est dedans");
  assert.equal(dansFenetre("2026-08-30", f), true, "le dimanche est dedans");
  assert.equal(dansFenetre("2026-08-31", f), false, "le lundi suivant est DEHORS");
  assert.equal(dansFenetre("2026-08-23", f), false, "la veille est dehors");
});

test("un rapport texte vide est refusé", () => {
  assert.equal(rapportTexteValide("").ok, false);
  assert.equal(rapportTexteValide("  ").ok, false);
  assert.equal(rapportTexteValide("ok").ok, false, "trop court");
  const bon = rapportTexteValide("  Tout s'est bien passé.  ");
  assert.equal(bon.ok, true);
  assert.equal(bon.texte, "Tout s'est bien passé.", "rogné aux extrémités");
});

test("l'historique se range du plus récent au plus ancien", () => {
  const h = historiqueRange([
    { texte: "vieux", redige_le: "2026-08-01T10:00:00Z" },
    { texte: "récent", redige_le: "2026-08-27T10:00:00Z" },
    { texte: "moyen", redige_le: "2026-08-15T10:00:00Z" },
  ]);
  assert.deepEqual(h.map((e) => e.texte), ["récent", "moyen", "vieux"]);
});
