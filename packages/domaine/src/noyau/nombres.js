// =============================================================================
// Nombres explicitement fournis — le remède à un piège payé SIX fois.
//
// LE PIÈGE : en JavaScript, `Number(null)` et `Number("")` valent **0**, pas
// NaN. Et 0 est un nombre parfaitement fini. Donc tout code de la forme
//
//     const taux = Number.isFinite(Number(v)) ? Number(v) : defaut;
//     const taux = Number(v) || defaut;          // à peine mieux : 0 tombe aussi
//
// transforme silencieusement une valeur ABSENTE en zéro. Dans un ERP, zéro
// n'est jamais neutre :
//   - un taux de TVA absent devenu 0 % → l'export comptable déclare zéro TVA
//     due, et l'UBL Peppol part avec 0 % (occurrence n° 6, la plus coûteuse) ;
//   - un taux horaire absent devenu 0 €/h → un salarié travaille gratuitement ;
//   - une validité d'offre vide devenue 0 jour → offre expirée en 24 h.
//
// LA RÈGLE : on distingue « la valeur vaut zéro » de « la valeur n'a pas été
// fournie ». `nombre()` renvoie NaN pour l'absence, et `Number.isFinite` fait
// alors correctement son travail.
//
// Historique des occurrences : 4× dans la paie, 1× sur la validité d'offre,
// 1× sur le taux de TVA des lignes de facture. À réutiliser partout où une
// valeur numérique peut légitimement manquer.
// =============================================================================

/**
 * Convertit en nombre, mais renvoie NaN si la valeur n'a pas été FOURNIE
 * (null, undefined, chaîne vide ou blanche).
 *
 *   nombre(0)      →  0      (zéro explicite : c'est une valeur)
 *   nombre("0")    →  0
 *   nombre(null)   →  NaN    (absence)
 *   nombre("")     →  NaN
 *   nombre("  ")   →  NaN
 *   nombre("abc")  →  NaN
 */
export function nombre(v) {
  if (v === null || v === undefined) return NaN;
  const s = typeof v === "string" ? v.trim() : v;
  if (s === "") return NaN;
  return Number(s);
}

/**
 * La valeur si elle a été fournie et est un nombre fini, sinon le défaut.
 * C'est la forme à utiliser à la place de `Number(v) || defaut`.
 *
 *   ouDefaut(0, 21)      →  0   (un zéro voulu est respecté)
 *   ouDefaut(null, 21)   →  21
 *   ouDefaut("", 21)     →  21
 */
export function ouDefaut(v, defaut) {
  const n = nombre(v);
  return Number.isFinite(n) ? n : defaut;
}

/** La valeur a-t-elle été explicitement fournie et exploitable ? */
export function estFourni(v) {
  return Number.isFinite(nombre(v));
}

/**
 * Comme `ouDefaut`, en bornant le résultat. Utile pour les réglages saisis à
 * la main (une validité de 9999 jours ou de −5 n'a pas de sens).
 */
export function borne(v, defaut, min, max) {
  const n = ouDefaut(v, defaut);
  return Math.min(max, Math.max(min, n));
}
