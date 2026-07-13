// =============================================================================
// Facturation — Communication structurée belge (OGM / VCS)
// Source : convention bancaire belge (+++XXX/XXXX/XXXXX+++) — actée comme
// non négociable pour les factures belges (alignement 08 §3).
//
// Règle : 12 chiffres — 10 de base + 2 de contrôle = base mod 97 ;
// un reste de 0 s'écrit 97. Le virement porteur d'une OGM correcte est
// rapproché automatiquement par les banques belges : c'est ce qui permet le
// lettrage sans lecture humaine du libellé.
// =============================================================================

/**
 * Calcule la communication structurée d'une facture à partir de son numéro
 * de séquence (déterministe : même facture → même OGM, rejouable à vie).
 * @param {number} sequence  numéro de la facture dans la séquence légale
 * @param {number} [annee]   année d'émission (défaut : année courante)
 * @returns {string} au format +++XXX/XXXX/XXXXX+++
 */
export function genererOGM(sequence, annee = new Date().getFullYear()) {
  // Base 10 chiffres : AAAA (année) + 6 chiffres de séquence.
  const base = `${annee}${String(sequence).padStart(6, "0")}`.slice(0, 10);
  let controle = Number(BigInt(base) % 97n);
  if (controle === 0) controle = 97;
  const douze = base + String(controle).padStart(2, "0");
  return `+++${douze.slice(0, 3)}/${douze.slice(3, 7)}/${douze.slice(7, 12)}+++`;
}

/**
 * Vérifie qu'une communication structurée est bien formée et cohérente
 * (format + clé mod 97). Sert au rapprochement d'un paiement entrant.
 * @param {string} ogm
 * @returns {boolean}
 */
export function ogmValide(ogm) {
  const m = String(ogm || "").match(/^\+\+\+(\d{3})\/(\d{4})\/(\d{5})\+\+\+$/);
  if (!m) return false;
  const douze = m[1] + m[2] + m[3];
  const base = douze.slice(0, 10);
  const controle = Number(douze.slice(10));
  let attendu = Number(BigInt(base) % 97n);
  if (attendu === 0) attendu = 97;
  return controle === attendu;
}

/**
 * Extrait le numéro de séquence d'une facture depuis son numéro légal
 * « AAAA-NNNNNN » (format de cmd_emettre_facture).
 * @param {string} numero
 * @returns {{annee: number, sequence: number}|null}
 */
export function decomposerNumero(numero) {
  const m = String(numero || "").match(/^(\d{4})-(\d{1,6})$/);
  if (!m) return null;
  return { annee: Number(m[1]), sequence: Number(m[2]) };
}
