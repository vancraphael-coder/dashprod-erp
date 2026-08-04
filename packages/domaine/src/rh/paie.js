// =============================================================================
// Paie — du temps réellement presté au brut, puis estimation du net.
//
// CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS
//
// Il fait : le BRUT, à partir des heures réellement pointées au chrono. C'est
// la valeur unique de l'ERP — lui seul connaît les heures de chantier.
// Il calcule aussi la cotisation ONSS travailleur, qui est un taux fixe et
// vérifiable, et le coût employeur approximatif.
//
// Il ne fait PAS de fiche de paie légale. En Belgique, le précompte
// professionnel suit un barème progressif dépendant de la situation familiale
// (conjoint, personnes à charge, handicap…), révisé chaque année. Le document
// officiel relève du secrétariat social, qui porte la responsabilité des
// déclarations DmfA. Ce module produit une PRÉPARATION DE PAIE : le décompte
// d'heures et de brut à transmettre, plus une estimation de net clairement
// signalée comme indicative.
//
// Base légale des constantes utilisées :
//   - ONSS travailleur : 13,07 %
//   - Ouvriers (dont les déménageurs) : assiette portée à 108 % du brut,
//     le pécule de vacances passant par la Caisse de vacances annuelles.
//     Les employés cotisent sur 100 %.
// Ces deux règles sont stables. Le précompte, lui, n'est jamais deviné ici.
// =============================================================================

import { nombre as nombreExplicite } from "../noyau/nombres.js";

// =============================================================================
// SECTEUR DU DÉMÉNAGEMENT — SCP 140.05
//
// Sources vérifiées au 21/07/2026. Ces montants sont INDEXÉS chaque 1er janvier
// (indexation de +2,23 % au 01/01/2026). Ils doivent être revus à chaque
// indexation : un barème périmé fait sous-payer, ce qui se règle avec arriérés
// et amendes.
//
// L'entreprise peut tout surcharger : ces valeurs sont des repères, pas une
// vérité figée dans le code.
// =============================================================================

export const SECTEUR_140_05 = Object.freeze({
  cle: "140.05",
  nom: "SCP 140.05 — Déménagement",
  duree_hebdo_max: 38,
  indexation_derniere: "2026-01-01",
  indexation_taux_pct: 2.23,

  // Chèques-repas introduits dans le secteur au 01/01/2026 : 3,09 € par jour
  // presté, dont 2 € à charge de l'employeur et 1,09 € du travailleur.
  // Délai d'attente de 6 mois pour un nouveau travailleur, pendant lequel une
  // indemnité de repas est versée à la place.
  cheque_repas: Object.freeze({
    valeur_centimes: 309,
    part_employeur_centimes: 200,
    part_travailleur_centimes: 109,
    delai_attente_mois: 6,
    depuis: "2026-01-01",
  }),

  // Pension complémentaire sectorielle, en % des salaires bruts.
  // Trajectoire convenue : 0,887 % → 1,09 % en 2026 → 1,3 % en 2027.
  pension_complementaire_pct: 1.09,
  pension_complementaire_2027_pct: 1.30,
});

/** Taux de cotisation personnelle à la sécurité sociale. */
export const ONSS_TRAVAILLEUR = 0.1307;

/** Assiette de cotisation selon le statut. */
export const ASSIETTE = Object.freeze({ ouvrier: 1.08, employe: 1.00 });

/** Statut par défaut d'un métier de terrain. */
export const STATUT_PAR_METIER = Object.freeze({
  demenageur: "ouvrier",
  chauffeur: "ouvrier",
  chef_equipe: "ouvrier",
  bureau: "employe",
});

const c = (v) => Math.round(Number(v) || 0);

/**
 * Nombre EXPLICITEMENT fourni, sinon NaN.
 *
 * Piège coûteux : Number(null) et Number("") valent 0. Sans ce garde-fou, un
 * taux absent passe pour un taux à 0 % — et produit un net trop élevé ou un
 * coût employeur trop bas, avec l'air d'être juste. L'erreur a été commise
 * deux fois dans ce fichier ; elle est désormais impossible.
 */
