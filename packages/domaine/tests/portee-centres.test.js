// =============================================================================
// LA PORTÉE PAR CENTRE — responsable dépôt cloisonné, secrétaire+ voit tout.
//
// Ce que ces tests protègent : le « sans interférer » de Raphaël. Une erreur
// ici, et un responsable dépôt voit les dossiers d'un autre centre, ou une
// liste mélange deux centres.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  porteeCentres, peutVoirCentre, filtrerParCentre, MAISON_MERE,
} from "../src/organisation/centres.js";

const CENTRES = [{ id: "anvers", nom: "Anvers" }, { id: "gand", nom: "Gand" }];

test("le responsable dépôt ne voit QUE son centre, sans bascule", () => {
  const p = porteeCentres({ poste: "responsable_depot", centre_id: "anvers" }, CENTRES);
  assert.deepEqual(p.centresVisibles, ["anvers"]);
  assert.equal(p.tousCentres, false);
  assert.equal(p.peutBasculer, false);
  assert.equal(p.centreParDefaut, "anvers");
});

test("le responsable dépôt ne peut pas ouvrir un autre centre", () => {
  // LE CŒUR DU « SANS INTERFÉRER ».
  const acteur = { poste: "responsable_depot", centre_id: "anvers" };
  assert.equal(peutVoirCentre(acteur, CENTRES, "anvers"), true);
  assert.equal(peutVoirCentre(acteur, CENTRES, "gand"), false);
  assert.equal(peutVoirCentre(acteur, CENTRES, MAISON_MERE), false,
    "il ne remonte pas non plus à la maison mère");
});

test("secrétaire, gérant, fondateur voient tous les centres + la maison mère", () => {
  for (const poste of ["secretaire", "gerant", "fondateur"]) {
    const p = porteeCentres({ poste, centre_id: "gand" }, CENTRES);
    assert.equal(p.tousCentres, true);
    assert.equal(p.peutBasculer, true);
    assert.deepEqual(p.centresVisibles, [MAISON_MERE, "anvers", "gand"]);
    // On atterrit sur SON centre s'il en a un.
    assert.equal(p.centreParDefaut, "gand");
  }
});

test("secrétaire+ peut ouvrir n'importe quel centre ET la maison mère", () => {
  const acteur = { poste: "secretaire", centre_id: null };
  assert.equal(peutVoirCentre(acteur, CENTRES, "anvers"), true);
  assert.equal(peutVoirCentre(acteur, CENTRES, "gand"), true);
  assert.equal(peutVoirCentre(acteur, CENTRES, MAISON_MERE), true);
});

test("le terrain reste dans son centre, sans bascule", () => {
  // Un déménageur ne « visite » pas les centres — il travaille dans le sien.
  const p = porteeCentres({ poste: "demenageur", centre_id: "anvers" }, CENTRES);
  assert.deepEqual(p.centresVisibles, ["anvers"]);
  assert.equal(p.peutBasculer, false);
});

test("filtrerParCentre ne mélange JAMAIS deux centres", () => {
  // La garantie « sans interférer » au niveau des listes.
  const dossiers = [
    { id: 1, centre_id: "anvers" }, { id: 2, centre_id: "gand" },
    { id: 3, centre_id: null }, { id: 4, centre_id: "anvers" },
  ];
  assert.deepEqual(filtrerParCentre(dossiers, "anvers").map((d) => d.id), [1, 4]);
  assert.deepEqual(filtrerParCentre(dossiers, MAISON_MERE).map((d) => d.id), [3]);
  assert.deepEqual(filtrerParCentre(dossiers, "gand").map((d) => d.id), [2]);
});

/* ── Filtrage des dépôts (stockage) selon la portée ──────────────────────── */

test("le sélecteur de dépôt du stockage ne montre que les centres visibles", () => {
  // Reproduit la logique de Stockage.jsx : filtrer la liste des dépôts sur la
  // portée. Un responsable dépôt ne voit que le sien dans le sélecteur.
  const depots = [{ id: "anvers" }, { id: "gand" }, { id: "liege" }];
  const filtrer = (acteur) => {
    const p = porteeCentres(acteur, depots);
    return p.tousCentres ? depots
      : depots.filter((c) => p.centresVisibles.some((v) => (v ?? null) === (c.id ?? null)));
  };
  assert.deepEqual(
    filtrer({ poste: "responsable_depot", centre_id: "gand" }).map((d) => d.id),
    ["gand"], "le responsable dépôt ne voit que Gand");
  assert.deepEqual(
    filtrer({ poste: "secretaire", centre_id: "anvers" }).map((d) => d.id),
    ["anvers", "gand", "liege"], "la secrétaire voit tous les dépôts");
});

/* ── L'espace de travail (Option A) : ce qu'on crée s'y rattache ──────────── */

import { centreDeRattachement, nomEspace } from "../src/organisation/centres.js";

test("un dossier créé dans un espace-centre lui est rattaché", () => {
  const centres = [{ id: "anvers", nom: "Anvers" }, { id: "gand", nom: "Gand" }];
  // Secrétaire dans l'espace Anvers → le dossier va à Anvers.
  assert.equal(centreDeRattachement("anvers", { poste: "secretaire" }, centres), "anvers");
  // Dans l'espace maison mère → null (rien à un centre).
  assert.equal(centreDeRattachement(MAISON_MERE, { poste: "gerant" }, centres), MAISON_MERE);
});

test("le responsable dépôt crée TOUJOURS dans son centre, jamais ailleurs", () => {
  // Même s'il tente d'ouvrir la maison mère ou un autre centre.
  const centres = [{ id: "anvers", nom: "Anvers" }, { id: "gand", nom: "Gand" }];
  const rd = { poste: "responsable_depot", centre_id: "anvers" };
  assert.equal(centreDeRattachement(MAISON_MERE, rd, centres), "anvers");
  assert.equal(centreDeRattachement("gand", rd, centres), "anvers");
  assert.equal(centreDeRattachement("anvers", rd, centres), "anvers");
});

test("nomEspace nomme l'espace courant", () => {
  const centres = [{ id: "anvers", nom: "Anvers" }];
  assert.equal(nomEspace(MAISON_MERE, centres), "Maison mère");
  assert.equal(nomEspace("anvers", centres), "Anvers");
});
