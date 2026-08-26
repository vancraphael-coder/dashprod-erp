// =============================================================================
// LES CENTRES et l'AFFECTATION DES MEMBRES — la logique, pas la base.
//
// POURQUOI CE FICHIER
// -------------------
// La colonne `utilisateurs.centre_id` existe, et `cmd_centre_affecter_membre`
// sait la changer (centre précis, ou NULL = maison mère). Ce qui manquait,
// Raphaël l'a demandé : le TRANSFERT DE PLUSIEURS MEMBRES à la fois, entre
// centres ou depuis/vers la maison mère, et le pouvoir de le faire au moment
// même où l'on crée un centre.
//
// Ce module décrit la maison mère comme un centre implicite (`null`), calcule
// ce qu'un transfert va changer, et énonce les règles — l'écran et l'adaptateur
// exécutent. Pur, testable sans base.
// =============================================================================

/**
 * La MAISON MÈRE n'est pas une ligne de `centres_logistiques` : c'est
 * l'absence de centre (`centre_id = null`). La représenter par une vraie ligne
 * créerait deux vérités — « le membre est à la maison mère » et « le membre a
 * pour centre la ligne maison-mère » — qu'on finirait par désaccorder.
 */
export const MAISON_MERE = null;

/** Normalise n'importe quelle valeur de centre en `null` (maison mère) ou id. */
export function centreOuMaisonMere(valeur) {
  return valeur == null || valeur === "" || valeur === "maison_mere"
    ? MAISON_MERE : valeur;
}

/**
 * Prépare un transfert de plusieurs membres vers une destination.
 *
 * Filtre les membres DÉJÀ à destination : les réaffecter ne changerait rien et
 * gonflerait le compte-rendu (« 12 transférés » quand 3 ont réellement bougé).
 * Dédoublonne aussi les identifiants — cliquer deux fois la même personne ne
 * doit pas la compter deux fois.
 *
 * @param {object[]} membres          [{ id, nom, centre_id }]
 * @param {string[]} idsSelectionnes  ceux qu'on veut transférer
 * @param {string|null} destination   id de centre, ou MAISON_MERE
 * @returns {{ aTransferer: object[], deja: object[], destination: string|null }}
 */
export function preparerTransfert(membres, idsSelectionnes, destination) {
  const dest = centreOuMaisonMere(destination);
  const voulus = new Set(idsSelectionnes || []);
  const aTransferer = [];
  const deja = [];
  for (const m of membres || []) {
    if (!voulus.has(m.id)) continue;
    const actuel = centreOuMaisonMere(m.centre_id);
    if (actuel === dest) deja.push(m);
    else aTransferer.push(m);
  }
  return { aTransferer, deja, destination: dest };
}

/**
 * Un compte-rendu lisible du transfert, pour l'écran.
 * « 3 membres transférés vers Anvers (2 y étaient déjà). »
 */
export function resumeTransfert(prep, nomDestination) {
  const n = prep.aTransferer.length;
  const ou = prep.destination === MAISON_MERE
    ? "la maison mère" : (nomDestination || "ce centre");
  if (n === 0) {
    return prep.deja.length
      ? `Personne à transférer : ${prep.deja.length > 1 ? "ils y sont" : "il y est"} déjà.`
      : "Aucun membre sélectionné.";
  }
  const base = `${n} membre${n > 1 ? "s" : ""} vers ${ou}`;
  return prep.deja.length
    ? `${base} (${prep.deja.length} y ${prep.deja.length > 1 ? "étaient" : "était"} déjà).`
    : `${base}.`;
}

/**
 * Les membres d'un centre donné (ou de la maison mère si `centreId` est
 * MAISON_MERE). Sert à afficher « qui est ici » sur la fiche d'un centre.
 */
export function membresDuCentre(membres, centreId) {
  const cible = centreOuMaisonMere(centreId);
  return (membres || []).filter((m) => centreOuMaisonMere(m.centre_id) === cible);
}
