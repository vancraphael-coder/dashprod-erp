// =============================================================================
// Garde-fou — aucune bande blanche sur le côté d'un téléphone.
//
// Le symptôme (page décalée, fond qui s'arrête avant le bord droit) vient
// toujours de la même cause : un élément plus large que l'écran. Le coupable le
// plus fréquent est `repeat(auto-fit, minmax(300px, 1fr))` : sur un écran de
// 320 px avec 20 px de marge de chaque côté, il reste 280 px de place et la
// colonne en réclame 300. La page déborde.
//
// La forme correcte est `minmax(min(300px, 100%), 1fr)` : la colonne descend
// jusqu'à la largeur disponible au lieu de la forcer.
//
// Ce test lit les écrans réels. Il ne peut pas être satisfait par une
// correction locale oubliée ailleurs.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../../../apps/web/src", import.meta.url).pathname;

function fichiers(dir) {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) return fichiers(p);
    return p.endsWith(".jsx") ? [p] : [];
  });
}

test("aucune colonne de grille ne peut dépasser la largeur d'un téléphone", () => {
  const fautifs = [];
  for (const f of fichiers(RACINE)) {
    const src = readFileSync(f, "utf8");
    // minmax(300px, 1fr) sans le min() protecteur
    const mauvais = src.match(/minmax\(\s*\d+px\s*,\s*1fr\s*\)/g);
    if (mauvais) fautifs.push(`${f.replace(RACINE, "")} → ${mauvais.join(", ")}`);
  }
  assert.deepEqual(fautifs, [],
    "utiliser minmax(min(Npx, 100%), 1fr) : sinon la page déborde sur un écran étroit");
});

test("la page pose explicitement sa largeur maximale", () => {
  const html = readFileSync(
    new URL("../../../apps/web/index.html", import.meta.url).pathname, "utf8");
  assert.match(html, /overflow-x:\s*hidden/, "ceinture de sécurité absente");
  assert.match(html, /max-width:\s*100%/);
  assert.match(html, /width=device-width/, "meta viewport indispensable");
});
