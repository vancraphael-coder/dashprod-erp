// =============================================================================
// LA BARRE DE NAVIGATION (nouvelle, animée) — garde de structure.
// Vérifie sur le source que les 6 tracés existent, que l'animation « feutre »
// et l'accessibilité sont en place, et que le mode réduit est respecté.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../../..", import.meta.url).pathname;
const main = readFileSync(join(RACINE, "apps/web/src/main.jsx"), "utf8");

test("les six tracés d'icônes de la barre existent", () => {
  for (const nom of ["dossiers", "planning", "stockage", "messages",
                     "ressources", "compte"]) {
    assert.match(main, new RegExp(`case "${nom}":`),
      `le tracé ${nom} doit exister`);
  }
});

test("l'animation « feutre » est branchée (pathLength + tracé au dashoffset)", () => {
  assert.match(main, /pathLength="1"/);
  assert.match(main, /stroke-dashoffset/);
  assert.match(main, /dpnav-item\.active/);
});

test("la barre suit le thème (accent + nuit), pas des couleurs figées", () => {
  // Les couleurs viennent de variables posées sur .dpnav, liées au thème.
  assert.match(main, /"--nav-on": C\.bleu/);
  assert.match(main, /"--nav-off": C\.muet/);
  assert.match(main, /background: C\.blanc/);
});

test("accessibilité et mouvement réduit respectés", () => {
  assert.match(main, /aria-current=\{estActif \? "page" : undefined\}/);
  assert.match(main, /prefers-reduced-motion/);
});

/* ── Les barres de sections du dossier partagent le même moteur ──────────── */

test("les sections du dossier ont leurs tracés animés", () => {
  for (const nom of ["fiche", "releve", "materiel", "devis", "offre", "facture"]) {
    assert.match(main, new RegExp(`case "${nom}":`),
      `le tracé ${nom} doit exister pour la barre du dossier`);
  }
});

test("les trois barres utilisent le MÊME moteur (une seule définition CSS)", () => {
  // Une seule source d'animation : si on la change, les trois suivent.
  assert.equal((main.match(/const CSS_NAV = /g) || []).length, 1);
  // Utilisée par la barre principale ET les deux barres de sections.
  assert.ok((main.match(/\{CSS_NAV\}/g) || []).length >= 3,
    "les barres de sections doivent réutiliser le moteur");
});

test("la barre dense du dossier trace plus vite (7 sections)", () => {
  // Une barre dense ne peut pas mettre 2,1 s à se tracer sans agacer.
  assert.match(main, /\.dpnav-dense \{ --draw:/);
});
