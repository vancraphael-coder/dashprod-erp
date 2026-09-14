// =============================================================================
// LES SECTEURS — l'axe de l'expansion, déclaré UNE fois.
//
// LE DÉFAUT TROUVÉ EN AUDITANT LA TENUE À DIX SECTEURS. La notion de secteur
// existait à TROIS endroits, sous trois formes :
//
//   1. `offres.secteur`  — texte libre : « Self-storage », « Débit industriel »
//   2. `reutilisation.js` — énumération : « chantier », « entreposage »
//   3. `corps_metier.secteur` en base — même énumération, recopiée
//
// C'est la QUATRIÈME fois que la même maladie apparaît dans ce projet — après
// la grille de modules, la liste des offres et les prix. Et cette fois-ci sur
// l'axe même de l'expansion : ce qui doit tenir à dix secteurs était déclaré
// trois fois.
//
// LA CLARIFICATION QUI DÉBLOQUE. En regardant les trois, elles ne disent pas
// la même chose — et c'est ça qui les avait fait diverger sans qu'on le voie :
//
//   · le SECTEUR est une famille d'activité. Deux corps du même secteur se
//     croisent sur le même travail : un déménageur et un manutentionnaire sont
//     tous deux du « chantier ». C'est une énumération fermée, et c'est ce
//     fichier.
//   · la CLIENTÈLE VISÉE est un argument commercial. « Self-storage » ou
//     « Cuisiniste, mobilier, industrie » décrivent à qui on parle, pas ce
//     qu'on fait. Ça reste sur l'offre, en texte libre, et ça n'a pas à être
//     une énumération.
//
// Le mot « secteur » désignait les deux. Un mot pour deux choses : c'est
// exactement ce qui est arrivé à « pyramide ».
//
// POURQUOI CE FICHIER EST LE SOCLE DE L'ACCÉLÉRATION. Ajouter un secteur, ce
// n'est pas écrire du code : c'est ajouter une entrée ici, puis quatre
// déclarations qui en dérivent (corps, natures, modules, postures). Le reste se
// génère ou se vérifie. C'est ce qui permet d'aller à dix secteurs sans les
// refaire tous à chaque fois.
// =============================================================================

/**
 * Les secteurs. Énumération FERMÉE : un cinquième secteur se discute, il ne se
 * glisse pas. C'est le seul endroit où la liste existe.
 *
 * `corps` : les métiers du secteur, dans l'ordre où on les rencontre sur un
 * chantier ou dans un entrepôt. Ils doivent correspondre à la table
 * `corps_metier` en base — un test le vérifie.
 */
export const SECTEURS = Object.freeze([
  {
    cle: "chantier",
    titre: "Chantier",
    // Ce qui réunit ces corps : ils se croisent sur le MÊME travail, le même
    // jour, au même endroit. C'est ce qui rend le réseau utile entre eux.
    liant: "Ils interviennent sur le même chantier, le même jour.",
    corps: ["demenagement", "manutention", "levage", "livraison", "montage"],
    offres: ["starter", "regular", "pro", "independant_manutention",
             "donneur_ordre", "groupe_liftier"],
  },
  {
    cle: "entreposage",
    titre: "Entreposage",
    // Ceux-là ne se croisent jamais. Ce qu'ils partagent est TECHNIQUE :
    // attribuer un espace, facturer une période. La réutilisation est du code,
    // pas du réseau — et ça ne se décide pas pour les mêmes raisons.
    liant: "Ils attribuent un espace et facturent une période.",
    corps: ["entreposage", "logistique"],
    offres: ["garde_meubles", "logistique_mobilier"],
  },
]);

/** Un secteur par sa clé. `null` plutôt qu'un défaut inventé. */
export function secteur(cle) {
  return SECTEURS.find((s) => s.cle === cle) || null;
}

/** Les clés, pour les contraintes et les tests. */
export const CLES_SECTEURS = Object.freeze(SECTEURS.map((s) => s.cle));

/** Tous les corps de métier déclarés, tous secteurs confondus. */
export function tousLesCorps() {
  return SECTEURS.flatMap((s) => s.corps);
}

/** Le secteur d'un corps de métier. */
export function secteurDuCorps(corps) {
  return SECTEURS.find((s) => s.corps.includes(corps)) || null;
}

/** Le secteur d'une offre. */
export function secteurDeLOffre(code) {
  return SECTEURS.find((s) => s.offres.includes(code)) || null;
}

/**
 * Les offres du même secteur qu'une offre donnée, elle exclue.
 *
 * C'est la question qui décide de l'ordre d'ouverture : ouvrir un corps d'un
 * secteur crée de la demande pour les autres corps du MÊME secteur, parce
 * qu'ils se croisent sur le même travail. Entre secteurs, on ne partage que du
 * code.
 */
export function voisinsDeSecteur(code) {
  const s = secteurDeLOffre(code);
  return s ? s.offres.filter((c) => c !== code) : [];
}

/**
 * Le coût marginal d'un secteur, en unités de travail déclarées.
 *
 * Ce n'est pas une estimation de durée — je n'en ai pas les moyens. C'est le
 * DÉNOMBREMENT de ce qui reste à déclarer ou à écrire, ce qui est vérifiable.
 * Trois natures de coût, et elles ne se paient pas au même prix :
 *
 *   · `declarations` — des entrées dans des fichiers de données. Quasi gratuit.
 *   · `verrous`      — des politiques RLS, désormais GÉNÉRÉES. Quasi gratuit.
 *   · `ecrans`       — irréductible : c'est le produit lui-même.
 */
export function coutMarginal({
  modulesNeufs = 0, tablesAVerrouiller = 0, ecransNeufs = 0,
  naturesNeuves = 0, reglagesNeufs = 0, posturesNeuves = 0,
} = {}) {
  return {
    declarations: modulesNeufs + naturesNeuves + reglagesNeufs + posturesNeuves,
    verrous: tablesAVerrouiller,
    ecrans: ecransNeufs,
    // Le seul poste qui ne se mécanise pas. S'il domine, c'est bon signe :
    // ça veut dire que le reste a été absorbé par les générateurs.
    irreductible: ecransNeufs,
  };
}
