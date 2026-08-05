// =============================================================================
// Garde-fous statiques — deux classes d'erreur qui ne se voient NI aux tests
// unitaires (l'écran n'est pas exécuté) NI au build (Rollup ne bronche pas sur
// un identifiant libre). Elles se manifestent par un plantage à l'ouverture.
//
// Toutes deux ont été payées : une route posée dans la mauvaise coquille
// (rapports/journal côté terrain, où `ecran` et `retourDossier` n'existent
// pas), et une variable utilisée sans être déclarée (`cli` dans composerOffre).
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const RACINE = new URL("../../..", import.meta.url).pathname;
const lire = (p) => readFileSync(RACINE + p, "utf8");

test("chaque coquille n'affecte QUE sa propre variable de vue", () => {
  // AppTerrain construit `vue`, l'app bureau construit `ecran`. Mélanger les
  // deux met une route dans un scope où sa variable n'existe pas — plantage
  // à l'ouverture de l'écran, jamais avant.
  const src = lire("apps/web/src/main.jsx");

  const debutTerrain = src.indexOf("function AppTerrain");
  const finTerrain = src.indexOf("function App(", debutTerrain);
  assert.ok(debutTerrain > 0 && finTerrain > debutTerrain, "coquilles introuvables");

  const terrain = src.slice(debutTerrain, finTerrain);
  const bureau = src.slice(finTerrain);

  const fautesTerrain = [...terrain.matchAll(/^\s*ecran\s*=/gm)];
  assert.equal(fautesTerrain.length, 0,
    "AppTerrain assigne `ecran`, qui n'existe que dans l'app bureau");

  const fautesBureau = [...bureau.matchAll(/^\s*vue\s*=/gm)];
  assert.equal(fautesBureau.length, 0,
    "l'app bureau assigne `vue`, qui n'existe que dans AppTerrain");
});

test("les routes d'un dossier vivent dans la coquille bureau", () => {
  const src = lire("apps/web/src/main.jsx");
  const finTerrain = src.indexOf("function App(");
  const bureau = src.slice(finTerrain);
  for (const route of ["rapports", "journal", "releve", "devis", "offre", "facture"]) {
    assert.ok(bureau.includes(`route.ecran === "${route}"`),
      `la route ${route} devrait être dans la coquille bureau`);
  }
});

test("aucune variable utilisée sans être déclarée dans l'adaptateur", () => {
  // `cli?.civilite` a été écrit alors que `cli` n'était pas dans le scope :
  // le build passe, l'appel échoue à l'exécution.
  const src = lire("apps/web/src/lib/adaptateur.js");
  const fautes = [];

  for (const m of src.matchAll(/export async function (\w+)\(([^)]*)\)\s*\{/g)) {
    const nom = m[1];
    // Corps de la fonction : jusqu'au prochain export de premier niveau.
    const suite = src.indexOf("\nexport ", m.index + 10);
    const corps = src.slice(m.index, suite === -1 ? src.length : suite);

    // Noms disponibles : paramètres + déclarations locales (dont
    // déstructurations) + tout ce qui est importé ou défini au module.
    const dispo = new Set();
    for (const p of m[2].split(",")) {
      const n = p.trim().split(/[=:{}[\]\s]/)[0];
      if (/^[A-Za-z_$][\w$]*$/.test(n)) dispo.add(n);
    }
    for (const d of corps.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
      dispo.add(d[1]);
    }
    for (const d of corps.matchAll(/(?:const|let|var)\s*[[{]([^\]}]*)[\]}]/g)) {
      for (const part of d[1].split(",")) {
        const n = part.trim().split(":").pop().replace(/^\.\.\./, "").trim();
        if (/^[A-Za-z_$][\w$]*$/.test(n)) dispo.add(n);
      }
    }

    // Variables courtes très typiques d'un oubli de scope, utilisées avec `?.`
    for (const u of corps.matchAll(/(?<![.\w$])(cli|org|contact|affaire|textes|inventaire)\?\./g)) {
      if (!dispo.has(u[1])) fautes.push(`${nom}() → ${u[1]}`);
    }
  }

  assert.deepEqual([...new Set(fautes)], [],
    "variable(s) utilisée(s) sans déclaration — échec à l'exécution seulement");
});
