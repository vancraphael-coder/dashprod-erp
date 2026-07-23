// Tests — paie : brut depuis les heures réelles, ONSS, et refus d'inventer un net.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ONSS_TRAVAILLEUR, ASSIETTE, brutPeriode, decompte, decompteEquipe,
  bornesPeriode, periodeCourante, STATUT_PAR_METIER,
} from "../src/rh/paie.js";

test("brutPeriode : heures × taux", () => {
  assert.equal(brutPeriode([{ heures: 8, taux_horaire_centimes: 1800 }]), 14400);
});

test("brutPeriode : la majoration s'applique", () => {
  assert.equal(brutPeriode([{ heures: 2, taux_horaire_centimes: 2000, majoration: 1.5 }]), 6000);
});

test("brutPeriode : heures aberrantes ignorées, jamais de brut négatif", () => {
  assert.equal(brutPeriode([{ heures: -5, taux_horaire_centimes: 2000 }]), 0);
  assert.equal(brutPeriode([{ heures: "abc", taux_horaire_centimes: 2000 }]), 0);
  assert.equal(brutPeriode(null), 0);
});

test("ONSS ouvrier : assiette à 108 % du brut", () => {
  const d = decompte({ brut_centimes: 100000, statut: "ouvrier" });
  assert.equal(d.assiette, ASSIETTE.ouvrier);
  assert.equal(d.onss_centimes, Math.round(100000 * 1.08 * ONSS_TRAVAILLEUR));
  assert.equal(d.imposable_centimes, 100000 - d.onss_centimes);
});

test("ONSS employé : assiette à 100 %", () => {
  const d = decompte({ brut_centimes: 100000, statut: "employe" });
  assert.equal(d.onss_centimes, Math.round(100000 * ONSS_TRAVAILLEUR));
});

test("un ouvrier cotise plus qu'un employé à brut égal", () => {
  const o = decompte({ brut_centimes: 200000, statut: "ouvrier" });
  const e = decompte({ brut_centimes: 200000, statut: "employe" });
  assert.ok(o.onss_centimes > e.onss_centimes);
});

test("SANS précompte renseigné, le net n'est PAS inventé", () => {
  const d = decompte({ brut_centimes: 100000 });
  assert.equal(d.precompte_connu, false);
  assert.equal(d.precompte_centimes, null);
  assert.equal(d.net_centimes, null, "un net deviné serait un chiffre faux sur un document");
});

test("avec précompte renseigné, le net se calcule", () => {
  const d = decompte({ brut_centimes: 100000, precomptePct: 20 });
  assert.equal(d.precompte_connu, true);
  assert.equal(d.precompte_centimes, Math.round(d.imposable_centimes * 0.2));
  assert.equal(d.net_centimes, d.imposable_centimes - d.precompte_centimes);
});

test("un précompte aberrant est refusé, pas appliqué", () => {
  for (const mauvais of [-5, 150, "abc", NaN]) {
    assert.equal(decompte({ brut_centimes: 100000, precomptePct: mauvais }).net_centimes, null);
  }
});

test("retenues et avantages entrent dans le net", () => {
  const base = decompte({ brut_centimes: 100000, precomptePct: 20 });
  const avec = decompte({ brut_centimes: 100000, precomptePct: 20,
                          retenues_centimes: 5000, avantages_centimes: 2000 });
  assert.equal(avec.net_centimes, base.net_centimes - 5000 + 2000);
});

// — Règle demandée : un onglet par membre, retiré à l'archivage —
const EQUIPE = [
  { id: "a", nom: "Actif Un", metier: "demenageur", actif: true,
    lignes: [{ heures: 10, taux_horaire_centimes: 1800 }] },
  { id: "b", nom: "Actif Deux", metier: "chauffeur", actif: true,
    lignes: [{ heures: 8, taux_horaire_centimes: 2000 }] },
  { id: "z", nom: "Archivé", metier: "demenageur", actif: false,
    lignes: [{ heures: 20, taux_horaire_centimes: 1800 }] },
];

test("un membre archivé n'a plus d'onglet de paie", () => {
  const d = decompteEquipe(EQUIPE);
  assert.equal(d.lignes.length, 2);
  assert.equal(d.lignes.some((l) => l.nom === "Archivé"), false);
  assert.equal(d.totaux.membres, 2);
});

test("les heures d'un archivé ne gonflent pas les totaux de la période", () => {
  const d = decompteEquipe(EQUIPE);
  assert.equal(d.totaux.heures, 18);
  assert.equal(d.totaux.brut_centimes, 10 * 1800 + 8 * 2000);
});

test("l'historique reste consultable si on le demande explicitement", () => {
  assert.equal(decompteEquipe(EQUIPE, { inclureArchives: true }).lignes.length, 3);
});

test("le total NET reste null tant qu'un seul membre manque de précompte", () => {
  const partiel = [
    { id: "a", nom: "A", actif: true, precomptePct: 20,
      lignes: [{ heures: 10, taux_horaire_centimes: 1800 }] },
    { id: "b", nom: "B", actif: true,
      lignes: [{ heures: 10, taux_horaire_centimes: 1800 }] },
  ];
  const d = decompteEquipe(partiel);
  assert.equal(d.totaux.net_complet, false);
  assert.equal(d.totaux.net_centimes, null, "un total partiel serait trompeur");
  assert.ok(d.totaux.brut_centimes > 0, "le brut, lui, est toujours connu");
});

test("le statut découle du métier quand il n'est pas donné", () => {
  assert.equal(STATUT_PAR_METIER.demenageur, "ouvrier");
  const d = decompteEquipe([{ id: "x", nom: "X", metier: "demenageur", actif: true,
                              lignes: [{ heures: 1, taux_horaire_centimes: 10000 }] }]);
  assert.equal(d.lignes[0].assiette, ASSIETTE.ouvrier);
});

test("bornesPeriode : mois complet, années bissextiles comprises", () => {
  assert.deepEqual(bornesPeriode("2026-07"), { debut: "2026-07-01", fin: "2026-07-31" });
  assert.deepEqual(bornesPeriode("2024-02"), { debut: "2024-02-01", fin: "2024-02-29" });
  assert.equal(bornesPeriode("2026-13"), null);
  assert.equal(bornesPeriode("nimporte"), null);
});

test("periodeCourante : format AAAA-MM", () => {
  assert.match(periodeCourante(new Date(Date.UTC(2026, 6, 21))), /^\d{4}-\d{2}$/);
  assert.equal(periodeCourante(new Date(Date.UTC(2026, 6, 21))), "2026-07");
});
