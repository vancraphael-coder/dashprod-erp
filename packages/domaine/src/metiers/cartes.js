// =============================================================================
// LES CARTES MÉTIER — le catalogue unique de ce qu'une équipe peut aller faire.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// Une « carte métier » est un travail identifiable qu'on pose à une date et
// qu'on pourvoit en gens et en véhicules : un déménagement, une visite, un
// emballage, un lift, une sous-traitance. C'est l'unité que le dossier affiche,
// que le planning reçoit, et que la facture finit par décrire.
//
// Cette notion existait déjà — mais éclatée en TROIS endroits qui ne se
// parlaient pas :
//
//   · `planning/affectation.js` figeait cinq types dans `EXIGENCES` ;
//   · `Dossier.jsx` codait en dur `typesAvecCarte = [principale, visite,
//     emballage]` — une liste qui ignorait `lift` et `sous_traitance` ;
//   · `commercial/natures.js` décrivait les étapes de chaque nature.
//
// Ajouter un métier demandait donc de retrouver trois listes sans lien. C'est
// exactement la forme de divergence que ce dépôt a déjà payée quatre fois
// (`Groupe`/`Entree`, `BlocPortes`/`Porte`, deux `carteAction`, deux vérités
// d'OGM). On ne l'attend pas une cinquième.
//
// CE FICHIER EST HORIZONTAL. Il décrit la FORME d'une carte, jamais le prix ni
// le contenu d'un métier : aucun import de `releve/`, `stocks/` ou
// `chiffrage/lift.js`. C'est ce qui permettra d'ajouter une carte « montage de
// mobilier » ou « archivage » sans toucher au déménagement — et c'est vérifié
// par `architecture.test.js`, pas laissé à la vigilance.
//
// CE QU'IL NE FAIT PAS
// --------------------
// Il ne décide rien de bloquant. Règle du produit, redite par Raphaël :
// ON SIGNALE, ON N'INTERDIT PAS. Le bureau connaît des situations que le
// logiciel ignore — un client qui prête son camion, un chantier fait en
// renfort. Toutes les valeurs ci-dessous nourrissent des AVERTISSEMENTS.
// =============================================================================

import { ouDefaut } from "../noyau/nombres.js";

/**
 * L'effectif attendu vient-il du CHIFFRAGE ou de la carte ?
 *
 *   "chiffrage" — le devis a fixé un effectif (3 déménageurs à 130 €/h), et
 *                 c'est LUI qui fait foi. On a vendu trois personnes : partir
 *                 à deux, c'est livrer autre chose que ce qui est facturé.
 *   "carte"     — le métier impose son propre effectif, quel que soit le prix
 *                 (une visite se fait à une personne, toujours).
 *
 * La distinction est la raison d'être de ce module. Avant, l'écran comparait
 * l'équipe affectée à une CONSTANTE (`membres_min: 2`) pendant que le prix
 * venait de `BAREME_HORAIRE[nbDemenageurs]`. Un dossier chiffré pour quatre
 * déménageurs affichait donc une carte qui passait au vert à deux : le voyant
 * disait « pourvu » sur un chantier sous-staffé et sous-facturé.
 */
export const SOURCE_EFFECTIF = Object.freeze({
  CHIFFRAGE: "chiffrage",
  CARTE: "carte",
});

/**
 * LE CATALOGUE.
 *
 * `role` place la carte dans le dossier :
 *   "principale" — le travail vendu ; il y en a exactement une par dossier
 *   "prealable"  — avant le travail (la visite d'estimation)
 *   "complement" — autour du travail (l'emballage)
 *
 * `plancher` est le minimum absolu du métier, celui qui tient même sans
 * chiffrage : deux personnes ne sont pas une préférence pour un déménagement,
 * une seule ne porte pas une armoire.
 */
