// =============================================================================
// A3 — LA FACTURATION RÉCURRENTE DES CONTRATS (boxe, zone).
// Trou comblé : 14 contrats, 0 échéance, 0 facture avant ce lot.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  periodesDues, montantPeriode, echeancesAcreer, echeanceModifiable,
  libelleEcheance, resteAFacturer,
} from "../src/stocks/recurrent.js";

const CONTRAT = { debut: "2026-01-15", periode: "mensuel", tarif_centimes: 9000 };

test("chaque mois commencé produit une période, jamais un mois à venir", () => {
  const p = periodesDues(CONTRAT, "2026-04-20");
  assert.equal(p.length, 4);                       // janv, févr, mars, avril
  assert.equal(p[0].debut, "2026-01-15");
  assert.equal(p[0].fin, "2026-02-15");
  // La période d'avril a commencé (le 15) : elle est due — facturation
  // d'avance, norme du self-storage. Mais mai n'existe pas encore.
  assert.equal(p[3].debut, "2026-04-15");
  assert.equal(p.some((x) => x.debut === "2026-05-15"), false);
});

test("un contrat qui n'a pas commencé ne doit RIEN", () => {
  assert.deepEqual(periodesDues({ ...CONTRAT, debut: "2027-01-01" }, "2026-04-20"), []);
  assert.deepEqual(periodesDues({ debut: null }, "2026-04-20"), []);
});

test("la sortie anticipée est facturée au PRORATA, pas au mois plein", () => {
  // Entré le 15/01, sorti le 08/02 : 24 jours sur 31, pas un mois entier.
  const c = { ...CONTRAT, fin: "2026-02-08" };
  const e = echeancesAcreer(c, [], "2026-04-20");
  assert.equal(e.length, 1);
  assert.equal(e[0].periode_fin, "2026-02-08");
  assert.ok(e[0].montant_centimes < 9000, "doit être inférieur au mois plein");
  assert.ok(e[0].montant_centimes > 6000, "mais proportionnel, pas symbolique");
});

test("rejouer la génération ne duplique JAMAIS une échéance", () => {
  // Idempotence : c'est ce qui permet de relancer le calcul sans crainte.
  const toutes = echeancesAcreer(CONTRAT, [], "2026-04-20");
  assert.equal(toutes.length, 4);
  const apres = echeancesAcreer(CONTRAT,
    [{ periode_debut: "2026-01-15" }, { periode_debut: "2026-02-15" }], "2026-04-20");
  assert.equal(apres.length, 2);
  assert.equal(apres[0].periode_debut, "2026-03-15");
});

test("le passage de mois court est géré (31 janvier → 28/29 février)", () => {
  const c = { debut: "2026-01-31", periode: "mensuel", tarif_centimes: 9000 };
  const p = periodesDues(c, "2026-03-05");
  assert.equal(p[0].debut, "2026-01-31");
  // Pas de 31 février : la période s'arrête au dernier jour du mois.
  assert.match(p[0].fin, /^2026-02-2[89]$/);
});

test("trimestriel et annuel suivent le même modèle", () => {
  const t = periodesDues({ debut: "2026-01-01", periode: "trimestriel", tarif_centimes: 27000 },
    "2026-08-01");
  assert.equal(t.length, 3);                       // janv, avril, juillet
  assert.equal(t[1].debut, "2026-04-01");
  const a = periodesDues({ debut: "2026-01-01", periode: "annuel", tarif_centimes: 100000 },
    "2026-08-01");
  assert.equal(a.length, 1);
});

test("une échéance FACTURÉE est figée : on ne la retouche pas", () => {
  // Comme toute pièce émise : corriger, c'est faire un avoir.
  assert.equal(echeanceModifiable({ montant_centimes: 9000 }), true);
  assert.equal(echeanceModifiable({ facture_id: "abc" }), false);
  assert.equal(echeanceModifiable({ facturee_le: "2026-02-01" }), false);
});

test("le libellé dit QUOI et QUAND (sinon le client ne rapproche pas)", () => {
  const l = libelleEcheance({ periode_debut: "2026-01-15", periode_fin: "2026-02-15" }, "Box A12");
  assert.match(l, /Box A12/);
  assert.match(l, /2026-01-15/);
  assert.match(l, /2026-02-15/);
});

test("le reste à facturer ignore ce qui est déjà facturé", () => {
  const total = resteAFacturer([
    { montant_centimes: 9000 },
    { montant_centimes: 9000, facture_id: "x" },   // déjà facturée
    { montant_centimes: 4500 },
  ]);
  assert.equal(total, 13500);
});

test("un tarif absent ou nul ne produit aucune échéance", () => {
  // Piège Number(null) : un contrat sans tarif ne facture pas 0 €, il ne
  // facture RIEN — et le cycle CONTRAT (A1) refuse déjà de l'activer.
  assert.equal(montantPeriode({ debut: "2026-01-01", fin: "2026-02-01" }, null), 0);
  assert.deepEqual(echeancesAcreer({ ...CONTRAT, tarif_centimes: 0 }, [], "2026-04-20"), []);
});