const heuresValides = (h) => {
  const n = Number(h);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Brut d'une période, en centimes, à partir des heures pointées.
 *
 * `lignes` : [{ heures, taux_horaire_centimes, majoration }] — la majoration
 * est un multiplicateur (1 = normal, 1.5 = heure sup à +50 %). L'ERP ne décide
 * pas des majorations : elles viennent de la convention applicable, saisies
 * par l'entreprise.
 */
export function brutPeriode(lignes) {
  return (lignes || []).reduce((total, l) => {
    const h = heuresValides(l?.heures);
    const taux = c(l?.taux_horaire_centimes);
    const maj = Number(l?.majoration);
    const m = Number.isFinite(maj) && maj > 0 ? maj : 1;
    return total + Math.round(h * taux * m);
  }, 0);
}

/**
 * Décompte brut → net d'un membre.
 *
 * `precomptePct` : taux de précompte professionnel. S'il n'est pas fourni, le
 * net n'est PAS calculé — on renvoie `net_centimes: null` et
 * `precompte_connu: false`. Inventer un précompte produirait un chiffre faux
 * sur un document que quelqu'un pourrait croire.
 */
export function decompte({
  brut_centimes,
  statut = "ouvrier",
  precomptePct = null,
  retenues_centimes = 0,
  avantages_centimes = 0,
}) {
  const brut = Math.max(0, c(brut_centimes));
  const assiette = ASSIETTE[statut] ?? ASSIETTE.ouvrier;

  const onss = Math.round(brut * assiette * ONSS_TRAVAILLEUR);
  const imposable = brut - onss;

  const pct = nombreExplicite(precomptePct);
  const precompteConnu = Number.isFinite(pct) && pct >= 0 && pct <= 100;
  const precompte = precompteConnu ? Math.round(imposable * (pct / 100)) : null;

  const retenues = Math.max(0, c(retenues_centimes));
  const avantages = Math.max(0, c(avantages_centimes));
  const net = precompteConnu
    ? imposable - precompte - retenues + avantages
    : null;

  return {
    brut_centimes: brut,
    statut,
    assiette,
    onss_centimes: onss,
    imposable_centimes: imposable,
    precompte_centimes: precompte,
    precompte_connu: precompteConnu,
    retenues_centimes: retenues,
    avantages_centimes: avantages,
    net_centimes: net,
    // Sans précompte renseigné, le net affiché serait une invention.
    // L'interface doit afficher « à déterminer », pas un montant.
    estimation: true,
  };
}

/**
 * Décompte d'une équipe : une ligne par membre, plus les totaux.
 * `membres` : [{ id, nom, metier, actif, taux_horaire_centimes,
 *                precomptePct, lignes }]
 *
 * Les membres archivés (actif === false) sont EXCLUS : un onglet de paie
 * disparaît avec le membre. Leurs heures passées restent dans l'historique,
 * mais ils ne figurent plus dans une période de paie en cours.
 */
export function decompteEquipe(membres, options = {}) {
  const inclureArchives = options.inclureArchives === true;

  const lignes = (membres || [])
    .filter((m) => inclureArchives || m?.actif !== false)
    .map((m) => {
      const statut = m?.statut || STATUT_PAR_METIER[m?.metier] || "ouvrier";
      const brut = brutPeriode(m?.lignes);
      const d = decompte({
        brut_centimes: brut,
        statut,
        precomptePct: m?.precomptePct ?? null,
        retenues_centimes: m?.retenues_centimes,
        avantages_centimes: m?.avantages_centimes,
      });
      return {
        utilisateur_id: m?.id,
        nom: m?.nom || "—",
        metier: m?.metier || null,
        heures: (m?.lignes || []).reduce((t, l) => t + heuresValides(l?.heures), 0),
        ...d,
      };
    });

  const somme = (cle) => lignes.reduce((t, l) => t + (l[cle] || 0), 0);
  const tousConnus = lignes.length > 0 && lignes.every((l) => l.precompte_connu);

  return {
    lignes,
    totaux: {
      membres: lignes.length,
      heures: lignes.reduce((t, l) => t + l.heures, 0),
      brut_centimes: somme("brut_centimes"),
      onss_centimes: somme("onss_centimes"),
      imposable_centimes: somme("imposable_centimes"),
      precompte_centimes: tousConnus ? somme("precompte_centimes") : null,
      net_centimes: tousConnus ? somme("net_centimes") : null,
      // Un total net partiel serait trompeur : il manquerait des membres.
      net_complet: tousConnus,
    },
  };
}

/** Libellé de période, ex. « 2026-07 ». */
export function periodeCourante(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Bornes d'un mois, pour filtrer les heures pointées. */
export function bornesPeriode(periode) {
  const [a, m] = String(periode || "").split("-").map(Number);
  if (!a || !m || m < 1 || m > 12) return null;
  const debut = new Date(Date.UTC(a, m - 1, 1));
  const fin = new Date(Date.UTC(a, m, 0));
  const iso = (d) => d.toISOString().slice(0, 10);
  return { debut: iso(debut), fin: iso(fin) };
}

// =============================================================================
// COÛT EMPLOYEUR — ce que l'heure coûte VRAIMENT à l'entreprise.
//
// C'est ce chiffre, pas le salaire brut, qui doit alimenter le barème client.
// Facturer 45 €/h en croyant payer 18 €/h alors que l'heure coûte 25 € fausse
// toute la marge.
//
// Le taux d'ONSS patronale n'est PAS codé en dur : il dépend des réductions
// structurelles, de la taille de l'entreprise et du profil du travailleur.
// Votre secrétariat social vous donne le vôtre. Sans lui, le coût n'est pas
// calculé — il est signalé comme incomplet, jamais deviné.
// =============================================================================

/**
 * Coût employeur d'une période pour un membre.
 *
 * `onssPatronalePct` : taux réel communiqué par le secrétariat social.
 *                      null → le coût total n'est pas calculé.
 * `joursPrestes`     : nombre de jours ouvrant droit au chèque-repas.
 * `anciennete_mois`  : sous 6 mois, pas de chèque-repas dans la SCP 140.05 —
 *                      une indemnité de repas est versée à la place.
 */
export function coutEmployeur({
  brut_centimes,
  statut = "ouvrier",
  onssPatronalePct = null,
  joursPrestes = 0,
  anciennete_mois = null,
  secteur = SECTEUR_140_05,
  pensionComplementairePct = null,
  autresCharges_centimes = 0,
}) {
  const brut = Math.max(0, c(brut_centimes));
  const assiette = ASSIETTE[statut] ?? ASSIETTE.ouvrier;
  const base = Math.round(brut * assiette);

  const pctOnss = nombreExplicite(onssPatronalePct);
  const onssConnu = Number.isFinite(pctOnss) && pctOnss >= 0 && pctOnss <= 100;
  const onssPatronale = onssConnu ? Math.round(base * (pctOnss / 100)) : null;

  const pctPensionSaisi = nombreExplicite(pensionComplementairePct);
  const pctPension = Number.isFinite(pctPensionSaisi)
    ? pctPensionSaisi
    : (secteur?.pension_complementaire_pct ?? 0);
  const pension = Math.round(base * (pctPension / 100));

  // Chèques-repas : uniquement après le délai d'attente sectoriel.
  const cr = secteur?.cheque_repas;
  const anciennete = nombreExplicite(anciennete_mois);
  const delaiPasse = !cr || !Number.isFinite(anciennete)
    || anciennete >= (cr.delai_attente_mois ?? 0);
  const jours = Math.max(0, Math.round(Number(joursPrestes) || 0));
  const chequesRepas = (cr && delaiPasse)
    ? jours * cr.part_employeur_centimes : 0;

  const autres = Math.max(0, c(autresCharges_centimes));
  const total = onssConnu
    ? brut + onssPatronale + pension + chequesRepas + autres
    : null;

  return {
    brut_centimes: brut,
    assiette,
    base_centimes: base,
    onss_patronale_centimes: onssPatronale,
    onss_connu: onssConnu,
    pension_complementaire_centimes: pension,
    pension_pct: pctPension,
    cheques_repas_centimes: chequesRepas,
    cheques_repas_dus: !!(cr && delaiPasse),
    jours_prestes: jours,
    autres_charges_centimes: autres,
    total_centimes: total,
    // Coefficient de charge : total / brut. C'est le multiplicateur à garder
    // en tête quand on fixe un prix horaire client.
    coefficient: total && brut > 0 ? Math.round((total / brut) * 100) / 100 : null,
  };
}

/** Coût horaire réel employeur, pour alimenter le barème client. */
export function coutHoraireReel(cout, heures) {
  const h = Number(heures);
  if (!cout?.total_centimes || !Number.isFinite(h) || h <= 0) return null;
  return Math.round(cout.total_centimes / h);
}

/** L'indexation sectorielle est-elle en retard ? Elle tombe chaque 1er janvier. */
export function indexationARevoir(secteur = SECTEUR_140_05, maintenant = new Date()) {
  const derniere = new Date(`${secteur?.indexation_derniere || "1970-01-01"}T00:00:00Z`);
  const anneeCourante = maintenant.getUTCFullYear();
  return derniere.getUTCFullYear() < anneeCourante;
}
