// =============================================================================
// LE WEBHOOK DU POINT D'ACCÈS — ce qui arrive de l'extérieur.
//
// POURQUOI CE MODULE
// ------------------
// Dashprod est un SPA Vite : il n'a pas de serveur. Or un webhook EXIGE une
// URL publique qui reçoit des requêtes. Il faut donc une fonction serveur
// (Vercel), et tout ce qui peut être décidé sans réseau doit vivre ici, pur et
// testable — la fonction serveur ne fait que brancher.
//
// TROIS DANGERS D'UN WEBHOOK, TRAITÉS ICI
// ---------------------------------------
// 1. N'IMPORTE QUI peut appeler une URL publique. Sans authentification, un
//    tiers marquerait vos factures « payées » ou injecterait de faux
//    documents. → `verifierAppel`.
// 2. UN MÊME ÉVÉNEMENT ARRIVE PLUSIEURS FOIS. Les réseaux réessaient ; un
//    accusé de réception peut être livré deux fois. Sans clé d'idempotence, on
//    crée des doublons. → `cleIdempotence`.
// 3. UN ÉVÉNEMENT INCONNU. Une nouvelle version du point d'accès enverra des
//    types qu'on ne connaît pas. Ils ne doivent JAMAIS déclencher d'action —
//    seulement être journalisés. → `routerWebhook`.
//
// LA RÈGLE : un webhook non authentifié, non reconnu ou déjà vu ne produit
// AUCUN effet. Le silence est le comportement sûr.
// =============================================================================

/** Comparaison à temps constant : une comparaison naïve fuit le secret par le
 *  temps de réponse, caractère par caractère. Coût nul, bénéfice réel. */
function egalConstant(a, b) {
  const x = String(a ?? ""), y = String(b ?? "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/**
 * L'appel vient-il bien du point d'accès ?
 *
 * Secret partagé transmis en en-tête. Rend `{ok, motif}` — et le motif reste
 * volontairement vague côté réponse HTTP : dire « signature invalide » plutôt
 * que « secret absent » renseignerait un attaquant sur ce qui manque.
 *
 * @param {object} entetes en-têtes de la requête (clés en minuscules)
 * @param {string} secretAttendu le secret configuré côté serveur
 */
export function verifierAppel(entetes = {}, secretAttendu) {
  if (!secretAttendu) {
    // Refuser plutôt que d'accepter tout : un serveur mal configuré ne doit pas
    // devenir une porte ouverte. Mieux vaut un webhook qui ne marche pas qu'un
    // webhook que n'importe qui peut appeler.
    return { ok: false, motif: "Webhook non configuré côté serveur." };
  }
  const fourni = entetes["x-digiteal-signature"]
              || entetes["x-webhook-secret"]
              || entetes["authorization"];
  if (!fourni) return { ok: false, motif: "Appel non authentifié." };

  const nu = String(fourni).replace(/^Bearer\s+/i, "").trim();
  if (!egalConstant(nu, secretAttendu)) {
    return { ok: false, motif: "Appel non authentifié." };
  }
  return { ok: true };
}

/**
 * La clé qui empêche de traiter deux fois le même événement.
 *
 * On la prend dans la charge utile plutôt que de hacher le corps : le même
 * événement retransmis peut différer d'un horodatage sans être un nouvel
 * événement.
 */
export function cleIdempotence(charge = {}) {
  const id = charge.eventId || charge.id || charge.operationId
          || charge.documentId || null;
  const type = charge.changeType || charge.type || "inconnu";
  return id ? `${type}|${id}` : null;
}

/** Les genres d'événements, pour savoir QUI traite quoi. */
export const GENRES = Object.freeze({
  SORTANT: "sortant",   // le sort d'une facture que NOUS avons émise
  ENTRANT: "entrant",   // un document qui ARRIVE d'un fournisseur
  INCONNU: "inconnu",
});

// Types d'événements ENTRANTS. [À CONFIRMER auprès de Digiteal] : leur
// documentation fait foi, et je ne les invente pas — d'où plusieurs variantes
// acceptées et, surtout, un défaut sûr. Un type non listé tombe en INCONNU et
// ne déclenche rien.
const TYPES_ENTRANTS = Object.freeze([
  "PEPPOL_DOCUMENT_RECEIVED",
  "PEPPOL_INBOUND_DOCUMENT",
  "PEPPOL_INVOICE_RECEIVED",
  "INBOUND_UBL_DOCUMENT",
]);

const TYPES_SORTANTS = Object.freeze([
  "PEPPOL_SEND_PROCESSING_OUTCOME",
  "PEPPOL_TRANSPORT_ACK_RECEIVED",
  "PEPPOL_MLR_RECEIVED",
  "PEPPOL_INVOICE_RESPONSE_RECEIVED",
  "PEPPOL_FUTURE_VALIDATION_FAILED",
]);

/**
 * De quel genre est cet événement, et que faut-il en faire ?
 *
 * Ne DÉCIDE rien : rend un aiguillage. C'est la fonction serveur qui agit, et
 * le domaine de réception (`reception.js`) qui qualifie le document entrant.
 *
 * @returns {{genre: string, type: string, cle: string|null,
 *            xml?: string, motif?: string}}
 */
export function routerWebhook(charge = {}) {
  const type = charge.changeType || charge.type || null;
  const cle = cleIdempotence(charge);

  if (type && TYPES_ENTRANTS.includes(type)) {
    // Le document peut arriver en clair ou encodé. On ne devine pas : si on ne
    // trouve pas de contenu, on le dit, et la fonction serveur ira le chercher
    // par l'API plutôt que de traiter un document vide.
    const xml = charge.document || charge.ublDocument || charge.payload || null;
    return { genre: GENRES.ENTRANT, type, cle, xml,
             reference_ext: charge.documentId || charge.id || null,
             motif: xml ? null
                        : "Document non joint à l'événement : à récupérer par l'API." };
  }

  if (type && TYPES_SORTANTS.includes(type)) {
    return { genre: GENRES.SORTANT, type, cle,
             reference_ext: charge.operationId || charge.documentId || null };
  }

  // Défaut SÛR : on journalise, on ne fait rien. Une nouvelle version du point
  // d'accès enverra des types qu'on ne connaît pas encore ; ils ne doivent
  // jamais déclencher une action devinée.
  return { genre: GENRES.INCONNU, type: type || null, cle,
           motif: `Événement non reconnu : ${type || "sans type"}. Journalisé, `
                + "aucune action." };
}

/**
 * Le verdict complet d'un appel de webhook : authentification, idempotence,
 * routage. Une seule porte, pour que la fonction serveur n'ait pas à composer
 * les trois règles elle-même — et ne puisse pas en oublier une.
 *
 * @param {object} entetes
 * @param {object} charge
 * @param {string} secretAttendu
 * @param {string[]} clesDejaVues clés d'idempotence déjà traitées
 */
export function traiterAppel(entetes, charge, secretAttendu, clesDejaVues = []) {
  const auth = verifierAppel(entetes, secretAttendu);
  if (!auth.ok) return { ok: false, statut: 401, motif: auth.motif };

  const route = routerWebhook(charge || {});

  if (route.cle && clesDejaVues.includes(route.cle)) {
    // Déjà traité : on répond 200 pour que le point d'accès cesse de réessayer,
    // mais on ne refait RIEN. Répondre en erreur relancerait la boucle.
    return { ok: true, statut: 200, rejoue: true, route,
             motif: "Événement déjà traité." };
  }

  return { ok: true, statut: 200, rejoue: false, route };
}
