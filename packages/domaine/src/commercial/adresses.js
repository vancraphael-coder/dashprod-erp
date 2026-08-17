// =============================================================================
// LES ADRESSES, SELON LE MÉTIER.
//
// « Chargement / Déchargement » est le vocabulaire du DÉMÉNAGEMENT. Il ne veut
// rien dire ailleurs :
//
//   · un LIFT ne charge rien — il se pose devant une façade. Il peut en
//     desservir plusieurs dans la journée : ce sont des POINTS numérotés,
//     pas une origine et une destination.
//   · une SOUS-TRAITANCE part d'un entrepôt ou d'un magasin et dessert
//     plusieurs clients : un enlèvement, plusieurs livraisons.
//   · une ZONE relève de la logistique : des colis ARRIVENT et repartent.
//     L'adresse n'est pas un trajet, c'est un flux.
//   · un BOXE est au dépôt. La seule adresse qui compte est celle où l'on va
//     éventuellement chercher les affaires du client.
//
// CHOIX DE RANGEMENT : les clés de stockage restent `charges` et `decharges`.
// Renommer les colonnes aurait imposé une migration des données existantes
// pour un gain nul — ce qui change, c'est ce que ces deux listes SIGNIFIENT
// selon la nature, et c'est ce module qui le dit.
// =============================================================================

import { nature as natureDe } from "./natures.js";

/**
 * Un groupe d'adresses :
 *   cle       — où c'est rangé (`charges` | `decharges`)
 *   titre     — ce que l'écran affiche
 *   numerote  — « Adresse 1, 2, 3… » plutôt qu'un titre répété
 *   min / max — combien on en attend
 *   aide      — la phrase qui évite une mauvaise saisie
 */
const PLANS = Object.freeze({
  demenagement: [
    { cle: "charges", titre: "Chargement", min: 1, max: 5,
      aide: "D'où part le mobilier." },
    { cle: "decharges", titre: "Déchargement", min: 1, max: 5,
      aide: "Où il arrive." },
  ],

  // Le lift se pose devant une façade, il ne transporte pas. Plusieurs
  // interventions dans la journée sont la norme, pas l'exception.
  lift: [
    { cle: "charges", titre: "Adresse", numerote: true, min: 1, max: 5,
      aide: "Où le lift se pose. Plusieurs interventions possibles dans la journée." },
  ],

  // Un enlèvement, plusieurs livraisons : c'est la forme réelle du métier,
  // multi-sectoriel par nature (mobilier, électroménager, matériaux).
  sous_traitance: [
    { cle: "charges", titre: "Enlèvement", min: 0, max: 3,
      aide: "Entrepôt ou magasin du donneur d'ordre. Vide s'il livre lui-même sur place." },
    { cle: "decharges", titre: "Livraison", numerote: true, min: 1, max: 5,
      aide: "Les clients finaux à desservir, dans l'ordre de la tournée." },
  ],

  // Logistique : ce n'est pas un trajet, c'est un flux entrant et sortant.
  zone: [
    { cle: "charges", titre: "Arrivée", numerote: true, min: 0, max: 5,
      aide: "D'où viennent les colis ou les palettes." },
    { cle: "decharges", titre: "Enlèvement", numerote: true, min: 0, max: 5,
      aide: "Où ils repartent, quand c'est prévu." },
  ],

  // Garde-meubles : le box est au dépôt. La seule adresse utile est celle où
  // l'on va chercher les affaires — et elle est facultative, le client
  // pouvant très bien les déposer lui-même.
  boxe: [
    { cle: "charges", titre: "Enlèvement", min: 0, max: 2,
      aide: "Où récupérer les affaires. Vide si le client dépose lui-même." },
  ],
});

/** Le plan d'adresses d'une nature. Nature inconnue → celui du déménagement. */
export function planAdresses(cle) {
  return PLANS[cle] || PLANS.demenagement;
}

/** Ce groupe est-il utilisé par cette nature ? */
export function groupeUtilise(cleNature, cleGroupe) {
  return planAdresses(cleNature).some((g) => g.cle === cleGroupe);
}

/**
 * Le titre d'une adresse à sa position. Numéroté quand le métier le demande :
 * « Adresse 1 », « Livraison 2 ». Sinon le titre simple, éventuellement suivi
 * du rang quand il y en a plusieurs.
 */
export function titreAdresse(groupe, index, total) {
  if (!groupe) return "";
  if (groupe.numerote) return `${groupe.titre} ${index + 1}`;
  return total > 1 ? `${groupe.titre} ${index + 1}` : groupe.titre;
}

/**
 * Ce qui manque pour que les adresses tiennent debout. On rend la LISTE des
 * manques, pas un booléen : c'est elle qu'on affiche.
 *
 * Une adresse vide ne compte pas — sinon un formulaire pré-rempli d'une ligne
 * blanche passerait pour rempli.
 */
export function manquesAdresses(cleNature, contact) {
  const out = [];
  for (const g of planAdresses(cleNature)) {
    const remplies = (contact?.[g.cle] || []).filter(estRemplie);
    if (remplies.length < g.min) {
      out.push(g.min === 1
        ? `Une adresse de ${g.titre.toLowerCase()}`
        : `${g.min} adresses de ${g.titre.toLowerCase()}`);
    }
  }
  return out;
}

/** Une adresse compte dès qu'elle porte une rue ou une ville. */
export function estRemplie(a) {
  return Boolean(String(a?.adresse || "").trim() || String(a?.ville || "").trim());
}

/** Peut-on encore en ajouter une ? Un maximum évite les listes ingérables. */
export function peutAjouter(groupe, liste) {
  return (liste || []).length < (groupe?.max ?? 5);
}

/**
 * Toutes les adresses d'un dossier, à plat — pour confronter les étages au
 * lift, ou tracer un itinéraire, sans que l'appelant sache où elles sont
 * rangées selon la nature.
 */
export function toutesLesAdresses(cleNature, contact) {
  const out = [];
  for (const g of planAdresses(cleNature)) {
    for (const a of contact?.[g.cle] || []) {
      if (estRemplie(a)) out.push({ ...a, groupe: g.cle, titre: g.titre });
    }
  }
  return out;
}

/** Le résumé d'un dossier en une ligne : « Bruxelles → Namur, Liège ». */
export function resumeTrajet(cleNature, contact) {
  const plan = planAdresses(cleNature);
  const bouts = plan.map((g) =>
    (contact?.[g.cle] || []).filter(estRemplie)
      .map((a) => a.ville || a.adresse).filter(Boolean).join(", "));
  const utiles = bouts.filter(Boolean);
  if (utiles.length === 0) return "";
  // Une seule liste (lift, boxe) : pas de flèche, il n'y a pas de trajet.
  return utiles.length === 1 ? utiles[0] : utiles.join(" → ");
}

/** Le métier auquel appartient cette nature — pour l'expliquer à l'écran. */
export function metier(cle) {
  const M = {
    demenagement: "Déménagement",
    lift: "Flottes nationales",
    sous_traitance: "Sous-traitance, multi-sectorielle",
    zone: "Logistique",
    boxe: "Garde-meubles",
  };
  return natureDe(cle) ? M[cle] : null;
}
