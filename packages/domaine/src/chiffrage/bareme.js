// =============================================================================
// Chiffrage — Barème de référence (valeurs validées client)
// Source : les trois modèles d'offre validés ; confirmés par le fondateur
// (ADR-008). Ces constantes sont la valeur INITIALE du référentiel versionné
// `bareme_horaire` (et apparentés) — le seed SQL 0002 en est le miroir.
// En production, le barème vit en base (referentiels) et se republie sans
// toucher au code (C-07). Ici : la référence de calcul et de test.
// =============================================================================

/** Taux horaire HTVA par nombre de déménageurs (€/heure). */
export const BAREME_HORAIRE = Object.freeze({
  2: 85,
  3: 130,   // seul palier figurant dans le texte des offres
  4: 170,
  5: 215,
  6: 255,
});

/** Options et suppléments (HTVA sauf mention). */
export const TARIFS = Object.freeze({
  elevateur: 150,          // forfait, maximum 7e étage
  km_facture: 1,           // € / km / camion (dépôt → dépôt)
  emballage_horaire: 75,   // € / heure (2 déménageurs, en régie)
  emballage_km: 0.75,      // € / km
  heure_sup_forfait: 42.5, // € HTVA / déménageur / heure (dépassement forfait)
  assurance_htva: 50,      // € HTVA (60,50 € TVAC)
});

/** Taux de TVA applicable (%). */
export const TVA_PCT = 21;

/** Cible de marge (sur recette HTVA) : zone saine 25 % – 45 %. */
export const MARGE_CIBLE = Object.freeze({ min: 25, max: 45 });

/** Barèmes d'indemnité (% du total TVAC) selon la distance à la date. */
export const REPORT = Object.freeze([
  { seuil_jours: 5, pct: 25 },   // jusqu'à 5 jours avant
  { seuil_jours: 2, pct: 50 },   // jusqu'à 2 jours avant
  { seuil_jours: 0, pct: 75 },   // veille ou jour même
]);
export const ANNULATION = Object.freeze([
  { seuil_jours: 5, pct: 50 },
  { seuil_jours: 2, pct: 70 },
  { seuil_jours: 0, pct: 100 },
]);
