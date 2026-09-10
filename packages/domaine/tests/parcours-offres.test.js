// =============================================================================
// LE PARCOURS D'UNE OFFRE NE PROMET RIEN QU'ELLE N'OUVRE.
//
// CE QUI CASSE SANS CES TESTS : la landing raconte un trajet, le RLS referme
// un des écrans, et le client découvre l'écart après avoir payé. C'est le même
// mécanisme qui avait caché `signature_client` aux clients Basique pendant des
// semaines — sauf que là, il se voit à la vente.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { REFERENTIEL_OFFRES, offreReferentiel }
  from "../src/commercial/referentiel-offres.js";
import { PARCOURS_OFFRES, parcoursOffre, ecransOffre }
  from "../src/commercial/parcours-offres.js";
import { MODULES, module as moduleParCle } from "../src/commercial/plans.js";

test("chaque offre du référentiel a un parcours", () => {
  // Une offre publiée sans parcours s'afficherait sur la landing comme une
  // carte de prix nue — c'est précisément ce qu'on remplace.
  for (const o of REFERENTIEL_OFFRES) {
    const p = parcoursOffre(o.code);
    assert.ok(p, `${o.code} n'a aucun parcours`);
    assert.ok(p.accroche, `${o.code} sans accroche`);
    assert.ok(p.parcours.length >= 4,
      `${o.code} : un parcours en moins de 4 étapes ne fait pas voyager`);
  }
});

test("aucun parcours orphelin", () => {
  const codes = new Set(REFERENTIEL_OFFRES.map((o) => o.code));
  for (const code of Object.keys(PARCOURS_OFFRES)) {
    assert.ok(codes.has(code),
      `${code} a un parcours mais n'existe pas au référentiel`);
  }
});

test("chaque étape se passe dans un écran nommé", () => {
  for (const o of REFERENTIEL_OFFRES) {
    for (const e of parcoursOffre(o.code).parcours) {
      assert.ok(e.etape, `${o.code} : étape sans titre`);
      assert.ok(e.texte && e.texte.length > 30,
        `${o.code} / ${e.etape} : texte trop court pour dire quoi que ce soit`);
      assert.ok(e.ecran, `${o.code} / ${e.etape} : aucun écran nommé`);
    }
  }
});

test("L'INVARIANT — une offre ne promet aucun écran qu'elle n'ouvre pas", () => {
  for (const o of REFERENTIEL_OFFRES) {
    // Une offre encore sans modules décrit un parcours à CONSTRUIRE : rien à
    // vérifier, et la contrainte en base l'empêche d'être vendue.
    if (o.modules.length === 0) continue;
    for (const e of parcoursOffre(o.code).parcours) {
      if (!e.module) continue;
      assert.ok(o.modules.includes(e.module),
        `${o.code} promet « ${e.ecran} » (module ${e.module}) sans l'ouvrir. `
        + `Modules de l'offre : ${o.modules.join(", ")}`);
    }
  }
});

test("les modules cités existent et sont livrés", () => {
  const connus = new Set(MODULES.map((m) => m.cle));
  for (const o of REFERENTIEL_OFFRES) {
    for (const e of parcoursOffre(o.code).parcours) {
      if (!e.module) continue;
      assert.ok(connus.has(e.module),
        `${o.code} cite un module inconnu : ${e.module}`);
      // Vendre un écran adossé à un module non livré, c'est vendre du vide.
      assert.equal(moduleParCle(e.module)?.livre, true,
        `${o.code} / ${e.ecran} s'appuie sur ${e.module}, pas encore livré`);
    }
  }
});

test("les écrans sont dérivés du parcours, sans doublon", () => {
  // « Suivi des missions » revient à deux étapes chez le donneur d'ordre : il
  // ne doit apparaître qu'une fois dans la liste des écrans.
  const ecrans = ecransOffre("donneur_ordre");
  const noms = ecrans.map((e) => e.nom);
  assert.deepEqual([...new Set(noms)], noms, "un écran est listé deux fois");
  assert.ok(noms.includes("Suivi des missions"));
});

test("chaque offre dit ce qu'elle NE fait pas", () => {
  // Une offre dont on ne connaît pas les limites se vend une fois et se
  // rembourse ensuite.
  for (const o of REFERENTIEL_OFFRES) {
    const p = parcoursOffre(o.code);
    assert.ok((p.pas_inclus || []).length > 0,
      `${o.code} ne dit nulle part ce qu'il ne couvre pas`);
  }
});

test("l'offre indépendant décrit bien un travail SEUL", () => {
  const o = offreReferentiel("independant_manutention");
  assert.equal(o.membres_limite, 1, "un seul accès, plafond dur");
  assert.ok(!o.modules.includes("paie"), "personne à payer quand on est seul");
  assert.ok(!o.modules.includes("releve"), "le relevé de volume n'est pas son métier");
  assert.ok(!o.modules.includes("flotte"), "pas de flotte à gérer");
  // Ce dont il a besoin, en revanche, doit être là.
  for (const cle of ["planning", "terrain", "rapport_chantier", "facturation"]) {
    assert.ok(o.modules.includes(cle), `l'indépendant a besoin de ${cle}`);
  }
  // Et l'offre n'est pas vendable tant que son parcours n'existe pas.
  assert.equal(o.souscriptible, false);
  assert.equal(o.statut, "bientot");
});
