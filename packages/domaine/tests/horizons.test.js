// Tests — regroupement des dossiers par horizon (« à s'occuper »).
import test from "node:test";
import assert from "node:assert/strict";
import {
  ETATS_ACTIFS, ETATS_CLOS, lundiDe, libelleSemaine, horizon, aSOccuper,
  regrouperParHorizon, compteurUrgent,
} from "../src/crm/horizons.js";

// Lundi 3 août 2026, pour raisonner sans ambiguïté.
const AUJ = new Date("2026-08-03T09:00:00");
const A = (date, etat = "confirme", nom = "Client") =>
  ({ id: date + etat + nom, date_souhaitee: date, etat, client: { nom } });

test("la semaine commence le lundi", () => {
  assert.equal(lundiDe(new Date("2026-08-05T12:00:00")).getDate(), 3, "mercredi → lundi 3");
  assert.equal(lundiDe(new Date("2026-08-09T12:00:00")).getDate(), 3, "dimanche → lundi 3");
  assert.equal(lundiDe(new Date("2026-08-10T12:00:00")).getDate(), 10, "lundi → lui-même");
});

test("le libellé de semaine se lit, même à cheval sur deux mois", () => {
  assert.equal(libelleSemaine(new Date("2026-08-10T00:00:00")), "du 10 au 16 août");
  assert.equal(libelleSemaine(new Date("2026-07-27T00:00:00")),
               "du 27 juillet au 2 août");
});

// — Les horizons —
test("aujourd'hui, demain, cette semaine", () => {
  assert.equal(horizon("2026-08-03", AUJ).cle, "aujourdhui");
  assert.equal(horizon("2026-08-04", AUJ).cle, "demain");
  assert.equal(horizon("2026-08-07", AUJ).cle, "cette_semaine", "vendredi de la semaine en cours");
  assert.equal(horizon("2026-08-09", AUJ).cle, "cette_semaine", "dimanche compris");
});

test("le retard passe TOUJOURS en tête", () => {
  const h = horizon("2026-07-30", AUJ);
  assert.equal(h.cle, "retard");
  assert.equal(h.rang, 0, "rang le plus bas = affiché en premier");
});

test("les semaines suivantes sont nommées par leurs dates", () => {
  const h = horizon("2026-08-12", AUJ);
  assert.match(h.titre, /Semaine du 10 au 16 août/);
  assert.ok(h.rang > horizon("2026-08-07", AUJ).rang);
});

test("au-delà d'un mois, on regroupe au MOIS — on ne pilote pas à la semaine", () => {
  const h = horizon("2026-10-15", AUJ);
  assert.equal(h.titre, "octobre 2026");
  assert.match(h.cle, /^mois_2026_10$/);
});

test("un dossier sans date finit en dernier, mais n'est jamais masqué", () => {
  const h = horizon(null, AUJ);
  assert.equal(h.cle, "sans_date");
  assert.ok(h.rang > horizon("2027-01-01", AUJ).rang, "après tout le reste");
  assert.equal(horizon("pas une date", AUJ).cle, "sans_date");
});

// — Ce qui appelle une action —
test("un dossier clos ou annulé ne s'occupe plus", () => {
  for (const e of ETATS_CLOS) assert.equal(aSOccuper({ etat: e }), false);
  for (const e of ETATS_ACTIFS) assert.equal(aSOccuper({ etat: e }), true);
});

test("les états morts facture/paye ne sont plus considérés actifs", () => {
  // Depuis la séparation des cycles (0064), ce ne sont plus des états.
  assert.equal(ETATS_ACTIFS.includes("facture"), false);
  assert.equal(ETATS_ACTIFS.includes("paye"), false);
});

// — Regroupement —
test("les groupes sortent dans l'ordre du temps, retard en tête", () => {
  const g = regrouperParHorizon([
    A("2026-10-01"), A("2026-08-04"), A("2026-07-20"), A("2026-08-03"),
  ], { maintenant: AUJ });
  assert.deepEqual(g.map((x) => x.cle).slice(0, 3),
                   ["retard", "aujourdhui", "demain"]);
  assert.equal(g[g.length - 1].titre, "octobre 2026");
});

test("dans un groupe, la date la plus proche vient d'abord", () => {
  const g = regrouperParHorizon([
    A("2026-08-07", "confirme", "Zoé"), A("2026-08-05", "confirme", "Ali"),
  ], { maintenant: AUJ });
  const semaine = g.find((x) => x.cle === "cette_semaine");
  assert.equal(semaine.dossiers[0].client.nom, "Ali");
});

test("les dossiers terminés sont écartés de « à s'occuper »", () => {
  const g = regrouperParHorizon([
    A("2026-08-03", "confirme"), A("2026-08-03", "clos"), A("2026-08-03", "annule"),
  ], { maintenant: AUJ });
  assert.equal(g.find((x) => x.cle === "aujourdhui").dossiers.length, 1);
});

test("on peut demander TOUS les dossiers, terminés compris", () => {
  const g = regrouperParHorizon([A("2026-08-03", "clos")],
    { maintenant: AUJ, seulementActifs: false });
  assert.equal(g.length, 1);
});

test("on peut regrouper sur une autre date que le déménagement", () => {
  const g = regrouperParHorizon(
    [{ id: "x", etat: "devis", date_visite: "2026-08-03", date_souhaitee: "2026-12-01" }],
    { maintenant: AUJ, dateDe: (a) => a.date_visite });
  assert.equal(g[0].cle, "aujourdhui", "la visite prime si on le demande");
});

test("une liste vide ne casse rien", () => {
  assert.deepEqual(regrouperParHorizon([], { maintenant: AUJ }), []);
  assert.deepEqual(regrouperParHorizon(null, { maintenant: AUJ }), []);
});

// — Le compteur —
test("le compteur ne retient que ce qui presse", () => {
  const c = compteurUrgent([
    A("2026-07-25"), A("2026-07-28"), A("2026-08-03"),
    A("2026-08-20"), A("2026-08-03", "clos"),
  ], AUJ);
  assert.equal(c.retard, 2);
  assert.equal(c.aujourdhui, 1);
  assert.equal(c.total, 3, "ni le lointain ni le clos ne comptent");
});
