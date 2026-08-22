// =============================================================================
// RÉCEPTION PEPPOL — recevoir n'est pas accepter.
//
// L'obligation belge impose de POUVOIR recevoir des factures structurées. Mais
// une facture reçue n'engage pas : elle peut être erronée, en double, ou ne
// correspondre à aucune commande. Ces tests verrouillent la règle centrale —
// aucun document n'est approuvé ni comptabilisé sans qu'un humain soit passé.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETATS_RECEPTION, PASSAGES_RECEPTION, passageReceptionPermis,
  lireUblEntrant, empreinteDocument, verdictReception, comptabilisationPermise,
} from "../src/facturation/reception.js";
import { facture } from "../src/facturation/modele.js";
import { versXmlUBL } from "../src/facturation/ubl.js";

const FOURNISSEUR = {
  nom: "Fournisseur SPRL", tva: "BE0999888777", peppol_id: "0208:0999888777",
  rue: "Rue 5", cp: "9000", ville: "Gand", pays: "BE", iban: "BE68539007547034",
};
const NOUS = {
  nom: "Roovers", tva: "BE0478363616", peppol_id: "0208:0478363616",
  rue: "Rue 1", cp: "2000", ville: "Anvers", pays: "BE",
};

/** Un document entrant réaliste : produit par notre propre générateur. */
const xmlEntrant = (extra = {}) => versXmlUBL(facture({
  numero: "F-2026-555", date_emission: "2026-08-20", echeance: "2026-09-19",
  vendeur: FOURNISSEUR, acheteur: NOUS,
  lignes: [{ libelle: "Carburant", quantite: 1, prix_unitaire_centimes: 50000, tva_pct: 21 }],
  tva_pct_defaut: 21, reference_acheteur: "NA", ...extra,
}));

/* ── Lecture ────────────────────────────────────────────────────────────── */

test("un document produit par Dashprod est relu par Dashprod", () => {
  // L'aller-retour est le meilleur test disponible sans point d'accès réel :
  // si notre lecteur ne relit pas notre propre UBL, il ne relira rien.
  const r = lireUblEntrant(xmlEntrant());
  assert.equal(r.ok, true);
  assert.equal(r.document.numero, "F-2026-555");
  assert.equal(r.document.fournisseur.nom, "Fournisseur SPRL");
  assert.equal(r.document.date_emission, "2026-08-20");
});

test("les montants du fournisseur sont LUS, jamais recalculés", () => {
  // Recalculer les totaux d'une facture entrante reviendrait à réécrire la
  // facture de quelqu'un d'autre.
  const r = lireUblEntrant(xmlEntrant());
  assert.equal(r.document.total.du_centimes, 60500);
  assert.equal(r.document.total.htva_centimes, 50000);
  assert.equal(r.document.total.tva_centimes, 10500);
});

test("un avoir entrant est reconnu comme tel", () => {
  const r = lireUblEntrant(xmlEntrant({ type: "avoir", facture_corrigee: "F-2026-100" }));
  assert.equal(r.document.type, "avoir");
});

test("un document vide ou sans numéro est refusé, pas deviné", () => {
  assert.equal(lireUblEntrant("").ok, false);
  assert.equal(lireUblEntrant("   ").ok, false);
  const sansId = lireUblEntrant("<Invoice><cbc:IssueDate>2026-01-01</cbc:IssueDate></Invoice>");
  assert.equal(sansId.ok, false);
  assert.match(sansId.motif, /[Nn]uméro/);
});

/* ── Doublons ───────────────────────────────────────────────────────────── */

test("le doublon se reconnaît au couple fournisseur + numéro", () => {
  // Pas au contenu : un même document retransmis (reprise après incident,
  // webhook rejoué) peut différer d'un octet sans être une autre facture.
  const a = lireUblEntrant(xmlEntrant()).document;
  const b = lireUblEntrant(xmlEntrant()).document;
  assert.equal(empreinteDocument(a), empreinteDocument(b));

  const autre = lireUblEntrant(xmlEntrant({ numero: "F-2026-556" })).document;
  assert.notEqual(empreinteDocument(a), empreinteDocument(autre));
});

test("une deuxième réception du même document donne DOUBLON", () => {
  const doc = lireUblEntrant(xmlEntrant()).document;
  assert.equal(verdictReception(doc, []).etat, "A_VERIFIER");
  assert.equal(verdictReception(doc, [empreinteDocument(doc)]).etat, "DOUBLON");
});

/* ── LA RÈGLE : recevoir n'est pas accepter ─────────────────────────────── */

test("un document parfaitement complet s'arrête à « à vérifier »", () => {
  // Le cœur du lot. Même impeccable, une facture reçue n'est pas approuvée
  // d'office : c'est l'entreprise qui décide si elle doit cette somme.
  const doc = lireUblEntrant(xmlEntrant()).document;
  const v = verdictReception(doc, []);
  assert.equal(v.etat, "A_VERIFIER");
  assert.notEqual(v.etat, "APPROUVE");
  assert.notEqual(v.etat, "COMPTABILISE");
});

test("APPROUVE n'est atteignable QUE depuis « à vérifier »", () => {
  // Aucun chemin ne contourne l'humain.
  for (const [de, vers] of Object.entries(PASSAGES_RECEPTION)) {
    if (de === "A_VERIFIER") continue;
    assert.equal(vers.includes("APPROUVE"), false,
      `${de} ne doit pas mener directement à APPROUVE`);
  }
  assert.equal(passageReceptionPermis("A_VERIFIER", "APPROUVE").ok, true);
  assert.equal(passageReceptionPermis("RECU", "APPROUVE").ok, false);
});

test("COMPTABILISE n'est atteignable QUE depuis APPROUVE", () => {
  for (const [de, vers] of Object.entries(PASSAGES_RECEPTION)) {
    if (de === "APPROUVE") continue;
    assert.equal(vers.includes("COMPTABILISE"), false,
      `${de} ne doit pas mener directement à COMPTABILISE`);
  }
  // Verrou explicite en plus de la machine d'états — deux serrures valent mieux
  // qu'une sur une écriture comptable.
  assert.equal(comptabilisationPermise("A_VERIFIER").ok, false);
  assert.equal(comptabilisationPermise("RECU").ok, false);
  assert.equal(comptabilisationPermise("APPROUVE").ok, true);
});

test("un document incomplet part en vérification, il n'est jamais jeté", () => {
  // Un document reçu est une pièce légale : illisible ou non, on le garde et
  // on demande un examen.
  const sansFournisseur = { numero: "X", date_emission: "2026-01-01",
    fournisseur: {}, total: { du_centimes: 100 } };
  assert.equal(verdictReception(sansFournisseur, []).etat, "A_VERIFIER");

  const sansMontant = { numero: "X", date_emission: "2026-01-01",
    fournisseur: { tva: "BE0999888777" }, total: {} };
  const v = verdictReception(sansMontant, []);
  assert.equal(v.etat, "A_VERIFIER");
  assert.match(v.motif, /[Mm]ontant/);

  assert.equal(verdictReception(null, []).etat, "A_VERIFIER");
});

test("chaque état de réception a un libellé lisible", () => {
  for (const [cle, lib] of Object.entries(ETATS_RECEPTION)) {
    assert.ok(lib && lib.length > 2, `${cle} doit se dire en français`);
    assert.ok(PASSAGES_RECEPTION[cle], `${cle} doit déclarer ses passages`);
  }
});
