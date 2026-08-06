// =============================================================================
// Main-d'œuvre automatique — quelles lignes survivent, et de quelle couleur.
//
// LE BUG D'ORIGINE. `affaires.equipe` garde des identifiants de membres. L'écran
// les résolvait contre la liste des membres ACTIFS seulement. Dès qu'un membre
// était retiré, `membres.find(...)` renvoyait undefined et la ligne affichait
// l'identifiant brut — « 3f2a91c8-… · ? €/h × 6 h ». Un texte illisible à
// l'endroit exact où l'on regarde une marge.
//
// LES DEUX RÈGLES, telles que demandées :
//
//   1. Le dossier est CLÔTURÉ → la ligne reste, en orange. Un dossier clos est
//      un fait comptable : la personne a bien coûté ce qu'elle a coûté, même
//      partie depuis. On ne réécrit pas l'histoire, on la signale.
//
//   2. La mission n'est PAS terminée et la personne n'a PAS travaillé dessus →
//      la ligne DISPARAÎT, simplement. Elle n'était que pressentie ; la garder
//      gonflerait un coût que personne n'a payé.
//
// Le reste du temps, ligne normale. Et dans tous les cas : un nom, jamais un
// identifiant — on préfère « Membre retiré » à une suite de caractères.
// =============================================================================

import { ouDefaut } from "../noyau/nombres.js";

export const TON_NORMAL = "normal";
export const TON_HISTORIQUE = "historique"; // orange

/**
 * @param {object} e
 * @param {string[]} e.equipeIds        équipe pressentie du dossier
 * @param {Array}   e.membres           membres connus, ARCHIVÉS COMPRIS
 * @param {object}  e.taux              { [membreId]: tauxHoraire }
 * @param {Set|Array} e.ontTravaille    membres réellement affectés à une mission
 * @param {boolean} e.dossierClos
 * @param {boolean} e.missionTerminee
 * @returns {Array} lignes { id, nom, taux, tauxConnu, retire, ton }
 */
export function lignesMainOeuvre({
  equipeIds = [], membres = [], taux = {},
  ontTravaille = [], dossierClos = false, missionTerminee = false,
} = {}) {
  const travailleurs = ontTravaille instanceof Set ? ontTravaille : new Set(ontTravaille);
  const index = new Map(membres.map((m) => [m.id, m]));

  return equipeIds.flatMap((id) => {
    const m = index.get(id);
    const retire = m ? m.actif === false : true;
    const aTravaille = travailleurs.has(id);

    // Règle 2 — rien de fait, rien de terminé : la ligne n'a pas lieu d'être.
    if (!dossierClos && !missionTerminee && !aTravaille) return [];

    const brut = ouDefaut(taux[id], NaN);
    const tauxConnu = Number.isFinite(brut);

    return [{
      id,
      nom: m?.nom || (retire ? "Membre retiré" : "Membre inconnu"),
      taux: tauxConnu ? brut : 0,
      tauxConnu,
      retire,
      // Règle 1 — un dossier clos fige la ligne ; un membre parti la signale.
      ton: dossierClos || retire ? TON_HISTORIQUE : TON_NORMAL,
    }];
  });
}

/** Coût total de la main-d'œuvre retenue, en euros. */
export function coutMainOeuvre(lignes, heures) {
  const h = ouDefaut(heures, 0);
  return Math.round(lignes.reduce((s, l) => s + l.taux * h, 0));
}

/**
 * Ce qu'on dit à l'utilisateur quand des lignes ont disparu — sinon le total
 * change sans explication, et un total inexpliqué ne vaut rien.
 */
export function mentionLignesRetirees(equipeIds = [], lignes = []) {
  const n = (equipeIds?.length || 0) - (lignes?.length || 0);
  if (n <= 0) return null;
  return n === 1
    ? "1 membre pressenti n'a pas travaillé sur ce chantier — sa ligne est retirée."
    : `${n} membres pressentis n'ont pas travaillé sur ce chantier — leurs lignes sont retirées.`;
}
