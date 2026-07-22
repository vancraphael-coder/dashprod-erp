import test from "node:test";
import assert from "node:assert/strict";
import { GROUPES_TEXTES, DEFAUTS_PAR_GROUPE, groupeTextes, lireGroupe, ecrireGroupe, textesEffectifs, TEXTES_PDF_DEFAUT } from "../src/communication/textes.js";

const OFFRE = groupeTextes("offre");
const PDF = groupeTextes("pdf");

test("lireGroupe : le groupe racine ne ramasse pas les sous-objets", () => {
  const stockes = { objet: "Mon objet", pdf: { titre: "MON TITRE" } };
  assert.deepEqual(lireGroupe(stockes, OFFRE), { objet: "Mon objet" });
  assert.deepEqual(lireGroupe(stockes, PDF), { titre: "MON TITRE" });
});

test("ecrireGroupe : modifier un groupe ne touche pas les autres", () => {
  const avant = { objet: "Mon objet", pdf: { titre: "MON TITRE" } };
  const apres = ecrireGroupe(avant, PDF, { titre: "AUTRE", tva: "TVA 6 %" });
  assert.equal(apres.objet, "Mon objet");
  assert.deepEqual(apres.pdf, { titre: "AUTRE", tva: "TVA 6 %" });
});

test("ecrireGroupe : une valeur vide retire la personnalisation", () => {
  const apres = ecrireGroupe({ objet: "X" }, OFFRE, { objet: "", salutation: "Salut," });
  assert.equal(apres.objet, undefined);
  assert.equal(apres.salutation, "Salut,");
});

test("ecrireGroupe : vider un groupe nommé supprime son espace", () => {
  const apres = ecrireGroupe({ pdf: { titre: "X" } }, PDF, {});
  assert.equal("pdf" in apres, false);
});

test("textesEffectifs : le défaut complète le réglage partiel", () => {
  const t = textesEffectifs({ pdf: { titre: "DEVIS" } }, "pdf");
  assert.equal(t.titre, "DEVIS");
  assert.equal(t.total_tvac, TEXTES_PDF_DEFAUT.total_tvac);
});

test("textesEffectifs : sans rien de stocké, tout vient du défaut", () => {
  assert.deepEqual(textesEffectifs({}, "pdf"), { ...TEXTES_PDF_DEFAUT });
  assert.deepEqual(textesEffectifs(null, "pdf"), { ...TEXTES_PDF_DEFAUT });
});

test("chaque groupe déclare des champs connus et un défaut par champ", () => {
  for (const g of GROUPES_TEXTES) {
    // Les groupes "fichier" (un PDF) et "alinéas" (articles numérotés réécrits
    // un par un) n'ont pas de champs nommés : leur contenu vient du domaine.
    if (g.fichier || g.alineas) continue;
    const defauts = DEFAUTS_PAR_GROUPE[g.cle];
    assert.ok(defauts, `défauts manquants pour le groupe ${g.cle}`);
    for (const ch of g.champs) {
      assert.ok(ch.cle in defauts, `le champ ${g.cle}.${ch.cle} n'a pas de valeur par défaut`);
    }
  }
});

test("garde-fou multi-tenant : aucune identité réelle dans les défauts", () => {
  const tout = JSON.stringify(DEFAUTS_PAR_GROUPE);
  for (const interdit of [/roovers/i, /van\s*cutsem/i, /BE\s*73/i, /jodoigne/i, /0478\.363/, /raphael/i]) {
    assert.doesNotMatch(tout, interdit, `une donnée d'entreprise réelle traîne dans les textes par défaut : ${interdit}`);
  }
});