export const CARTES_METIER = Object.freeze([
  {
    cle: "demenagement",
    titre: "Déménagement",
    role: "principale",
    natures: ["demenagement"],
    effectif: { source: SOURCE_EFFECTIF.CHIFFRAGE, plancher: 2, plafond: null },
    vehicule: { besoin: "requis", categorie: "camion" },
    note: "Une seule personne ne porte pas une armoire.",
  },
  {
    cle: "visite",
    titre: "Visite préalable",
    role: "prealable",
    facultative: true,
    // Les natures qui comportent un relevé : on ne va pas estimer un box.
    natures: ["demenagement"],
    // Une visite ne se chiffre pas à l'effectif : c'est une personne qui passe
    // regarder. Le chiffrage du déménagement ne la concerne pas.
    effectif: { source: SOURCE_EFFECTIF.CARTE, plancher: 1, plafond: 1 },
    // « facultatif », pas « aucun » : on n'EXIGE pas de véhicule pour estimer,
    // mais la voiture de service qui emmène l'estimateur doit pouvoir être
    // notée — décision de Raphaël, toute carte dispose des deux sélections.
    // La nuance tient dans le verdict : un véhicule facultatif ne déclenche
    // jamais d'avertissement d'absence, il reste seulement disponible.
    vehicule: { besoin: "facultatif", categorie: null },
    note: "Une personne passe estimer. Une voiture de service, si besoin.",
  },
  {
    cle: "emballage",
    titre: "Emballage",
    role: "complement",
    facultative: true,
    natures: ["demenagement"],
    // L'emballage a ses propres heures et son propre effectif dans le devis —
    // il ne suit pas l'effectif du déménagement. Un emballage se fait souvent
    // à deux quand le déménagement se fait à quatre.
    effectif: { source: SOURCE_EFFECTIF.CHIFFRAGE, plancher: 1, plafond: null },
    vehicule: { besoin: "facultatif", categorie: null },
    note: "Un véhicule est utile pour les fournitures, sans être nécessaire.",
  },
  {
    cle: "lift",
    titre: "Lift",
    role: "principale",
    natures: ["lift"],
    effectif: { source: SOURCE_EFFECTIF.CARTE, plancher: 1, plafond: null },
    vehicule: { besoin: "requis", categorie: "lift" },
    note: "Un véhicule de catégorie lift, pas un fourgon.",
  },
  {
    cle: "sous_traitance",
    titre: "Sous-traitance",
    role: "principale",
    natures: ["sous_traitance"],
    effectif: { source: SOURCE_EFFECTIF.CHIFFRAGE, plancher: 1, plafond: null },
    // Le camion dépend du donneur d'ordre : exiger un véhicule ferait clignoter
    // en orange toutes les missions où il fournit le sien.
    vehicule: { besoin: "facultatif", categorie: null },
    note: "Le camion dépend du donneur d'ordre, qui fournit parfois le sien.",
  },
]);

/** Une carte par sa clé. Rend `null` plutôt que d'inventer un défaut. */
export function carteMetier(cle) {
  return CARTES_METIER.find((c) => c.cle === cle) || null;
}

/**
 * Les cartes d'un dossier, dans l'ordre d'affichage : le travail vendu
 * d'abord, puis ce qui l'entoure.
 *
 * L'ordre est celui du parcours réel — on pose la date du déménagement, puis
 * on se demande s'il faut une visite et un emballage. L'inverse ferait
 * commencer le dossier par une option.
 */
const RANG_ROLE = { principale: 0, prealable: 1, complement: 2 };

export function cartesDeNature(nature) {
  return CARTES_METIER
    .filter((c) => c.natures.includes(nature))
    .slice()
    .sort((a, b) => (RANG_ROLE[a.role] ?? 9) - (RANG_ROLE[b.role] ?? 9));
}

/** La carte principale d'une nature — celle qui porte le travail vendu. */
export function cartePrincipale(nature) {
  return CARTES_METIER.find(
    (c) => c.role === "principale" && c.natures.includes(nature)) || null;
}

/**
 * L'EFFECTIF ATTENDU sur une carte — le « X » de « 2 membres / X ».
 *
 * C'est le cœur du lot. Le nombre affiché doit être celui qu'on a VENDU, pas
 * une constante du code : sinon le voyant certifie qu'un chantier est pourvu
 * alors qu'il manque deux personnes payées par le client.
 *
 * Le chiffrage prime, le plancher du métier le rattrape :
 *   · devis à 4 déménageurs → 4, même si le plancher est 2 ;
 *   · devis absent ou à 0   → le plancher (`Number(null) === 0` ne doit JAMAIS
 *     devenir « aucune personne attendue » — c'est le piège de coercition déjà
 *     rencontré six fois dans ce dépôt, d'où `ouDefaut`) ;
 *   · carte à effectif propre → son plancher, le chiffrage est ignoré.
 *
 * @param {object} carte une entrée de CARTES_METIER
 * @param {object} [chiffrage] { nbDemenageurs, nbEmballeurs }
 * @returns {number} l'effectif attendu, toujours ≥ 1
 */
