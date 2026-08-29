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

// =============================================================================
// LA PORTÉE PAR CENTRE — qui voit quoi (lot centres, 27/08/2026)
//
// Deux règles, arrêtées par Raphaël :
//   · le RESPONSABLE DÉPÔT ne voit QUE son centre ;
//   · SECRÉTAIRE ET AU-DESSUS voient TOUS les centres et leurs écrans, sans
//     interférer avec la maison mère ni les autres centres — ils basculent
//     d'un centre à l'autre.
//
// « Sans interférer » : voir un autre centre est une CONSULTATION cadrée, pas
// une fusion. Chaque écran reste filtré sur le centre choisi ; on ne mélange
// jamais les dossiers de deux centres dans une même liste.
//
// Ce module ne lit aucune base : il DÉCIDE, à partir du poste et du centre de
// l'acteur, la liste des centres visibles et si la bascule est permise. Le
// filtrage effectif (requêtes, RLS) s'appuie dessus.
// =============================================================================

/** Les postes qui voient TOUS les centres. Secrétaire et au-dessus. */
const POSTES_TOUS_CENTRES = new Set([
  "fondateur", "gerant", "secretaire", "responsable_depot",
]);
// NB : le responsable dépôt est dans la liste des postes « bureau », mais sa
// portée est RESTREINTE à son centre — voir `porteeCentres`. Sa présence ici ne
// vaut que pour dire « c'est un poste bureau », pas « voit tout ».

/**
 * La portée de centres d'un acteur.
 *
 * @param {object} acteur { poste, centre_id }
 * @param {object[]} centres tous les centres de l'org [{ id, nom }]
 * @returns {{
 *   tousCentres: boolean,        // voit-il l'ensemble ?
 *   centresVisibles: (string|null)[],  // ids visibles ; null = maison mère
 *   centreParDefaut: string|null,      // sur quel centre il atterrit
 *   peutBasculer: boolean        // peut-il changer de centre ?
 * }}
 */
export function porteeCentres(acteur = {}, centres = []) {
  const poste = acteur.poste || null;
  const sien = centreOuMaisonMere(acteur.centre_id);

  // Le responsable dépôt : SON centre, rien d'autre. Même s'il est « bureau ».
  if (poste === "responsable_depot") {
    return {
      tousCentres: false,
      centresVisibles: [sien],
      centreParDefaut: sien,
      peutBasculer: false,
    };
  }

  // Secrétaire, gérant, fondateur : tous les centres + la maison mère.
  if (POSTES_TOUS_CENTRES.has(poste)) {
    const tous = [MAISON_MERE, ...(centres || []).map((c) => c.id)];
    return {
      tousCentres: true,
      centresVisibles: tous,
      // On atterrit sur SON centre s'il en a un, sinon la maison mère.
      centreParDefaut: sien,
      peutBasculer: true,
    };
  }

  // Le terrain et les accès sur mesure : leur centre de rattachement, sans
  // bascule. Ils ne « visitent » pas les centres — ils travaillent dans le leur.
  return {
    tousCentres: false,
    centresVisibles: [sien],
    centreParDefaut: sien,
    peutBasculer: false,
  };
}

/**
 * Un acteur peut-il OUVRIR les écrans du centre `cible` ?
 * La règle « sans interférer » se réduit à : la cible est-elle dans sa portée ?
 */
export function peutVoirCentre(acteur, centres, cible) {
  const p = porteeCentres(acteur, centres);
  const c = centreOuMaisonMere(cible);
  return p.centresVisibles.some((v) => centreOuMaisonMere(v) === c);
}

/**
 * Filtre une liste d'objets porteurs de `centre_id` sur le centre choisi.
 * Garantit le « sans interférer » : jamais deux centres dans la même liste.
 * La maison mère (centre_id null) est un centre comme un autre ici.
 */
export function filtrerParCentre(objets, centreChoisi) {
  const c = centreOuMaisonMere(centreChoisi);
  return (objets || []).filter((o) => centreOuMaisonMere(o.centre_id) === c);
}

// -----------------------------------------------------------------------------
// L'ESPACE DE TRAVAIL (décision Option A du 28/08) — un centre n'est pas un
// filtre sur une liste commune, c'est un ESPACE : on y entre, on y travaille,
// ce qu'on y crée LUI appartient. La maison mère est un espace comme un autre.
// -----------------------------------------------------------------------------

/**
 * Le centre où RATTACHER une création (dossier, mission) selon l'espace où
 * l'acteur travaille. C'est ce qui rend un centre neuf réellement utilisable :
 * un dossier créé dans son espace lui appartient.
 *
 * @param {string|null|undefined} espaceCourant  le centre ouvert (ou MAISON_MERE)
 * @param {object} acteur  { poste, centre_id }
 * @param {object[]} centres
 * @returns {string|null}  centre_id à poser (null = maison mère)
 */
export function centreDeRattachement(espaceCourant, acteur = {}, centres = []) {
  const p = porteeCentres(acteur, centres);
  // Le responsable dépôt (pas de bascule) crée toujours dans SON centre — quel
  // que soit l'espace demandé, il ne sort pas de chez lui.
  if (!p.peutBasculer) return centreOuMaisonMere(p.centreParDefaut);
  // Sinon, on rattache à l'espace explicitement ouvert ; à défaut, au centre par
  // défaut de l'acteur.
  return centreOuMaisonMere(
    espaceCourant === undefined ? p.centreParDefaut : espaceCourant);
}

/**
 * L'intitulé de l'espace courant, pour dire « vous êtes ici » à l'écran.
 * @returns {string}
 */
export function nomEspace(espaceCourant, centres = []) {
  const c = centreOuMaisonMere(espaceCourant);
  if (c === MAISON_MERE) return "Maison mère";
  return (centres || []).find((x) => x.id === c)?.nom || "Centre";
}
