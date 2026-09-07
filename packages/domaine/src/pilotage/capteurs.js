// =============================================================================
// LES CAPTEURS KPI — la mesure, posée AVANT le tableau de bord.
//
// POURQUOI MAINTENANT : un indicateur qu'on branche après coup oblige à
// retrouver la donnée, souvent perdue. En déclarant les capteurs d'abord, chaque
// lot qui produit une donnée sait qu'elle sera mesurée, et le tableau de bord
// n'aura qu'à lire. C'est la dette de structure qu'on refuse de créer.
//
// UN CAPTEUR N'EST PAS UN CHIFFRE : c'est la DÉCLARATION d'une mesure — sa clé,
// son libellé, son unité, sa source, les secteurs concernés, et son sens (une
// hausse est-elle bonne ?). Le calcul vient après, alimenté par l'adaptateur.
//
// Ces déclarations servent trois consommateurs, d'où leur forme neutre :
//   1. le tableau de bord « Pilotage » de chaque organisation ;
//   2. les API de conformité (ce qui doit être prouvable est ici) ;
//   3. le pilotage par MCP — un agent doit pouvoir lire le catalogue des
//      mesures sans qu'on lui écrive un adaptateur sur mesure.
// =============================================================================

/** Les familles de mesure. Un tableau de bord se lit famille par famille. */
export const FAMILLES_KPI = Object.freeze([
  "argent", "activite", "terrain", "conformite", "reseau",
]);

/** Le sens d'une variation : ce qui est souhaitable. */
export const SENS = Object.freeze({ HAUT: "haut_est_bon", BAS: "bas_est_bon",
                                    NEUTRE: "neutre" });

/**
 * Le catalogue des capteurs. `secteurs: null` = tous les secteurs.
 * `source` dit d'où vient la donnée — c'est ce qui garantit qu'un capteur n'est
 * pas une intention mais une mesure réellement disponible.
 */
