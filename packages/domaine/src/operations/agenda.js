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

/**
 * Construit la grille d'un mois pour la vue calendrier (alignement page 09 §1).
 * Semaine commençant le LUNDI (usage belge) — attention, getDay() renvoie 0
 * pour dimanche : le décalage se calcule (jour+6)%7.
 *
 * @param {number} annee
 * @param {number} mois  index 0-11 (comme Date)
 * @param {{date: string}[]} missions
 * @returns {{
 *   annee: number, mois: number,
 *   decalage: number,            // cases vides avant le 1er
 *   jours: {jour: number, date: string, nb: number}[]
 * }}
 */
export function grilleMois(annee, mois, missions) {
  const premier = new Date(annee, mois, 1);
  // getDay() : 0=dimanche … 6=samedi. Semaine au lundi → dimanche vaut 6.
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  // Densité : combien de missions par date.
  const densite = new Map();
  for (const m of missions || []) {
    if (!m.date) continue;
    const d = String(m.date).slice(0, 10);
    densite.set(d, (densite.get(d) || 0) + 1);
  }

  const jours = [];
  for (let j = 1; j <= nbJours; j++) {
    const date = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
    jours.push({ jour: j, date, nb: densite.get(date) || 0 });
  }
  return { annee, mois, decalage, jours };
}

/**
 * Missions d'une date donnée, triées par heure.
 * @param {any[]} missions
 * @param {string} date  AAAA-MM-JJ
 */
export function missionsDuJour(missions, date) {
  return (missions || [])
    .filter((m) => m.date && String(m.date).slice(0, 10) === date)
    .sort((a, b) => (a.heure || "").localeCompare(b.heure || ""));
}
