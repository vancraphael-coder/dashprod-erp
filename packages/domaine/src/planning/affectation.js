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

import { carteMetier, effectifAttendu, origineEffectif } from "../metiers/cartes.js";

/**
 * Ce qu'attend chaque type de mission — DÉRIVÉ du catalogue des cartes métier.
 *
 * Cette table était écrite à la main ici, en doublon de `CARTES_METIER` et de
 * `commercial/natures.js`. Trois listes sans lien : ajouter un métier
 * demandait de les retrouver toutes, et en oublier une ne cassait rien
 * visiblement — la carte apparaissait sans exigence, ou l'exigence sans carte.
 *
 * `membres_min` n'est plus qu'un PLANCHER. Le nombre réellement attendu se
 * demande à `effectifRequis()`, qui connaît le chiffrage : c'est là qu'un
 * dossier vendu à quatre déménageurs cesse de passer au vert à deux.
 */
export const EXIGENCES = Object.freeze(Object.fromEntries(
  [...(function* () {
    for (const c of [
      "demenagement", "visite", "emballage", "lift", "sous_traitance",
    ]) {
      const carte = carteMetier(c);
      yield [c, Object.freeze({
        titre: carte.titre,
        membres_min: carte.effectif.plancher,
        membres_max: carte.effectif.plafond,
        vehicule: carte.vehicule.besoin,
        categorie: carte.vehicule.categorie,
        note: carte.note,
      })];
    }
  })(),
]));

/** L'ancienne table, conservée en commentaire de référence :
const _EXIGENCES_HISTORIQUE = Object.freeze({
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
}); */

export function exigence(type) {
  return EXIGENCES[type] || EXIGENCES.demenagement;
}

/**
 * L'EFFECTIF RÉELLEMENT ATTENDU sur une mission, et d'où il vient.
 *
 * C'est le « X » de « 2 membres / X ». Il ne peut pas sortir d'une constante :
 * le prix vient de `BAREME_HORAIRE[nbDemenageurs]`, choisi au devis entre 2 et
 * 6. Comparer l'équipe à un `membres_min` figé à 2 faisait passer au vert un
 * chantier vendu à quatre — sous-staffé ET sous-facturé, sans que rien ne le
 * dise.
 *
 * @param {string} type type de mission
 * @param {object} [chiffrage] { nbDemenageurs, nbEmballeurs }
 * @returns {{nombre: number, origine: "devis"|"métier"}}
 */
export function effectifRequis(type, chiffrage = {}) {
  const carte = carteMetier(type);
  return {
    nombre: effectifAttendu(carte, chiffrage),
    origine: origineEffectif(carte, chiffrage),
  };
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
 * @param {object} [chiffrage] { nbDemenageurs, nbEmballeurs } — l'effectif VENDU
 */
export function etatAffectation(type, affectation, flotte, chiffrage = {}) {
  const e = exigence(type);
  // Le nombre attendu vient du devis quand il existe, du métier sinon.
  const requis = effectifRequis(type, chiffrage);
  const membres = (affectation?.membres || []).filter(Boolean);
  const vehicules = (affectation?.vehicules || []).filter(Boolean);

  if (membres.length === 0 && vehicules.length === 0) {
    return { etat: "vide", manques: [`Personne n'est affecté`], note: e.note };
  }

  const manques = [];
  if (membres.length < requis.nombre) {
    // Le motif DIT d'où vient le nombre. « 4 attendus » sans origine laisse
    // croire à une règle du logiciel ; « 4 attendus — effectif du devis » se
    // corrige au bon endroit, dans le devis.
    manques.push(requis.nombre === 1
      ? "Aucune personne affectée"
      : `${requis.nombre} personnes attendues${requis.origine === "devis" ? " (effectif du devis)" : ""}, `
        + `${membres.length} affectée${membres.length > 1 ? "s" : ""}`);
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
 * Le résumé AVEC DÉNOMINATEUR : « 2 membres / 4 ».
 *
 * C'est ce que Raphaël a demandé de rendre cohérent. La fraction n'a de sens
 * que si son dénominateur est celui du forfait utilisé — sinon elle rassure à
 * tort. Elle se lit d'un coup d'œil, ce qu'un « il manque 2 personnes » enfoui
 * dans une phrase ne permet pas.
 *
 * @returns {string} ex. « 2 membres / 4 · 1 véhicule »
 */
export function resumeEffectif(affectation, type, chiffrage = {}) {
  const m = (affectation?.membres || []).filter(Boolean).length;
  const v = (affectation?.vehicules || []).filter(Boolean).length;
  const requis = effectifRequis(type, chiffrage).nombre;
  const bouts = [`${m} membre${m > 1 ? "s" : ""} / ${requis}`];
  if (v > 0) bouts.push(`${v} véhicule${v > 1 ? "s" : ""}`);
  return bouts.join(" · ");
}

/**
 * Les missions d'un dossier qui restent à pourvoir. Sert au récapitulatif :
 * on doit pouvoir dire « il manque l'équipe de l'emballage » sans ouvrir
 * chaque volet.
 */
export function missionsAPourvoir(missions, flotte, chiffrage = {}) {
  return (missions || [])
    .map((m) => ({ mission: m,
                   ...etatAffectation(m.type, m.affectation, flotte, chiffrage) }))
    .filter((r) => r.etat !== "complet");
}
