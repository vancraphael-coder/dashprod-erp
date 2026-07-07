// =============================================================================
// Pilotage — Charge d'équipe
// Source : Réf. 2 (Ressources · Heures : équilibre à ±20 % de la moyenne, tri du
// plus au moins chargé). Les heures d'une personne = somme des heures des
// missions où elle est affectée (C-13 : source unique). Logique PURE.
// =============================================================================

/** Seuil d'équilibre : ±20 % autour de la moyenne d'équipe (Réf. 2). */
const SEUIL_EQUILIBRE = 0.20;

/**
 * Calcule la charge de chaque membre et la qualifie par rapport à la moyenne.
 * @param {{id: string, nom?: string, heures: number}[]} membres
 * @returns {{
 *   moyenne: number,
 *   membres: {id: string, nom?: string, heures: number, ecart_pct: number,
 *             etat: "sous_charge"|"equilibre"|"sur_charge"}[]
 * }}
 */
export function equilibreCharge(membres) {
  const liste = membres || [];
  const total = liste.reduce((a, m) => a + (m.heures || 0), 0);
  const moyenne = liste.length > 0 ? total / liste.length : 0;

  const qualifies = liste.map((m) => {
    const h = m.heures || 0;
    const ecartPct = moyenne > 0 ? Math.round(((h - moyenne) / moyenne) * 1000) / 10 : 0;
    let etat = "equilibre";
    if (moyenne > 0) {
      if (h > moyenne * (1 + SEUIL_EQUILIBRE)) etat = "sur_charge";
      else if (h < moyenne * (1 - SEUIL_EQUILIBRE)) etat = "sous_charge";
    }
    return { id: m.id, nom: m.nom, heures: h, ecart_pct: ecartPct, etat };
  });

  // Tri du plus chargé au moins chargé (Réf. 2 : extrêmes sous les yeux).
  qualifies.sort((a, b) => b.heures - a.heures);
  return { moyenne: Math.round(moyenne * 10) / 10, membres: qualifies };
}

/**
 * Identifie les déséquilibres à corriger : membres sur- ou sous-chargés.
 * @param {ReturnType<typeof equilibreCharge>} bilan
 * @returns {{surcharges: string[], souscharges: string[]}}
 */
export function desequilibres(bilan) {
  const surcharges = bilan.membres.filter((m) => m.etat === "sur_charge").map((m) => m.id);
  const souscharges = bilan.membres.filter((m) => m.etat === "sous_charge").map((m) => m.id);
  return { surcharges, souscharges };
}
