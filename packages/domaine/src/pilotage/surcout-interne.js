// =============================================================================
// LE SURCOÛT INTERNE — du temps qui coûte à la société, jamais au client.
//
// LE PRINCIPE (celui de Raphaël)
// ------------------------------
// Les heures des membres sont un coût INTERNE. Quand le chantier déborde pour
// une raison qui n'est pas imputable au client — une panne au retour, un membre
// en retard, un camion à nettoyer — ces heures en plus alourdissent le coût
// réel et rongent la marge, mais elles NE remontent JAMAIS sur la facture. Ce
// n'est pas au client de payer nos aléas.
//
// Ce module distingue deux choses que le rapport de chantier ne séparait pas :
//   · les CONSTATS facturables (objet non prévu, accès difficile) — déjà gérés
//     par operations/rapport-chantier.js, ils PEUVENT justifier plus de facture ;
//   · le SURCOÛT INTERNE en heures — panne, retard, nettoyage — qui ne justifie
//     jamais un centime de plus au client.
//
// QUI FAIT QUOI (décisions de Raphaël)
//   · Le TERRAIN déclare et FIGE : le chef d'équipe signale « 1 h de panne au
//     retour ». Une fois figé, il ne le retouche plus.
//   · Le BUREAU corrige : la secrétaire ajuste si besoin, et c'est elle — jamais
//     le terrain — qui décide de ce qui est facturable. Le surcoût interne, lui,
//     n'est jamais une question : il est interne par nature.
//
// Ce module est PUR : il porte les motifs, valide une déclaration, somme les
// heures internes et les valorise au coût interne. Il ne facture rien.
// =============================================================================

import { ouDefaut } from "../noyau/nombres.js";

/**
 * Les MOTIFS de surcoût interne. Tous « internes » par nature — aucun n'est
 * facturable, c'est le point. Liste courte et concrète : les cas nommés par
 * Raphaël, plus « autre » pour ne pas coincer le terrain.
 */
export const MOTIFS_INTERNES = Object.freeze([
  { cle: "panne_retour", titre: "Panne au retour",
    aide: "Le véhicule est tombé en panne après la livraison." },
  { cle: "retard_equipe", titre: "Retard de l'équipe",
    aide: "Un membre est arrivé en retard, le chantier a démarré tard." },
  { cle: "nettoyage", titre: "Nettoyage du véhicule",
    aide: "Temps passé à nettoyer le camion, non imputable au client." },
  { cle: "materiel_oublie", titre: "Matériel oublié",
    aide: "Aller-retour pour du matériel manquant au départ." },
  { cle: "autre_interne", titre: "Autre (interne)",
    aide: "Un autre aléa à notre charge — à préciser." },
]);

export function motifInterne(cle) {
  return MOTIFS_INTERNES.find((m) => m.cle === cle) || null;
}

const CLES_MOTIF = new Set(MOTIFS_INTERNES.map((m) => m.cle));

/** Heures d'une valeur, jamais négatives, jamais NaN (Number(null) === 0). */
function heures(v) {
  const n = Number(ouDefaut(v, 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Normalise une déclaration. Forme : { motif, heures, note?, declare_par?, fige? } */
export function surcoutInterne(brut = {}) {
  return {
    motif: CLES_MOTIF.has(brut.motif) ? brut.motif : null,
    heures: heures(brut.heures),
    note: typeof brut.note === "string" ? brut.note.trim() : "",
    declare_par: brut.declare_par || null,
    fige: Boolean(brut.fige),
  };
}

/** Valide une déclaration avant enregistrement. */
export function surcoutValide(brut) {
  const s = surcoutInterne(brut);
  if (!s.motif) return { ok: false, message: "Choisissez un motif." };
  if (s.heures <= 0) return { ok: false, message: "Indiquez un temps en heures." };
  if (s.motif === "autre_interne" && !s.note) {
    return { ok: false, message: "Précisez le motif « autre »." };
  }
  return { ok: true, surcout: s };
}

/** Le TERRAIN peut-il encore modifier ? Il déclare et fige. */
export function terrainPeutModifier(surcout) {
  return !surcoutInterne(surcout).fige;
}

/** Le BUREAU corrige toujours (quand l'acteur EST au bureau). */
export function bureauPeutCorriger(estBureau) {
  return Boolean(estBureau);
}

/** Le total des heures internes, motifs valides seulement. */
export function heuresInternes(surcouts = []) {
  const total = (surcouts || [])
    .map(surcoutInterne)
    .filter((s) => s.motif && s.heures > 0)
    .reduce((t, s) => t + s.heures, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Le COÛT interne de ces heures, à un taux horaire donné. Reste un COÛT — il
 * n'apparaît jamais côté facturé.
 * @returns {{ heures, coutEuros, parMotif: {motif,titre,heures,coutEuros}[] }}
 */
export function coutInterne(surcouts = [], tauxHoraire = 0) {
  const t = heures(tauxHoraire);
  const valides = (surcouts || []).map(surcoutInterne)
    .filter((s) => s.motif && s.heures > 0);

  const parMotifMap = new Map();
  for (const s of valides) {
    parMotifMap.set(s.motif,
      Math.round(((parMotifMap.get(s.motif) || 0) + s.heures) * 100) / 100);
  }
  const parMotif = [...parMotifMap.entries()].map(([motif, h]) => ({
    motif, titre: motifInterne(motif)?.titre || motif,
    heures: h, coutEuros: Math.round(h * t * 100) / 100,
  }));

  const h = heuresInternes(valides);
  return { heures: h, coutEuros: Math.round(h * t * 100) / 100, parMotif };
}

/**
 * LA RÈGLE, gardée par test : le surcoût interne s'ajoute au coût réel et
 * n'entre JAMAIS dans le facturé.
 * @returns {{ ajouteAuReel: number, ajouteAuFacture: number }}
 */
export function effetSurCalcul(coutInterneEuros) {
  const c = heures(coutInterneEuros);
  return { ajouteAuReel: c, ajouteAuFacture: 0 };
}
