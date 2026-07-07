// =============================================================================
// Chiffrage — Barème de tarification
// Source : Réf. 2 (C-08 : barèmes internes) ; Réf. 3 (T2 : référentiel versionné).
// Le barème vit en base comme référentiel ; ici, la structure et les valeurs.
// =============================================================================

/**
 * Barème par défaut (v1) : structure et valeurs de tarification.
 * @type {{
 *   nom: string,
 *   version: number,
 *   version_date: string,
 *   devise: string,
 *   tva_pct: number,
 *   taux_horaire: number,
 *   supplement_emballage_horaire: number,
 *   supplement_emballage_km: number,
 *   taux_km: number,
 *   elevateurPct: number,
 *   cibleMarge_pct: number,
 *   paliers_demenageurs: number[],
 *   zones_marge: {sous_cible: number, dans_cible: [number, number], premium: number},
 *   indemnites: {report: number[], annulation: number[]}
 * }}
 */
export const BAREME_DEFAUT = Object.freeze({
  nom: "Tarif standard 2026",
  version: 1,
  version_date: "2026-01-01",
  devise: "EUR",
  tva_pct: 21,
  
  // Tarification horaire de base (€/h pour 1 ou 2 déménageurs)
  taux_horaire: 85, // tarif minimum
  
  // Suppléments emballage (régie : +75 €/h et +0,75 €/km)
  supplement_emballage_horaire: 75,
  supplement_emballage_km: 0.75,
  
  // Tarification au km (€/km par camion)
  taux_km: 1.0,
  
  // Élévateur (% du montant horaire)
  elevateurPct: 15,
  
  // Cible de marge (%)
  cibleMarge_pct: 30,
  
  // Paliers de tarif selon le nombre de déménageurs
  // Clés = nombre de déménageurs ; valeurs = taux €/h
  paliers_demenageurs: [
    85,    // 1 déménageur
    85,    // 2 déménageurs (pas d'augmentation pour 2)
    130,   // 3 déménageurs
    160,   // 4 déménageurs
    185,   // 5 déménageurs
    210,   // 6 déménageurs
  ],
  
  // Zones de marge
  zones_marge: Object.freeze({
    sous_cible: 25,      // < 25 % = alerte rouge
    dans_cible: [25, 45], // 25–45 % = cible verte
    premium: 45,         // > 45 % = premium bleu
  }),
  
  // Indemnités (pourcentages selon la distance en jours)
  indemnites: Object.freeze({
    report: [25, 50, 75],     // jours <7, <15, ≥15
    annulation: [50, 70, 100], // jours <7, <15, ≥15
  }),
});

/**
 * Résout le taux horaire en fonction du nombre de déménageurs.
 * @param {number} effectif nombre de déménageurs
 * @param {typeof BAREME_DEFAUT} [bareme=BAREME_DEFAUT]
 * @returns {number} taux horaire (€/h)
 */
export function resoudreTauxHoraire(effectif, bareme = BAREME_DEFAUT) {
  const idx = Math.min(Math.max(0, effectif - 1), bareme.paliers_demenageurs.length - 1);
  return bareme.paliers_demenageurs[idx];
}

// Aliases pour la rétrocompatibilité avec le frontend
export const BAREME_HORAIRE = BAREME_DEFAUT.paliers_demenageurs;
export const TARIFS = {
  tarifaire: BAREME_DEFAUT.taux_horaire,
  emballage: BAREME_DEFAUT.supplement_emballage_horaire,
  km: BAREME_DEFAUT.taux_km,
};
