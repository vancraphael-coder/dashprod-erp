// =============================================================================
// Litiges — les circuits, par type.
//
// Un litige n'est pas un état mou. Chaque type suit un chemin balisé, et l'écran
// ne doit proposer QUE l'étape suivante légitime. La base journalise ; ce module
// dit ce qui a le droit de suivre quoi. Aucune décision d'argent ici : juste le
// parcours.
//
// « Litige en cours » à l'écran = le dossier est effectué ET a un litige ouvert.
// C'est dérivé, jamais stocké — comme le cycle de facturation.
// =============================================================================

// Chaque type : ses étapes ordonnées, avec libellé lisible. La dernière étape
// « métier » précède la résolution (resolu / abandonne), commune à tous.
export const CIRCUITS = {
  impaye: {
    libelle: "Impayé",
    couleur: "#DC2626",
    etapes: [
      ["a_relancer", "À relancer"],
      ["relance_envoyee", "Relance envoyée"],
      ["mise_en_demeure", "Mise en demeure"],
      ["recouvrement", "Recouvrement / huissier"],
    ],
    issues: [
      ["resolu", "Payé"],
      ["abandonne", "Passé en perte"],
    ],
  },
  degat: {
    libelle: "Dégât / assurance",
    couleur: "#D97706",
    etapes: [
      ["a_declarer", "À déclarer"],
      ["declare_assureur", "Déclaré à l'assureur"],
      ["expertise", "Expertise en cours"],
      ["indemnisation", "Indemnisation attendue"],
    ],
    issues: [
      ["resolu", "Indemnisé / réglé"],
      ["abandonne", "Refusé / classé"],
    ],
  },
  contestation: {
    libelle: "Contestation",
    couleur: "#7C3AED",
    etapes: [
      ["recue", "Réclamation reçue"],
      ["en_examen", "En examen"],
      ["proposition", "Proposition faite au client"],
    ],
    issues: [
      ["resolu", "Accord trouvé"],
      ["abandonne", "Sans suite"],
    ],
  },
  autre: {
    libelle: "Autre",
    couleur: "#5B6B84",
    etapes: [["ouvert", "Ouvert"], ["en_traitement", "En traitement"]],
    issues: [["resolu", "Résolu"], ["abandonne", "Abandonné"]],
  },
};

export function typesLitige() {
  return Object.entries(CIRCUITS).map(([cle, c]) => ({
    cle, libelle: c.libelle, couleur: c.couleur,
  }));
}

export function libelleType(type) {
  return CIRCUITS[type]?.libelle || type;
}

export function couleurType(type) {
  return CIRCUITS[type]?.couleur || "#5B6B84";
}

export function libelleEtape(type, etape) {
  const c = CIRCUITS[type];
  if (!c) return etape;
  const t = [...c.etapes, ...c.issues].find(([cle]) => cle === etape);
  return t ? t[1] : etape;
}

/**
 * L'étape suivante légitime, s'il y en a une. Un litige n'avance que d'un cran :
 * proposer un saut à trois étapes plus loin ferait perdre la trace du parcours.
 */
export function etapeSuivante(type, etapeActuelle) {
  const c = CIRCUITS[type];
  if (!c) return null;
  const i = c.etapes.findIndex(([cle]) => cle === etapeActuelle);
  if (i === -1 || i >= c.etapes.length - 1) return null;
  const [cle, libelle] = c.etapes[i + 1];
  return { cle, libelle };
}

/** Les fins possibles pour ce type (toujours proposées, dès l'ouverture). */
export function issues(type) {
  return (CIRCUITS[type]?.issues || []).map(([cle, libelle]) => ({ cle, libelle }));
}

/** Progression 0→1 pour une barre discrète. La résolution vaut 1. */
export function progression(type, etape, statut) {
  if (statut && statut !== "ouvert") return 1;
  const c = CIRCUITS[type];
  if (!c) return 0;
  const i = c.etapes.findIndex(([cle]) => cle === etape);
  if (i === -1) return 0;
  return (i + 1) / (c.etapes.length + 1);
}
