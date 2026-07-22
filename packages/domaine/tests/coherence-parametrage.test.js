// Tests — cohérence aller/retour entre PARAMÉTRAGE et pages de DOSSIER.
//
// Règle : une information réglée dans Paramètres doit être consommée telle
// quelle par les pages de dossier. Aucune page ne recalcule, ne redéfinit ni
// ne code en dur une donnée qui a une source.
//
// Rupture réelle trouvée le 21/07/2026 : composerOffre() calculait
// htva = tvac / 1.21 en dur pendant que l'étiquette affichait le taux de
// l'organisation. Une entreprise en TVA 6 % aurait vu « TVA 6 % » sur un
// montant calculé à 21 % — document faux, et faux légalement.

import test from "node:test";
import assert from "node:assert/strict";
import { tauxTva, libelleTva, facturation } from "../src/organisation/identite.js";
import { calculerScenario } from "../src/chiffrage/moteur.js";
import { catalogue, CATALOGUES_DEFAUT } from "../src/stocks/catalogues.js";
import { textesEffectifs } from "../src/communication/textes.js";

/** Reproduit le calcul de composerOffre : HTVA déduit du TVAC. */
const htvaDepuis = (tvac, org) => Math.round(tvac / (1 + tauxTva(org) / 100));

test("le libellé et le montant sortent du même taux (21 %)", () => {
  const org = {};
  assert.equal(libelleTva(org), "TVA 21 %");
  assert.equal(htvaDepuis(12100, org), 10000);
});

test("le libellé et le montant sortent du même taux (6 %)", () => {
  const org = { parametres_facturation: { tva_taux: 6 } };
  assert.equal(libelleTva(org), "TVA 6 %");
  assert.equal(htvaDepuis(10600, org), 10000);
});

test("le calcul en dur à 1.21 diverge de l'étiquette — régression interdite", () => {
  const org = { parametres_facturation: { tva_taux: 6 } };
  const enDur = Math.round(10600 / 1.21);        // l'ancien code
  const correct = htvaDepuis(10600, org);
  assert.notEqual(enDur, correct);
  assert.equal(correct, 10000);
});

test("le moteur de chiffrage suit le même taux que l'étiquette", () => {
  const org = { parametres_facturation: { tva_taux: 6 } };
  const s = calculerScenario({ formule: "forfait", forfaitTvacEuros: 106 }, {},
                             { tvaPct: tauxTva(org) });
  assert.equal(s.htva_centimes, 10000);
  assert.equal(s.tva_centimes, 600);
});

test("l'échéance réglée en paramètres est celle que lit la facturation", () => {
  assert.equal(facturation({ parametres_facturation: { echeance_jours: 15 } }).echeance_jours, 15);
  assert.equal(facturation({}).echeance_jours, 30);
});

test("les pièces du relevé viennent du catalogue de l'entreprise", () => {
  assert.deepEqual(catalogue({ pieces: ["Loft", "Atelier"] }, "pieces"), ["Loft", "Atelier"]);
  assert.deepEqual(catalogue({}, "pieces"), CATALOGUES_DEFAUT.pieces);
});

test("le matériel de terrain réglé est celui que voit la page Matériel", () => {
  const perso = [{ cle: "transpalette", nom: "Transpalette", unite: "pièce", cout_centimes: 30000 }];
  assert.deepEqual(catalogue({ materiel_terrain: perso }, "materiel_terrain"), perso);
});

test("un texte réglé est celui que reprend le document", () => {
  const t = textesEffectifs({ pdf: { titre: "DEVIS" } }, "pdf");
  assert.equal(t.titre, "DEVIS");
});

// — Régression : écran blanc Matériel du 21/07/2026 —
// resumeEmballage() calculait sur CATALOGUE_EMBALLAGE (clés std, livre…) alors
// que l'écran affichait le catalogue de l'organisation (clés carton_standard…).
// Le .find() ne trouvait rien, ligne.e plantait le rendu.
import { resumeEmballage, fournituresOffre } from "../src/stocks/emballage.js";

test("resumeEmballage calcule sur le catalogue qu'on lui donne", () => {
  const perso = [{ cle: "carton_standard", nom: "Carton standard" }];
  const r = resumeEmballage({ carton_standard: { e: 10, u: 7, r: 3 } }, perso);
  assert.equal(r.lignes.length, 1);
  assert.equal(r.lignes[0].cle, "carton_standard");
  assert.equal(r.lignes[0].u, 7);
});

test("chaque article affiché a sa ligne — plus de find() undefined", () => {
  const perso = [{ cle: "a", nom: "A" }, { cle: "b", nom: "B" }];
  const r = resumeEmballage({}, perso);
  for (const art of perso) {
    assert.ok(r.lignes.find((l) => l.cle === art.cle), `ligne manquante : ${art.cle}`);
  }
});

test("un catalogue vide retombe sur le catalogue du domaine", () => {
  assert.ok(resumeEmballage({}, []).lignes.length > 0);
  assert.ok(resumeEmballage({}, null).lignes.length > 0);
});

test("fournituresOffre tolère un article sans pluriel", () => {
  const perso = [{ cle: "x", nom: "Housse spéciale" }];
  const t = fournituresOffre({ x: { u: 3 } }, perso);
  assert.equal(t.length, 1);
  assert.match(t[0], /^3 /);
});
