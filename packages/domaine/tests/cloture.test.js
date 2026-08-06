// Tests — clôture de dossier : lecture de la check-list et du bilan figé.
import test from "node:test";
import assert from "node:assert/strict";
import {
  synthese, verdict, trierPoints, pictoStatut, lignesBilan, mentionDerogation,
} from "../src/crm/cloture.js";

const pt = (cle, statut, bloquant) => ({ cle, libelle: cle, statut, bloquant });

test("les points qui bloquent remontent en tête", () => {
  const points = [
    pt("solde", "ok", true),
    pt("signature", "manquant", false),
    pt("rapports", "manquant", true),
    pt("missions", "sans_objet", true),
  ];
  const ordre = trierPoints(points).map((p) => p.cle);
  assert.equal(ordre[0], "rapports", "le bloquant manquant passe devant");
  assert.ok(ordre.indexOf("signature") < ordre.indexOf("solde"));
});

test("synthèse : bloquants et réserves ne se confondent pas", () => {
  const s = synthese({
    etat: "effectue",
    peut_cloturer: false,
    peut_cloturer_avec_motif: true,
    points: [pt("facture", "manquant", true), pt("signature", "manquant", false)],
  });
  assert.equal(s.nbBloquants, 1);
  assert.equal(s.reserves.length, 1);
  assert.equal(s.peutCloturer, false);
  assert.equal(s.peutForcer, true, "une dérogation reste possible avec motif");
});

test("une réserve seule n'empêche pas la clôture", () => {
  const s = synthese({
    etat: "effectue", peut_cloturer: true, peut_cloturer_avec_motif: true,
    points: [pt("signature", "manquant", false), pt("solde", "ok", true)],
  });
  assert.equal(s.peutCloturer, true);
  assert.equal(s.peutForcer, false, "rien à forcer : aucun point bloquant");
  assert.match(verdict({ ...s, etat: "effectue", peut_cloturer: true, points: s.points }),
               /réserve/);
});

test("verdict : le chantier non terminé s'annonce, il ne se refuse pas sèchement", () => {
  const v = verdict({ etat: "planifie", points: [], peut_cloturer: false });
  assert.match(v, /chantier sera terminé/);
});

test("verdict : un dossier clos le dit", () => {
  assert.match(verdict({ etat: "clos", points: [] }), /clôturé/);
});

test("verdict : le pluriel suit le nombre de points", () => {
  const un = verdict({ etat: "effectue", peut_cloturer: false,
    points: [pt("facture", "manquant", true)] });
  const deux = verdict({ etat: "effectue", peut_cloturer: false,
    points: [pt("facture", "manquant", true), pt("solde", "manquant", true)] });
  assert.match(un, /^Un point/);
  assert.match(deux, /^2 points/);
});

test("pictogrammes : trois statuts, trois signes distincts", () => {
  assert.equal(pictoStatut("ok"), "✓");
  assert.equal(pictoStatut("sans_objet"), "–");
  assert.equal(pictoStatut("manquant"), "✗");
});

test("bilan figé : les montants se lisent tels qu'ils ont été écrits", () => {
  const lignes = lignesBilan({
    facturation: { du_centimes: 121000, paye_centimes: 121000, solde_centimes: 0 },
    missions: { effectuees: 2, annulees: 1 },
    heures_chantier: 13.5,
    constats: { valides: 1, ajustes: 1, minutes_cumulees: 90, volume_cumule_m3: 2 },
    documents_signes: 1,
  });
  const dict = Object.fromEntries(lignes);
  assert.match(dict["Facturé"], /1[\s\u00a0\u202f]?210,00/);
  assert.equal(dict["Chantiers effectués"], "2");
  assert.equal(dict["Chantiers annulés"], "1");
  assert.equal(dict["Heures de chantier"], "13.50 h");
  assert.match(dict["Écarts retenus"], /^2 · 90 min · 2 m³$/);
});

test("bilan figé : une valeur absente ne devient jamais NaN à l'écran", () => {
  // Le piège Number(null) a déjà coûté six fois : ici l'absence vaut zéro,
  // parce qu'un bilan figé qui n'a rien écrit n'a rien encaissé.
  const dict = Object.fromEntries(lignesBilan({ facturation: {}, missions: {} }));
  assert.ok(!/NaN/.test(JSON.stringify(dict)), "aucun NaN affiché");
  assert.equal(dict["Heures de chantier"], "0.00 h");
});

test("bilan absent : aucune ligne inventée", () => {
  assert.deepEqual(lignesBilan(null), []);
});

test("une clôture par dérogation se voit et porte son motif", () => {
  const m = mentionDerogation({ derogation: { bloquants: 2, motif: "Litige client en cours" } });
  assert.match(m, /2 points non levés/);
  assert.match(m, /Litige client en cours/);
  assert.equal(mentionDerogation({}), null, "une clôture normale n'affiche rien");
});
