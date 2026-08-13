// =============================================================================
// Repères de localisation — zones et boxes.
//
// Deux pièges centraux testés ici :
//   1. z = 0 est une position RÉELLE (le sol). Le confondre avec « non
//      renseigné » ferait apparaître au sol tout ce qui n'a pas de repère.
//      Même famille de bug que Number(null) === 0.
//   2. Les axes appartiennent à l'ORGANISATION. Rien ne doit être en dur :
//      ni le libellé, ni les bornes, ni le format.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  AXES_DEFAUT, axes, repereDe, repereVersChamps, repereVide, valeurAxe,
  formaterRepere, decrireRepere, repereRecevable, valeursAxe, collisions,
  etendue,
} from "../src/stocks/repere.js";

/* ── Les axes de l'organisation ─────────────────────────────────────────── */

test("sans réglage, on retombe sur allée / rangée / étage", () => {
  const A = axes(null);
  assert.equal(A.x.libelle, "Allée");
  assert.equal(A.y.libelle, "Rangée");
  assert.equal(A.z.libelle, "Étage");
  assert.equal(A.x.format, "lettre");
});

test("l'organisation impose ses libellés, ses formats et ses bornes", () => {
  const A = axes({
    x: { libelle: "Travée", format: "nombre", min: 1, max: 3 },
    y: { libelle: "Bloc", format: "lettre", min: 1, max: 5 },
    z: { libelle: "Palier", format: "nombre", min: 0, max: 2 },
  });
  assert.equal(A.x.libelle, "Travée");
  assert.equal(A.x.format, "nombre");
  assert.equal(A.y.format, "lettre");
  assert.equal(A.z.max, 2);
  // Le format suit l'axe, pas une position figée : ici c'est y qui est lettré.
  assert.equal(valeurAxe(2, A.x), "2");
  assert.equal(valeurAxe(2, A.y), "B");
});

test("un réglage incomplet est complété, jamais laissé indéfini", () => {
  const A = axes({ x: { libelle: "Travée" } });
  assert.equal(A.x.libelle, "Travée");
  assert.equal(A.x.format, AXES_DEFAUT.x.format);   // hérité du repli
  assert.equal(A.y.libelle, "Rangée");
});

test("un max sous le min ne rend pas l'axe inutilisable", () => {
  const A = axes({ z: { libelle: "Étage", min: 3, max: 1 } });
  assert.equal(A.z.max, 3);
  assert.ok(A.z.max >= A.z.min);
});

/* ── L'asymétrie box / zone ─────────────────────────────────────────────── */

test("un box prend son z dans `niveau`, une zone dans `pos_z`", () => {
  const box = { pos_x: 2, pos_y: 12, niveau: 3, pos_z: 99 };
  assert.deepEqual(repereDe(box, "box"), { x: 2, y: 12, z: 3 });

  const zone = { pos_x: 1, pos_y: 4, pos_z: 2, niveaux: 5 };
  assert.deepEqual(repereDe(zone, "zone"), { x: 1, y: 4, z: 2 });
  // `niveaux` est un NOMBRE de niveaux : jamais une position.
  assert.notEqual(repereDe(zone, "zone").z, zone.niveaux);
});

test("le retour vers la base respecte la forme de chaque table", () => {
  assert.deepEqual(repereVersChamps({ x: 2, y: 3, z: 1 }, "box"),
    { pos_x: 2, pos_y: 3, niveau: 1 });
  assert.deepEqual(repereVersChamps({ x: 2, y: 3, z: 1 }, "zone"),
    { pos_x: 2, pos_y: 3, pos_z: 1 });
  assert.equal(repereVersChamps({ x: 1, y: 1 }, "box").niveau, 0);  // NOT NULL
  assert.equal(repereVersChamps({ x: 1, y: 1 }, "zone").pos_z, null); // nullable
});

/* ── Le piège du zéro ───────────────────────────────────────────────────── */

test("z = 0 est l'étage du sol, pas « non renseigné »", () => {
  const r = repereDe({ pos_x: 1, pos_y: 1, niveau: 0 }, "box");
  assert.equal(r.z, 0);
  assert.equal(repereVide(r), false);
  assert.match(decrireRepere(r), /étage 0/);
});

