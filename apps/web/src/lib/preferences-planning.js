// =============================================================================
// PRÉFÉRENCES D'AFFICHAGE DU PLANNING — sur l'appareil, pas en base.
//
// Ce que chaque personne choisit de voir sur son planning (masquer les visites,
// sortir un intérimaire de la vue) est un confort de lecture, pas une décision
// d'entreprise : deux chefs d'équipe n'ont pas les mêmes besoins le même jour.
// On garde donc ça localement, comme l'apparence — jamais en base, où ça
// s'imposerait à tout le monde.
//
// C'est bien un FILTRE, pas un état du dossier : rien de ce qui est ici ne
// change une mission ou une affectation. Le domaine (`filtrerMissions`) ne fait
// que taire ce qui est masqué ; la disponibilité reste calculée sur la réalité
// complète, sinon masquer un membre effacerait ses conflits.
// =============================================================================

const CLE = "dashprod-planning-filtres-v1";

function tout() {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? JSON.parse(brut) : {};
  } catch {
    // Un stockage illisible (mode privé, quota) ne doit pas casser le planning :
    // on repart d'aucun filtre plutôt que de faire écran blanc.
    return {};
  }
}

/** La liste masquée pour une clé (`types` ou `membres`). Toujours un tableau. */
export function lireFiltre(cle) {
  const v = tout()[cle];
  return Array.isArray(v) ? v : [];
}

/** Écrit la liste masquée. Une liste vide efface l'entrée plutôt que de garder `[]`. */
export function ecrireFiltre(cle, liste) {
  try {
    const etat = tout();
    if (!liste || liste.length === 0) delete etat[cle];
    else etat[cle] = liste;
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // Écriture impossible : le filtre vaudra pour la session, sans persister.
    // Silencieux volontairement — l'utilisateur n'a rien demandé d'autre que
    // de masquer une carte.
  }
}

/** Bascule une valeur dans une liste masquée, et renvoie la nouvelle liste. */
export function basculerMasque(liste, valeur) {
  return (liste || []).includes(valeur)
    ? liste.filter((x) => x !== valeur)
    : [...(liste || []), valeur];
}
