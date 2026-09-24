// =============================================================================
// DÉCOMPTE DE FIN DE CHANTIER — le montant annoncé au client au téléphone.
//
// Un chiffre faux annoncé à un client ne se rattrape pas : il l'a entendu. Ces
// tests prouvent que le décompte (1) passe par le MÊME moteur que le devis,
// (2) compte ce qui doit l'être aux deux moments du métier, et (3) refuse de
// conclure quand une donnée manque plutôt que de l'inventer.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import {
  decompterChantier, arrondirAuPas, minutesDePause, formaterDuree,
  montantPourHeures, rangEtape, reglesDecompte, decrireRegles,
} from "../src/operations/decompte-chantier.js";
import { calculerScenario } from "../src/chiffrage/moteur.js";

const DEVIS = { formule: "tarifaire", nbDemenageurs: 3, heures: 5, nbCamions: 1,
                km: 40, elevateur: false, remisePct: 0 };
const depart = new Date("2026-09-25T07:00:00Z");
const a = (hhmm) => new Date(`2026-09-25T${hhmm}:00Z`);

test("même moteur que le devis : même heures → même montant, au centime", () => {
  const dec = decompterChantier({ depart, instant: a("11:00"), moment: "avant_retour_depot",
                                   minutesRetour: 60, entrees: DEVIS });
  assert.equal(dec.heures, 5);
  const devis = calculerScenario({ ...DEVIS, heures: 5 });
  assert.equal(dec.montant.tvac_centimes, devis.tvac_centimes);
});

test("avant déchargement : écoulé + déchargement restant + retour", () => {
  const dec = decompterChantier({ depart, instant: a("10:00"), moment: "avant_dechargement",
    minutesDechargement: 75, minutesRetour: 45, entrees: DEVIS });
  // 180 + 75 + 45 = 300 min = 5 h
  assert.equal(dec.lignes.travaillees, 180);
  assert.equal(dec.lignes.facturables, 300);
  assert.equal(dec.heures, 5);
  assert.equal(dec.pret, true);
});

test("avant retour dépôt : le déchargement n'est plus compté", () => {
  const dec = decompterChantier({ depart, instant: a("10:00"), moment: "avant_retour_depot",
    minutesDechargement: 75, minutesRetour: 45, entrees: DEVIS });
  assert.equal(dec.lignes.dechargement, null);
  assert.equal(dec.lignes.facturables, 225);   // 180 + 45
});

test("le quart d'heure entamé est dû", () => {
  assert.equal(arrondirAuPas(181), 195);
  assert.equal(arrondirAuPas(180), 180);
  assert.equal(arrondirAuPas(0), 0);
  const dec = decompterChantier({ depart, instant: a("10:01"), moment: "avant_retour_depot",
    minutesRetour: 0, entrees: DEVIS });
  assert.equal(dec.lignes.facturables, 195);
  assert.equal(dec.heures, 3.25);
});

test("les pauses déclarées ne sont pas facturées, et seulement leur part dans la plage", () => {
  const pauses = [{ debut: a("09:00"), fin: a("09:30") },    // 30 min dedans
                  { debut: a("06:30"), fin: a("07:15") },    // 15 min dedans
                  { debut: a("12:00"), fin: a("12:30") }];   // hors plage
  assert.equal(minutesDePause(pauses, depart, a("10:00")), 45);
  const dec = decompterChantier({ depart, instant: a("10:00"), pauses,
    moment: "avant_retour_depot", minutesRetour: 45, entrees: DEVIS });
  assert.equal(dec.lignes.facturables, 180);   // 180 − 45 + 45
});

test("donnée manquante : aucun montant inventé", () => {
  const dec = decompterChantier({ depart, instant: a("10:00"),
    moment: "avant_dechargement", minutesRetour: 45, entrees: DEVIS });
  assert.equal(dec.pret, false);
  assert.equal(dec.montant, null);
  assert.match(dec.manques.join(" "), /déchargement/);
});