test("l'absence reste nulle et ne devient jamais zéro", () => {
  const r = repereDe({ pos_x: null, pos_y: "", pos_z: undefined }, "zone");
  assert.deepEqual(r, { x: null, y: null, z: null });
  assert.equal(repereVide(r), true);
  assert.equal(formaterRepere(r), "");
  assert.equal(decrireRepere(r), "Pas de repère");
});

/* ── Lecture ────────────────────────────────────────────────────────────── */

test("le repère court se lit d'un coup d'œil", () => {
  assert.equal(formaterRepere({ x: 2, y: 12, z: 2 }), "B12 · É2");
  assert.equal(formaterRepere({ x: 2, y: 12, z: 0 }), "B12 · É0");
  // Ce qui manque est omis, pas remplacé par un point d'interrogation.
  assert.equal(formaterRepere({ x: 2, y: null, z: null }), "B");
  assert.equal(formaterRepere({ x: null, y: 7, z: null }), "7");
});

test("l'initiale du 3e axe suit le libellé de l'organisation", () => {
  const reglage = { z: { libelle: "Palier", format: "nombre", min: 0, max: 3 } };
  assert.equal(formaterRepere({ x: 1, y: 5, z: 2 }, reglage), "A5 · P2");
});

test("la description reprend le vocabulaire de l'organisation", () => {
  const reglage = { x: { libelle: "Travée", format: "nombre", min: 1, max: 9 } };
  assert.match(decrireRepere({ x: 3, y: null, z: null }, reglage), /travée 3/);
});

/* ── Bornes déclarées ───────────────────────────────────────────────────── */

test("un repère hors de ce que l'organisation a déclaré est refusé", () => {
  const reglage = {
    x: { libelle: "Allée", format: "lettre", min: 1, max: 3 },
    z: { libelle: "Étage", format: "nombre", min: 0, max: 2 },
  };
  assert.equal(repereRecevable({ x: null, y: null, z: null }, reglage).ok, true);
  assert.equal(repereRecevable({ x: 3, y: 10, z: 0 }, reglage).ok, true);

  const allee = repereRecevable({ x: 4, y: 1, z: 1 }, reglage);
  assert.equal(allee.ok, false);
  // Le message dit les bornes RÉELLES, dans le format de l'axe.
  assert.match(allee.message, /Allée/);
  assert.match(allee.message, /A/);
  assert.match(allee.message, /C/);

  assert.equal(repereRecevable({ x: 1, y: 1, z: 3 }, reglage).ok, false);
});

test("on peut proposer les positions qui existent vraiment", () => {
  const A = axes({ x: { libelle: "Allée", format: "lettre", min: 1, max: 3 } });
  assert.deepEqual(valeursAxe(A.x).map((v) => v.libelle), ["A", "B", "C"]);
  const z = axes({ z: { libelle: "Étage", format: "nombre", min: 0, max: 2 } }).z;
  assert.deepEqual(valeursAxe(z).map((v) => v.valeur), [0, 1, 2]);
});

/* ── Collisions et plan ─────────────────────────────────────────────────── */

test("deux entités au même repère dans un même centre sont signalées", () => {
  const boxes = [
    { id: "a", centre_id: "c1", pos_x: 1, pos_y: 1, niveau: 0 },
    { id: "b", centre_id: "c1", pos_x: 1, pos_y: 1, niveau: 0 },
    { id: "c", centre_id: "c2", pos_x: 1, pos_y: 1, niveau: 0 }, // autre centre
    { id: "d", centre_id: "c1", pos_x: null, pos_y: null, niveau: 0 },
  ];
  const d = collisions(boxes, "box");
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].entites.map((e) => e.id), ["a", "b"]);
});

test("le plan couvre le dépôt déclaré, élargi si des données débordent", () => {
  const reglage = {
    x: { libelle: "Allée", format: "lettre", min: 1, max: 4 },
    y: { libelle: "Rangée", format: "nombre", min: 1, max: 6 },
  };
  // Rien ne déborde : on dessine le dépôt tel que déclaré.
  assert.deepEqual(etendue([], "zone", reglage), { xMax: 4, yMax: 6 });
  // Un box hors cadre (dépôt réduit après coup) reste visible.
  assert.deepEqual(
    etendue([{ pos_x: 7, pos_y: 2 }], "zone", reglage), { xMax: 7, yMax: 6 });
});
