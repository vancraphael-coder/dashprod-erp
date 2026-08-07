import test from "node:test";
import assert from "node:assert/strict";
import {
  CIRCUITS, typesLitige, libelleType, libelleEtape,
  etapeSuivante, issues, progression,
} from "../src/crm/litige.js";
import { calculDefinitif, euroCentimes } from "../src/pilotage/calcul-definitif.js";

// ---------------------------------------------------------------------------
// Litiges — circuits
// ---------------------------------------------------------------------------
test("chaque type a un circuit et des issues", () => {
  for (const [cle, c] of Object.entries(CIRCUITS)) {
    assert.ok(c.etapes.length >= 1, `${cle} sans étape`);
    assert.ok(c.issues.length >= 2, `${cle} doit pouvoir bien ou mal finir`);
  }
});

test("l'étape suivante n'avance que d'un cran", () => {
  const s = etapeSuivante("impaye", "a_relancer");
  assert.equal(s.cle, "relance_envoyee");
});

test("la dernière étape métier n'a pas de suivante (place aux issues)", () => {
  assert.equal(etapeSuivante("impaye", "recouvrement"), null);
});

test("un type inconnu ne casse rien", () => {
  assert.equal(etapeSuivante("fantaisie", "x"), null);
  assert.equal(libelleType("fantaisie"), "fantaisie");
  assert.deepEqual(issues("fantaisie"), []);
});

test("les issues sont disponibles dès l'ouverture", () => {
  const is = issues("degat").map((i) => i.cle);
  assert.deepEqual(is, ["resolu", "abandonne"]);
});

test("libellé d'étape lisible, y compris pour une issue", () => {
  assert.equal(libelleEtape("impaye", "mise_en_demeure"), "Mise en demeure");
  assert.equal(libelleEtape("impaye", "resolu"), "Payé");
});

test("progression : croît, et vaut 1 une fois résolu", () => {
  const p0 = progression("impaye", "a_relancer", "ouvert");
  const p1 = progression("impaye", "recouvrement", "ouvert");
  assert.ok(p1 > p0);
  assert.equal(progression("impaye", "a_relancer", "resolu"), 1);
});

test("typesLitige expose libellé et couleur pour l'écran", () => {
  const t = typesLitige().find((x) => x.cle === "impaye");
  assert.equal(t.libelle, "Impayé");
  assert.match(t.couleur, /^#/);
});

// ---------------------------------------------------------------------------
// Calcul définitif — prévu vs réel vs facturé
// ---------------------------------------------------------------------------
test("les trois colonnes se remplissent quand tout est connu", () => {
  const r = calculDefinitif({
    prevuTvacCentimes: 121000, prevuHtvaCentimes: 100000,
    reel: { mainOeuvre: 400, carburant: 80, materiel: 30, divers: 0, peages: 15 },
    facturation: { du_centimes: 121000, paye_centimes: 121000, solde_centimes: 0, factures: 1, etat: "paye" },
  });
  assert.equal(r.colonnes.prevu.tvac, 121000);
  assert.equal(r.colonnes.reel.total, 52500); // (400+80+30+15)*100
  assert.equal(r.colonnes.facture.du, 121000);
});

test("marge réelle = facturé − réel", () => {
  const r = calculDefinitif({
    reel: { mainOeuvre: 500 },
    facturation: { du_centimes: 100000, paye_centimes: 0, solde_centimes: 100000, factures: 1 },
  });
  assert.equal(r.marges.reelle_centimes, 50000);   // 100000 − 50000
  assert.equal(r.marges.reelle_pct, 50);
});

test("écart de devis = facturé − prévu, null si pas de prévu", () => {
  const avec = calculDefinitif({
    prevuTvacCentimes: 120000,
    facturation: { du_centimes: 100000, factures: 1 },
  });
  assert.equal(avec.marges.ecart_devis_centimes, -20000);
  const sans = calculDefinitif({ facturation: { du_centimes: 100000, factures: 1 } });
  assert.equal(sans.marges.ecart_devis_centimes, null);
});

test("alerte quand le chantier coûte plus qu'il n'a rapporté", () => {
  const r = calculDefinitif({
    reel: { mainOeuvre: 1500 },
    facturation: { du_centimes: 100000, solde_centimes: 0, factures: 1 },
  });
  assert.ok(r.alertes.some((a) => a.ton === "rouge"));
});

test("alerte solde restant dû", () => {
  const r = calculDefinitif({
    reel: { mainOeuvre: 100 },
    facturation: { du_centimes: 100000, paye_centimes: 40000, solde_centimes: 60000, factures: 1 },
  });
  assert.ok(r.alertes.some((a) => /reste due/i.test(a.texte)));
});

test("sans facture, le facturé est annoncé non comparable", () => {
  const r = calculDefinitif({ reel: { mainOeuvre: 100 }, facturation: { factures: 0 } });
  assert.equal(r.colonnes.facture.connu, false);
  assert.ok(r.alertes.some((a) => /Aucune facture/i.test(a.texte)));
});

test("une valeur absente ne devient jamais NaN", () => {
  const r = calculDefinitif({});
  assert.ok(!/NaN/.test(JSON.stringify(r)));
  assert.equal(r.colonnes.prevu.connu, false);
});

test("euroCentimes : absence affichée en tiret, pas en 0", () => {
  assert.equal(euroCentimes(null), "—");
  assert.match(euroCentimes(121000), /1[\s\u00a0\u202f]?210,00/);
});
