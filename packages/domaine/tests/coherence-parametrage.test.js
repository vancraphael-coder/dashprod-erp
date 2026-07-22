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

// — CGV : ajout, suppression, renumérotation, et cohérence avec l'offre —
import { cgv, renumeroter, articlesCgv, CGV_VERSION_COURANTE }
  from "../src/documents/cgv.js";

test("sans personnalisation, les CGV du socle s'appliquent", () => {
  assert.ok(cgv(CGV_VERSION_COURANTE).length > 0);
  assert.deepEqual(cgv(CGV_VERSION_COURANTE, []), cgv(CGV_VERSION_COURANTE));
  assert.deepEqual(cgv(CGV_VERSION_COURANTE, null), cgv(CGV_VERSION_COURANTE));
});

test("une liste personnalisée remplace intégralement le socle", () => {
  const perso = ["1. Mon article.", "2. Le second."];
  assert.deepEqual(cgv(CGV_VERSION_COURANTE, perso), perso);
});

test("supprimer un article ne laisse pas de trou dans la numérotation", () => {
  const base = cgv(CGV_VERSION_COURANTE);
  const sansLeDeuxieme = base.filter((_, i) => i !== 1);
  const finale = renumeroter(sansLeDeuxieme);
  assert.equal(finale.length, base.length - 1);
  finale.forEach((a, i) => assert.ok(a.startsWith(`${i + 1}. `),
    `article mal numéroté : ${a.slice(0, 24)}`));
});

test("ajouter un article le numérote à la suite", () => {
  const finale = renumeroter([...cgv(CGV_VERSION_COURANTE), "Clause spéciale."]);
  assert.match(finale[finale.length - 1], /^\d+\. Clause spéciale\.$/);
});

test("un article vide est écarté, pas numéroté", () => {
  assert.equal(renumeroter(["1. Un.", "   ", "", "2. Deux."]).length, 2);
});

test("articlesCgv reflète la liste personnalisée, pas le socle", () => {
  const arts = articlesCgv(CGV_VERSION_COURANTE, ["1. Alpha.", "2. Beta."]);
  assert.equal(arts.length, 2);
  assert.equal(arts[0].texte, "1. Alpha.");
});

test("COHÉRENCE OFFRE : le document imprime les articles figés, pas le socle", () => {
  // composerOffre fige cgv_articles dans le document ; Contrat imprime ce
  // champ en priorité. Une modification ultérieure ne doit PAS changer un
  // document déjà composé — c'est ce qui rend une signature opposable.
  const perso = ["1. Version au moment de la signature."];
  const documentFige = { cgv_version: CGV_VERSION_COURANTE, cgv_articles: perso };
  const rendu = Array.isArray(documentFige.cgv_articles) && documentFige.cgv_articles.length
    ? documentFige.cgv_articles
    : cgv(documentFige.cgv_version);
  assert.deepEqual(rendu, perso);

  // Et le socle a bien changé entre-temps : la divergence est le test.
  assert.notDeepEqual(rendu, cgv(CGV_VERSION_COURANTE));
});

test("un vieux document sans articles figés retombe sur son socle de version", () => {
  const ancien = { cgv_version: CGV_VERSION_COURANTE };
  const rendu = Array.isArray(ancien.cgv_articles) && ancien.cgv_articles.length
    ? ancien.cgv_articles : cgv(ancien.cgv_version);
  assert.deepEqual(rendu, cgv(CGV_VERSION_COURANTE));
});
