// =============================================================================
// Adaptateur Digiteal — point d'accès Peppol certifié par l'autorité belge.
//
// Écrit d'après la documentation publique de Digiteal (doc.digiteal.eu).
// Digiteal n'accepte QUE de l'UBL 2.1 conforme à OpenPeppol BIS Billing 3.0 —
// exactement ce que produit versXmlUBL(). Aucune conversion, aucun format
// propriétaire : c'est ce qui rend le changement d'access point possible.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE MODULE N'INVENTE AUCUN STATUT.
// Tant qu'aucune clé n'est configurée, chaque appel renvoie un état explicite
// disant ce qui manque. Une facture n'est jamais marquée transmise sans
// réponse réelle de l'API.
// ─────────────────────────────────────────────────────────────────────────────
//
// `fetch` est injectable : les tests s'exécutent sans réseau.
// =============================================================================

import { versXmlUBL, preparerTransmission } from "./ubl.js";

export const ENVIRONNEMENTS = Object.freeze({
  test: "https://test.digiteal.eu/api/v1",
  production: "https://api.digiteal.eu/api/v1",
});

/**
 * Correspondance statut Digiteal → état de transmission Dashprod.
 * Codes repris de leur documentation (webhook PEPPOL_SEND_PROCESSING_OUTCOME).
 * Un code inconnu devient ECHEC, jamais un succès par défaut.
 */
export const STATUTS = Object.freeze({
  OK: { etat: "ACCEPTEE", message: "Remis au point d'accès du destinataire." },
  RECIPIENT_NOT_IN_PEPPOL: { etat: "REJETEE",
    message: "Ce client n'est pas enregistré sur Peppol. Envoyez la facture par un autre canal." },
  PARTICIPANT_NOT_REGISTERED_TO_CALLER: { etat: "ECHEC",
    message: "Vous n'êtes pas autorisé à envoyer pour cette entreprise. Enregistrez-la d'abord." },
  FAILED_TO_PRODUCE_SBDH: { etat: "ECHEC",
    message: "Erreur d'enveloppe technique côté point d'accès." },
  DUPLICATED_DOCUMENT: { etat: "ACCEPTEE",
    message: "Document déjà transmis — l'envoi n'a pas été dupliqué." },
  RECIPIENT_AP_UNAVAILABLE: { etat: "ECHEC",
    message: "Le point d'accès du destinataire est injoignable. Réessayez plus tard." },
  DIGITEAL_AP_ERROR: { etat: "ECHEC",
    message: "Le point d'accès est indisponible. Réessayez plus tard." },
  TECHNICAL_ERROR: { etat: "ECHEC", message: "Erreur technique côté point d'accès." },
});

export function interpreterStatut(code, message) {
  const connu = STATUTS[code];
  if (connu) return { ...connu, code, brut: message || null };
  // Code inattendu : on ne suppose pas que c'est bon signe.
  return { etat: "ECHEC", code: code || "INCONNU",
           message: message || `Statut non reconnu : ${code}`, brut: message || null };
}

/**
 * Identifiants Peppol dérivés d'un numéro d'entreprise belge.
 *
 * Digiteal recommande d'enregistrer une entreprise sur TOUS ses identifiants :
 * en Belgique, 0208 (numéro BCE, obligatoire) et 9925 (numéro de TVA). Un
 * destinataire peut n'être joignable que par l'un des deux.
 */
export function identifiantsBelges({ bce, tva }) {
  const chiffres = (v) => String(v ?? "").replace(/\D/g, "");
  const ids = [];
  const numBce = chiffres(bce) || chiffres(tva);
  if (numBce.length === 10) ids.push(`0208:${numBce}`);
  const numTva = chiffres(tva) || chiffres(bce);
  if (numTva.length === 10) ids.push(`9925:be${numTva}`);
  return ids;
}

