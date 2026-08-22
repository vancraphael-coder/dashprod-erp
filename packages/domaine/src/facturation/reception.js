// =============================================================================
// RÉCEPTION PEPPOL — les factures fournisseur qui arrivent.
//
// POURQUOI CE MODULE
// ------------------
// Depuis le 1er janvier 2026, toute entreprise belge assujettie doit pouvoir
// RECEVOIR des factures électroniques structurées — même celle qui ne facture
// que des particuliers. Dashprod savait émettre, pas recevoir.
//
// C'est aussi la porte d'entrée de la moitié « achat », entièrement absente du
// produit : un document Peppol entrant est déjà structuré, donc exploitable
// sans ressaisie. C'est le chemin le moins coûteux vers une comptabilité
// fournisseur.
//
// LA RÈGLE QUI COMMANDE TOUT
// --------------------------
// Une facture reçue n'est JAMAIS comptabilisée automatiquement, ni même
// approuvée automatiquement. Recevoir n'est pas accepter : le document peut
// être erroné, en double, ou ne pas correspondre à une commande. Un humain
// tranche. Le réseau garantit l'acheminement, pas la justesse.
//
//        reçu → lisible → à vérifier → [HUMAIN] → approuvé → comptabilisé
//                     ↘ doublon        ↘ refusé
//
// CE QUE CE MODULE NE FAIT PAS
// ----------------------------
// Il ne revalide pas techniquement le document : le point d'accès l'a déjà
// fait, c'est son métier et sa responsabilité. Il LIT ce qui est nécessaire au
// triage. Il ne recalcule pas non plus les montants : ceux d'une facture
// entrante appartiennent au fournisseur — les recalculer reviendrait à
// réécrire sa facture.
// =============================================================================

import { nombre } from "../noyau/nombres.js";

/**
 * Les états d'un document entrant. L'ordre compte : on avance, on ne saute pas
 * d'étape, et on ne revient pas en arrière (sauf pour rouvrir une vérification).
 */
export const ETATS_RECEPTION = Object.freeze({
  RECU:          "Reçu du réseau",
  LISIBLE:       "Lu et exploitable",
  DOUBLON:       "Déjà reçu",
  A_VERIFIER:    "À vérifier",
  APPROUVE:      "Approuvé",
  REFUSE:        "Refusé",
  COMPTABILISE:  "Comptabilisé",
  ARCHIVE:       "Archivé",
});

/**
 * Les passages autorisés. `APPROUVE` n'est atteignable QUE depuis `A_VERIFIER` :
 * il n'existe aucun chemin qui approuve un document sans qu'un humain soit
 * passé par la case vérification. Et `COMPTABILISE` n'est atteignable que
 * depuis `APPROUVE` — jamais directement depuis la réception.
 */
export const PASSAGES_RECEPTION = Object.freeze({
  RECU:         ["LISIBLE", "A_VERIFIER", "DOUBLON"],
  LISIBLE:      ["A_VERIFIER", "DOUBLON"],
  DOUBLON:      ["ARCHIVE"],
  A_VERIFIER:   ["APPROUVE", "REFUSE"],
  APPROUVE:     ["COMPTABILISE", "A_VERIFIER"],
  REFUSE:       ["ARCHIVE", "A_VERIFIER"],
  COMPTABILISE: ["ARCHIVE"],
  ARCHIVE:      [],
});

/** Ce passage d'état est-il permis ? Rend `{ok, motif}`, jamais un booléen nu. */
export function passageReceptionPermis(de, vers) {
  if (!ETATS_RECEPTION[de]) return { ok: false, motif: `État inconnu : ${de}.` };
  if (!ETATS_RECEPTION[vers]) return { ok: false, motif: `État inconnu : ${vers}.` };
  if ((PASSAGES_RECEPTION[de] || []).includes(vers)) return { ok: true };
  return { ok: false,
    motif: `Passage refusé : « ${ETATS_RECEPTION[de]} » → « ${ETATS_RECEPTION[vers]} ».` };
}

/** Le premier contenu d'une balise, ou null. Lecture de triage, pas de parseur. */
function balise(xml, nom) {
  const m = new RegExp(`<(?:\\w+:)?${nom}[^>]*>([^<]*)</(?:\\w+:)?${nom}>`).exec(xml);
  return m ? m[1].trim() || null : null;
}

/** Le contenu d'un bloc (avec ses enfants), pour isoler une partie. */
function bloc(xml, nom) {
  const m = new RegExp(`<(?:\\w+:)?${nom}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nom}>`).exec(xml);
  return m ? m[1] : "";
}

