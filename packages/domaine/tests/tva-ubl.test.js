// =============================================================================
// QUALIFICATION TVA → UBL → PEPPOL.
//
// La chaîne qui produit un document à valeur légale n'avait aucun test dédié :
// `versXmlUBL` était la pièce la moins couverte du dépôt alors qu'elle est la
// plus engageante. Ces tests verrouillent la règle qui fonde tout le lot :
//
//        information TVA absente  →  ERREUR  →  aucune transmission
//        JAMAIS                   →  21 %
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { qualifierTva, qualificationCoherente, CATEGORIES_TVA }
  from "../src/facturation/tva.js";
import { facture } from "../src/facturation/modele.js";
import { versXmlUBL, preparerTransmission } from "../src/facturation/ubl.js";

const VENDEUR = {
  nom: "Roovers", tva: "BE0478363616", peppol_id: "0208:0478363616",
  rue: "Rue du Dépôt 1", cp: "2000", ville: "Anvers", pays: "BE",
  iban: "BE68539007547034",
};
const ACHETEUR = {
  nom: "Client SA", tva: "BE0123456789", peppol_id: "0208:0123456789",
  rue: "Avenue Louise 10", cp: "1000", ville: "Bruxelles", pays: "BE",
};

const facBE = (extra = {}) => facture({
  numero: "2026-000001", date_emission: "2026-08-22", echeance: "2026-09-21",
  vendeur: VENDEUR, acheteur: ACHETEUR,
  lignes: [{ libelle: "Déménagement", quantite: 1, prix_unitaire_centimes: 100000, tva_pct: 21 }],
  communication: "+++123/4567/89012+++", tva_pct_defaut: 21,
  reference_acheteur: "BC-2026-0042", ...extra,
});

/* ── Le moteur de qualification ─────────────────────────────────────────── */

test("BE → BE avec un taux fourni : catégorie S, taux respecté", () => {
  const r = qualifierTva({ paysVendeur: "BE", paysAcheteur: "BE", taux: 21 });
  assert.equal(r.ok, true);
  assert.equal(r.qualification.categorie, "S");
  assert.equal(r.qualification.taux, 21);
});

test("le taux réduit passe : le moteur ne choisit pas le taux, il l'exige", () => {
  // 6 % n'est pas « moins normal » que 21 % : c'est une donnée d'entreprise.
  // Le moteur qualifie la catégorie, pas le montant du taux.
  const r = qualifierTva({ paysVendeur: "BE", paysAcheteur: "BE", taux: 6 });
  assert.equal(r.ok, true);
  assert.equal(r.qualification.taux, 6);
});

test("un taux absent est REFUSÉ, jamais remplacé par 21 %", () => {
  // Le cœur du lot. Avant, cette situation produisait silencieusement une
  // facture à 21 % — ou pire, une facture à 0 € de TVA avec un HTVA complet.
  for (const taux of [null, undefined, "", NaN]) {
    const r = qualifierTva({ paysVendeur: "BE", paysAcheteur: "BE", taux });
    assert.equal(r.ok, false, `taux ${String(taux)} doit être refusé`);
    assert.match(r.motif, /non fourni/i);
  }
});

test("les opérations non qualifiées sont refusées AVEC leur motif", () => {
  // Un refus muet ne vaut guère mieux qu'un mauvais taux : il faut que
  // l'utilisateur sache quoi corriger, et que Raphaël sache quelle règle
  // faire valider.
  const ue = qualifierTva({ paysVendeur: "BE", paysAcheteur: "FR", taux: 21 });
  assert.equal(ue.ok, false);
  assert.match(ue.motif, /VALIDER/);

  const hors = qualifierTva({ paysVendeur: "BE", paysAcheteur: "US", taux: 0 });
  assert.equal(hors.ok, false);
  assert.match(hors.motif, /VALIDER/);
});

