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
