// Tests — périodes comptables et récapitulatif TVA.
import test from "node:test";
import assert from "node:assert/strict";
import {
  bornesMois, bornesTrimestre, bornesAnnee, bornesPeriode, libellePeriode,
  trimestreCourant, dansPeriode, recapitulatif, controlerLot, lotPret,
} from "../src/facturation/periodes.js";

const F = (o = {}) => ({
  numero: "2026-000001", date_emission: "2026-08-15", type: "facture",
  acheteur: { nom: "Client SA" },
  total: { htva_centimes: 100000, tva_centimes: 21000, tvac_centimes: 121000 },
  ventilation_tva: [{ taux: 21, base_centimes: 100000, tva_centimes: 21000 }],
  ...o,
});

test("les bornes de mois tiennent compte de la longueur réelle", () => {
  assert.deepEqual(bornesMois(2026, 2), { debut: "2026-02-01", fin: "2026-02-28" });
  assert.deepEqual(bornesMois(2024, 2), { debut: "2024-02-01", fin: "2024-02-29" },
    "2024 est bissextile");
  assert.deepEqual(bornesMois(2026, 8), { debut: "2026-08-01", fin: "2026-08-31" });
});

test("un mois hors bornes est refusé plutôt que deviné", () => {
  assert.equal(bornesMois(2026, 0), null);
  assert.equal(bornesMois(2026, 13), null);
  assert.equal(bornesMois("abc", 5), null);
});

test("les trimestres suivent le rythme de la déclaration TVA belge", () => {
  assert.deepEqual(bornesTrimestre(2026, 1), { debut: "2026-01-01", fin: "2026-03-31" });
  assert.deepEqual(bornesTrimestre(2026, 3), { debut: "2026-07-01", fin: "2026-09-30" });
  assert.deepEqual(bornesTrimestre(2026, 4), { debut: "2026-10-01", fin: "2026-12-31" });
  assert.equal(bornesTrimestre(2026, 5), null);
});

test("l'exercice couvre l'année civile", () => {
  assert.deepEqual(bornesAnnee(2026), { debut: "2026-01-01", fin: "2026-12-31" });
});

test("bornesPeriode aiguille selon le type", () => {
  assert.deepEqual(bornesPeriode({ type: "mois", annee: 2026, mois: 8 }),
                   bornesMois(2026, 8));
  assert.deepEqual(bornesPeriode({ type: "trimestre", annee: 2026, trimestre: 2 }),
                   bornesTrimestre(2026, 2));
  assert.equal(bornesPeriode({ type: "semaine" }), null);
});

test("les libellés se lisent", () => {
  assert.equal(libellePeriode({ type: "trimestre", annee: 2026, trimestre: 3 }), "T3 2026");
  assert.equal(libellePeriode({ type: "mois", annee: 2026, mois: 8 }), "août 2026");
  assert.equal(libellePeriode({ type: "annee", annee: 2026 }), "exercice 2026");
});

test("le trimestre courant se déduit de la date", () => {
  assert.deepEqual(trimestreCourant(new Date("2026-08-15")),
                   { type: "trimestre", annee: 2026, trimestre: 3 });
  assert.deepEqual(trimestreCourant(new Date("2026-01-02")),
                   { type: "trimestre", annee: 2026, trimestre: 1 });
});

test("les bornes de période sont INCLUSES", () => {
  const b = bornesTrimestre(2026, 3);
  assert.equal(dansPeriode("2026-07-01", b), true, "premier jour inclus");
  assert.equal(dansPeriode("2026-09-30", b), true, "dernier jour inclus");
  assert.equal(dansPeriode("2026-06-30", b), false);
  assert.equal(dansPeriode("2026-10-01", b), false);
});

// — Récapitulatif —
test("le récapitulatif additionne HTVA, TVA et TVAC", () => {
  const r = recapitulatif([F(), F()]);
  assert.equal(r.nb, 2);
  assert.equal(r.htva_centimes, 200000);
  assert.equal(r.tva_centimes, 42000);
  assert.equal(r.tvac_centimes, 242000);
});

test("un AVOIR se SOUSTRAIT — sinon le chiffre d'affaires est faux", () => {
  const r = recapitulatif([F(), F({ type: "avoir", numero: "2026-000002" })]);
  assert.equal(r.htva_centimes, 0);
  assert.equal(r.tva_centimes, 0);
  assert.equal(r.nb_factures, 1);
  assert.equal(r.nb_avoirs, 1);
});

test("la ventilation reste PAR TAUX, jamais globale", () => {
  const mixte = F({ ventilation_tva: [
    { taux: 21, base_centimes: 100000, tva_centimes: 21000 },
    { taux: 6,  base_centimes: 50000,  tva_centimes: 3000 },
  ] });
  const r = recapitulatif([mixte]);
  assert.equal(r.par_taux.length, 2);
  assert.equal(r.par_taux[0].taux, 21, "trié du plus élevé au plus bas");
  assert.equal(r.par_taux[1].base_centimes, 50000);
});

test("un lot vide donne des totaux à zéro, pas une erreur", () => {
  const r = recapitulatif([]);
  assert.equal(r.nb, 0);
  assert.equal(r.htva_centimes, 0);
  assert.deepEqual(r.par_taux, []);
});

// — Contrôles avant remise au comptable —
test("une facture sans numéro bloque l'export", () => {
  const v = lotPret([F({ numero: null })]);
  assert.equal(v.pret, false);
  assert.match(v.bloquantes[0].message, /num/i);
});

test("une facture sans ventilation TVA bloque : le journal serait faux", () => {
  const v = lotPret([F({ ventilation_tva: [] })]);
  assert.equal(v.pret, false);
  assert.match(v.bloquantes[0].message, /ventilation/i);
});

test("un client sans nom avertit sans bloquer", () => {
  const v = lotPret([F({ acheteur: {} })]);
  assert.equal(v.pret, true);
  assert.equal(v.avertissements.length, 1);
});

test("une période vide le dit, sans crier au bloquant", () => {
  const v = lotPret([]);
  assert.equal(v.pret, true);
  assert.match(v.avertissements[0].message, /Aucune facture/);
});

test("un lot sain passe", () => {
  assert.equal(lotPret([F(), F({ numero: "2026-000002" })]).pret, true);
});
