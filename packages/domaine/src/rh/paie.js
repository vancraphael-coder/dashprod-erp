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

  // Attention : Number(null) et Number("") valent 0, ce qui ferait passer un
  // précompte ABSENT pour un précompte à 0 % — et produirait un net faux, plus
  // élevé que la réalité. On exige donc une valeur explicitement numérique.
  const brutPct = typeof precomptePct === "string" ? precomptePct.trim() : precomptePct;
  const pct = (brutPct === null || brutPct === undefined || brutPct === "")
    ? NaN : Number(brutPct);
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
