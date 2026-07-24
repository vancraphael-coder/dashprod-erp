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

// — Coût employeur : SCP 140.05, législation en vigueur 2026 —
import { coutEmployeur, coutHoraireReel, indexationARevoir, SECTEUR_140_05 }
  from "../src/rh/paie.js";

test("SANS taux ONSS patronale, le coût total n'est PAS calculé", () => {
  const c = coutEmployeur({ brut_centimes: 100000 });
  assert.equal(c.onss_connu, false);
  assert.equal(c.total_centimes, null, "un coût deviné fausserait le prix client");
  assert.equal(c.coefficient, null);
});

test("avec le taux réel, le coût employeur se calcule", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25 });
  assert.equal(c.base_centimes, 108000, "assiette ouvrier à 108 %");
  assert.equal(c.onss_patronale_centimes, 27000);
  assert.ok(c.total_centimes > 100000);
  assert.ok(c.coefficient > 1);
});

test("pension complémentaire sectorielle 2026 : 1,09 % de la base", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25 });
  assert.equal(c.pension_pct, SECTEUR_140_05.pension_complementaire_pct);
  assert.equal(c.pension_complementaire_centimes, Math.round(108000 * 0.0109));
});

test("chèques-repas : 2 € employeur par jour presté", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25,
                            joursPrestes: 20, anciennete_mois: 12 });
  assert.equal(c.cheques_repas_centimes, 20 * 200);
  assert.equal(c.cheques_repas_dus, true);
});

test("délai d'attente de 6 mois : pas de chèque-repas pour un nouveau", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25,
                            joursPrestes: 20, anciennete_mois: 3 });
  assert.equal(c.cheques_repas_centimes, 0);
  assert.equal(c.cheques_repas_dus, false, "une indemnité de repas est versée à la place");
});

test("à 6 mois pile, le droit s'ouvre", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25,
                            joursPrestes: 10, anciennete_mois: 6 });
  assert.equal(c.cheques_repas_dus, true);
});

test("le coefficient de charge est le multiplicateur du brut", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25,
                            joursPrestes: 20, anciennete_mois: 12 });
  assert.equal(c.coefficient, Math.round((c.total_centimes / 100000) * 100) / 100);
  assert.ok(c.coefficient >= 1.25, "au moins ONSS patronale + pension");
});

test("coût horaire réel : ce qui doit alimenter le barème client", () => {
  const c = coutEmployeur({ brut_centimes: 100000, onssPatronalePct: 25 });
  const h = coutHoraireReel(c, 100);
  assert.ok(h > 1000, "l'heure coûte plus que le brut horaire");
  assert.equal(coutHoraireReel(c, 0), null);
  assert.equal(coutHoraireReel({ total_centimes: null }, 10), null);
});

test("un statut employé cotise sur 100 %, pas 108 %", () => {
  const o = coutEmployeur({ brut_centimes: 100000, statut: "ouvrier", onssPatronalePct: 25 });
  const e = coutEmployeur({ brut_centimes: 100000, statut: "employe", onssPatronalePct: 25 });
  assert.equal(e.base_centimes, 100000);
  assert.ok(o.total_centimes > e.total_centimes);
});

test("l'indexation sectorielle est signalée quand elle date de l'an dernier", () => {
  assert.equal(indexationARevoir(SECTEUR_140_05, new Date("2026-07-21")), false);
  assert.equal(indexationARevoir(SECTEUR_140_05, new Date("2027-02-01")), true,
    "au 1er janvier suivant, le barème doit être réindexé");
});

test("les constantes sectorielles portent leur date d'application", () => {
  assert.equal(SECTEUR_140_05.duree_hebdo_max, 38);
  assert.equal(SECTEUR_140_05.cheque_repas.valeur_centimes, 309);
  assert.equal(SECTEUR_140_05.cheque_repas.part_employeur_centimes
             + SECTEUR_140_05.cheque_repas.part_travailleur_centimes, 309);
  assert.ok(SECTEUR_140_05.indexation_derniere);
});