/** Un montant décimal du document → centimes entiers. */
function centimes(v) {
  const n = nombre(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * Lit un document UBL entrant pour le trier.
 *
 * Ne juge pas la validité technique — le point d'accès l'a déjà fait. Extrait
 * ce qu'il faut pour identifier le fournisseur, détecter un doublon et
 * présenter le document à un humain.
 *
 * @param {string} xml le document reçu
 * @returns {{ok: true, document: object} | {ok: false, motif: string}}
 */
export function lireUblEntrant(xml) {
  const src = String(xml ?? "");
  if (!src.trim()) return { ok: false, motif: "Document vide." };

  const estAvoir = /<(?:\w+:)?CreditNote[\s>]/.test(src);
  const numero = balise(src, "ID");
  if (!numero) {
    return { ok: false, motif: "Numéro de document introuvable : illisible pour le tri." };
  }

  const vendeurBloc = bloc(src, "AccountingSupplierParty");
  const totauxBloc = bloc(src, "LegalMonetaryTotal");

  const fournisseur = {
    nom: balise(vendeurBloc, "RegistrationName") || balise(vendeurBloc, "Name"),
    tva: balise(vendeurBloc, "CompanyID"),
    peppol_id: balise(vendeurBloc, "EndpointID"),
    pays: balise(vendeurBloc, "IdentificationCode"),
  };

  // Les montants du fournisseur, LUS tels quels. On ne les recalcule pas :
  // ce serait réécrire sa facture. Si l'un manque, le document part en
  // vérification humaine plutôt que d'être complété au jugé.
  const total = {
    htva_centimes: centimes(balise(totauxBloc, "TaxExclusiveAmount")),
    tvac_centimes: centimes(balise(totauxBloc, "TaxInclusiveAmount")),
    du_centimes: centimes(balise(totauxBloc, "PayableAmount")),
    tva_centimes: centimes(balise(bloc(src, "TaxTotal"), "TaxAmount")),
  };

  return {
    ok: true,
    document: {
      type: estAvoir ? "avoir" : "facture",
      numero,
      date_emission: balise(src, "IssueDate"),
      echeance: balise(src, "DueDate"),
      devise: balise(src, "DocumentCurrencyCode") || "EUR",
      reference_acheteur: balise(src, "BuyerReference"),
      fournisseur,
      total,
    },
  };
}

/**
 * L'empreinte d'un document entrant, pour reconnaître un doublon.
 *
 * On identifie par FOURNISSEUR + NUMÉRO, pas par le contenu : un même document
 * peut être retransmis (reprise après incident, doublon de webhook) avec un
 * XML différent au caractère près. C'est le couple qui fait l'identité d'une
 * facture, pas ses octets.
 */
export function empreinteDocument(doc) {
  const f = doc?.fournisseur || {};
  const emetteur = (f.peppol_id || f.tva || f.nom || "inconnu").toUpperCase().trim();
  return `${emetteur}|${String(doc?.numero ?? "").trim()}`;
}

/**
 * Que faire d'un document qui arrive ?
 *
 * @param {object} doc document lu par `lireUblEntrant`
 * @param {string[]} empreintesConnues empreintes des documents déjà reçus
 * @returns {{etat: string, motif: string}}
 */
export function verdictReception(doc, empreintesConnues = []) {
  if (!doc) return { etat: "A_VERIFIER", motif: "Document illisible : à examiner." };

  if (empreintesConnues.includes(empreinteDocument(doc))) {
    return { etat: "DOUBLON",
      motif: `Facture ${doc.numero} déjà reçue de ce fournisseur.` };
  }

  const f = doc.fournisseur || {};
  if (!f.peppol_id && !f.tva) {
    return { etat: "A_VERIFIER",
      motif: "Fournisseur non identifiable : ni identifiant Peppol ni numéro de TVA." };
  }
  if (!Number.isFinite(doc.total?.du_centimes)) {
    return { etat: "A_VERIFIER", motif: "Montant dû absent ou illisible." };
  }
  if (!doc.date_emission) {
    return { etat: "A_VERIFIER", motif: "Date d'émission absente." };
  }

  // Un document complet et lisible s'arrête à « à vérifier ». JAMAIS approuvé
  // d'office : recevoir n'est pas accepter. C'est l'entreprise qui décide si
  // elle doit cette somme.
  return { etat: "A_VERIFIER",
    motif: "Document complet — en attente de votre validation." };
}

/**
 * Un document peut-il être comptabilisé ?
 * Verrou explicite, en plus de la machine d'états : aucune écriture ne se crée
 * sur un document que personne n'a approuvé.
 */
export function comptabilisationPermise(etat) {
  if (etat !== "APPROUVE") {
    return { ok: false,
      motif: "Seul un document approuvé par une personne peut être comptabilisé." };
  }
  return { ok: true };
}
