// =============================================================================
// Garde-fou — la vitrine ne doit jamais promettre autre chose que les offres.
//
// Elle a promis « utilisateurs illimités » et un prix unique de 360 € pendant
// que la grille comptait trois offres, 2 et 5 utilisateurs. Un client le
// découvrait au deuxième collaborateur invité : c'est une contre-vérité
// commerciale, pas un détail de rédaction.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PLANS, plansDisponibles } from "../src/commercial/plans.js";

const RACINE = new URL("../../..", import.meta.url).pathname;
const DOSSIER = RACINE + "apps/web/src/ecrans/vitrine/";

function fichiersVitrine() {
  return readdirSync(DOSSIER).filter((f) => f.endsWith(".jsx"))
    .map((f) => ({ nom: f, src: readFileSync(DOSSIER + f, "utf8") }));
}

/** Le code hors commentaires — un commentaire peut légitimement citer le mot. */
function sansCommentaires(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("la vitrine ne promet nulle part « illimité »", () => {
  const fautes = fichiersVitrine()
    .filter(({ src }) => /illimit/i.test(sansCommentaires(src)))
    .map(({ nom }) => nom);
  assert.deepEqual(fautes, [],
    "aucune offre souscriptible n'a d'utilisateurs illimités");
});

test("aucune offre souscriptible n'est réellement illimitée", () => {
  // Le test précédent n'aurait aucun sens si l'une l'était.
  for (const p of plansDisponibles()) {
    assert.ok(p.utilisateurs != null,
      `${p.cle} est vendue comme limitée : la vitrine doit le dire`);
  }
});

test("aucun prix n'est écrit en dur dans la vitrine", () => {
  // Les prix doivent venir de plans.js, sinon ils divergent au premier
  // changement de grille.
  const prixConnus = PLANS.map((p) => String(Math.round(p.prix_centimes / 100)));
  const fautes = [];
  for (const { nom, src } of fichiersVitrine()) {
    const code = sansCommentaires(src);
    for (const prix of prixConnus) {
      // Un prix suivi d'un symbole euro = une annonce tarifaire figée.
      if (new RegExp(`>\\s*${prix}\\s*€|"${prix} €|${prix} € HTVA`).test(code)) {
        fautes.push(`${nom} → ${prix} €`);
      }
    }
  }
  assert.deepEqual(fautes, [],
    "prix codé en dur : il divergera de la grille au premier changement");
});

test("la vitrine lit bien la grille des offres", () => {
  const src = fichiersVitrine().map((f) => f.src).join("\n");
  assert.match(src, /@domaine\/commercial\/plans\.js/,
    "la vitrine doit s'alimenter à la source des offres");
});
