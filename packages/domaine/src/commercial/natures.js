// =============================================================================
// LES NATURES D'AFFAIRE — ce qu'on vend.
//
// À ne pas confondre avec la FORMULE (tarifaire | forfait), qui dit comment on
// calcule le prix. Un lift au forfait et un déménagement au forfait ont la
// même formule et n'ont rien à voir : ni le même parcours, ni le même client,
// ni les mêmes étapes obligatoires.
//
// Ce module est la SOURCE UNIQUE de ce qui distingue les cinq natures. Le menu
// « + », les parcours et les écrans en découlent — sans quoi la règle « un
// lift n'a pas de relevé » serait réécrite à trois endroits et divergerait.
// =============================================================================

/**
 * `etapes` : ce que le parcours comporte réellement.
 *   releve      — relevé de meubles pièce par pièce
 *   materiel    — l'écran Matériel existe pour cette nature
 *   emballage   — l'emballage et les fournitures y figurent
 *   planning    — passe par le planning et l'affectation d'équipe
 *   recurrent   — facturé période après période, et non une fois
 *
 * `materiel` et `emballage` sont DEUX étapes distinctes, et c'est essentiel :
 * une sous-traitance emporte du matériel de terrain (sangles, diable,
 * couvertures) mais ne vend ni carton ni emballage. Les confondre supprimerait
 * l'écran Matériel à une nature qui en a besoin.
 */
export const NATURES = Object.freeze([
  {
    cle: "demenagement",
    titre: "Déménagement",
    resume: "Le parcours complet : relevé, emballage, fournitures, planning.",
    pourEntreprise: false,
    etapes: { releve: true, materiel: true, emballage: true,
              planning: true, recurrent: false },
    // Le seul à passer par le chiffrage classique au volume.
    chiffrage: "volume",
  },
  {
    cle: "sous_traitance",
    titre: "Sous-traitance",
    resume: "Vous travaillez pour un vendeur de mobilier ou un transporteur "
          + "qui ne peut pas assurer une livraison simple. Prix négocié, "
          + "à l'homme, camion si besoin.",
    pourEntreprise: true,
    // Matériel OUI (terrain), emballage NON : on emporte des sangles, on ne
    // vend pas de cartons.
    etapes: { releve: false, materiel: true, emballage: false,
              planning: true, recurrent: false },
    chiffrage: "main_doeuvre",
  },
  {
    cle: "lift",
    titre: "Lift",
    resume: "Monte-meubles seul. Ni relevé, ni emballage, ni fournitures. "
          + "Le prix suit la couronne kilométrique du centre.",
    pourEntreprise: false,
    etapes: { releve: false, materiel: false, emballage: false,
              planning: true, recurrent: false },
    chiffrage: "couronne",
  },
  {
    cle: "boxe",
    titre: "Boxe",
    resume: "Location d'un box. Facturé au mois, selon le volume.",
    pourEntreprise: false,
    etapes: { releve: false, materiel: false, emballage: false,
              planning: false, recurrent: true },
    chiffrage: "palier_volume",
  },
  {
    cle: "zone",
    titre: "Zone",
    resume: "Location d'une zone à une entreprise, au forfait. Souvent "
          + "attachée à une livraison, avec ou sans étages, avec ou sans "
          + "montage de mobilier.",
    pourEntreprise: true,
    etapes: { releve: false, materiel: false, emballage: false,
              planning: false, recurrent: true },
    chiffrage: "forfait",
  },
]);

/** L'ordre du menu « + » : le quotidien d'abord, le récurrent ensuite. */
export const ORDRE_MENU = Object.freeze([
  "demenagement", "sous_traitance", "lift", "boxe", "zone",
]);

export function nature(cle) {
  return NATURES.find((n) => n.cle === cle) || null;
}

export function natureValide(cle) {
  return NATURES.some((n) => n.cle === cle);
}

/** Les natures dans l'ordre du menu. */
export function naturesDuMenu() {
  return ORDRE_MENU.map((c) => nature(c)).filter(Boolean);
}

/** Cette nature comporte-t-elle cette étape ? Inconnue → non. */
export function comporte(cle, etape) {
  return nature(cle)?.etapes?.[etape] === true;
}

/** Une location facturée période après période. */
export function estRecurrente(cle) {
  return comporte(cle, "recurrent");
}

/**
 * Cette nature s'adresse-t-elle nécessairement à une entreprise ? La zone et
 * la sous-traitance, oui — le formulaire demande alors une raison sociale et
 * un numéro de TVA, et non un nom de particulier.
 */
export function exigeEntreprise(cle) {
  return nature(cle)?.pourEntreprise === true;
}

/**
 * Les natures qui peuvent porter un litige. Une location peut mal se passer
 * (dégât dans une zone, désaccord sur un forfait) sans qu'il y ait eu de
 * chantier : le litige porte alors sur le CONTRAT, pas sur une affaire.
 * Voir la contrainte `litiges_porte_sur_une_chose` (migration 0115).
 */
export function porteSurContrat(cle) {
  return estRecurrente(cle);
}

/**
 * Ce qu'il faut avoir saisi pour qu'une affaire de cette nature tienne debout.
 * Renvoie la liste des MANQUES, vide si tout est là — on rend les manques,
 * pas un booléen, pour pouvoir les afficher.
 */
export function manques(cle, saisie = {}) {
  const n = nature(cle);
  if (!n) return ["Nature inconnue"];
  const out = [];
  if (!saisie.clientId && !saisie.clientNom) out.push("Le client");
  if (n.pourEntreprise && !saisie.entreprise && !saisie.clientId) {
    out.push("La raison sociale de l'entreprise");
  }
  if (n.etapes.recurrent && !saisie.debut) out.push("La date de début");
  if (!n.etapes.recurrent && !saisie.date) out.push("La date d'intervention");
  return out;
}
