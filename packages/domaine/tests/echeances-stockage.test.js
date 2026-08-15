// =============================================================================
// Échéances récurrentes — boxe et zone.
//
// Deux modèles à ne surtout pas confondre :
//   · BOXE : le prix suit le VOLUME, box par box. Deux boxes se CUMULENT.
//   · ZONE : un forfait négocié pour le CONTRAT. Attacher une deuxième zone
//     n'en double pas le prix — c'est le sens d'un forfait.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  montantEcheance, estFacturee, echeancesDues, prorata,
} from "../src/stocks/stockage.js";

const BAREME = [
  { jusqua_m3: 5, prix_mensuel_centimes: 5000 },
  { jusqua_m3: 10, prix_mensuel_centimes: 8000 },
  { jusqua_m3: 20, prix_mensuel_centimes: 13000 },
];

const MOIS_PLEIN = { jours_couverts: 31, jours_mois: 31 };

/* ── Boxe : le volume, box par box ──────────────────────────────────────── */

test("un box est facturé selon sa tranche de volume", () => {
  const r = montantEcheance({
    nature: "box", boxes: [{ id: "b1", numero: "A12", volume_m3: 7 }],
    ...MOIS_PLEIN }, BAREME);
  assert.equal(r.centimes, 8000);       // 7 m³ → tranche des 10
  assert.equal(r.lignes.length, 1);
  assert.match(r.lignes[0].libelle, /A12/);
});

test("deux boxes se CUMULENT", () => {
  const r = montantEcheance({
    nature: "box",
    boxes: [{ id: "b1", numero: "A1", volume_m3: 4 },
            { id: "b2", numero: "A2", volume_m3: 12 }],
    ...MOIS_PLEIN }, BAREME);
  assert.equal(r.centimes, 5000 + 13000);
  assert.equal(r.lignes.length, 2);
});

test("un box hors barème vaut zéro ET le signale", () => {
  // Mieux vaut une facture visiblement à zéro qu'un montant inventé.
  const r = montantEcheance({
    nature: "box", boxes: [{ id: "b", numero: "XL", volume_m3: 90 }],
    ...MOIS_PLEIN }, BAREME);
  assert.equal(r.centimes, 0);
  assert.equal(r.hors_bareme, true);
});

/* ── Zone : un forfait pour le contrat ──────────────────────────────────── */

test("une zone est facturée au forfait négocié", () => {
  const r = montantEcheance({
    nature: "zone", tarif_centimes: 25000,
    zones: [{ id: "z1", nom: "Hall B" }], ...MOIS_PLEIN });
  assert.equal(r.centimes, 25000);
  assert.match(r.lignes[0].libelle, /Hall B/);
});

test("plusieurs zones NE doublent PAS le forfait", () => {
  // C'est le sens même d'un forfait : il porte sur le contrat, pas sur chaque
  // zone. Le contraire ferait doubler la facture en rattachant une zone.
  const une = montantEcheance({
    nature: "zone", tarif_centimes: 25000,
    zones: [{ id: "z1", nom: "Hall B" }], ...MOIS_PLEIN });
  const deux = montantEcheance({
    nature: "zone", tarif_centimes: 25000,
    zones: [{ id: "z1", nom: "Hall B" }, { id: "z2", nom: "Hall C" }],
    ...MOIS_PLEIN });
  assert.equal(deux.centimes, une.centimes);
  assert.match(deux.lignes[0].libelle, /Hall B, Hall C/);
  assert.match(deux.lignes[0].libelle, /Zones/);
});

/* ── Le prorata ─────────────────────────────────────────────────────────── */

test("un mois entamé se proratise sur les jours couverts", () => {
  // Contrat démarré le 20 : 12 jours sur 31.
  const r = montantEcheance({
    nature: "zone", tarif_centimes: 31000, zones: [],
    jours_couverts: 12, jours_mois: 31 });
  assert.equal(r.proratise, true);
  assert.equal(r.centimes, prorata(31000, 12, 31));
  assert.equal(r.plein_centimes, 31000);
  assert.ok(r.centimes < r.plein_centimes);
});

test("un mois complet n'est jamais proratisé", () => {
  const r = montantEcheance({
    nature: "zone", tarif_centimes: 25000, zones: [], ...MOIS_PLEIN });
  assert.equal(r.proratise, false);
  assert.equal(r.centimes, 25000);
});

test("sans information de jours, on facture le mois PLEIN", () => {
  // `jours_couverts` absent ne vaut pas zéro : un montant nul passerait
  // inaperçu et le client ne serait jamais facturé.
  const r = montantEcheance({ nature: "zone", tarif_centimes: 25000, zones: [] });
  assert.equal(r.centimes, 25000);
  assert.equal(r.proratise, false);
});

test("zéro jour couvert donne bien zéro, s'il est EXPLICITE", () => {
  const r = montantEcheance({
    nature: "zone", tarif_centimes: 25000, zones: [],
    jours_couverts: 0, jours_mois: 31 });
  assert.equal(r.centimes, 0);
  assert.equal(r.proratise, true);
});

/* ── Ce qui reste dû ────────────────────────────────────────────────────── */

test("une échéance déjà facturée ne se refacture pas", () => {
  assert.equal(estFacturee({ facturee_le: "2026-08-01T10:00:00Z" }), true);
  assert.equal(estFacturee({ facturee_le: null }), false);
  assert.equal(estFacturee({}), false);

  const dues = echeancesDues([
    { periode_debut: "2026-06-01", facturee_le: "2026-06-02T00:00:00Z" },
    { periode_debut: "2026-07-01", facturee_le: null },
    { periode_debut: "2026-08-01" },
  ]);
  assert.deepEqual(dues.map((e) => e.periode_debut), ["2026-07-01", "2026-08-01"]);
});
