// =============================================================================
// LA MAIN-D'ŒUVRE RÉELLE — les heures POINTÉES, pas l'estimation du devis.
//
// LE TROU QUE CE MODULE COMBLE
// ----------------------------
// Le Calcul définitif comparait « prévu » et « réel », mais sa main-d'œuvre
// « réelle » venait de `coutMainOeuvre(equipe, faits.heures)` : le même nombre
// d'heures — celui du DEVIS — appliqué à tout le monde. C'était une estimation
// déguisée en réel. Deux colonnes censées s'opposer disaient la même chose.
//
// Ce module lit ce que CHAQUE membre a réellement pointé sur une mission, et le
// valorise au COÛT INTERNE (le taux du barème interne, pas la paie). Décision
// de Raphaël, et sa raison est juste : la paie déclare les heures d'un membre
// au niveau du JOUR — deux déménagements dans la même journée y sont fondus.
// On ne peut donc pas répartir la paie par mission. Le pointage, lui, est par
// mission ; multiplié par le taux interne, il donne le coût réel de CETTE
// mission.
//
// PRINCIPE PORTÉ (celui de Raphaël) : les heures des membres sont un COÛT
// INTERNE à la société, pas un coût refacturé au client. Ce module calcule donc
// un coût — il ne touche jamais à ce qu'on facture. Le lien avec la facture se
// fait plus loin (surcoût interne, lot suivant) ; ici on établit seulement la
// dépense réelle en main-d'œuvre.
// =============================================================================

import { ouDefaut } from "../noyau/nombres.js";

/** Heures d'une valeur quelconque, jamais négatives, jamais NaN.
 *  `Number(null) === 0` : sans ce garde-fou, une heure absente vaudrait 0 et
 *  passerait inaperçue, ou pire ferait planer un total. */
