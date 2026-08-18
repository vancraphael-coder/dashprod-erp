// =============================================================================
// Flotte — Véhicules
// Source : alignement pages 03 (jauge capacité) et 10 (fiches camions).
// Logique PURE : capacité d'une sélection de camions, jauge volume/capacité,
// et alertes (état mécanique, CT, assurance) — réutilise qualifierEcheance
// (commun) : une seule règle d'échéance pour RH et Flotte.
// =============================================================================

import { qualifierEcheance } from "../commun/echeances.js";

/** Types de véhicules du métier (modèle validé). */
export const TYPES_VEHICULE = Object.freeze(["fourgon", "porteur", "hayon"]);

/** États mécaniques (modèle : OK / À surveiller / URGENT). */
export const ETATS_MECANIQUES = Object.freeze(["ok", "surveiller", "urgent"]);

/**
 * Capacité totale (m³) d'une sélection de camions.
 * @param {{volume_m3?: number|string}[]} camions
 * @returns {number}
 */
export function capaciteFlotte(camions) {
  const total = (camions || []).reduce((s, c) => s + (Number(c.volume_m3) || 0), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Jauge volume relevé / capacité sélectionnée (alignement 03 §2).
 * Zones : ok ≤ 85 %, serre ≤ 100 %, surcharge au-delà — évite le classique
 * « tout ne rentre pas » découvert le jour J.
 * @param {number} volumeM3
 * @param {number} capaciteM3
 * @returns {{pct: number, zone: "ok"|"serre"|"surcharge"|"vide"}}
 */
export function jaugeCapacite(volumeM3, capaciteM3) {
  if (!capaciteM3) return { pct: 0, zone: "vide" };
  const pct = Math.round(((volumeM3 || 0) / capaciteM3) * 100);
  return { pct, zone: pct <= 85 ? "ok" : pct <= 100 ? "serre" : "surcharge" };
}

/**
 * Alertes d'un véhicule : mécanique urgente, CT ou assurance expirés (urgent),
 * échéances proches ou mécanique à surveiller (attention).
 * @param {{etat_mecanique?: string, ct_echeance?: string, assurance_echeance?: string}} v
 * @param {string|Date} [reference]
 * @returns {{niveau: "urgent"|"attention"|"ok", raisons: string[]}}
 */
export function alertesVehicule(v, reference = new Date()) {
  const raisons = [];
  let urgent = false;

  if (v.etat_mecanique === "urgent") { urgent = true; raisons.push("État mécanique urgent"); }
  else if (v.etat_mecanique === "surveiller") raisons.push("Mécanique à surveiller");

  const ct = qualifierEcheance(v.ct_echeance, reference);
  if (ct.etat === "expiree") { urgent = true; raisons.push("Contrôle technique expiré"); }
  else if (ct.etat === "proche") raisons.push(`CT dans ${ct.jours} j`);

  const ass = qualifierEcheance(v.assurance_echeance, reference);
  if (ass.etat === "expiree") { urgent = true; raisons.push("Assurance expirée"); }
  else if (ass.etat === "proche") raisons.push(`Assurance dans ${ass.jours} j`);

  return { niveau: urgent ? "urgent" : raisons.length ? "attention" : "ok", raisons };
}

// =============================================================================
// CATÉGORIES — camion, lift, voiture.
//
// À ne pas confondre avec `TYPES_VEHICULE` (fourgon | porteur | hayon), qui
// est la CARROSSERIE d'un camion. Un lift n'a pas de carrosserie de camion, et
// mettre les deux notions sur le même axe rendrait « fourgon » et « lift »
// comparables alors qu'ils ne sont pas du même ordre.
// =============================================================================

export const CATEGORIES = Object.freeze([
  { cle: "camion", nom: "Camion", resume: "Transporte le mobilier. Se mesure en m³.",
    porte: { volume: true, carrosserie: true, echelle: false } },
  { cle: "lift", nom: "Lift", resume: "Monte-meubles. Hauteur d'échelle et étage desservi.",
    porte: { volume: false, carrosserie: false, echelle: true } },
  { cle: "voiture", nom: "Voiture", resume: "Transporte les personnes. Rien à charger.",
    porte: { volume: false, carrosserie: false, echelle: false } },
]);

/** Carburants proposés. `electrique` n'a pas de carte carburant : c'est voulu. */
export const CARBURANTS = Object.freeze([
  { cle: "diesel", nom: "Diesel" },
  { cle: "essence", nom: "Essence" },
  { cle: "hybride", nom: "Hybride" },
  { cle: "electrique", nom: "Électrique" },
  { cle: "gpl", nom: "GPL" },
]);

/**
 * Permis belges, avec ce qu'ils autorisent réellement. Le poids est la borne
 * de la masse en charge — c'est lui qui décide, pas la catégorie du véhicule :
 * un gros lift peut exiger un C alors qu'un petit camion se conduit en B.
 */
export const PERMIS = Object.freeze([
  { cle: "B", nom: "B", resume: "Jusqu'à 3,5 t — permis voiture." },
  { cle: "BE", nom: "BE", resume: "B avec remorque lourde." },
  { cle: "C1", nom: "C1", resume: "De 3,5 à 7,5 t." },
  { cle: "C", nom: "C", resume: "Plus de 7,5 t — poids lourd." },
  { cle: "CE", nom: "CE", resume: "C avec remorque." },
]);

export function categorie(cle) {
  return CATEGORIES.find((c) => c.cle === cle) || null;
}

/** La catégorie porte-t-elle cet attribut ? Inconnue → non. */
export function porte(cle, attribut) {
  return categorie(cle)?.porte?.[attribut] === true;
}

export function nomCarburant(cle) {
  return CARBURANTS.find((c) => c.cle === cle)?.nom || null;
}

export function nomPermis(cle) {
  return PERMIS.find((p) => p.cle === cle)?.nom || null;
}

/** Seuls les camions comptent dans la capacité : un lift ne charge rien. */
export function capaciteCamions(vehicules) {
  return capaciteFlotte((vehicules || []).filter((v) => porte(v.categorie || "camion", "volume")));
}

/** Les lifts de la flotte, pour n'offrir qu'eux quand on réserve un lift. */
export function liftsDisponibles(vehicules) {
  return (vehicules || []).filter((v) => v.categorie === "lift" && !v.archive_le);
}

/**
 * Un lift atteint-il cet étage ? Renvoie une DÉCISION motivée plutôt qu'un
 * booléen : c'est le motif qu'on affichera au moment de réserver.
 *
 * `etage_max` non renseigné ne vaut PAS zéro — c'est « on ne sait pas ». Le
 * confondre ferait refuser tous les lifts non documentés (piège Number(null)).
 */
export function liftAtteint(vehicule, etageDemande) {
  if (!vehicule || vehicule.categorie !== "lift") {
    return { ok: false, motif: "Ce véhicule n'est pas un lift." };
  }
  const max = vehicule.etage_max;
  if (max === null || max === undefined || max === "") {
    return { ok: true, inconnu: true,
             motif: "Étage maximal non renseigné pour ce lift." };
  }
  const demande = Number(etageDemande);
  if (!Number.isFinite(demande)) return { ok: true, motif: null };
  if (demande > Number(max)) {
    return { ok: false,
             motif: `Ce lift dessert jusqu'au ${Number(max)}e étage — `
                  + `le chantier est au ${demande}e.` };
  }
  return { ok: true, motif: null };
}

/** Le résumé d'un véhicule selon sa catégorie : m³, ou échelle et étages. */
export function resumeCapacite(v) {
  if (!v) return "";
  const cat = v.categorie || "camion";
  if (porte(cat, "volume")) return v.volume_m3 ? `${v.volume_m3} m³` : "";
  if (porte(cat, "echelle")) {
    const bouts = [];
    if (v.echelle_m) bouts.push(`${v.echelle_m} m`);
    if (v.etage_max !== null && v.etage_max !== undefined && v.etage_max !== "") {
      bouts.push(`jusqu'au ${Number(v.etage_max)}e`);
    }
    return bouts.join(" · ");
  }
  return "";
}

/**
 * LES PERMIS S'EMBOÎTENT : détenir le « plus grand » couvre le « plus petit ».
 * Qui peut conduire un poids lourd (C) conduit un camion léger (C1) et une
 * voiture (B). Ne comparer que l'égalité stricte signalerait à tort un chef
 * d'équipe titulaire du CE qu'on met sur un fourgon.
 *
 * L'ordre de couverture (chaque permis couvre ceux qui le suivent) :
 */
const COUVERTURE_PERMIS = {
  CE: ["CE", "C", "C1E", "C1", "BE", "B"],
  C:  ["C", "C1", "B"],
  C1E: ["C1E", "C1", "BE", "B"],
  C1: ["C1", "B"],
  BE: ["BE", "B"],
  B:  ["B"],
};

/** L'ensemble des catégories réellement couvertes par les permis détenus. */
export function permisCouverts(permisDetenus = []) {
  const set = new Set();
  for (const p of permisDetenus || []) {
    for (const c of COUVERTURE_PERMIS[p] || [p]) set.add(c);
  }
  return set;
}

/**
 * Un membre est-il en règle pour conduire un véhicule donné ?
 *
 * Rend un {ok, motif} motivé plutôt qu'un booléen : le planning doit pouvoir
 * DIRE « il n'a pas le permis C » ou « code 95 expiré », pas juste teinter un
 * jeton. Deux signaux distincts, parce qu'ils appellent des actions
 * différentes — passer un permis, ou renouveler une formation.
 *
 * RIEN N'EST BLOQUANT (décision Raphaël, §4.5) : cette fonction SIGNALE. C'est
 * l'appelant qui décide d'afficher un avertissement, jamais d'interdire.
 *
 * @param {{permis?: string}} vehicule le véhicule à conduire (permis requis)
 * @param {{permis_detenus?: string[], code95_echeance?: string}} membre
 * @param {string} dateMission AAAA-MM-JJ — le code 95 doit être valide CE jour-là
 */
export function permisConduite(vehicule, membre, dateMission) {
  const requis = vehicule?.permis;
  // Un véhicule sans permis requis (petit utilitaire) ne réclame rien.
  if (!requis) return { ok: true };

  const couverts = permisCouverts(membre?.permis_detenus);
  if (!couverts.has(requis)) {
    return { ok: false, manque: "permis",
             motif: `permis ${requis} requis` };
  }

  // Le code 95 n'est vérifié QUE si une échéance est renseignée : une donnée
  // absente n'est pas une donnée expirée. On ne crie pas sur ce qu'on ignore.
  const ech = membre?.code95_echeance;
  if (ech && dateMission && ech < dateMission) {
    return { ok: false, manque: "code95",
             motif: "code 95 expiré à cette date" };
  }
  return { ok: true };
}
