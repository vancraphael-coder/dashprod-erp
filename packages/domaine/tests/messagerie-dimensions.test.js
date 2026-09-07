// =============================================================================
// LA MESSAGERIE — le fil doit RESPECTER SES DIMENSIONS.
//
// Défaut réel signalé le 01/09/2026 : en pleine hauteur, la liste passait en
// maxHeight:none + overflow:visible → elle poussait la page au lieu de défiler
// dans son cadre.
//
// Ce test protège aussi le FUTUR espace « équipe » (messagerie interne) : toute
// nouvelle surface de discussion devra tenir les mêmes règles.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)),
                 "..", "..", "..", "apps", "web", "src");
const fil = readFileSync(join(APP, "ecrans/FilMessages.jsx"), "utf8");

test("le fil défile DANS son cadre, il ne déborde jamais", () => {
  // overflow:visible laissait le fil pousser la page : interdit.
  assert.equal(/overflowY: pleineHauteur \? "visible"/.test(fil), false,
    "la liste ne doit jamais être en overflow visible");
  assert.match(fil, /overflowY: "auto"/);
  // Une hauteur bornée, même en pleine hauteur.
  assert.equal(/maxHeight: pleineHauteur \? "none"/.test(fil), false);
  assert.match(fil, /maxHeight: pleineHauteur \? "calc\(/);
});

test("minHeight:0 est posé (sinon un enfant flex ne peut pas défiler)", () => {
  // Piège classique : sans minHeight:0, l'enfant d'un conteneur flex refuse de
  // rétrécir et le défilement ne s'active pas.
  assert.match(fil, /minHeight: 0/);
});

test("un mot long ou un lien n'élargit pas la bulle", () => {
  // whiteSpace pre-wrap seul laisse une URL casser la largeur du fil.
  assert.match(fil, /overflowWrap: "anywhere"/);
  assert.match(fil, /wordBreak: "break-word"/);
});

test("les bulles restent bornées en largeur", () => {
  assert.match(fil, /maxWidth: "8[0-9]%"/);
});