export function effectifAttendu(carte, chiffrage = {}) {
  if (!carte) return 1;
  const plancher = Math.max(1, ouDefaut(carte.effectif?.plancher, 1));
  if (carte.effectif?.source !== SOURCE_EFFECTIF.CHIFFRAGE) return plancher;

  // L'emballage a son propre effectif : le confondre avec celui du
  // déménagement ferait réclamer quatre emballeurs parce que le camion part
  // à quatre.
  const brut = carte.cle === "emballage"
    ? ouDefaut(chiffrage?.nbEmballeurs, null)
    : ouDefaut(chiffrage?.nbDemenageurs, null);

  const vendu = Number(brut);
  if (!Number.isFinite(vendu) || vendu <= 0) return plancher;
  return Math.max(plancher, Math.round(vendu));
}

/**
 * D'où vient l'effectif affiché — pour que l'écran puisse le DIRE.
 *
 * « 4 attendus » sans motif laisse croire à une règle du logiciel. « 4 attendus
 * — effectif du devis » se corrige au bon endroit : dans le devis.
 */
export function origineEffectif(carte, chiffrage = {}) {
  if (!carte) return "métier";
  if (carte.effectif?.source !== SOURCE_EFFECTIF.CHIFFRAGE) return "métier";
  const brut = carte.cle === "emballage"
    ? ouDefaut(chiffrage?.nbEmballeurs, null)
    : ouDefaut(chiffrage?.nbDemenageurs, null);
  const vendu = Number(brut);
  const plancher = Math.max(1, ouDefaut(carte.effectif?.plancher, 1));
  if (!Number.isFinite(vendu) || vendu <= 0) return "métier";
  // Le devis peut être SOUS le plancher du métier (un déménagement chiffré à
  // une personne). Le plancher gagne, et on le dit : c'est un devis à revoir.
  return vendu < plancher ? "métier" : "devis";
}

// =============================================================================
// LE TRI DES CATALOGUES
//
// Les jetons de membres et de véhicules étaient rendus dans l'ordre de la
// base : `listerMembresSimples()` n'a aucun `order by`, et PostgREST rend
// alors les lignes dans l'ordre physique de la table — un ordre qui change
// après une mise à jour. Les mêmes noms changeaient donc de place entre deux
// visites du même écran.
//
// Ce n'est pas qu'inélégant : on choisit une équipe en visant une position
// mémorisée. Un jeton qui se déplace se coche à la place d'un autre, et
// l'erreur ne se voit qu'au départ du camion.
//
// Le tri vit ICI, dans le domaine, et non dans chaque écran : trois écrans qui
// trient chacun « à peu près pareil » finissent par afficher trois ordres.
// =============================================================================

/**
 * Comparaison de noms à la belge : accents et casse ignorés, chiffres lus
 * comme des nombres (« Camion 2 » avant « Camion 10 »).
 */
const COLLATEUR = new Intl.Collator("fr-BE", {
  sensitivity: "base", numeric: true, ignorePunctuation: true,
});

/**
 * Les membres, triés pour être RETROUVÉS.
 *
 * Deux rangs avant l'alphabet, parce qu'ils correspondent à la façon dont on
 * cherche quelqu'un dans une liste :
 *   1. les DÉJÀ AFFECTÉS en tête — on les relit pour vérifier, pas pour les
 *      chercher ; les noyer dans l'alphabet oblige à parcourir toute la liste
 *      pour savoir qui est coché ;
 *   2. les indisponibles en dernier — proposés quand même (on signale, on
 *      n'interdit pas), mais hors du chemin du geste courant.
 *
 * @param {Array} membres
 * @param {object} [p] { affectes: string[], estIndisponible: (id) => boolean }
 */