/** Client Digiteal. `cles` absent = mode non configuré, aucun appel réseau. */
export function clientDigiteal({ identifiant, secret, environnement = "test",
                                 fetchImpl = globalThis.fetch } = {}) {
  const base = ENVIRONNEMENTS[environnement] || ENVIRONNEMENTS.test;
  const configure = !!(identifiant && secret);

  const entetes = () => ({
    "Authorization": "Basic " + Buffer.from(`${identifiant}:${secret}`).toString("base64"),
    "Content-Type": "application/json",
  });

  const nonConfigure = (operation) => ({
    ok: false,
    configure: false,
    etat: "PRETE",
    message: "Aucune clé Digiteal configurée. La facture est prête à partir, "
           + "mais rien n'a été transmis.",
    operation,
  });

  return {
    configure,
    base,

    /**
     * Le destinataire est-il joignable sur Peppol ?
     * Digiteal expose ce contrôle GRATUITEMENT, sans contrat. C'est le premier
     * geste de l'approche « Peppol first » : on vérifie avant d'envoyer, et on
     * retombe sur l'email si le client n'est pas sur le réseau.
     */
    async estJoignable(peppolId) {
      if (!fetchImpl) return { ...nonConfigure("estJoignable"), joignable: null };
      try {
        const r = await fetchImpl(
          `${base}/peppol/participants/${encodeURIComponent(peppolId)}/document-types`,
          { method: "GET", headers: configure ? entetes() : { "Content-Type": "application/json" } });
        if (r.status === 404) return { ok: true, joignable: false, peppolId };
        if (!r.ok) return { ok: false, joignable: null, message: `HTTP ${r.status}` };
        const d = await r.json();
        const types = d?.documentTypes || "";
        return { ok: true, joignable: String(types).includes("Invoice"), peppolId, types };
      } catch (e) {
        return { ok: false, joignable: null, message: e.message };
      }
    },

    /**
     * Enregistre une entreprise comme participant.
     *
     * `limitedToOutboundTraffic: true` = envoi seul. À utiliser tant que le
     * client reçoit ses factures ailleurs : Digiteal précise qu'UN SEUL point
     * d'accès peut recevoir pour un participant donné. Basculer la réception
     * exige de le désenregistrer de son point d'accès actuel.
     */
    async enregistrerParticipant({ peppolId, nom, pays = "BE", envoiSeul = true,
                                   contact = null, siteWeb = null }) {
      if (!configure) return nonConfigure("enregistrerParticipant");
      const corps = {
        peppolIdentifier: peppolId,
        name: nom,
        countryCode: pays,
        limitedToOutboundTraffic: !!envoiSeul,
      };
      if (siteWeb) corps.website = siteWeb;
      if (contact) corps.contact = contact;
      try {
        const r = await fetchImpl(`${base}/peppol/participants`,
          { method: "POST", headers: entetes(), body: JSON.stringify(corps) });
        const d = await r.json().catch(() => ({}));
        if (r.ok) return { ok: true, peppolId, reponse: d };
        // Deux erreurs à traduire pour l'utilisateur, elles sont fréquentes.
        const code = d?.errorCode || d?.code;
        if (code === "ALREADY_REGISTERED_TO_DIGITEAL") {
          return { ok: true, deja: true, peppolId,
                   message: "Déjà enregistrée — rien à faire." };
        }
        if (code === "REGISTER_ALREADY_REGISTERED_TO_OTHER_AP") {
          return { ok: false, peppolId, code,
                   message: "Cette entreprise est enregistrée chez un autre point d'accès. "
                          + "Elle doit s'en désinscrire avant de basculer." };
        }
        return { ok: false, peppolId, code, message: d?.message || `HTTP ${r.status}` };
      } catch (e) {
        return { ok: false, peppolId, message: e.message };
      }
    },

    /**
     * Transmet une facture canonique.
     *
     * Mode asynchrone : Digiteal le recommande en production. La réponse
     * immédiate porte un operationId ; le sort réel arrive par webhook
     * PEPPOL_SEND_PROCESSING_OUTCOME. On enregistre donc SOUMISE, pas
     * ACCEPTEE — l'acceptation viendra du réseau, ou ne viendra pas.
     */
    async transmettre(factureCanonique, { asynchrone = true } = {}) {
      const prep = preparerTransmission(factureCanonique, "PEPPOL");
      if (prep.etat !== "PRETE") {
        return { ok: false, etat: "ECHEC", erreurs: prep.erreurs,
                 message: "Facture non conforme : " + prep.erreurs.join(" · ") };
      }
      if (!configure) {
        return { ...nonConfigure("transmettre"), charge_utile: prep.charge_utile,
                 cle_idempotence: prep.cle_idempotence };
      }

      const chemin = asynchrone ? "outbound-ubl-documents-async" : "outbound-ubl-documents";
      try {
        const r = await fetchImpl(`${base}/peppol/${chemin}`, {
          method: "POST",
          headers: { ...entetes(), "Content-Type": "application/xml" },
          body: prep.charge_utile,
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          return { ok: false, etat: "ECHEC", code: d?.status,
                   message: d?.message || `HTTP ${r.status}`,
                   cle_idempotence: prep.cle_idempotence };
        }
        if (asynchrone) {
          return { ok: true, etat: "SOUMISE", reference_ext: d?.operationId || null,
                   message: "Transmise au point d'accès. Le sort final arrivera par webhook.",
                   cle_idempotence: prep.cle_idempotence };
        }
        const st = interpreterStatut(d?.status, d?.message);
        return { ok: st.etat === "ACCEPTEE", etat: st.etat, code: st.code,
                 message: st.message, reference_ext: d?.documentId || null,
                 cle_idempotence: prep.cle_idempotence };
      } catch (e) {
        return { ok: false, etat: "ECHEC", message: e.message,
                 cle_idempotence: prep.cle_idempotence };
      }
    },

    /**
     * Valide un UBL sans l'envoyer. Endpoint PUBLIC chez Digiteal : utilisable
     * AVANT toute signature de contrat. C'est le moyen de vérifier que nos
     * factures passent la validation Peppol dès aujourd'hui.
     */
    async validerDocument(factureCanonique) {
      if (!fetchImpl) return { ok: false, message: "fetch indisponible" };
      let xml;
      try { xml = versXmlUBL(factureCanonique); }
      catch (e) { return { ok: false, valide: false, erreurs: [e.message] }; }
      try {
        const r = await fetchImpl(`${base}/peppol/validate`, {
          method: "POST", headers: { "Content-Type": "application/xml" }, body: xml,
        });
        const d = await r.json().catch(() => ({}));
        return { ok: r.ok, valide: r.ok && !(d?.errors?.length),
                 erreurs: d?.errors || [], avertissements: d?.warnings || [] };
      } catch (e) {
        return { ok: false, valide: null, message: e.message };
      }
    },
  };
}

/**
 * Traduit un webhook Digiteal en changement d'état.
 * Les types viennent de leur documentation. Un type inconnu ne change RIEN :
 * on ne déduit pas un succès d'un message qu'on ne comprend pas.
 */
export function interpreterWebhook(charge) {
  const type = charge?.changeType || charge?.type;
  switch (type) {
    case "PEPPOL_SEND_PROCESSING_OUTCOME": {
      const st = interpreterStatut(charge?.status, charge?.message);
      return { reconnu: true, etat: st.etat, message: st.message,
               reference_ext: charge?.operationId || charge?.documentId || null };
    }
    case "PEPPOL_TRANSPORT_ACK_RECEIVED":
      // Preuve signée de remise au point d'accès du destinataire.
      return { reconnu: true, etat: "DELIVREE",
               message: "Accusé de réception signé par le point d'accès destinataire." };
    case "PEPPOL_MLR_RECEIVED":
      return { reconnu: true, etat: null,
               message: "Réponse technique reçue (MLR)." };
    case "PEPPOL_INVOICE_RESPONSE_RECEIVED":
      return { reconnu: true, etat: null,
               message: "Le destinataire a répondu sur le fond de la facture." };
    case "PEPPOL_FUTURE_VALIDATION_FAILED":
      // Avertissement : la facture est partie, mais une règle à venir la
      // refuserait. À traiter avant la date d'application.
      return { reconnu: true, etat: null, alerte: true,
               message: "Cette facture ne passera plus une future version des "
                      + "règles Peppol. À corriger avant application." };
    default:
      return { reconnu: false, etat: null,
               message: `Webhook non reconnu : ${type || "sans type"}` };
  }
}
