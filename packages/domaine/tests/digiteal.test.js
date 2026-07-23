// Tests — adaptateur Digiteal. Aucun appel réseau : fetch est injecté.
import test from "node:test";
import assert from "node:assert/strict";
import { facture } from "../src/facturation/modele.js";
import {
  clientDigiteal, identifiantsBelges, interpreterStatut, interpreterWebhook,
  STATUTS, ENVIRONNEMENTS,
} from "../src/facturation/digiteal.js";

const VENDEUR = { nom: "Déménagements Test SRL", tva: "BE0478363616",
  peppol_id: "0208:0478363616", rue: "Rue du Dépôt 9", cp: "1370",
  ville: "Jodoigne", pays: "BE", iban: "BE68 5390 0754 7034" };
const ACHETEUR = { nom: "Client SA", tva: "BE0999888777",
  peppol_id: "0208:0999888777", rue: "Avenue Louise 1", cp: "1050",
  ville: "Bruxelles", pays: "BE" };
const F = facture({
  numero: "2026-000001", date_emission: "2026-07-21", echeance: "2026-08-20",
  vendeur: VENDEUR, acheteur: ACHETEUR,
  lignes: [{ libelle: "Déménagement", quantite: 1, prix_unitaire_centimes: 100000 }],
  communication: "+++123/4567/89012+++",
});

const faux = (reponse, statut = 200) => async () => ({
  ok: statut >= 200 && statut < 300, status: statut,
  json: async () => reponse,
});

// ── Identifiants belges ────────────────────────────────────────────────────
test("identifiantsBelges : 0208 (BCE) et 9925 (TVA), les deux", () => {
  const ids = identifiantsBelges({ bce: "BE 0478.363.616", tva: "BE0478363616" });
  assert.deepEqual(ids, ["0208:0478363616", "9925:be0478363616"]);
});

test("un destinataire peut n'être joignable que par un seul identifiant", () => {
  // C'est pourquoi Digiteal conseille d'enregistrer les deux.
  assert.equal(identifiantsBelges({ tva: "BE0478363616" }).length, 2);
  assert.deepEqual(identifiantsBelges({ bce: "123" }), []);
});

// ── Statuts ────────────────────────────────────────────────────────────────
test("les codes Digiteal sont traduits en états Dashprod", () => {
  assert.equal(interpreterStatut("OK").etat, "ACCEPTEE");
  assert.equal(interpreterStatut("RECIPIENT_NOT_IN_PEPPOL").etat, "REJETEE");
  assert.equal(interpreterStatut("RECIPIENT_AP_UNAVAILABLE").etat, "ECHEC");
});

test("un doublon n'est PAS un échec — le document est déjà passé", () => {
  assert.equal(interpreterStatut("DUPLICATED_DOCUMENT").etat, "ACCEPTEE");
});

test("un code inconnu devient ECHEC, jamais un succès par défaut", () => {
  const s = interpreterStatut("QUELQUE_CHOSE_DE_NOUVEAU");
  assert.equal(s.etat, "ECHEC");
  assert.notEqual(s.etat, "ACCEPTEE");
});

test("chaque statut documenté a un message en français", () => {
  for (const [code, s] of Object.entries(STATUTS)) {
    assert.ok(s.message && s.message.length > 10, `message manquant : ${code}`);
  }
});

// ── Client non configuré ───────────────────────────────────────────────────
test("SANS clé, rien n'est transmis et rien n'est simulé", async () => {
  const c = clientDigiteal({});
  assert.equal(c.configure, false);
  const r = await c.transmettre(F);
  assert.equal(r.configure, false);
  assert.equal(r.etat, "PRETE", "s'arrête à PRETE, n'invente pas SOUMISE");
  assert.notEqual(r.etat, "ACCEPTEE");
  assert.ok(r.charge_utile.includes("<cbc:ID>2026-000001</cbc:ID>"),
    "l'UBL est quand même produit et récupérable");
});

test("l'environnement de test est le défaut — jamais la production par accident", () => {
  assert.equal(clientDigiteal({}).base, ENVIRONNEMENTS.test);
  assert.equal(clientDigiteal({ environnement: "production" }).base, ENVIRONNEMENTS.production);
});

// ── Transmission ───────────────────────────────────────────────────────────
test("envoi asynchrone : SOUMISE, pas ACCEPTEE", async () => {
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: faux({ operationId: "op-123" }) });
  const r = await c.transmettre(F);
  assert.equal(r.etat, "SOUMISE");
  assert.equal(r.reference_ext, "op-123");
  assert.notEqual(r.etat, "ACCEPTEE", "l'acceptation vient du réseau, pas de nous");
});

