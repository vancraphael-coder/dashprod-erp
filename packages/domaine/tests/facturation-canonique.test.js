// Tests — modèle canonique et ses adaptateurs.
// Chaque adaptateur est testé SEUL, depuis le même modèle : c'est tout
// l'intérêt de l'architecture. Aucun n'appelle le réseau.
import test from "node:test";
import assert from "node:assert/strict";
import { facture, ligne, ventilationTva, valider, echeanceDepuis }
  from "../src/facturation/modele.js";
import { versXmlUBL, preparerTransmission, passagePermis, estTermine, PASSAGES }
  from "../src/facturation/ubl.js";
import { versCsv, journalVentes, journalCsv, equilibre, COMPTES_DEFAUT }
  from "../src/facturation/exports.js";

const VENDEUR = { nom: "Déménagements Test SRL", tva: "BE0478363616",
  peppol_id: "0208:0478363616", rue: "Rue du Dépôt 9", cp: "1370",
  ville: "Jodoigne", pays: "BE" };
const ACHETEUR = { nom: "Client SA", tva: "BE0999888777",
  peppol_id: "0208:0999888777", rue: "Avenue Louise 1", cp: "1050",
  ville: "Bruxelles", pays: "BE" };

const base = (extra = {}) => facture({
  numero: "2026-000001", date_emission: "2026-07-21", echeance: "2026-08-20",
  vendeur: VENDEUR, acheteur: ACHETEUR,
  lignes: [{ libelle: "Déménagement", quantite: 1, prix_unitaire_centimes: 100000 }],
  communication: "+++123/4567/89012+++", ...extra,
});

// ── Modèle ─────────────────────────────────────────────────────────────────
test("le total de ligne est dérivé, jamais accepté de l'extérieur", () => {
  const l = ligne({ libelle: "Cartons", quantite: 10, prix_unitaire_centimes: 150 });
  assert.equal(l.montant_htva_centimes, 1500);
});

test("une quantité nulle ou aberrante donne un montant nul, pas NaN", () => {
  assert.equal(ligne({ libelle: "X", quantite: 0, prix_unitaire_centimes: 500 }).montant_htva_centimes, 0);
  assert.equal(ligne({ libelle: "X", quantite: "abc", prix_unitaire_centimes: 500 }).montant_htva_centimes, 0);
});

test("les totaux de facture découlent des lignes", () => {
  const f = base();
  assert.equal(f.total.htva_centimes, 100000);
  assert.equal(f.total.tva_centimes, 21000);
  assert.equal(f.total.tvac_centimes, 121000);
});

test("ventilation : une facture mixte 21 % / 6 % produit deux sous-totaux", () => {
  const f = base({ lignes: [
    { libelle: "Déménagement", quantite: 1, prix_unitaire_centimes: 100000, tva_pct: 21 },
    { libelle: "Travaux", quantite: 1, prix_unitaire_centimes: 50000, tva_pct: 6 },
  ] });
  assert.equal(f.ventilation_tva.length, 2);
  assert.equal(f.ventilation_tva.find((v) => v.taux === 21).tva_centimes, 21000);
  assert.equal(f.ventilation_tva.find((v) => v.taux === 6).tva_centimes, 3000);
  assert.equal(f.total.tva_centimes, 24000);
});

test("la TVA est calculée sur la base agrégée, pas ligne à ligne", () => {
  // Trois lignes à 3,33 € : ligne à ligne donnerait un centime d'écart.
  const f = base({ lignes: Array.from({ length: 3 }, () => (
    { libelle: "X", quantite: 1, prix_unitaire_centimes: 333, tva_pct: 21 })) });
  assert.equal(f.total.htva_centimes, 999);
  assert.equal(f.total.tva_centimes, Math.round(999 * 0.21));
});

test("un avoir porte des montants négatifs", () => {
  const a = base({ type: "avoir" });
  assert.ok(a.total.tvac_centimes < 0);
});

test("echeanceDepuis : délai de l'entreprise, changement de mois compris", () => {
  assert.equal(echeanceDepuis("2026-07-21", 30), "2026-08-20");
  assert.equal(echeanceDepuis("2026-01-31", 30), "2026-03-02");
  assert.equal(echeanceDepuis(null, 30), null);
});

