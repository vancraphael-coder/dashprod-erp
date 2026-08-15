// =============================================================================
// Mode nuit — garde-fou statique.
//
// Ces bugs avaient tous la MÊME cause : des couleurs écrites en dur, pensées
// pour un fond clair, invisibles ou aveuglantes sur un fond presque noir.
//
// Pourquoi un test STATIQUE plutôt qu'un test de rendu : `apparence.js` vit
// dans `apps/web` et importe l'alias `@domaine`, que seul Vite résout — un
// import direct depuis la suite domaine échoue. Or c'est exactement le genre
// de régression qu'aucun build ni aucun test d'exécution ne signale : elle ne
// se voit qu'à l'œil, en nuit, sur l'écran concerné. D'où la lecture des
// sources, dans la lignée d'`imports-ecrans.test.js`.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ICI, "../../../apps/web/src");
const lire = (p) => fs.readFileSync(path.join(WEB, p), "utf8");

/** Retire commentaires de ligne et de bloc : seul le code exécuté compte. */
const sansCommentaires = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/* ── La profondeur des cartes ───────────────────────────────────────────── */

test("de nuit, la profondeur ne repose plus sur une ombre noire", () => {
  // Le bug : `0 18px 40px -28px rgba(0,0,0,.9)` sur un fond #070B18 presque
  // noir. Une ombre noire sur du noir ne se voit pas : les trois profondeurs
  // rendaient une carte identique.
  const src = lire("lib/apparence.js");
  assert.equal(src.includes("rgba(0,0,0,.9)"), false,
    "l'ombre noire quasi opaque ne produit aucune profondeur en nuit");
  assert.equal(src.includes("rgba(0,0,0,.95)"), false);
});

test("de nuit, chaque profondeur a sa propre surface", () => {
  // La correction : sur fond sombre, l'élévation se lit à la LUMINANCE.
  const src = lire("lib/apparence.js");
  const debut = src.indexOf("const paliers");
  assert.ok(debut > 0, "le tableau des paliers de nuit doit exister");
  const bloc = src.slice(debut, src.indexOf("};", debut));
  for (const palier of ["plat:", "relief:", "flottant:"]) {
    assert.ok(bloc.includes(palier), `palier ${palier} manquant`);
  }
  // Trois teintes hautes distinctes : sans quoi rien ne se distingue.
  const hauts = [...bloc.matchAll(/haut:\s*"(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
  assert.equal(hauts.length, 3);
  assert.equal(new Set(hauts).size, 3, "les trois profondeurs doivent différer");

  // Et elles montent : plat < relief < flottant.
  const clarte = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16)
                      + parseInt(h.slice(5, 7), 16);
  assert.ok(clarte(hauts[0]) < clarte(hauts[1]), "relief doit être plus clair que plat");
  assert.ok(clarte(hauts[1]) < clarte(hauts[2]), "flottant doit être plus clair que relief");
});

test("de jour, la profondeur reste une ombre portée", () => {
  // On ne casse pas ce qui fonctionnait.
  const src = lire("lib/apparence.js");
  assert.ok(src.includes("rgba(15,23,42,.28)"));
  assert.ok(src.includes("rgba(15,23,42,.38)"));
});

/* ── Le planning ────────────────────────────────────────────────────────── */

test("le planning n'écrit plus de pastel clair en dur", () => {
  // Chacune de ces teintes posait un rectangle clair sur le fond nuit, et
  // rendait l'encre — quasi blanche en nuit — illisible par-dessus.
  // On retire les commentaires avant d'inspecter : ils CITENT les couleurs
  // fautives pour expliquer le bug, et ne doivent pas déclencher le garde-fou.
  const src = sansCommentaires(lire("ecrans/Planning.jsx"));
  const interdites = ["#FEF2F2", "#FFFBEB", "#F5F3FF", "#E7EFFC",
                      "#DDD6FE", "#FDE68A", "#FECACA", "#F3C7C7", "#F1F5F9"];
  const trouvees = interdites.filter((c) => src.includes(c));
  assert.deepEqual(trouvees, [],
    `couleurs claires en dur : ${trouvees.join(", ")} — passer par un jeton`);
});

test("la couleur du congé suit le réglage d'Apparence", () => {
  // `C.violet` était un jeton FIGÉ : le réglage « Congé approuvé » d'Apparence
  // était purement décoratif, le planning ne le lisait jamais.
  const src = sansCommentaires(lire("ecrans/Planning.jsx"));
  assert.equal(src.includes("C.violet"), false,
    'le congé doit venir de couleurPlanning("conge"), pas d\'un jeton figé');
  assert.ok(src.includes('couleurPlanning("conge")'));
  assert.ok(src.includes("couleurPlanning") && src.includes("../lib/theme.jsx"));
});

test("Apparence propose bien congé demandé ET congé approuvé", () => {
  // La distinction servira au lot 5 : une demande non traitée ne doit pas
  // s'afficher comme une absence acquise.
  const src = lire("lib/apparence.js");
  const bloc = src.slice(src.indexOf('cle: "planning"'), src.indexOf('couleurUtilite'));
  assert.ok(bloc.includes('cle: "conge"'));
  assert.ok(bloc.includes('cle: "demande"'));
});
