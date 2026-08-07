// =============================================================================
// Clôture d'un dossier — lecture métier de la check-list et du bilan figé.
//
// Aucune décision ici : la base tranche (cmd_exigences_cloture, puis
// cmd_cloturer_dossier refuse ou accepte). Ce module met la réponse en mots et
// en ordre pour l'écran, et rien de plus. Si un jour l'écran et la base ne
// disent plus la même chose, c'est la base qui a raison.
// =============================================================================

import { ouDefaut } from "../noyau/nombres.js";

/** Un chiffre absent vaut zéro DANS UN BILAN DÉJÀ FIGÉ — jamais ailleurs. */
const n0 = (v) => ouDefaut(v, 0);

/** Ordre d'affichage : ce qui bloque en premier, puis ce qui manque sans bloquer. */
const RANG = { manquant: 0, sans_objet: 1, ok: 2 };

export function trierPoints(points) {
  return [...(points || [])].sort((a, b) => {
    const ba = a.bloquant && a.statut === "manquant" ? 0 : 1;
    const bb = b.bloquant && b.statut === "manquant" ? 0 : 1;
    if (ba !== bb) return ba - bb;
    return (RANG[a.statut] ?? 3) - (RANG[b.statut] ?? 3);
  });
}

export function pictoStatut(statut) {
  if (statut === "ok") return "✓";
  if (statut === "sans_objet") return "–";
  return "✗";
}

/**
 * Synthèse lisible d'une réponse de cmd_exigences_cloture.
 * `bloquants` compte les points qui EMPÊCHENT la clôture ; `reserves` ceux qui
 * manquent sans l'empêcher — on les nomme quand même, ils partiront dans le
 * motif si l'on force.
 */
export function synthese(exigences) {
  const points = exigences?.points || [];
  const bloquants = points.filter((p) => p.bloquant && p.statut === "manquant");
  const reserves = points.filter((p) => !p.bloquant && p.statut === "manquant");
  return {
    points: trierPoints(points),
    bloquants,
    reserves,
    nbBloquants: bloquants.length,
    peutCloturer: Boolean(exigences?.peut_cloturer),
    peutForcer: Boolean(exigences?.peut_cloturer_avec_motif) && bloquants.length > 0,
    etat: exigences?.etat || null,
  };
}

/** Phrase d'en-tête : ce qu'on peut faire, en une ligne, sans jargon. */
export function verdict(exigences) {
  const s = synthese(exigences);
  if (s.etat === "clos") return "Ce dossier est clôturé.";
  if (s.etat !== "effectue") {
    return "La clôture s'ouvrira quand le chantier sera terminé.";
  }
  if (s.peutCloturer && s.reserves.length === 0) return "Tout est en ordre : le dossier peut être clôturé.";
  if (s.peutCloturer) return "Le dossier peut être clôturé — une réserve reste notée.";
  return s.nbBloquants === 1
    ? "Un point empêche la clôture."
    : `${s.nbBloquants} points empêchent la clôture.`;
}

/**
 * Lignes du bilan figé, prêtes à afficher. Le bilan ne se recalcule jamais :
 * on lit ce qui a été écrit le jour de la clôture, pas l'état d'aujourd'hui.
 */
export function lignesBilan(bilan) {
  if (!bilan) return [];
  const f = bilan.facturation || {};
  const m = bilan.missions || {};
  const c = bilan.constats || {};
  const lignes = [
    ["Facturé", euro(n0(f.du_centimes))],
    ["Encaissé", euro(n0(f.paye_centimes))],
    ["Solde", euro(n0(f.solde_centimes))],
    ["Chantiers effectués", String(n0(m.effectuees))],
    ["Heures de chantier", `${n0(bilan.heures_chantier).toFixed(2)} h`],
  ];
  if (n0(m.annulees) > 0) lignes.push(["Chantiers annulés", String(n0(m.annulees))]);
  const ecarts = n0(c.valides) + n0(c.ajustes);
  if (ecarts > 0) {
    lignes.push(["Écarts retenus", `${ecarts} · ${n0(c.minutes_cumulees)} min · ${n0(c.volume_cumule_m3)} m³`]);
  }
  if (n0(bilan.documents_signes) > 0) {
    lignes.push(["Documents signés", String(n0(bilan.documents_signes))]);
  }
  return lignes;
}

/** Une clôture forcée doit se voir : elle porte le nombre de points levés. */
export function mentionDerogation(bilan) {
  const d = bilan?.derogation;
  if (!d) return null;
  const n = n0(d.bloquants);
  return `Clôturé par dérogation — ${n} point${n > 1 ? "s" : ""} non levé${n > 1 ? "s" : ""} : ${d.motif || "sans motif"}`;
}

function euro(centimes) {
  return (n0(centimes) / 100).toLocaleString("fr-BE", {
    style: "currency", currency: "EUR",
  });
}
