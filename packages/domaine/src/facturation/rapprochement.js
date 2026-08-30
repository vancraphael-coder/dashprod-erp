// =============================================================================
// LE RAPPROCHEMENT — d'une communication reçue à la facture qu'elle désigne.
//
// Un virement arrive avec une communication (l'OGM que le client a recopiée, ou
// le numéro de facture en communication libre). Le rapprochement fait le chemin
// INVERSE de l'émission : de la communication, il retrouve la facture. Pur et
// déterministe — aucune lecture de table, l'appelant fournit les factures.
//
// Deux formes de communication, posées à l'émission (voir cmd_emettre_facture) :
//   · structurée : +++AAA/AAAA/AAAAA+++ (OGM) — on la décode.
//   · libre      : le numéro de facture « AAAA-NNNNNN » — on le lit tel quel.
// =============================================================================

import { ogmValide, decomposerNumero } from "./ogm.js";

/**
 * Décode une OGM en année + séquence (l'inverse de genererOGM).
 * La base 10 chiffres = AAAA + 6 chiffres de séquence ; les 2 derniers sont le
 * contrôle. On ne renvoie que si l'OGM est bien formée ET cohérente (clé mod 97),
 * pour ne jamais rapprocher sur une communication corrompue.
 * @param {string} ogm
 * @returns {{annee:number, sequence:number}|null}
 */
export function decomposerOGM(ogm) {
  if (!ogmValide(ogm)) return null;
  const chiffres = String(ogm).replace(/[^\d]/g, "");   // 12 chiffres
  const base = chiffres.slice(0, 10);
  return { annee: Number(base.slice(0, 4)), sequence: Number(base.slice(4, 10)) };
}

/**
 * Normalise une communication (OGM ou numéro) en { annee, sequence } si possible.
 * @param {string} communication
 * @returns {{annee:number, sequence:number}|null}
 */
export function cleDepuisCommunication(communication) {
  const c = String(communication || "").trim();
  if (!c) return null;
  // Forme structurée +++…+++
  if (/^\+\+\+/.test(c)) return decomposerOGM(c);
  // Forme libre = numéro de facture AAAA-NNNNNN
  return decomposerNumero(c);
}

/**
 * Retrouve, dans une liste de factures, celle que désigne une communication.
 * Compare d'abord sur la communication STOCKÉE (identité exacte), puis, à
 * défaut, sur la clé année+séquence reconstruite depuis le numéro — ce qui
 * rattrape les anciennes factures sans communication stockée.
 *
 * @param {string} communication  ce que porte le virement entrant
 * @param {Array<{id:string, numero?:string, communication?:string}>} factures
 * @returns {{facture:object|null, motif:string}}
 *   motif : 'communication' | 'numero' | 'introuvable' | 'ambigu' | 'illisible'
 */
export function rapprocherCommunication(communication, factures = []) {
  const c = String(communication || "").trim();
  if (!c) return { facture: null, motif: "illisible" };

  // 1) Correspondance exacte sur la communication stockée (le cas normal pour
  //    les factures émises depuis le lot B).
  const exacts = (factures || []).filter(
    (f) => f.communication && f.communication.trim() === c);
  if (exacts.length === 1) return { facture: exacts[0], motif: "communication" };
  if (exacts.length > 1) return { facture: null, motif: "ambigu" };

  // 2) Repli : reconstruire la clé année+séquence et comparer au numéro.
  const cle = cleDepuisCommunication(c);
  if (!cle) return { facture: null, motif: "illisible" };
  const numeroCible = `${cle.annee}-${String(cle.sequence).padStart(6, "0")}`;
  const parNum = (factures || []).filter((f) => {
    const d = decomposerNumero(f.numero);
    return d && d.annee === cle.annee && d.sequence === cle.sequence;
  });
  if (parNum.length === 1) return { facture: parNum[0], motif: "numero" };
  if (parNum.length > 1) return { facture: null, motif: "ambigu" };
  return { facture: null, motif: "introuvable", numeroCible };
}
