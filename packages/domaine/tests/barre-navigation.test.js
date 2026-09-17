// =============================================================================
// AUCUNE BARRE NE PORTE DEUX FOIS LA MÊME ICÔNE.
//
// CE QUI CASSE SANS CE TEST : deux boutons au même dessin dans la même barre.
// C'est un bouton qu'on ne trouve pas — et sur un téléphone, avec des gants,
// on ne lit pas les libellés, on visse le doigt sur la forme.
//
// Trois défauts réels en deux jours : `terrain` absent de la table d'icônes
// (retombait sur « dossiers », déjà pris), `ma_journee` et `mes_missions`
// pointant vers des tracés inexistants (boutons sans icône), et
// `rituel_coordination` sur « planning » alors que l'entrée voisine l'utilisait
// déjà. Aucun n'aurait été vu par un test d'unité — ils se voient sur l'écran
// ou pas du tout. D'où la lecture du fichier source.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { POSTURES, navigationDeLaPosture } from "../src/produit/postures.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = readFileSync(join(RACINE, "apps", "web", "src", "main.jsx"), "utf8");

/** La table d'icônes, lue dans la source : une seule vérité, pas une copie. */
function traces() {
  const bloc = SRC.match(/const TRACE_NAV = \{([\s\S]*?)\};/);
  assert.ok(bloc, "TRACE_NAV introuvable dans main.jsx");
  return Object.fromEntries(
    [...bloc[1].matchAll(/(\w+):\s*"([\w]+)"/g)].map((m) => [m[1], m[2]]));
}

/** Les tracés que `traceIcone` sait dessiner. */
function tracesDessinees() {
  return new Set([...SRC.matchAll(/case "(\w+)":/g)].map((m) => m[1]));
}

/** Les classes présentes dans la feuille de style de la barre. */
function classesCss() {
  return new Set([...SRC.matchAll(/dpnav-(\w+)/g)].map((m) => m[1]));
}

test("chaque entrée de barre a une icône déclarée", () => {
  const t = traces();
  for (const p of POSTURES) {
    for (const cle of navigationDeLaPosture(p.cle)) {
      assert.ok(t[cle],
        `${p.cle} navigue vers « ${cle} » sans icône dans TRACE_NAV — le bouton `
        + "retomberait sur « dossiers », déjà utilisé ailleurs");
    }
  }
});

test("chaque icône déclarée est réellement dessinée", () => {
  const dessinees = tracesDessinees();
  for (const [cle, trace] of Object.entries(traces())) {
    assert.ok(dessinees.has(trace),
      `« ${cle} » pointe vers le tracé « ${trace} », que traceIcone ne dessine pas`);
  }
});

test("chaque icône déclarée a sa classe dans la feuille de style", () => {
  const css = classesCss();
  for (const [cle, trace] of Object.entries(traces())) {
    assert.ok(css.has(trace),
      `« ${cle} » pointe vers « ${trace} », absent de CSS_NAV — bouton sans style`);
  }
});

test("AUCUNE BARRE ne porte deux fois la même icône", () => {
  const t = traces();
  for (const p of POSTURES) {
    const nav = navigationDeLaPosture(p.cle);
    if (nav.length === 0) continue;
    const icones = nav.map((c) => t[c]);
    const uniques = [...new Set(icones)];
    assert.equal(uniques.length, icones.length,
      `la barre de ${p.cle} porte deux fois la même icône : `
      + nav.map((c, i) => `${c}→${icones[i]}`).join(", "));
  }
});

test("les libellés de barre tiennent en un ou deux mots", () => {
  // Un bouton de barre fait quelques dizaines de pixels. « Mon chantier »
  // débordait et cassait l'alignement.
  const bloc = SRC.match(/const LIB = \{([\s\S]*?)\};/);
  assert.ok(bloc, "table des libellés introuvable");
  for (const m of bloc[1].matchAll(/(\w+):\s*\["\w+",\s*"([^"]+)"\]/g)) {
    const mots = m[2].split(/\s+/).length;
    assert.ok(mots <= 2,
      `le libellé « ${m[2]} » de ${m[1]} fait ${mots} mots`);
  }
});
