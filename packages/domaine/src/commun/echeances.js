// =============================================================================
// Commun — Échéances
// Source : Réf. 2 (échéances colorées : documents RH, CT/assurance flotte).
// Toute date d'échéance est qualifiée : Valide (> 30 j), Proche (<= 30 j),
// Expirée (dépassée). Logique PURE, partagée par RH et Flotte — une seule règle.
// Alimente la file « À traiter » (calcul, pas saisie).
// =============================================================================

/**
 * La date d'échéance d'une facture : date d'émission + délai réglé.
 * Règle métier PURE, doublon testable de ce que pose cmd_emettre_facture en SQL.
 * Le délai est celui de la société ; défaut prudent à 30 jours si absent ou
 * incohérent ; jamais négatif.
 *
 * @param {string|Date} emission   date d'émission
 * @param {number|null|undefined} joursRegles  parametres_facturation.echeance_jours
 * @returns {Date}
 */
export function dateEcheance(emission, joursRegles) {
  const base = emission instanceof Date ? emission : new Date(emission);
  // Piège Number(null)===0 : un réglage absent NE doit pas valoir 0 jour. On
  // traite null/undefined/"" comme « absent » AVANT toute coercition.
  const absent = joursRegles === null || joursRegles === undefined || joursRegles === "";
  let jours = absent ? 30 : Number(joursRegles);
  if (!Number.isFinite(jours) || jours < 0) jours = 30;   // défaut prudent
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + jours);
  return d;
}

/**
 * Qualifie une échéance par rapport à une date de référence.
 * @param {string|null} echeance  date ISO, ou null (absente)
 * @param {string|Date} [reference]  aujourd'hui par défaut
 * @param {number} [seuilJours=30]  fenêtre d'alerte
 * @returns {{etat: "valide"|"proche"|"expiree"|"absente", jours: number|null}}
 */
export function qualifierEcheance(echeance, reference = new Date(), seuilJours = 30) {
  if (!echeance) return { etat: "absente", jours: null };
  const ref = reference instanceof Date ? reference : new Date(reference);
  const ech = new Date(echeance);
  const jours = Math.floor((ech.getTime() - ref.getTime()) / 86400000);
  if (jours < 0) return { etat: "expiree", jours };
  if (jours <= seuilJours) return { etat: "proche", jours };
  return { etat: "valide", jours };
}

/**
 * Indique si une échéance requiert une action (proche, expirée ou absente).
 * C'est le filtre de la file « À traiter ».
 * @param {ReturnType<typeof qualifierEcheance>} q
 * @returns {boolean}
 */
export function echeanceARegler(q) {
  return q.etat === "proche" || q.etat === "expiree" || q.etat === "absente";
}