export const CAPTEURS = Object.freeze([
  // ── Argent ───────────────────────────────────────────────────────────────
  { cle: "ca_emis", libelle: "Chiffre d'affaires émis", famille: "argent",
    unite: "centimes", sens: SENS.HAUT, source: "factures.emise",
    secteurs: null, expose_api: true, expose_mcp: true },
  { cle: "ca_encaisse", libelle: "Encaissé", famille: "argent",
    unite: "centimes", sens: SENS.HAUT, source: "paiements",
    secteurs: null, expose_api: true, expose_mcp: true },
  { cle: "reste_du", libelle: "Reste dû", famille: "argent",
    unite: "centimes", sens: SENS.BAS, source: "factures - paiements",
    secteurs: null, expose_api: true, expose_mcp: true },
  { cle: "en_retard", libelle: "En retard", famille: "argent",
    unite: "centimes", sens: SENS.BAS, source: "factures.echeance dépassée",
    secteurs: null, expose_api: true, expose_mcp: true },
  { cle: "delai_encaissement", libelle: "Délai moyen d'encaissement",
    famille: "argent", unite: "jours", sens: SENS.BAS,
    source: "paiements.date - factures.date_emission",
    secteurs: null, expose_api: false, expose_mcp: true },
  { cle: "marge_moyenne", libelle: "Marge moyenne", famille: "argent",
    unite: "pourcent", sens: SENS.HAUT, source: "scenarios.resultats",
    secteurs: ["demenagement", "lift", "sous_traitance"],
    expose_api: false, expose_mcp: true },

  // ── Activité ─────────────────────────────────────────────────────────────
  { cle: "dossiers_par_etat", libelle: "Dossiers par état", famille: "activite",
    unite: "compte", sens: SENS.NEUTRE, source: "affaires.etat",
    secteurs: null, expose_api: false, expose_mcp: true },
  { cle: "taux_conversion", libelle: "Devis → confirmé", famille: "activite",
    unite: "pourcent", sens: SENS.HAUT, source: "affaires.etat",
    secteurs: null, expose_api: false, expose_mcp: true },
  { cle: "dossiers_bloques", libelle: "Bloqués depuis 30 jours",
    famille: "activite", unite: "compte", sens: SENS.BAS,
    source: "affaires.etat + updated_at",
    secteurs: null, expose_api: false, expose_mcp: true },

  // ── Terrain ──────────────────────────────────────────────────────────────
  { cle: "chantiers_du_jour", libelle: "Chantiers du jour", famille: "terrain",
    unite: "compte", sens: SENS.NEUTRE, source: "missions.date",
    secteurs: ["demenagement", "lift", "sous_traitance"],
    expose_api: false, expose_mcp: true },
  { cle: "heures_reelles_vs_estimees", libelle: "Heures réelles vs estimées",
    famille: "terrain", unite: "pourcent", sens: SENS.NEUTRE,
    source: "chrono_sessions vs scenarios",
    secteurs: ["demenagement", "sous_traitance"],
    expose_api: false, expose_mcp: true },
  { cle: "constats_en_attente", libelle: "Constats à trancher",
    famille: "terrain", unite: "compte", sens: SENS.BAS,
    source: "constats_chantier.etat",
    secteurs: ["demenagement", "lift", "sous_traitance"],
    expose_api: false, expose_mcp: true },

  // ── Contrats (secteurs à contrat) ────────────────────────────────────────
  { cle: "contrats_actifs", libelle: "Contrats actifs", famille: "activite",
    unite: "compte", sens: SENS.HAUT, source: "stock_contrats.actif",
    secteurs: ["boxe", "zone"], expose_api: false, expose_mcp: true },
  { cle: "recurrent_mensuel", libelle: "Revenu récurrent mensuel",
    famille: "argent", unite: "centimes", sens: SENS.HAUT,
    source: "stock_contrats.tarif_centimes",
    secteurs: ["boxe", "zone"], expose_api: true, expose_mcp: true },
  { cle: "taux_occupation", libelle: "Taux d'occupation", famille: "activite",
    unite: "pourcent", sens: SENS.HAUT, source: "stock_boxes vs contrats",
    secteurs: ["boxe", "zone"], expose_api: false, expose_mcp: true },
  { cle: "echeances_non_facturees", libelle: "Échéances à facturer",
    famille: "argent", unite: "centimes", sens: SENS.BAS,
    source: "stock_echeances.facture_id null",
    secteurs: ["boxe", "zone"], expose_api: false, expose_mcp: true },

  // ── Conformité (ce qui doit être PROUVABLE) ──────────────────────────────
  { cle: "factures_sans_communication", libelle: "Factures sans communication",
    famille: "conformite", unite: "compte", sens: SENS.BAS,
    source: "factures.communication", secteurs: null,
    expose_api: true, expose_mcp: true },
  { cle: "documents_transport_incomplets",
    libelle: "Documents de transport incomplets", famille: "conformite",
    unite: "compte", sens: SENS.BAS, source: "conformite/transport",
    secteurs: ["sous_traitance"], expose_api: true, expose_mcp: true },
  { cle: "pieces_conservees", libelle: "Pièces conservées", famille: "conformite",
    unite: "compte", sens: SENS.NEUTRE, source: "factures + documents",
    secteurs: null, expose_api: true, expose_mcp: false },

  // ── Réseau (préparé, alimenté quand le réseau ouvre) ─────────────────────
  { cle: "missions_recues", libelle: "Missions reçues du réseau",
    famille: "reseau", unite: "compte", sens: SENS.HAUT, source: "réseau",
    secteurs: null, expose_api: false, expose_mcp: true },
  { cle: "missions_envoyees", libelle: "Missions envoyées", famille: "reseau",
    unite: "compte", sens: SENS.HAUT, source: "réseau",
    secteurs: null, expose_api: false, expose_mcp: true },
  { cle: "delai_acceptation", libelle: "Délai d'acceptation", famille: "reseau",
    unite: "minutes", sens: SENS.BAS, source: "réseau",
    secteurs: null, expose_api: false, expose_mcp: true },
]);

/** Un capteur par sa clé. `null` plutôt qu'un défaut inventé. */
export function capteur(cle) {
  return CAPTEURS.find((c) => c.cle === cle) || null;
}

/**
 * Les capteurs pertinents pour un secteur. Un tableau de bord de garde-meubles
 * ne montre pas « heures réelles vs estimées » — il n'a pas de chantier.
 */
export function capteursDeSecteur(secteur) {
  return CAPTEURS.filter((c) => c.secteurs === null
    || (secteur && c.secteurs.includes(secteur)));
}

/** Les capteurs d'une famille, pour un secteur donné. */
export function capteursDeFamille(famille, secteur = null) {
  return capteursDeSecteur(secteur).filter((c) => c.famille === famille);
}

/**
 * Le contrat d'exposition d'un capteur vers l'extérieur. Sert aux futurs
 * branchements : API de conformité et pilotage MCP. Déclarer ce contrat
 * MAINTENANT évite d'avoir à ré-annoter cinquante mesures plus tard.
 */
export function contratExposition(cle) {
  const c = capteur(cle);
  if (!c) return null;
  return {
    cle: c.cle,
    libelle: c.libelle,
    unite: c.unite,
    famille: c.famille,
    // Ce qu'un consommateur externe doit savoir pour interpréter la valeur.
    sens: c.sens,
    api: c.expose_api === true,
    mcp: c.expose_mcp === true,
  };
}

/** Le catalogue exposable à un agent MCP : de quoi se piloter sans adaptateur. */
export function catalogueMcp() {
  return CAPTEURS.filter((c) => c.expose_mcp).map((c) => contratExposition(c.cle));
}

/** Le catalogue exposable aux API de conformité. */
export function catalogueApi() {
  return CAPTEURS.filter((c) => c.expose_api).map((c) => contratExposition(c.cle));
}
