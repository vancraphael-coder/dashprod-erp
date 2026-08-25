// =============================================================================
// LES ÉQUIPES D'UNE JOURNÉE.
//
// CE QUE C'EST
// ------------
// Une équipe se forme pour une journée et s'affilie à une ou plusieurs missions.
// Elle peut être enregistrée comme MODÈLE, pour être reformée un autre jour
// sans tout ressaisir — les mêmes trois personnes travaillent souvent ensemble.
//
// LES RÈGLES, TELLES QUE RAPHAËL LES A POSÉES
// -------------------------------------------
// 1. UNE personne au minimum. Une équipe vide n'est pas une équipe.
// 2. Le maximum n'INTERDIT rien : il AVERTIT. C'est la discipline du projet
//    (§4.5) — on signale, on ne bloque pas. Le bureau connaît son terrain mieux
//    que la règle : un chantier peut légitimement demander six personnes là où
//    le barème en suggère quatre.
// 3. Une personne PEUT être dans deux équipes le même jour, à condition que les
//    missions ne se chevauchent PAS dans le temps. C'est le cas réel : un
//    déménagement le matin, un lift l'après-midi.
//
// LE CHEVAUCHEMENT EST LE CŒUR
// ----------------------------
// Tout se joue sur les heures. Deux missions qui se suivent ne se chevauchent
// pas ; deux missions qui se recouvrent, même d'une minute, ne peuvent pas
// avoir la même personne. Une mission sans horaire est traitée comme occupant
// la journée entière : on ne peut pas prouver qu'elle laisse de la place, donc
// on ne le suppose pas.
// =============================================================================

import { nombre, estFourni } from "../noyau/nombres.js";

/** Minutes depuis minuit, ou null si l'heure est absente ou illisible. */
function minutes(h) {
  if (!h) return null;
  const m = /^(\d{1,2})[:h](\d{2})?$/.exec(String(h).trim());
  if (!m) return null;
  const heures = Number(m[1]), mins = Number(m[2] || 0);
  if (heures > 23 || mins > 59) return null;
  return heures * 60 + mins;
}

/**
 * La plage horaire d'une mission, en minutes.
 *
 * Une mission SANS horaire occupe la journée entière. C'est volontaire et
 * prudent : on ne peut pas prouver qu'elle laisse la place à une autre, donc
 * on ne le suppose pas. Le bureau qui veut doubler une personne devra poser
 * des heures — ce qui est justement l'information qui manque.
 */
export function plage(mission) {
  const debut = minutes(mission?.heure_debut ?? mission?.heure);
  const fin = minutes(mission?.heure_fin);
  if (debut == null && fin == null) return { debut: 0, fin: 24 * 60, floue: true };
  if (debut != null && fin == null) {
    // Début connu, fin inconnue : on ne devine pas une durée. La mission tient
    // jusqu'au bout de la journée.
    return { debut, fin: 24 * 60, floue: true };
  }
  if (debut == null) return { debut: 0, fin, floue: true };
  // Une fin avant le début = passage à minuit (chantier de nuit).
  return { debut, fin: fin <= debut ? 24 * 60 : fin, floue: false };
}

/** Deux plages se recouvrent-elles ? Se toucher bout à bout ne compte pas. */
export function seChevauchent(a, b) {
  return a.debut < b.fin && b.debut < a.fin;
}

/**
 * Une personne peut-elle rejoindre cette équipe ce jour-là ?
 *
 * @param {object[]} missionsVisees missions de l'équipe qu'on rejoint
 * @param {object[]} missionsDejaTenues missions des AUTRES équipes du jour où
 *        la personne figure déjà
 * @returns {{ok: true} | {ok: false, motif: string, mission?: object}}
 */