test("envoi synchrone : le statut renvoyé est interprété", async () => {
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: faux({ status: "OK", documentId: "doc-9" }) });
  const r = await c.transmettre(F, { asynchrone: false });
  assert.equal(r.etat, "ACCEPTEE");
  assert.equal(r.reference_ext, "doc-9");
});

test("une facture non conforme n'est jamais envoyée", async () => {
  let appele = false;
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: async () => { appele = true; return faux({})(); } });
  const invalide = facture({ ...F, acheteur: { ...ACHETEUR, peppol_id: null } });
  const r = await c.transmettre(invalide);
  assert.equal(r.etat, "ECHEC");
  assert.equal(appele, false, "aucun appel réseau pour une facture invalide");
});

test("une erreur réseau ne devient pas un succès", async () => {
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: async () => { throw new Error("timeout"); } });
  const r = await c.transmettre(F);
  assert.equal(r.etat, "ECHEC");
  assert.equal(r.ok, false);
});

test("la clé d'idempotence accompagne chaque envoi", async () => {
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: faux({ operationId: "x" }) });
  const r = await c.transmettre(F);
  assert.equal(r.cle_idempotence, "PEPPOL:2026-000001:2026-07-21");
});

// ── Joignabilité ───────────────────────────────────────────────────────────
test("un client absent du réseau est signalé, pas planté", async () => {
  const c = clientDigiteal({ fetchImpl: faux({}, 404) });
  const r = await c.estJoignable("0208:0999888777");
  assert.equal(r.ok, true);
  assert.equal(r.joignable, false);
});

test("un client présent supportant Invoice est joignable", async () => {
  const c = clientDigiteal({ fetchImpl: faux({
    documentTypes: "urn:...:Invoice-2::Invoice##urn:cen.eu:en16931:2017...",
    peppolIdentifier: "0208:0999888777" }) });
  const r = await c.estJoignable("0208:0999888777");
  assert.equal(r.joignable, true);
});

// ── Enregistrement ─────────────────────────────────────────────────────────
test("déjà enregistré chez Digiteal = succès, pas erreur", async () => {
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: faux({ errorCode: "ALREADY_REGISTERED_TO_DIGITEAL" }, 400) });
  const r = await c.enregistrerParticipant({ peppolId: "0208:1", nom: "X" });
  assert.equal(r.ok, true);
  assert.equal(r.deja, true);
});

test("enregistré ailleurs : message actionnable, pas un code brut", async () => {
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: faux({ errorCode: "REGISTER_ALREADY_REGISTERED_TO_OTHER_AP" }, 400) });
  const r = await c.enregistrerParticipant({ peppolId: "0208:1", nom: "X" });
  assert.equal(r.ok, false);
  assert.match(r.message, /autre point d'accès/);
});

test("envoi seul par défaut : on ne prend pas la réception d'un client", async () => {
  let corps = null;
  const c = clientDigiteal({ identifiant: "u", secret: "p",
    fetchImpl: async (url, opts) => { corps = JSON.parse(opts.body); return faux({})(); } });
  await c.enregistrerParticipant({ peppolId: "0208:1", nom: "X" });
  assert.equal(corps.limitedToOutboundTraffic, true);
});

// ── Webhooks ───────────────────────────────────────────────────────────────
test("l'accusé de transport signé vaut DELIVREE", () => {
  const w = interpreterWebhook({ changeType: "PEPPOL_TRANSPORT_ACK_RECEIVED" });
  assert.equal(w.etat, "DELIVREE");
});

test("le résultat asynchrone traduit son statut", () => {
  const w = interpreterWebhook({ changeType: "PEPPOL_SEND_PROCESSING_OUTCOME",
    status: "RECIPIENT_NOT_IN_PEPPOL", operationId: "op-1" });
  assert.equal(w.etat, "REJETEE");
  assert.equal(w.reference_ext, "op-1");
});

test("un webhook non reconnu ne change AUCUN état", () => {
  const w = interpreterWebhook({ changeType: "TRUC_INCONNU" });
  assert.equal(w.reconnu, false);
  assert.equal(w.etat, null, "on ne déduit rien d'un message incompris");
});

test("l'alerte de validation future ne change pas l'état mais alerte", () => {
  const w = interpreterWebhook({ changeType: "PEPPOL_FUTURE_VALIDATION_FAILED" });
  assert.equal(w.alerte, true);
  assert.equal(w.etat, null, "la facture est partie, l'état ne bouge pas");
});
