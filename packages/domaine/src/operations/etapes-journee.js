// =============================================================================
// ÉTAPES DE LA JOURNÉE — où en est l'équipe, d'un coup d'œil.
//
// Le chef d'équipe avance (ou recule) d'un geste ; le bureau voit la jauge
// bouger dans sa vue « journée ». C'est un indicateur rapide, pas un pointage :
// il ne touche ni aux heures, ni à la paie, ni au décompte. Reculer est donc
// toujours permis — un doigt qui a glissé ne doit rien coûter.
//
// Chaque type de travail a sa séquence. Un déménagement passe par le
// chargement et le déchargement ; une visite n'en a pas. Les séquences vivent
// ICI et nulle part ailleurs : la base ne connaît que le rang, et refuse tout
// saut de plus d'une étape.
// =============================================================================

export const LIBELLES = Object.freeze({
  depart:       { court: "Départ",       long: "Départ du dépôt" },
  chargement:   { court: "Chargement",   long: "Sur place — chargement" },
  route:        { court: "En route",     long: "En route vers le déchargement" },
  dechargement: { court: "Déchargement", long: "Déchargement" },
  emballage:    { court: "Emballage",    long: "Emballage chez le client" },
  installation: { court: "Installation", long: "Installation du lift" },
  lift:         { court: "Lift",         long: "Montée / descente au lift" },
  visite:       { court: "Visite",       long: "Visite chez le client" },
  retour:       { court: "Retour",       long: "Retour au dépôt" },
  fin:          { court: "Terminé",      long: "Journée terminée" },
});

const SEQUENCES = Object.freeze({
  demenagement: ["depart", "chargement", "route", "dechargement", "retour", "fin"],
  emballage:    ["depart", "emballage", "retour", "fin"],
  lift:         ["depart", "installation", "lift", "retour", "fin"],
  visite:       ["depart", "visite", "fin"],
});

/** La séquence d'un type de travail ; inconnu → celle du déménagement. */
export function etapesPour(type) {
  const cles = SEQUENCES[type] || SEQUENCES.demenagement;
  return cles.map((cle) => ({ cle, ...LIBELLES[cle] }));
}

/**
 * L'état complet pour l'affichage.
 * rang 0 = pas commencé ; rang k = k-ième étape atteinte ; rang n = terminé.
 * Une clé inconnue de la séquence (type changé en cours de route) → rang 0,
 * jamais une jauge fausse.
 */
export function etatEtapes(type, cle) {
  const etapes = etapesPour(type);
  const i = cle ? etapes.findIndex((e) => e.cle === cle) : -1;
  const rang = i + 1;
  const total = etapes.length;
  return {
    etapes, rang, total,
    pct: total ? rang / total : 0,
    courante: rang > 0 ? etapes[rang - 1] : null,
    suivante: rang < total ? etapes[rang] : null,
    precedente: rang > 1 ? etapes[rang - 2] : null,
    commence: rang > 0,
    termine: rang === total,
  };
}

/**
 * Un pas en avant (+1) ou en arrière (−1). Hors bornes → null (le bouton est
 * alors désactivé, rien n'est envoyé).
 * @returns {{cle: string|null, rang: number}|null}
 */
export function deplacer(type, cleActuelle, sens) {
  const { etapes, rang, total } = etatEtapes(type, cleActuelle);
  const cible = rang + (sens > 0 ? 1 : -1);
  if (cible < 0 || cible > total) return null;
  return { cle: cible === 0 ? null : etapes[cible - 1].cle, rang: cible };
}

/**
 * Le moment du décompte que l'étape rend évident : arrivé au déchargement,
 * c'est « avant déchargement » ; sur le retour, « avant retour dépôt ».
 */
export function momentDecompteSuggere(cle) {
  if (cle === "dechargement") return "avant_dechargement";
  if (cle === "retour") return "avant_retour_depot";
  return null;
}