export function peutRejoindre(missionsVisees = [], missionsDejaTenues = []) {
  for (const v of missionsVisees) {
    const pv = plage(v);
    for (const d of missionsDejaTenues) {
      // La même mission dans deux équipes n'est pas un conflit : c'est la même
      // présence, comptée deux fois.
      if (d.id && v.id && d.id === v.id) continue;
      const pd = plage(d);
      if (seChevauchent(pv, pd)) {
        return {
          ok: false,
          mission: d,
          motif: pv.floue || pd.floue
            ? `Déjà engagée sur « ${d.libelle || d.type || "une mission"} » ce `
              + "jour-là, sans horaire précis : impossible de garantir qu'elle "
              + "est libre. Posez des heures pour la placer deux fois."
            : `Déjà engagée de ${fmt(pd.debut)} à ${fmt(pd.fin)} sur `
              + `« ${d.libelle || d.type || "une mission"} ».`,
        };
      }
    }
  }
  return { ok: true };
}

function fmt(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}h${m ? String(m).padStart(2, "0") : ""}`;
}

/**
 * L'effectif suggéré pour un ensemble de missions.
 *
 * SUGGÈRE, ne décide pas : c'est un point de départ pour l'avertissement, pas
 * une règle tarifaire. Le barème reste la source des prix (§ volumetrie).
 */
export function effectifSuggere(missions = []) {
  let total = 0;
  for (const m of missions) {
    const explicite = nombre(m?.demenageurs_requis);
    if (estFourni(explicite) && explicite > 0) { total += explicite; continue; }
    // Sans exigence explicite, une mission demande au moins deux personnes :
    // un déménagement à un seul homme n'existe pas.
    total += 2;
  }
  return Math.max(1, total);
}

/**
 * Le verdict complet sur une équipe.
 *
 * Rend TOUJOURS un résultat exploitable : `bloquant` pour ce qui empêche
 * d'enregistrer, `avertissements` pour ce qui mérite un regard sans interdire.
 * Le bureau garde la main.
 *
 * @param {object} equipe { membres: string[], missions: object[], vehicules: string[] }
 * @param {object} contexte {
 *   engagementsParMembre: { [membreId]: object[] },
 *   engagementsParVehicule: { [vehiculeId]: object[] },
 *   flotte: object[]
 * }
 */
export function verdictEquipe(equipe = {}, contexte = {}) {
  const membres = equipe.membres || [];
  const missions = equipe.missions || [];
  const vehicules = equipe.vehicules || [];
  const engagements = contexte.engagementsParMembre || {};
  const engagementsVehicule = contexte.engagementsParVehicule || {};

  const bloquant = [];
  const avertissements = [];

  // ── Règle 1 : une personne au minimum. C'est le seul vrai blocage. ────────
  if (membres.length === 0) {
    bloquant.push("Une équipe compte au moins une personne.");
  }

  // ── Règle 3 : chevauchement horaire, par personne. Bloquant : la même
  //    personne ne peut pas être à deux endroits en même temps. ─────────────
  for (const id of membres) {
    const r = peutRejoindre(missions, engagements[id] || []);
    if (!r.ok) {
      bloquant.push(`${nomDe(contexte, id)} : ${r.motif}`);
    }
  }

  // ── Règle 2 : l'effectif AVERTIT, il n'interdit pas. ─────────────────────
  if (missions.length > 0 && membres.length > 0) {
    const suggere = effectifSuggere(missions);
    if (membres.length < suggere) {
      avertissements.push(
        `${membres.length} personne${membres.length > 1 ? "s" : ""} pour `
        + `${missions.length} mission${missions.length > 1 ? "s" : ""} : `
        + `${suggere} sont habituellement nécessaires. À vous de voir.`);
    } else if (membres.length > suggere * 2) {
      avertissements.push(
        `${membres.length} personnes pour un besoin estimé à ${suggere} : `
        + "vérifiez que personne n'est immobilisé pour rien.");
    }
  }

  if (missions.length === 0) {
    avertissements.push("Équipe sans mission affiliée : elle sera formée mais "
      + "n'apparaîtra sur aucun chantier.");
  }

  // ── Règle 4 : LE VÉHICULE (0144). ────────────────────────────────────────
  //
  // Un véhicule dans deux équipes du même jour n'est pas forcément une faute :
  // le même camion peut servir le matin puis l'après-midi. C'est le
  // CHEVAUCHEMENT qui pose problème — et un camion, contrairement à une
  // personne, ne peut vraiment pas être coupé en deux.
  //
  // Pourtant ce n'est PAS bloquant, et c'est délibéré : le bureau connaît des
  // situations que le logiciel ignore (un véhicule libéré plus tôt, une
  // permutation de dernière minute). On signale, on n'interdit pas — la règle
  // du produit vaut aussi ici.
  for (const id of vehicules) {
    const r = peutRejoindre(missions, engagementsVehicule[id] || []);
    if (!r.ok) {
      // « Déjà engagée » est écrit pour une personne. Sur un camion, l'accord
      // faux fait douter du message tout entier — et un avertissement dont on
      // doute est un avertissement qu'on cesse de lire.
      avertissements.push(
        `${nomVehicule(contexte, id)} : ${r.motif.replace(/^Déjà engagée/, "déjà engagé")}`);
    }
  }

  // Une équipe qui a des missions mais aucun véhicule mérite un regard : la
  // plupart des chantiers en demandent un. Sans mission, la question ne se
  // pose pas encore.
  if (missions.length > 0 && vehicules.length === 0) {
    avertissements.push("Aucun véhicule affecté à cette équipe.");
  }

  return {
    ok: bloquant.length === 0,
    bloquant,
    avertissements,
    effectif: membres.length,
    effectif_suggere: missions.length ? effectifSuggere(missions) : 0,
    vehicules: vehicules.length,
  };
}

function nomVehicule(contexte, id) {
  const v = (contexte.flotte || []).find((x) => x.id === id);
  return v?.nom || "Ce véhicule";
}

function nomDe(contexte, id) {
  const m = (contexte.membres || []).find((x) => x.id === id);
  return m?.nom || "Cette personne";
}

/**
 * Prépare un MODÈLE d'équipe réutilisable.
 *
 * Un modèle ne retient QUE les personnes : ni la date, ni les missions. Les
 * mêmes trois personnes travaillent souvent ensemble, mais jamais sur le même
 * chantier deux jours de suite. Garder la date ferait rejouer un passé.
 */
export function modeleDepuisEquipe(equipe = {}, nom) {
  const libelle = String(nom ?? "").trim();
  if (!libelle) {
    return { ok: false, motif: "Donnez un nom au modèle pour le retrouver." };
  }
  const membres = equipe.membres || [];
  if (membres.length === 0) {
    return { ok: false, motif: "Un modèle sans personne n'a rien à reformer." };
  }
  return { ok: true, modele: { nom: libelle, membres: [...membres] } };
}

/**
 * L'AFFECTATION QU'UNE MISSION REÇOIT DE SES ÉQUIPES DU JOUR.
 *
 * Décision de Raphaël : les membres et véhicules d'une équipe sont RÉSERVÉS
 * pour les missions qu'elle a sélectionnées. Composer une équipe et lui donner
 * un camion, c'est mettre ce camion sur les chantiers de cette équipe — sans
 * ressaisir l'affectation mission par mission.
 *
 * LE PIÈGE QUE CETTE FONCTION ÉVITE : plusieurs équipes peuvent viser la même
 * mission (l'équipe du matin et celle de l'après-midi sur un gros
 * déménagement). Écraser l'affectation à chaque enregistrement effacerait le
 * travail de l'autre équipe. On fait donc l'UNION de ce que toutes les équipes
 * de la journée apportent à cette mission — jamais un remplacement.
 *
 * Les doublons sont fondus : deux équipes qui partagent une personne ne
 * l'affectent pas deux fois.
 *
 * @param {string} missionId
 * @param {object[]} equipesDuJour [{ missions:[], membres:[], vehicules:[] }]
 * @returns {{membres: string[], vehicules: string[]}}
 */
export function affectationDepuisEquipes(missionId, equipesDuJour = []) {
  const membres = new Set();
  const vehicules = new Set();
  for (const e of equipesDuJour || []) {
    if (!(e?.missions || []).includes(missionId)) continue;
    for (const m of e.membres || []) membres.add(m);
    for (const v of e.vehicules || []) vehicules.add(v);
  }
  return { membres: [...membres], vehicules: [...vehicules] };
}

/**
 * Les missions dont l'affectation CHANGE si l'on enregistre `equipe`.
 *
 * Sert à ne réécrire que le nécessaire : les missions que l'équipe vient de
 * quitter (leur ancienne affectation doit être recalculée sans elle) ET celles
 * qu'elle vise désormais. Réécrire toutes les missions du jour à chaque
 * enregistrement serait coûteux et risquerait d'écraser des affectations
 * posées à la main ailleurs.
 *
 * @param {object} equipeAvant état précédent de l'équipe (ou null si nouvelle)
 * @param {object} equipeApres état voulu
 * @returns {string[]} identifiants de missions à recalculer
 */
export function missionsImpactees(equipeAvant, equipeApres) {
  const av = new Set((equipeAvant?.missions) || []);
  const ap = new Set((equipeApres?.missions) || []);
  return [...new Set([...av, ...ap])];
}

// =============================================================================
// LA COULEUR D'UNE ÉQUIPE DU JOUR
//
// Décision de Raphaël : la deuxième bille de la carte mission (celle du
// bandeau « Qui la fait ») prend la couleur du GROUPE DE TRAVAIL — l'équipe du
// jour à laquelle la mission appartient. Sur un planning chargé, la couleur
// dit d'un coup d'œil « ces trois chantiers, c'est la même équipe », là où
// relire des noms demande de l'attention.
//
// La couleur n'est PAS stockée : elle se DÉDUIT de la position de l'équipe dans
// la journée. Trois raisons :
//   · pas de colonne à migrer, pas de valeur à maintenir cohérente ;
//   · une équipe supprimée ne laisse pas un « trou » de couleur ;
//   · deux équipes d'une même journée ont toujours des couleurs distinctes
//     tant qu'elles tiennent dans la palette — ce qu'un choix libre ne
//     garantirait pas (deux fois le même bleu).
//
// Les tons sont ceux de la bille (`matiere-bille.js`), choisis pour rester
// lisibles côte à côte. `bleu` est RÉSERVÉ : c'est le ton de marque, celui
// d'une carte sans équipe encore constituée. Une équipe reçoit donc une
// couleur AUTRE que le bleu, pour que « pas encore d'équipe » et « équipe n° 1 »
// ne se confondent pas.
// =============================================================================

/** Les tons d'équipe, dans l'ordre d'attribution. Le bleu de marque est exclu. */
export const TONS_EQUIPE = Object.freeze([
  "vert", "orange", "mauve", "ambre", "rose", "rouge", "gris",
]);

/**
 * Le ton d'une équipe d'après son RANG dans la journée (0 = première créée).
 *
 * Au-delà de la palette, on reboucle : mieux vaut deux verts sur une très
 * grosse journée qu'une équipe sans couleur. Le rang vient de l'ordre de
 * création (`cree_le`), stable, et non d'un tirage — sinon la couleur d'une
 * équipe changerait à chaque rechargement.
 */
export function tonEquipe(rang) {
  const i = Number(rang);
  if (!Number.isInteger(i) || i < 0) return TONS_EQUIPE[0];
  return TONS_EQUIPE[i % TONS_EQUIPE.length];
}

/**
 * Le ton à donner à la bille d'une MISSION : celui de la première équipe du
 * jour qui la porte, `bleu` si aucune ne la porte encore.
 *
 * « La première » et non « toutes » : une bille a une couleur, pas plusieurs.
 * Si deux équipes se partagent une mission (matin/après-midi), la bille prend
 * la couleur de la première — l'appartenance fine se lit en dépliant, la bille
 * ne sert qu'au repérage d'ensemble.
 *
 * @param {string} missionId
 * @param {object[]} equipesDuJour équipes du jour, DANS L'ORDRE de création
 * @returns {string} un ton de `matiere-bille.js`
 */
export function tonMissionParEquipe(missionId, equipesDuJour = []) {
  const rang = (equipesDuJour || []).findIndex(
    (e) => (e?.missions || []).includes(missionId));
  return rang < 0 ? "bleu" : tonEquipe(rang);
}
