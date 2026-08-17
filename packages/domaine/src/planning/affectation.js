// =============================================================================
// LA VÉRITÉ D'UNE AFFECTATION.
//
// « Affecté » ne veut pas dire la même chose selon la mission :
//
//   · une VISITE, c'est une personne qui passe estimer. Un camion n'y sert à
//     rien, et deux personnes non plus.
//   · un EMBALLAGE, ce sont des emballeurs. Un véhicule est utile pour porter
//     les fournitures, il n'est pas indispensable.
//   · un DÉMÉNAGEMENT, ce sont au moins deux personnes ET un camion. Une
//     seule personne ne porte pas une armoire.
//   · un LIFT, c'est un opérateur ET un véhicule de catégorie lift. Affecter
//     un fourgon à un lift est une erreur, pas une variante.
//   · une SOUS-TRAITANCE, ce sont des hommes ; le camion dépend du donneur
//     d'ordre, qui fournit parfois le sien.
//
// Ce module rend des VERDICTS MOTIVÉS, jamais un booléen : c'est le motif que
// l'écran affiche, et c'est lui qui évite qu'on parte à trois sur un chantier
// où il fallait un lift.
//
// Rien n'est BLOQUANT ici. Le bureau connaît des situations que le logiciel
// ignore — un client qui prête son camion, un chantier fait en renfort. On
// signale, on n'interdit pas.
// =============================================================================

/** Ce qu'attend chaque type de mission. */
export const EXIGENCES = Object.freeze({
  visite: {
    titre: "Visite", membres_min: 1, membres_max: 1,
    vehicule: "facultatif", categorie: null,
    note: "Une personne passe estimer. Un camion n'y sert à rien.",
  },
  emballage: {
    titre: "Emballage", membres_min: 1, membres_max: null,
    vehicule: "facultatif", categorie: null,
    note: "Un véhicule est utile pour les fournitures, sans être nécessaire.",
  },
  demenagement: {
    titre: "Déménagement", membres_min: 2, membres_max: null,
    vehicule: "requis", categorie: "camion",
    note: "Une seule personne ne porte pas une armoire.",
  },
  lift: {
    titre: "Lift", membres_min: 1, membres_max: null,
    vehicule: "requis", categorie: "lift",
    note: "Un véhicule de catégorie lift, pas un fourgon.",
  },
  sous_traitance: {
    titre: "Sous-traitance", membres_min: 1, membres_max: null,
    vehicule: "facultatif", categorie: null,
    note: "Le camion dépend du donneur d'ordre, qui fournit parfois le sien.",
  },
});

export function exigence(type) {
  return EXIGENCES[type] || EXIGENCES.demenagement;
}

/**
 * L'état d'une affectation, en trois couleurs :
 *   "vide"     — rien n'est affecté
 *   "partiel"  — quelque chose manque
 *   "complet"  — la mission est pourvue
 *
 * @param {string} type type de mission
 * @param {{membres: Array, vehicules: Array}} affectation
 * @param {Array} flotte pour vérifier la catégorie du véhicule
 */
export function etatAffectation(type, affectation, flotte) {
  const e = exigence(type);
  const membres = (affectation?.membres || []).filter(Boolean);
  const vehicules = (affectation?.vehicules || []).filter(Boolean);

  if (membres.length === 0 && vehicules.length === 0) {
    return { etat: "vide", manques: [`Personne n'est affecté`], note: e.note };
  }

  const manques = [];
  if (membres.length < e.membres_min) {
    manques.push(e.membres_min === 1
      ? "Aucune personne affectée"
      : `${e.membres_min} personnes attendues, ${membres.length} affectée${membres.length > 1 ? "s" : ""}`);
  }
  if (e.membres_max && membres.length > e.membres_max) {
    manques.push(`Une seule personne suffit — ${membres.length} sont affectées`);
  }
  if (e.vehicule === "requis" && vehicules.length === 0) {
    manques.push(e.categorie === "lift" ? "Aucun lift affecté" : "Aucun véhicule affecté");
  }
  // La catégorie compte : un fourgon sur un lift n'est pas une variante.
  if (e.categorie && vehicules.length > 0 && Array.isArray(flotte)) {
    const mauvais = vehicules
      .map((id) => flotte.find((v) => v.id === id))
      .filter((v) => v && (v.categorie || "camion") !== e.categorie);
    for (const v of mauvais) {
      manques.push(`${v.nom || "Ce véhicule"} n'est pas un ${e.categorie}`);
    }
  }

  return {
    etat: manques.length === 0 ? "complet" : "partiel",
    manques,
    note: e.note,
  };
}

/**
 * La couleur du voyant. Trois états seulement — un dégradé de nuances serait
 * illisible d'un coup d'œil, et c'est précisément ce qu'on cherche.
 */
export function couleurVoyant(etat) {
  return { vide: "gris", partiel: "orange", complet: "vert" }[etat] || "gris";
}

/** Le résumé d'une affectation, pour la ligne repliée. */
export function resumeAffectation(affectation) {
  const m = (affectation?.membres || []).filter(Boolean).length;
  const v = (affectation?.vehicules || []).filter(Boolean).length;
  if (m === 0 && v === 0) return "Personne";
  const bouts = [];
  if (m > 0) bouts.push(`${m} personne${m > 1 ? "s" : ""}`);
  if (v > 0) bouts.push(`${v} véhicule${v > 1 ? "s" : ""}`);
  return bouts.join(" · ");
}

/**
 * Les missions d'un dossier qui restent à pourvoir. Sert au récapitulatif :
 * on doit pouvoir dire « il manque l'équipe de l'emballage » sans ouvrir
 * chaque volet.
 */
export function missionsAPourvoir(missions, flotte) {
  return (missions || [])
    .map((m) => ({ mission: m, ...etatAffectation(m.type, m.affectation, flotte) }))
    .filter((r) => r.etat !== "complet");
}
