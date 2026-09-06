// =============================================================================
// VERROUS DE SORTIE PRO — trois défauts réels constatés le 01/09/2026 :
//   1. une facture VIDE a reçu un numéro légal (2026-000019, 0 ligne, 0 €) ;
//   2. la prestation portait toujours « Déménagement », même pour un lift ;
//   3. la clôture était refusée à tous — la capacité n'était attribuée à
//      aucun rôle.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VUES } from "../src/crm/vues-dossiers.js";
import { nature } from "../src/commercial/natures.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const adaptateur = readFileSync(
  join(RACINE, "apps/web/src/lib/adaptateur.js"), "utf8");

test("le libellé de prestation suit la NATURE, pas « Déménagement » en dur", () => {
  // Une facture de lift ne doit pas annoncer « Déménagement ».
  assert.match(adaptateur, /natureDe\(a\.nature\)\?\.titre/);
  assert.equal(/libelle: `Déménagement — /.test(adaptateur), false,
    "le libellé figé « Déménagement » ne doit plus exister");
  // Chaque nature a bien un titre à afficher.
  for (const cle of ["demenagement", "lift", "boxe", "zone", "sous_traitance"]) {
    assert.ok(nature(cle)?.titre, `${cle} doit avoir un titre`);
  }
});

test("aucune ligne de prestation fantôme à 0 €", () => {
  // Une prestation à 0 € signale un chiffrage absent : on ne la pousse pas,
  // sinon la facture paraît complète alors qu'elle ne réclame rien.
  assert.match(adaptateur, /if \(htva > 0\) \{/);
});

test("« Clos » est une vue à part entière", () => {
  const clos = VUES.find((v) => v.cle === "clos");
  assert.ok(clos, "la vue clos doit exister");
    assert.deepEqual(clos.etats, ["clos"]);
  // Elle se place avant « Tous » : la fin du cycle, pas le fourre-tout.
  const cles = VUES.map((v) => v.cle);
  assert.ok(cles.indexOf("clos") < cles.indexOf("tous"));
});

test("les vues qui montrent des dossiers TERMINÉS n'activent pas « actifs seulement »", () => {
  // Défaut réel : la vue « Clos » comptait juste mais n'affichait rien — le
  // regroupement par horizon écartait les terminés après le filtrage.
  const liste = readFileSync(
    join(RACINE, "apps/web/src/ecrans/ListeAffaires.jsx"), "utf8");
  assert.match(liste, /seulementActifs: vue !== "tous" && vue !== "clos"/);
});