test("sans départ pointé, pas de décompte", () => {
  const dec = decompterChantier({ instant: a("10:00"), moment: "avant_retour_depot",
    minutesRetour: 30, entrees: DEVIS });
  assert.equal(dec.pret, false);
  assert.match(dec.manques.join(" "), /départ/);
});

test("un zéro saisi est une vraie valeur, pas un manque", () => {
  const dec = decompterChantier({ depart, instant: a("10:00"), moment: "avant_retour_depot",
    minutesRetour: 0, entrees: DEVIS });
  assert.equal(dec.pret, true);
});

test("forfait : le montant est le prix ferme, les heures n'y changent rien", () => {
  const F = { formule: "forfait", forfaitTvacEuros: 1210, nbDemenageurs: 3 };
  const dec = decompterChantier({ depart, instant: a("15:00"), moment: "avant_retour_depot",
    minutesRetour: 60, entrees: F });
  assert.equal(dec.forfait, true);
  assert.equal(dec.montant.tvac_centimes, 121000);
});

test("le barème de l'organisation est celui du devis, pas la référence", () => {
  const ref = { bareme: { 3: 150 } };
  const m = montantPourHeures(DEVIS, 5, ref);
  assert.equal(m.tvac_centimes, calculerScenario({ ...DEVIS, heures: 5 }, {}, ref).tvac_centimes);
  assert.notEqual(m.tvac_centimes, montantPourHeures(DEVIS, 5).tvac_centimes);
});

test("ajustement manuel tracé, jamais négatif au total", () => {
  const dec = decompterChantier({ depart, instant: a("08:00"), moment: "avant_retour_depot",
    minutesRetour: 0, ajustementMinutes: -500, entrees: DEVIS });
  assert.equal(dec.lignes.ajustement, -500);
  assert.equal(dec.lignes.facturables, 0);
});

test("lisible au téléphone", () => {
  assert.equal(formaterDuree(255), "4 h 15");
  assert.equal(formaterDuree(240), "4 h");
  assert.equal(formaterDuree(40), "40 min");
});

test("les étapes du circuit", () => {
  assert.equal(rangEtape(null), 0);
  assert.equal(rangEtape("valide_chef"), 1);
  assert.equal(rangEtape("valide_bureau"), 2);
  assert.equal(rangEtape("communique"), 3);
});

test("règles de l'entreprise : demi-heure entamée", () => {
  const dec = decompterChantier({ depart, instant: a("10:01"), moment: "avant_retour_depot",
    minutesRetour: 0, entrees: DEVIS, regles: { pas_minutes: 30 } });
  assert.equal(dec.lignes.facturables, 210);   // 181 → 210
  assert.equal(dec.pas, 30);
});

test("règles de l'entreprise : minimum facturé, appliqué et signalé", () => {
  const dec = decompterChantier({ depart, instant: a("09:20"), moment: "avant_retour_depot",
    minutesRetour: 0, entrees: DEVIS, regles: { minimum_heures: 3 } });
  assert.equal(dec.lignes.arrondies, 150);
  assert.equal(dec.lignes.facturables, 180);
  assert.equal(dec.minimumApplique, true);
});

test("règles absentes ou invalides : valeurs par défaut, jamais NaN", () => {
  assert.deepEqual(reglesDecompte(null), { pas_minutes: 15, minimum_heures: 0, retour_defaut_minutes: null });
  assert.deepEqual(reglesDecompte({ decompte: { pas_minutes: 7, minimum_heures: "x", retour_defaut_minutes: "" } }),
                   { pas_minutes: 15, minimum_heures: 0, retour_defaut_minutes: null });
  assert.equal(reglesDecompte({ decompte: { retour_defaut_minutes: 45 } }).retour_defaut_minutes, 45);
});

test("la règle se lit en une phrase", () => {
  assert.equal(decrireRegles({ pas_minutes: 15 }), "Quart d'heure entamé compté");
  assert.equal(decrireRegles({ pas_minutes: 60, minimum_heures: 3 }), "Heure entamée comptée · minimum 3 h");
});
