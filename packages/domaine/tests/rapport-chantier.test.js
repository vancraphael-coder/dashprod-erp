// Tests — rapport de chantier et boucle d'écart (EX-10).
import test from "node:test";
import assert from "node:assert/strict";
import {
  NATURES, ETATS_CONSTAT, nature, naturesFacturables, constat, constatValide,
  aTraiter, impactValide, heuresSupplementaires, syntheseRapport, demandeAction,
} from "../src/operations/rapport-chantier.js";

const C = (o = {}) => ({
  nature: "objet_non_prevu", description: "Piano droit au 2e étage",
  minutes: 45, etat: "declare", ...o,
});

test("chaque nature répond à une question du bureau, en clair", () => {
  for (const n of NATURES) {
    assert.ok(n.titre && n.titre.length > 5, `titre manquant : ${n.cle}`);
    assert.ok(n.aide && n.aide.length > 15, `aide manquante : ${n.cle}`);
    assert.equal(typeof n.facturable, "boolean");
  }
});

test("dommage, réserve et incident ne sont JAMAIS facturables", () => {
  for (const cle of ["dommage", "reserve", "incident"]) {
    assert.equal(nature(cle).facturable, false, `${cle} ne doit pas être facturable`);
  }
  assert.equal(naturesFacturables().length, 3);
});

test("une nature inconnue retombe sur incident plutôt que de disparaître", () => {
  assert.equal(constat({ nature: "n'importe quoi" }).nature, "incident");
  assert.equal(nature("inexistante"), null);
});

test("un constat naît toujours à l'état déclaré", () => {
  assert.equal(constat(C()).etat, "declare");
  assert.equal(constat({ etat: "n'importe quoi" }).etat, "declare");
  assert.ok(ETATS_CONSTAT.includes("valide"));
});

// — Validité —
test("un constat sans description n'est pas exploitable", () => {
  const v = constatValide(C({ description: "abc" }));
  assert.equal(v.ok, false);
  assert.match(v.message, /Décrivez/);
});

test("un écart facturable sans estimation est refusé", () => {
  // Sans temps ni volume, le bureau ne peut ni facturer ni discuter.
  const v = constatValide(C({ minutes: 0, volume_m3: 0 }));
  assert.equal(v.ok, false);
  assert.match(v.message, /temps ou le volume/);
});

test("un dommage n'a pas besoin d'estimation — il engage autre chose", () => {
  const v = constatValide({ nature: "dommage",
    description: "Rayure sur le buffet, constatée au chargement" });
  assert.equal(v.ok, true);
});

test("un volume seul suffit pour un objet non prévu", () => {
  assert.equal(constatValide(C({ minutes: 0, volume_m3: 2.5 })).ok, true);
});

// — Le terrain n'invente aucun prix —
test("un constat ne porte JAMAIS de montant", () => {
  const c = constat({ ...C(), montant_centimes: 15000, prix: 150 });
  assert.equal("montant_centimes" in c, false, "le prix se décide au bureau");
  assert.equal("prix" in c, false);
});

// — Boucle de validation —
test("seuls les constats déclarés attendent une décision", () => {
  const cs = [C(), C({ etat: "valide" }), C({ etat: "refuse" })];
  assert.equal(aTraiter(cs).length, 1);
});

test("un écart REFUSÉ n'entre pas dans l'impact", () => {
  const i = impactValide([C({ etat: "refuse", minutes: 120 })]);
  assert.equal(i.minutes, 0);
  assert.equal(i.nb, 0);
});

test("un écart DÉCLARÉ mais pas encore validé n'entre pas non plus", () => {
  // Le bureau tranche : tant qu'il n'a pas validé, rien ne bouge.
  assert.equal(impactValide([C({ minutes: 90 })]).minutes, 0);
});

test("les écarts validés se cumulent en temps et en volume", () => {
  const i = impactValide([
    C({ etat: "valide", minutes: 45, volume_m3: 1.5 }),
    C({ etat: "ajuste", minutes: 30, volume_m3: 0.75 }),
    C({ etat: "declare", minutes: 999 }),
  ]);
  assert.equal(i.minutes, 75);
  assert.equal(i.volume_m3, 2.25);
  assert.equal(i.nb, 2);
});

test("un dommage validé n'ajuste pas le prix", () => {
  const i = impactValide([{ nature: "dommage", description: "Buffet rayé",
                            etat: "valide", minutes: 60 }]);
  assert.equal(i.minutes, 0, "un dommage n'est pas un supplément");
});

test("les heures supplémentaires se déduisent des minutes validées", () => {
  assert.equal(heuresSupplementaires([C({ etat: "valide", minutes: 90 })]), 1.5);
  assert.equal(heuresSupplementaires([]), 0);
});

// — Synthèse —
test("la synthèse compte séparément ce qui est sensible", () => {
  const s = syntheseRapport({ constats: [
    C({ etat: "valide", minutes: 45 }),
    { nature: "dommage", description: "Rayure buffet", etat: "declare" },
    { nature: "reserve", description: "Cartons emballés par le client", etat: "declare" },
  ] });
  assert.equal(s.nb_constats, 3);
  assert.equal(s.a_traiter, 2);
  assert.equal(s.sensibles, 2, "dommage et réserve remontent même sans impact prix");
  assert.equal(s.impact.minutes, 45);
});

test("un rapport avec des constats non traités appelle une action", () => {
  assert.equal(demandeAction({ constats: [C()] }), true);
  assert.equal(demandeAction({ constats: [C({ etat: "valide" })] }), false);
  assert.equal(demandeAction({ constats: [] }), false);
  assert.equal(demandeAction(null), false);
});

test("le détail regroupe par nature avec son titre lisible", () => {
  const s = syntheseRapport({ constats: [C(), C(), { nature: "dommage",
    description: "Rayure", etat: "declare" }] });
  const objets = s.detail.find((d) => d.nature === "objet_non_prevu");
  assert.equal(objets.nb, 2);
  assert.equal(objets.titre, "Objet non prévu");
});