export function trierMembres(membres = [], { affectes = [], estIndisponible = null } = {}) {
  const coches = new Set(affectes || []);
  const rang = (m) => {
    if (coches.has(m?.id)) return 0;
    if (estIndisponible && estIndisponible(m?.id)) return 2;
    return 1;
  };
  return (membres || []).slice().sort((a, b) =>
    rang(a) - rang(b) || COLLATEUR.compare(a?.nom || "", b?.nom || ""));
}

/**
 * Les véhicules, triés de même — avec la CATÉGORIE avant le nom.
 *
 * Un lift et un fourgon ne se cherchent pas dans la même intention : regrouper
 * par catégorie évite de balayer toute la flotte pour trouver le seul lift.
 */
/**
 * Les catégories réelles de la base (`categorie_vehicule` : camion | lift |
 * voiture). L'ordre est celui du poids sur le chantier : ce qui porte la
 * charge d'abord, ce qui suit ensuite.
 *
 * Une catégorie inconnue tombe en fin de liste plutôt que de disparaître —
 * une valeur ajoutée à l'énumération SQL sans passer ici doit rester visible,
 * pas s'évaporer.
 */
export const CATEGORIES_VEHICULE = Object.freeze([
  { cle: "camion", titre: "Camions", rang: 0 },
  { cle: "lift", titre: "Lifts", rang: 1 },
  { cle: "voiture", titre: "Voitures", rang: 2 },
]);

const RANG_CATEGORIE = Object.fromEntries(
  CATEGORIES_VEHICULE.map((c) => [c.cle, c.rang]));

/** Le titre affichable d'une catégorie — jamais une clé brute à l'écran. */
export function titreCategorie(cle) {
  const c = CATEGORIES_VEHICULE.find((x) => x.cle === cle);
  if (c) return c.titre;
  // Une catégorie inconnue s'affiche telle quelle, capitalisée : mieux vaut un
  // intitulé imparfait qu'un véhicule sans en-tête.
  const brut = String(cle || "autre");
  return brut.charAt(0).toUpperCase() + brut.slice(1) + "s";
}

/**
 * LES VÉHICULES GROUPÉS PAR CATÉGORIE, prêts à être affichés avec un en-tête.
 *
 * Toute la flotte est offerte sur toute carte mission (décision de Raphaël) :
 * on peut ajouter la voiture qui suit le lift, ou un second camion. Mais
 * dérouler quinze véhicules à plat redonnerait le problème que le tri venait de
 * régler — on cherche « le lift », pas « un véhicule ». Le groupe porte donc
 * l'en-tête, et le regard saute directement à la bonne famille.
 *
 * `categorieAttendue` remonte le groupe qui satisfait la mission : sur un lift,
 * les lifts d'abord. Elle ne CACHE rien — c'est un ordre, pas un filtre.
 *
 * @returns {{cle: string, titre: string, attendue: boolean, vehicules: Array}[]}
 *          les groupes non vides uniquement
 */
export function grouperVehicules(flotte = [], {
  affectes = [], estIndisponible = null, categorieAttendue = null,
} = {}) {
  const tries = trierVehicules(flotte, { affectes, estIndisponible });
  const groupes = new Map();
  for (const v of tries) {
    const cle = v?.categorie || "camion";
    if (!groupes.has(cle)) {
      groupes.set(cle, {
        cle, titre: titreCategorie(cle),
        attendue: Boolean(categorieAttendue) && cle === categorieAttendue,
        vehicules: [],
      });
    }
    groupes.get(cle).vehicules.push(v);
  }
  return [...groupes.values()].sort((a, b) =>
    (b.attendue ? 1 : 0) - (a.attendue ? 1 : 0)
    || (RANG_CATEGORIE[a.cle] ?? 8) - (RANG_CATEGORIE[b.cle] ?? 8));
}

export function trierVehicules(flotte = [], { affectes = [], estIndisponible = null } = {}) {
  const coches = new Set(affectes || []);
  const rang = (v) => {
    if (coches.has(v?.id)) return 0;
    if (estIndisponible && estIndisponible(v?.id)) return 2;
    return 1;
  };
  const cat = (v) => RANG_CATEGORIE[v?.categorie || "camion"] ?? 8;
  return (flotte || []).slice().sort((a, b) =>
    rang(a) - rang(b)
    || cat(a) - cat(b)
    || COLLATEUR.compare(a?.nom || "", b?.nom || ""));
}
