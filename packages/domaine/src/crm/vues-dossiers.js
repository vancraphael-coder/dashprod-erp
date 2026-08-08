// =============================================================================
// Vues de la pile de dossiers — un tri rapide, par intention.
//
// L'ancienne barre alignait onze pastilles, une par état. Pour retrouver « ce
// que je dois faire aujourd'hui », il fallait lire toute la ligne. On remplace
// ça par quelques VUES larges, ordonnées comme le travail se pense :
//
//   À traiter · À planifier · Sur le terrain · À clôturer · Tous
//
// Chaque vue regroupe plusieurs états sous une même question. Le compteur de
// chaque vue se calcule d'un coup, pour que la barre montre où est la charge
// sans avoir à ouvrir quoi que ce soit.
// =============================================================================

export const VUES = Object.freeze([
  {
    cle: "a_traiter",
    libelle: "À traiter",
    aide: "Devis à faire, offres envoyées à relancer",
    etats: ["brouillon", "devis", "envoye"],
  },
  {
    cle: "a_planifier",
    libelle: "À planifier",
    aide: "Confirmés, en attente de date et d'équipe",
    etats: ["confirme", "reporte"],
  },
  {
    cle: "terrain",
    libelle: "Sur le terrain",
    aide: "Planifiés et chantiers en cours",
    etats: ["planifie", "en_cours"],
  },
  {
    cle: "a_cloturer",
    libelle: "À clôturer",
    aide: "Effectués : à confirmer, facturer, encaisser",
    etats: ["effectue"],
  },
  {
    cle: "tous",
    libelle: "Tous",
    aide: "Tout, y compris clos et annulés",
    etats: null,   // null = pas de filtre
  },
]);

const PAR_CLE = new Map(VUES.map((v) => [v.cle, v]));

/** Un dossier appartient-il à cette vue ? */
export function dansLaVue(affaire, cleVue) {
  const v = PAR_CLE.get(cleVue);
  if (!v || v.etats === null) return true;
  return v.etats.includes(affaire?.etat);
}

/** Filtre une liste selon la vue choisie. */
export function filtrerParVue(affaires, cleVue) {
  return (affaires || []).filter((a) => dansLaVue(a, cleVue));
}

/**
 * Compte les dossiers de chaque vue en UN seul passage. « Tous » n'est pas
 * compté (le nombre total n'aide pas à décider quoi faire).
 */
export function compteursVues(affaires) {
  const c = {};
  for (const v of VUES) if (v.etats !== null) c[v.cle] = 0;
  for (const a of affaires || []) {
    for (const v of VUES) {
      if (v.etats !== null && v.etats.includes(a?.etat)) c[v.cle]++;
    }
  }
  return c;
}

/** La vue par défaut à l'ouverture : celle où il y a du travail, sinon À traiter. */
export function vueParDefaut(affaires) {
  const c = compteursVues(affaires);
  for (const cle of ["a_cloturer", "a_traiter", "a_planifier", "terrain"]) {
    if (c[cle] > 0) return cle;
  }
  return "a_traiter";
}

/**
 * Signaux d'urgence par vue — ce qui doit sauter aux yeux sans ouvrir un dossier.
 * La barre affiche un point rouge (bloquant) ou ambre (à traiter) sur les vues
 * concernées, pour que la charge SE VOIE d'un coup d'œil.
 *
 *  — À clôturer : rouge s'il y a un litige ou un impayé ; ambre s'il reste à
 *    facturer ou à confirmer.
 *  — Sur le terrain : ambre s'il y a des chantiers remontés en attente du bureau.
 *
 * S'appuie sur les champs enrichis par listerAffaires (solde, litiges, facture)
 * et sur l'état des missions quand il est fourni.
 */
export function urgencesVues(affaires) {
  const u = {};
  for (const a of affaires || []) {
    if (a?.etat === "effectue") {
      const litige = (Number(a.litiges_ouverts) || 0) > 0;
      const impaye = (Number(a.solde_centimes) || 0) > 0;
      const aFacturer = a.a_facture === false;
      const enAttente = a.missions_terrain_en_attente === true;
      if (litige || impaye) u.a_cloturer = "rouge";
      else if ((aFacturer || enAttente) && u.a_cloturer !== "rouge") u.a_cloturer = "ambre";
    }
    if (a?.etat === "en_cours" && a.missions_terrain_en_attente === true) {
      if (u.terrain !== "rouge") u.terrain = "ambre";
    }
  }
  return u;
}