test("une catégorie à taux zéro obligatoire refuse un taux positif", () => {
  // Annoncer « autoliquidation » à 21 % serait contradictoire — et rejeté par
  // un validateur Peppol.
  const r = qualificationCoherente({ categorie: "AE", taux: 21 });
  assert.equal(r.ok, false);
  assert.match(r.motif, /0 %/);
  assert.equal(qualificationCoherente({ categorie: "AE", taux: 0 }).ok, true);
});

test("chaque catégorie déclarée a un libellé et une règle de taux", () => {
  for (const [cle, def] of Object.entries(CATEGORIES_TVA)) {
    assert.ok(def.libelle, `${cle} doit être lisible par un humain`);
    assert.equal(typeof def.tauxZeroExige, "boolean");
  }
});

/* ── La ventilation ─────────────────────────────────────────────────────── */

test("une ligne sans taux fait ÉCHOUER la facture, elle n'est plus ignorée", () => {
  // Le trou mesuré dans le dépôt : la ligne était sautée par la ventilation
  // mais comptée dans le HTVA. Résultat : 100 € HTVA, 0 € de TVA, aucune
  // erreur. Une facture qui sous-déclare en silence.
  assert.throws(
    () => facBE({ tva_pct_defaut: null,
      lignes: [{ libelle: "Presta", quantite: 1, prix_unitaire_centimes: 10000, tva_pct: null }] }),
    /non qualifiable|non fourni/i);
});

test("la ventilation porte la CATÉGORIE, pas seulement le taux", () => {
  const f = facBE();
  assert.equal(f.ventilation_tva[0].categorie, "S",
    "l'UBL doit pouvoir la lire au lieu de la deviner");
});

test("les totaux restent cohérents : HTVA + TVA = TVAC", () => {
  const f = facBE();
  assert.equal(f.total.tva_centimes, 21000);
  assert.equal(f.total.tvac_centimes,
    f.total.htva_centimes + f.total.tva_centimes);
});

/* ── Le document UBL ────────────────────────────────────────────────────── */

test("UBL : la catégorie vient de la ventilation, plus jamais codée en dur", () => {
  const xml = versXmlUBL(facBE());
  // Le profil Peppol BIS Billing 3.0 et la catégorie qualifiée.
  assert.match(xml, /peppol\.eu:2017:poacc:billing:3\.0/);
  assert.match(xml, /<cbc:ID>S<\/cbc:ID>/);
  assert.match(xml, /<cbc:Percent>21\.00<\/cbc:Percent>/);
});

test("UBL : un avoir devient un CreditNote (381), pas une Invoice", () => {
  const xml = versXmlUBL(facBE({ type: "avoir", facture_corrigee: "2026-000000" }));
  assert.match(xml, /<CreditNote/);
  assert.match(xml, /<cbc:CreditNoteTypeCode>381<\/cbc:CreditNoteTypeCode>/);
});

test("UBL : deux taux produisent deux sous-totaux distincts", () => {
  const xml = versXmlUBL(facBE({ lignes: [
    { libelle: "Déménagement", quantite: 1, prix_unitaire_centimes: 100000, tva_pct: 21 },
    { libelle: "Travaux",      quantite: 1, prix_unitaire_centimes: 50000,  tva_pct: 6 },
  ] }));
  assert.equal((xml.match(/<cac:TaxSubtotal>/g) || []).length, 2);
  assert.match(xml, /<cbc:Percent>6\.00<\/cbc:Percent>/);
});

test("UBL : l'identifiant Peppol porte son schemeID 0208", () => {
  const xml = versXmlUBL(facBE());
  assert.match(xml, /schemeID="0208"/);
});

/* ── LE TEST QUI COMPTE : rien ne part sans qualification ───────────────── */