function heures(v) {
  const n = Number(ouDefaut(v, 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Le pointage d'UN membre sur UNE mission → ses heures travaillées.
 *
 * On accepte deux formes, parce que le terrain les produit toutes deux :
 *   · `heures` déjà calculées (issues de `heuresTravail`) ;
 *   · `secondes` brutes (ce que le chrono stocke).
 * L'une OU l'autre ; si les deux manquent, la personne a été affectée mais n'a
 * pas pointé — 0 heure, et on le dira (voir `mainOeuvreReelle`).
 *
 * @param {object} p { heures?, secondes? }
 * @returns {number} heures, arrondies au centième
 */
export function heuresPointees(p = {}) {
  if (p.heures != null) return Math.round(heures(p.heures) * 100) / 100;
  if (p.secondes != null) {
    const h = Math.max(0, Number(p.secondes) || 0) / 3600;
    return Math.round(h * 100) / 100;
  }
  return 0;
}

/**
 * LA MAIN-D'ŒUVRE RÉELLE d'une mission, membre par membre.
 *
 * Chaque membre affecté apporte ses heures pointées × son taux interne. Un
 * membre affecté qui n'a pas pointé apparaît quand même, à 0 h : son absence de
 * pointage est une information (a-t-il oublié ? n'est-il pas venu ?), pas un
 * silence à cacher.
 *
 * @param {object} p
 * @param {Array}  p.pointages [{ membreId, heures?|secondes? }]
 * @param {object} p.taux      { [membreId]: tauxHoraireInterneEuros }
 * @param {Array}  [p.membres] pour afficher un nom ; [{ id, nom }]
 * @returns {{
 *   lignes: {membreId, nom, heures, taux, tauxConnu, coutEuros}[],
 *   heuresTotales: number,
 *   coutEuros: number,
 *   sansPointage: string[],   // membres affectés sans pointage
 *   sansTaux: string[]        // membres pointés sans taux connu
 * }}
 */
export function mainOeuvreReelle({ pointages = [], taux = {}, membres = [] } = {}) {
  const nomDe = (id) => (membres.find((m) => m.id === id)?.nom) || null;
  const lignes = [];
  const sansPointage = [];
  const sansTaux = [];

  for (const p of pointages) {
    const h = heuresPointees(p);
    const brut = ouDefaut(taux[p.membreId], NaN);
    const tauxConnu = Number.isFinite(brut);
    const t = tauxConnu ? brut : 0;

    if (h === 0) sansPointage.push(p.membreId);
    // Un taux inconnu sur des heures réelles fausse le coût vers le BAS (0 €) :
    // on le signale, pour ne pas laisser croire à une mission bon marché.
    if (h > 0 && !tauxConnu) sansTaux.push(p.membreId);

    lignes.push({
      membreId: p.membreId,
      nom: nomDe(p.membreId) || "Membre",
      heures: h,
      taux: t,
      tauxConnu,
      coutEuros: Math.round(h * t * 100) / 100,
    });
  }

  const heuresTotales = Math.round(
    lignes.reduce((s, l) => s + l.heures, 0) * 100) / 100;
  const coutEuros = Math.round(
    lignes.reduce((s, l) => s + l.coutEuros, 0) * 100) / 100;

  return { lignes, heuresTotales, coutEuros, sansPointage, sansTaux };
}

/**
 * L'ÉCART entre les heures prévues (au devis) et les heures réelles (pointées).
 *
 * C'est le chiffre qui déclenche la lecture du bureau : « on avait prévu 18 h,
 * il y en a eu 23 ». Le module ne juge PAS d'où vient l'écart — travail
 * supplémentaire facturable, ou surcoût interne (panne, retard, nettoyage). Ce
 * tri est la décision du bureau, portée par le lot suivant. Ici, on ne fait que
 * mesurer.
 *
 * @param {number} heuresPrevues heures du devis (somme équipe × durée)
 * @param {number} heuresReelles heures pointées totales
 * @returns {{ prevues: number, reelles: number, ecart: number, depassement: boolean }}
 */
export function ecartHeures(heuresPrevues, heuresReelles) {
  const prev = heures(heuresPrevues);
  const reel = heures(heuresReelles);
  const ecart = Math.round((reel - prev) * 100) / 100;
  return { prevues: prev, reelles: reel, ecart, depassement: ecart > 0 };
}

// -----------------------------------------------------------------------------
// AGRÉGATION DES SESSIONS DE POINTAGE (individuel, migration 0147/0148)
// -----------------------------------------------------------------------------

/** Heures entre deux instants ISO, jamais négatives. Une session sans arrivée
 *  n'est pas finie : elle compte 0 (le chantier n'est pas clôturé pour ce
 *  membre), plutôt qu'un total qui court tout seul. */
function heuresSession(depart, arrivee) {
  if (!depart || !arrivee) return 0;
  const d = new Date(depart).getTime();
  const a = new Date(arrivee).getTime();
  if (!Number.isFinite(d) || !Number.isFinite(a) || a <= d) return 0;
  return Math.round((a - d) / 3600000 * 100) / 100;
}

/**
 * Transforme les sessions brutes d'une affaire (une par mission et par membre)
 * en heures cumulées PAR MEMBRE — la forme qu'attend `mainOeuvreReelle`.
 *
 * Un membre qui a pointé sur deux missions de l'affaire voit ses heures
 * additionnées : c'est bien SON temps total sur ce dossier. Les sessions sans
 * `utilisateur_id` (pointage collectif d'avant 0147) sont ignorées ici — elles
 * ne peuvent pas être attribuées à quelqu'un, et deviner fausserait le coût.
 *
 * @param {object[]} sessions [{ utilisateur_id, depart, arrivee }]
 * @returns {{ pointages: {membreId, heures}[], collectivesIgnorees: number }}
 */
export function pointagesParMembre(sessions = []) {
  const parMembre = new Map();
  let collectivesIgnorees = 0;
  for (const s of sessions || []) {
    const id = s.utilisateur_id;
    if (!id) { collectivesIgnorees += 1; continue; }
    const h = heuresSession(s.depart, s.arrivee);
    parMembre.set(id, Math.round(((parMembre.get(id) || 0) + h) * 100) / 100);
  }
  return {
    pointages: [...parMembre.entries()].map(([membreId, heures]) => ({ membreId, heures })),
    collectivesIgnorees,
  };
}
