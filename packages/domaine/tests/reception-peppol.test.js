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
import { journalAchats, tiersCsv, inventaireExport }
  from "../src/facturation/exports.js";
import { verifierAppel, cleIdempotence, routerWebhook, traiterAppel, GENRES }
  from "../src/facturation/webhook.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const lireDomaineFichier = (rel) => readFileSync(join(SRC, rel), "utf8");

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

/* ── Export comptable : réversibilité ───────────────────────────────────── */

test("le journal des achats n'inclut QUE les documents approuvés", () => {
  // Une facture reçue mais non validée n'a rien à faire dans une comptabilité :
  // recevoir n'est pas accepter, et cette règle doit tenir jusqu'à l'export.
  const e = journalAchats([
    { etat: "APPROUVE", type: "facture", numero: "F-1", date_emission: "2026-08-01",
      fournisseur_nom: "Total", htva_centimes: 50000, tva_centimes: 10500,
      tvac_centimes: 60500 },
    { etat: "A_VERIFIER", numero: "F-2", htva_centimes: 99999 },
    { etat: "RECU", numero: "F-3", htva_centimes: 88888 },
    { etat: "REFUSE", numero: "F-4", htva_centimes: 77777 },
  ]);
  assert.equal(e.every((x) => x.piece === "F-1"), true,
    "seul le document approuvé produit des écritures");
});

test("le journal des achats est équilibré — sinon aucun cabinet ne l'importe", () => {
  const e = journalAchats([
    { etat: "APPROUVE", numero: "F-1", date_emission: "2026-08-01",
      htva_centimes: 50000, tva_centimes: 10500, tvac_centimes: 60500 },
    { etat: "COMPTABILISE", numero: "F-2", date_emission: "2026-08-02",
      htva_centimes: 20000, tva_centimes: 4200, tvac_centimes: 24200 },
  ]);
  const debit = e.reduce((s, x) => s + x.debit, 0);
  const credit = e.reduce((s, x) => s + x.credit, 0);
  assert.equal(debit, credit);
});

test("un avoir fournisseur inverse les écritures, il n'en crée pas de fausses", () => {
  const e = journalAchats([{ etat: "APPROUVE", type: "avoir", numero: "A-1",
    date_emission: "2026-08-03", htva_centimes: 10000, tva_centimes: 2100,
    tvac_centimes: 12100 }]);
  assert.equal(e.reduce((s, x) => s + x.debit, 0),
               e.reduce((s, x) => s + x.credit, 0));
  assert.ok(e.some((x) => x.debit < 0 || x.credit < 0),
    "un avoir porte des montants négatifs, comme côté vente");
});

test("l'export des tiers échappe les point-virgules des noms", () => {
  // Un nom de société contenant un « ; » casserait les colonnes chez le
  // comptable — et personne ne s'en apercevrait avant l'import.
  const csv = tiersCsv([{ nom: "Client; SA", tva: "BE0123456789" }]);
  assert.match(csv, /"Client; SA"/);
});

test("l'inventaire dit ce que le paquet contient", () => {
  // Le comptable reçoit une table des matières, pas un tas de fichiers.
  const inv = inventaireExport({ nbFactures: 12, nbAchats: 3, periode: "T3 2026" });
  assert.ok(inv.length >= 5);
  for (const x of inv) {
    assert.ok(x.fichier && x.contenu && x.usage,
      "chaque fichier dit son nom, son contenu et son usage");
  }
});

/* ── Le webhook du point d'accès : trois dangers, trois verrous ─────────── */

test("un appel non authentifié ne produit AUCUN effet", () => {
  // Une URL publique est appelable par n'importe qui. Sans ce verrou, un tiers
  // injecterait de fausses factures fournisseur.
  const S = "secret-partage";
  assert.equal(verifierAppel({ "x-digiteal-signature": S }, S).ok, true);
  assert.equal(verifierAppel({ "x-digiteal-signature": "faux" }, S).ok, false);
  assert.equal(verifierAppel({}, S).ok, false);
});

test("un serveur non configuré REFUSE au lieu de tout accepter", () => {
  // Le piège classique : « pas de secret configuré → on laisse passer ».
  // Mieux vaut un webhook qui ne marche pas qu'une porte ouverte.
  assert.equal(verifierAppel({ "x-digiteal-signature": "n'importe quoi" }, null).ok,
    false);
  assert.equal(verifierAppel({ "x-digiteal-signature": "x" }, "").ok, false);
});

test("le même événement livré deux fois n'est traité qu'une fois", () => {
  // Les réseaux réessaient. Sans idempotence : deux factures fournisseur pour
  // un seul document.
  const S = "s";
  const charge = { changeType: "PEPPOL_DOCUMENT_RECEIVED", id: "d1" };
  const entetes = { "x-digiteal-signature": S };
  const cle = cleIdempotence(charge);

  assert.equal(traiterAppel(entetes, charge, S, []).rejoue, false);
  const rejeu = traiterAppel(entetes, charge, S, [cle]);
  assert.equal(rejeu.rejoue, true);
  // 200 et non une erreur : répondre en erreur relancerait la boucle de
  // réessai du point d'accès.
  assert.equal(rejeu.statut, 200);
});

test("un événement INCONNU est journalisé mais ne déclenche rien", () => {
  // Une version future du point d'accès enverra des types qu'on ne connaît
  // pas. Ils ne doivent jamais provoquer une action devinée.
  const r = routerWebhook({ changeType: "TYPE_QUI_N_EXISTE_PAS_ENCORE", id: "x" });
  assert.equal(r.genre, GENRES.INCONNU);
  assert.match(r.motif, /aucune action/i);
  assert.equal(r.cle, "TYPE_QUI_N_EXISTE_PAS_ENCORE|x",
    "il garde une clé : on veut la trace, même sans action");
});

test("l'entrant et le sortant ne se confondent pas", () => {
  assert.equal(routerWebhook({ changeType: "PEPPOL_SEND_PROCESSING_OUTCOME",
    operationId: "o1" }).genre, GENRES.SORTANT);
  assert.equal(routerWebhook({ changeType: "PEPPOL_DOCUMENT_RECEIVED",
    id: "d1", document: "<Invoice/>" }).genre, GENRES.ENTRANT);
});

test("un document entrant sans contenu joint le DIT au lieu de traiter du vide", () => {
  const r = routerWebhook({ changeType: "PEPPOL_DOCUMENT_RECEIVED", id: "d2" });
  assert.equal(r.genre, GENRES.ENTRANT);
  assert.equal(r.xml, null);
  assert.match(r.motif, /récupérer par l'API/i);
});

test("l'enregistrement d'un participant EXIGE la décision de recevoir", () => {
  // Un seul point d'accès peut recevoir pour un participant. Un défaut
  // silencieux à « envoi seul » condamnerait l'organisation à ne jamais
  // recevoir — l'obligation légale exacte.
  const src = lireDomaineFichier("facturation/digiteal.js");
  assert.ok(src.includes('typeof envoiSeul !== "boolean"'),
    "la décision doit être explicite, jamais devinée");
  assert.equal(/envoiSeul = true/.test(src), false,
    "plus de défaut « envoi seul »");
});