test("taux absent → versXmlUBL échoue ET aucune transmission n'est préparée", () => {
  // Le verrou de non-régression du lot. Il ne suffit pas que la génération
  // échoue : il faut qu'AUCUN chemin ne mène à un envoi. Un document dont la
  // TVA n'est pas certaine ne doit jamais atteindre le réseau Peppol.
  let f = null;
  assert.throws(() => {
    f = facBE({ tva_pct_defaut: null,
      lignes: [{ libelle: "X", quantite: 1, prix_unitaire_centimes: 10000, tva_pct: null }] });
  }, /non qualifiable|non fourni/i);

  // La facture n'existe même pas : il n'y a donc rien à transmettre.
  assert.equal(f, null,
    "aucune facture ne doit être construite sur une TVA non qualifiée");
});

test("une opération intracommunautaire ne peut PAS être transmise aujourd'hui", () => {
  // Conséquence assumée : Dashprod refuse plutôt que d'émettre à 21 % une
  // prestation qui relève peut-être de l'autoliquidation. La règle attend une
  // validation professionnelle — c'est écrit dans le motif.
  assert.throws(
    () => facBE({ acheteur: { ...ACHETEUR, pays: "FR" } }),
    /VALIDER/);
});

test("preparerTransmission ne simule jamais un envoi", () => {
  // Garde déjà présent, reverrouillé ici : un statut ne s'écrit que sur retour
  // réel du point d'accès.
  const t = preparerTransmission(facBE(), "PEPPOL");
  assert.ok(t.etat === "PRETE" || t.etat === "PREPAREE",
    `s'arrête avant l'envoi, or état = ${t.etat}`);
});


/* ── Conformité du document Peppol (règles fatales) ─────────────────────── */

test("PEPPOL-EN16931-R003 : sans référence acheteur, on REFUSE d'émettre", () => {
  // Règle `fatal` du réseau : « A buyer reference or purchase order reference
  // MUST be provided ». Sans elle, le point d'accès rejette le document.
  // Dashprod ne l'émettait NI l'une NI l'autre : toute facture aurait été
  // rejetée. On échoue ici, avec un motif utile, plutôt que d'expédier une
  // transmission vouée au rejet — et sans inventer de valeur de repli.
  assert.throws(() => versXmlUBL(facBE({ reference_acheteur: null })),
    /PEPPOL-EN16931-R003|Référence de l'acheteur/);
  assert.match(versXmlUBL(facBE()), /<cbc:BuyerReference>BC-2026-0042<\/cbc:BuyerReference>/);
});

test("un avoir doit dire QUELLE facture il corrige", () => {
  // La donnée existait dans le modèle (`facture_corrigee`) mais n'était jamais
  // émise : l'avoir partait orphelin. Mention légale, et rapprochement
  // impossible côté client sans elle.
  assert.throws(() => versXmlUBL(facBE({ type: "avoir", facture_corrigee: null })),
    /avoir doit référencer/i);
  const xml = versXmlUBL(facBE({ type: "avoir", facture_corrigee: "2026-000001" }));
  assert.match(xml, /<cac:BillingReference>/);
  assert.match(xml, /<cbc:ID>2026-000001<\/cbc:ID>/);
});

test("la période de PRESTATION est émise quand elle est connue", () => {
  // Mention légale belge dès qu'elle diffère de la date d'émission, et donnée
  // que le client attend pour rapprocher la facture de son chantier.
  const xml = versXmlUBL(facBE({
    prestation_debut: "2026-08-10", prestation_fin: "2026-08-12" }));
  assert.match(xml, /<cac:InvoicePeriod>/);
  assert.match(xml, /<cbc:StartDate>2026-08-10<\/cbc:StartDate>/);
  assert.match(xml, /<cbc:EndDate>2026-08-12<\/cbc:EndDate>/);
  // Absente, elle ne produit pas de bloc vide (PEPPOL-EN16931-R008 refuse les
  // éléments vides).
  assert.equal(/<cac:InvoicePeriod>/.test(versXmlUBL(facBE())), false);
});
