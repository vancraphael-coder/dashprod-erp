// =============================================================================
// LA TABLE DE RÉUTILISATION DIT VRAI.
//
// Une table de décision qui se trompe est pire qu'une intuition : on lui fait
// confiance. Ces tests tiennent sa cohérence avec le catalogue réel des
// modules — un besoin qui cite un module inexistant, ou un mécanisme déclaré
// « neuf » alors qu'il est livré, faussent le classement.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { BESOINS_OFFRES, bilanOffre, parente, classementOuverture,
         mecanismesPartages, offresDuSecteur, incoherences }
  from "../src/commercial/reutilisation.js";
import { REFERENTIEL_OFFRES, offreReferentiel }
  from "../src/commercial/referentiel-offres.js";
import { PARCOURS_OFFRES } from "../src/commercial/parcours-offres.js";

test("aucune incohérence entre les besoins et le catalogue", () => {
  assert.deepEqual(incoherences(), []);
});

test("toute offre non construite a ses besoins déclarés", () => {
  // Une offre sans besoins déclarés sort du classement en silence : elle
  // paraîtrait inexistante au moment de décider quoi ouvrir.
  for (const o of REFERENTIEL_OFFRES) {
    if (o.souscriptible) continue;
    assert.ok(BESOINS_OFFRES[o.code],
      `${o.code} est publiée non souscriptible sans besoins déclarés`);
  }
});

test("les besoins couvrent les modules du parcours annoncé", () => {
  // La landing décrit un trajet ; la table dit ce qu'il coûte. Si le trajet
  // cite un module que les besoins ignorent, le coût est sous-estimé.
  for (const [code, p] of Object.entries(PARCOURS_OFFRES)) {
    const b = BESOINS_OFFRES[code];
    if (!b) continue;
    for (const etape of p.parcours) {
      if (!etape.module) continue;
      assert.ok(b.requis.includes(etape.module),
        `${code} promet « ${etape.ecran} » (${etape.module}) que ses besoins `
        + "ne déclarent pas");
    }
  }
});

test("une offre déjà dotée de ses modules est à 100 %", () => {
  const b = bilanOffre("independant_manutention");
  assert.equal(b.taux, 1);
  assert.deepEqual(b.a_construire, []);
  assert.equal(b.porte_deja, true);
  // Et ses modules en base correspondent à ses besoins déclarés.
  assert.deepEqual([...offreReferentiel("independant_manutention").modules].sort(),
                   [...b.requis].sort());
});

test("le classement met devant ce qui ne demande aucun mécanisme inédit", () => {
  const c = classementOuverture();
  // Le coût d'un parcours n'est pas celui d'un chantier : une offre dont tous
  // les mécanismes existent passe devant, quel que soit son taux.
  for (let i = 1; i < c.length; i += 1) {
    assert.ok(c[i - 1].a_construire.length <= c[i].a_construire.length,
      "le classement ne trie plus par mécanismes inédits d'abord");
  }
  assert.equal(c[0].code, "independant_manutention");
});

test("la parenté est symétrique et bornée", () => {
  const a = parente("pro", "garde_meubles");
  const b = parente("garde_meubles", "pro");
  assert.equal(a.proximite, b.proximite);
  assert.ok(a.proximite >= 0 && a.proximite <= 1);
  // Une offre est parfaitement parente d'elle-même.
  assert.equal(parente("pro", "pro").proximite, 1);
});

test("les deux axes de secteur sont distincts", () => {
  // Entre corps d'un même secteur : ils se croisent sur un chantier, donc
  // ouvrir l'un crée de la demande pour l'autre. Entre secteurs : on ne
  // partage que du code.
  const chantier = offresDuSecteur("chantier");
  const entreposage = offresDuSecteur("entreposage");
  assert.ok(chantier.includes("independant_manutention"));
  assert.ok(chantier.includes("donneur_ordre"));
  assert.ok(entreposage.includes("garde_meubles"));
  for (const c of chantier) assert.ok(!entreposage.includes(c));
});

test("CONSTAT MESURÉ — aucun mécanisme inédit ne sert deux offres", () => {
  // C'est le résultat le plus important de la table, et il est contre-intuitif :
  // il n'y a AUCUNE économie d'échelle à attendre des mécanismes manquants.
  // Chacun ne débloque qu'une offre. L'ordre d'ouverture se décide donc sur
  // l'effet de réseau entre corps d'un même secteur, pas sur la mutualisation
  // du code.
  //
  // Si ce test se met à échouer, c'est une BONNE nouvelle : un mécanisme sert
  // désormais deux offres et doit passer devant.
  for (const m of mecanismesPartages()) {
    assert.equal(m.nb, 1,
      `« ${m.mecanisme} » sert maintenant ${m.nb} offres (${m.offres.join(", ")}) `
      + "— à reclasser en tête");
  }
});
