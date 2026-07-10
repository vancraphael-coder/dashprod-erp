// =============================================================================
// Opérations — Agenda (vue planning)
// Source : Réf. 2 (agenda terrain, filtré par membre affecté ; C-20 conflits).
// Logique PURE : organiser les missions en journées pour la vue planning, et
// résumer la charge d'un jour. S'appuie sur missions.js (déjà testé) pour les
// conflits. Ne décide rien : prépare l'affichage.
// =============================================================================

/**
 * Regroupe des missions par date (clé AAAA-MM-JJ), triées chronologiquement,
 * chaque jour triant ses missions par heure.
 * @param {{id: string, date: string, heure?: string}[]} missions
 * @returns {{date: string, missions: any[]}[]}
 */
export function grouperParJour(missions) {
  const map = new Map();
  for (const m of missions || []) {
    if (!m.date) continue;
    const jour = String(m.date).slice(0, 10);
    if (!map.has(jour)) map.set(jour, []);
    map.get(jour).push(m);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, ms]) => ({
      date,
      missions: ms.sort((x, y) => (x.heure || "").localeCompare(y.heure || "")),
    }));
}

/**
 * Résume la charge d'un jour : nombre de missions et effectif total affecté
 * (somme des tailles d'équipe). Sert d'indicateur de tension du planning.
 * @param {{affectations?: any[]}[]} missionsDuJour
 * @returns {{nbMissions: number, effectif: number}}
 */
export function chargeDuJour(missionsDuJour) {
  const nbMissions = (missionsDuJour || []).length;
  const effectif = (missionsDuJour || []).reduce(
    (s, m) => s + ((m.affectations && m.affectations.length) || 0), 0
  );
  return { nbMissions, effectif };
}

/**
 * Filtre les missions visibles par un membre du terrain : seulement celles où
 * il est affecté (Réf. 2 : agenda terrain filtré par membre). Le bureau voit
 * tout (filtre non appliqué).
 * @param {any[]} missions
 * @param {string} utilisateurId
 * @returns {any[]}
 */
export function missionsDuMembre(missions, utilisateurId) {
  return (missions || []).filter((m) =>
    (m.affectations || []).some((a) => (a.utilisateur_id || a.utilisateurId || a) === utilisateurId)
  );
}
