// =============================================================================
// FONCTION SERVEUR — le webhook du point d'accès Peppol.
//
// POURQUOI ELLE EXISTE
// --------------------
// Dashprod est un SPA Vite : aucun serveur. Or recevoir des factures EXIGE une
// URL publique appelable par le point d'accès, et le secret Digiteal ne doit
// JAMAIS partir dans un navigateur. Cette fonction est le seul endroit où le
// secret vit.
//
// À CONFIGURER DANS VERCEL (Settings → Environment Variables) :
//   DIGITEAL_WEBHOOK_SECRET   secret partagé, vérifié à chaque appel
//   SUPABASE_URL              projet Supabase
//   SUPABASE_SERVICE_ROLE_KEY clé de service — CÔTÉ SERVEUR UNIQUEMENT.
//                             Elle contourne la RLS : jamais dans le front,
//                             jamais dans une variable préfixée VITE_.
//
// Toute la décision est dans le domaine (`facturation/webhook.js` et
// `facturation/reception.js`), testée sans réseau. Ici, on ne fait que brancher.
// =============================================================================

import { traiterAppel, GENRES } from "../../packages/domaine/src/facturation/webhook.js";
import { lireUblEntrant, empreinteDocument, verdictReception }
  from "../../packages/domaine/src/facturation/reception.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Appel REST Supabase avec la clé de service. */
async function pg(chemin, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

export default async function handler(req, res) {
  // Un webhook n'est jamais un GET : refuser tôt évite qu'un robot d'indexation
  // ou un curieux ne déclenche quoi que ce soit.
  if (req.method !== "POST") {
    return res.status(405).json({ erreur: "Méthode non autorisée." });
  }

  const charge = typeof req.body === "string"
    ? JSON.parse(req.body || "{}") : (req.body || {});

  // Les clés déjà vues, pour ne pas traiter deux fois le même événement.
  let dejaVues = [];
  try {
    const cle = charge.eventId || charge.id || charge.operationId || charge.documentId;
    if (cle) {
      const trouve = await pg(
        `peppol_evenements?cle_idempotence=eq.${encodeURIComponent(
          `${charge.changeType || charge.type || "inconnu"}|${cle}`)}&select=cle_idempotence`);
      dejaVues = (trouve || []).map((x) => x.cle_idempotence);
    }
  } catch { /* la lecture d'idempotence ne doit pas bloquer : on retombe sur la
                contrainte d'unicité en écriture, qui est la vraie garantie. */ }

  const verdict = traiterAppel(
    req.headers || {}, charge, process.env.DIGITEAL_WEBHOOK_SECRET, dejaVues);

  if (!verdict.ok) {
    // Motif volontairement pauvre côté réponse : ne pas renseigner un
    // attaquant sur ce qui manque.
    return res.status(verdict.statut).json({ erreur: "Refusé." });
  }
  if (verdict.rejoue) {
    // 200 pour que le point d'accès cesse de réessayer, mais aucune action.
    return res.status(200).json({ recu: true, rejoue: true });
  }

  const { route } = verdict;

  // Journaliser AVANT d'agir : même un événement inconnu doit laisser une
  // trace. C'est ce qui permettra de comprendre un jour pourquoi une facture
  // n'est jamais arrivée.
  try {
    if (route.cle) {
      await pg("peppol_evenements", { method: "POST", body: JSON.stringify({
        cle_idempotence: route.cle, genre: route.genre, type: route.type,
        charge, reference_ext: route.reference_ext || null,
      }) });
    }
  } catch (e) {
    // Violation d'unicité = course entre deux livraisons du même événement.
    // C'est exactement ce qu'on voulait empêcher : on s'arrête, sans erreur.
    if (String(e.message).includes("23505")) {
      return res.status(200).json({ recu: true, rejoue: true });
    }
    return res.status(500).json({ erreur: "Journalisation impossible." });
  }

  if (route.genre === GENRES.ENTRANT && route.xml) {
    try {
      const lu = lireUblEntrant(route.xml);
      // Un document illisible n'est PAS jeté : c'est une pièce légale. On le
      // conserve tel quel, en attente d'examen humain.
      const doc = lu.ok ? lu.document : null;
      const empreinte = doc ? empreinteDocument(doc)
                            : `illisible|${route.reference_ext || route.cle}`;
      const v = doc ? verdictReception(doc, [])
                    : { etat: "A_VERIFIER", motif: lu.motif };

      await pg("factures_fournisseur", { method: "POST", body: JSON.stringify({
        org_id: charge.organisationId || charge.orgId || null,
        numero: doc?.numero || "(illisible)",
        type: doc?.type || "facture",
        date_emission: doc?.date_emission || null,
        echeance: doc?.echeance || null,
        devise: doc?.devise || "EUR",
        fournisseur_nom: doc?.fournisseur?.nom || null,
        fournisseur_tva: doc?.fournisseur?.tva || null,
        fournisseur_peppol: doc?.fournisseur?.peppol_id || null,
        fournisseur_pays: doc?.fournisseur?.pays || null,
        htva_centimes: doc?.total?.htva_centimes ?? null,
        tva_centimes: doc?.total?.tva_centimes ?? null,
        tvac_centimes: doc?.total?.tvac_centimes ?? null,
        du_centimes: doc?.total?.du_centimes ?? null,
        document_xml: route.xml,
        empreinte_doc: empreinte,
        // JAMAIS 'APPROUVE' : recevoir n'est pas accepter (§4.19).
        etat: v.etat, motif_etat: v.motif,
      }) });
    } catch (e) {
      if (String(e.message).includes("23505")) {
        // Doublon : le fournisseur a déjà envoyé cette facture. Comportement
        // attendu, pas une erreur.
        return res.status(200).json({ recu: true, doublon: true });
      }
      return res.status(500).json({ erreur: "Enregistrement impossible." });
    }
  }

  return res.status(200).json({ recu: true, genre: route.genre });
}