// ── Validation ─────────────────────────────────────────────────────────────
test("une facture complète est valide pour un PDF", () => {
  assert.equal(valider(base(), "PDF").valide, true);
});

test("PEPPOL exige plus qu'un PDF : identifiants et adresses", () => {
  const sansPeppol = base({ acheteur: { ...ACHETEUR, peppol_id: null } });
  assert.equal(valider(sansPeppol, "PDF").valide, true, "le PDF passe");
  const v = valider(sansPeppol, "PEPPOL");
  assert.equal(v.valide, false, "Peppol refuse");
  assert.ok(v.erreurs.some((e) => /Peppol du client/i.test(e)));
});

test("une facture sans ligne est refusée", () => {
  assert.equal(valider(base({ lignes: [] })).valide, false);
});

test("une incohérence total/lignes est détectée", () => {
  const f = base();
  f.total.htva_centimes = 999999;
  assert.ok(valider(f).erreurs.some((e) => /Incohérence/i.test(e)));
});

// ── Adaptateur UBL ─────────────────────────────────────────────────────────
test("UBL : XML bien formé avec le profil BIS Billing 3.0", () => {
  const x = versXmlUBL(base());
  assert.match(x, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.ok(x.includes("urn:cen.eu:en16931:2017#compliant"));
  assert.ok(x.includes("<cbc:ID>2026-000001</cbc:ID>"));
  assert.ok(x.includes("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>"));
});

test("UBL : les montants sont en unités décimales, pas en centimes", () => {
  const x = versXmlUBL(base());
  assert.ok(x.includes(">1000.00<"), "HTVA en décimal");
  assert.ok(x.includes(">1210.00<"), "TVAC en décimal");
  assert.equal(x.includes(">100000<"), false, "aucun centime brut ne fuit");
});

test("UBL : l'identifiant Peppol porte son schemeID", () => {
  const x = versXmlUBL(base());
  assert.ok(x.includes('schemeID="0208"'));
  assert.ok(x.includes(">0478363616<"));
});

test("UBL : un avoir devient un CreditNote, pas une Invoice", () => {
  const x = versXmlUBL(base({ type: "avoir" }));
  assert.ok(x.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<CreditNote'));
  assert.ok(x.includes("<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>"));
});

test("UBL : les caractères spéciaux sont échappés", () => {
  const x = versXmlUBL(base({ acheteur: { ...ACHETEUR, nom: 'Dupont & Fils <"SA">' } }));
  assert.ok(x.includes("Dupont &amp; Fils &lt;&quot;SA&quot;&gt;"));
  assert.equal(x.includes('<"SA">'), false);
});

test("UBL : REFUSE de sérialiser une facture non conforme", () => {
  assert.throws(() => versXmlUBL(base({ acheteur: { ...ACHETEUR, peppol_id: null } })),
    /non conforme pour Peppol/);
});

test("UBL : chaque taux a son TaxSubtotal", () => {
  const x = versXmlUBL(base({ lignes: [
    { libelle: "A", quantite: 1, prix_unitaire_centimes: 100000, tva_pct: 21 },
    { libelle: "B", quantite: 1, prix_unitaire_centimes: 50000, tva_pct: 6 },
  ] }));
  assert.equal((x.match(/<cac:TaxSubtotal>/g) || []).length, 2);
});

// ── Machine d'états ────────────────────────────────────────────────────────
test("les passages d'état suivent l'ordre, sans saut", () => {
  assert.equal(passagePermis("BROUILLON", "VALIDEE"), true);
  assert.equal(passagePermis("BROUILLON", "DELIVREE"), false, "aucun saut d'étape");
  assert.equal(passagePermis("SOUMISE", "ACCEPTEE"), true);
  assert.equal(passagePermis("SOUMISE", "REJETEE"), true);
});

test("un état terminal ne repart pas", () => {
  assert.equal(estTermine("DELIVREE"), true);
  assert.equal(estTermine("REJETEE"), true);
  assert.equal(passagePermis("DELIVREE", "SOUMISE"), false);
});

test("un échec peut être réessayé après correction", () => {
  assert.equal(passagePermis("ECHEC", "PRETE"), true);
});

test("aucun état ne mène directement à DELIVREE depuis PRETE", () => {
  // DELIVREE ne s'obtient que sur retour réel du réseau, via SOUMISE→ACCEPTEE.
  assert.equal(PASSAGES.PRETE.includes("DELIVREE"), false);
});

test("preparerTransmission s'arrête à PRETE et ne simule aucun envoi", () => {
  const t = preparerTransmission(base(), "PEPPOL");
  assert.equal(t.etat, "PRETE");
  assert.ok(t.charge_utile.includes("<cbc:ID>2026-000001</cbc:ID>"));
  assert.equal(PASSAGES.PRETE.includes("ACCEPTEE"), false,
    "aucun statut réseau ne peut être atteint sans point d'accès");
});

test("preparerTransmission échoue proprement et dit ce qui manque", () => {
  const t = preparerTransmission(base({ acheteur: { ...ACHETEUR, peppol_id: null } }), "PEPPOL");
  assert.equal(t.etat, "ECHEC");
  assert.ok(t.erreurs.length > 0);
  assert.equal(t.charge_utile, null);
});

test("la clé d'idempotence est stable pour une même facture", () => {
  const a = preparerTransmission(base(), "PEPPOL").cle_idempotence;
  const b = preparerTransmission(base(), "PEPPOL").cle_idempotence;
  assert.equal(a, b, "deux envois accidentels = une seule transmission");
});

// ── Exports comptables ─────────────────────────────────────────────────────
test("CSV : en-tête, BOM Excel, montants décimaux", () => {
  const csv = versCsv([base()]);
  assert.ok(csv.startsWith("\uFEFF"), "BOM pour Excel");
  assert.ok(csv.includes("Date;Numero;Type"));
  assert.ok(csv.includes("1210.00"));
});

test("CSV : un point-virgule dans un nom ne casse pas les colonnes", () => {
  const csv = versCsv([base({ acheteur: { ...ACHETEUR, nom: "Dupont; Fils" } })]);
  assert.ok(csv.includes('"Dupont; Fils"'));
});

test("journal des ventes : débit client = crédit ventes + TVA", () => {
  const e = journalVentes([base()]);
  assert.equal(e.length, 3);
  assert.equal(e[0].compte, COMPTES_DEFAUT.clients);
  assert.equal(e[0].debit_centimes, 121000);
  assert.equal(e[1].credit_centimes, 100000);
  assert.equal(e[2].credit_centimes, 21000);
});

test("le journal est TOUJOURS équilibré", () => {
  const eq = equilibre(journalVentes([base(), base({ numero: "2026-000002" })]));
  assert.equal(eq.equilibre, true);
  assert.equal(eq.ecart_centimes, 0);
});

test("une facture mixte produit une écriture de vente par taux", () => {
  const e = journalVentes([base({ lignes: [
    { libelle: "A", quantite: 1, prix_unitaire_centimes: 100000, tva_pct: 21 },
    { libelle: "B", quantite: 1, prix_unitaire_centimes: 50000, tva_pct: 6 },
  ] })]);
  assert.equal(e.length, 5, "1 client + 2 ventes + 2 TVA");
  assert.equal(equilibre(e).equilibre, true);
});

test("les comptes du plan sont paramétrables", () => {
  const e = journalVentes([base()], { ventes: "701000" });
  assert.equal(e[1].compte, "701000");
  assert.equal(e[0].compte, COMPTES_DEFAUT.clients, "les autres gardent le défaut");
});

test("journalCsv produit les mêmes écritures, en CSV", () => {
  const csv = journalCsv([base()]);
  assert.ok(csv.includes("Date;Piece;Compte;Libelle;Debit;Credit"));
  assert.ok(csv.includes("1210.00"));
});

// ── Le point d'architecture : une source, plusieurs sorties ─────────────────
test("ARCHITECTURE : tous les canaux dérivent du MÊME modèle", () => {
  const f = base();
  const xml = versXmlUBL(f);
  const csv = versCsv([f]);
  const jrn = journalVentes([f]);
  // Le même total apparaît dans les trois sorties, sans recalcul divergent.
  assert.ok(xml.includes(">1210.00<"));
  assert.ok(csv.includes("1210.00"));
  assert.equal(jrn[0].debit_centimes, f.total.tvac_centimes);
});
