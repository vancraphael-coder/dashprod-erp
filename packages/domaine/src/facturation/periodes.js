// =============================================================================
// Périodes comptables et récapitulatif de TVA.
//
// Un comptable ne demande pas « les factures de mardi » : il demande un mois,
// un trimestre, un exercice. Et en Belgique, la déclaration TVA se fait au
// trimestre (ou au mois pour les gros volumes) — c'est donc la période qui
// structure l'écran de comptabilité, pas une liste sans fin.
//
// Aucune de ces fonctions ne touche à la base : elles bornent des dates et
// additionnent. Les montants restent en centimes jusqu'à l'affichage.
// =============================================================================

const deuxChiffres = (n) => String(n).padStart(2, "0");

/** Bornes d'un mois : { debut, fin } en AAAA-MM-JJ, fin INCLUSE. */
export function bornesMois(annee, mois) {
  const a = Number(annee), m = Number(mois);
  if (!Number.isFinite(a) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { debut: `${a}-${deuxChiffres(m)}-01`,
           fin: `${a}-${deuxChiffres(m)}-${deuxChiffres(dernier)}` };
}

/** Bornes d'un trimestre (1 à 4) — le rythme de la déclaration TVA belge. */
export function bornesTrimestre(annee, trimestre) {
  const t = Number(trimestre);
  if (!Number.isFinite(t) || t < 1 || t > 4) return null;
  const premier = bornesMois(annee, (t - 1) * 3 + 1);
  const dernier = bornesMois(annee, t * 3);
  if (!premier || !dernier) return null;
  return { debut: premier.debut, fin: dernier.fin };
}

/** Bornes d'un exercice civil. */
export function bornesAnnee(annee) {
  const a = Number(annee);
  if (!Number.isFinite(a)) return null;
  return { debut: `${a}-01-01`, fin: `${a}-12-31` };
}

/**
 * Bornes d'une période décrite par { type, annee, mois, trimestre }.
 * `type` : "mois" | "trimestre" | "annee".
 */
export function bornesPeriode({ type, annee, mois, trimestre } = {}) {
  if (type === "mois") return bornesMois(annee, mois);
  if (type === "trimestre") return bornesTrimestre(annee, trimestre);
  if (type === "annee") return bornesAnnee(annee);
  return null;
}

/** Libellé lisible : « T3 2026 », « août 2026 », « exercice 2026 ». */
export function libellePeriode({ type, annee, mois, trimestre } = {}) {
  if (type === "trimestre") return `T${trimestre} ${annee}`;
  if (type === "annee") return `exercice ${annee}`;
  if (type === "mois") {
    const noms = ["janvier", "février", "mars", "avril", "mai", "juin",
                  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    return `${noms[Number(mois) - 1] || "?"} ${annee}`;
  }
  return "";
}

/** La période courante, au trimestre — le défaut naturel de l'écran. */
export function trimestreCourant(d = new Date()) {
  return { type: "trimestre", annee: d.getFullYear(),
           trimestre: Math.floor(d.getMonth() / 3) + 1 };
}

/** Une date (AAAA-MM-JJ) tombe-t-elle dans la période ? Bornes incluses. */
export function dansPeriode(dateIso, bornes) {
  if (!bornes) return false;
  const d = String(dateIso || "").slice(0, 10);
  return d >= bornes.debut && d <= bornes.fin;
}

/**
 * Récapitulatif d'un lot de factures canoniques.
 *
 * Les AVOIRS se soustraient — c'est leur nature. Les compter positivement
 * gonflerait le chiffre d'affaires et la TVA due, ce qui se paie cher à la
 * déclaration. La ventilation reste PAR TAUX : un comptable ne déclare jamais
 * une TVA globale.
 */
export function recapitulatif(factures) {
  const parTaux = new Map();
  let htva = 0, tva = 0, tvac = 0, nbFactures = 0, nbAvoirs = 0;

  for (const f of factures || []) {
    const signe = f.type === "avoir" ? -1 : 1;
    signe < 0 ? nbAvoirs++ : nbFactures++;

    htva += signe * (f.total?.htva_centimes || 0);
    tva  += signe * (f.total?.tva_centimes || 0);
    tvac += signe * (f.total?.tvac_centimes || 0);

    for (const t of f.ventilation_tva || []) {
      const cle = Number(t.taux) || 0;
      const acc = parTaux.get(cle) || { taux: cle, base_centimes: 0, tva_centimes: 0 };
      acc.base_centimes += signe * (t.base_centimes || 0);
      acc.tva_centimes  += signe * (t.tva_centimes || 0);
      parTaux.set(cle, acc);
    }
  }

  return {
    nb: nbFactures + nbAvoirs,
    nb_factures: nbFactures,
    nb_avoirs: nbAvoirs,
    htva_centimes: htva,
    tva_centimes: tva,
    tvac_centimes: tvac,
    par_taux: [...parTaux.values()].sort((a, b) => b.taux - a.taux),
  };
}

/**
 * Contrôles avant de remettre un export au comptable.
 * On ne bloque rien — le comptable reste juge — mais on signale ce qui, par
 * expérience, lui fait renvoyer le fichier.
 */
export function controlerLot(factures) {
  const a = [];
  const liste = factures || [];
  if (liste.length === 0) {
    a.push({ bloquant: false, message: "Aucune facture émise sur cette période." });
    return a;
  }
  for (const f of liste) {
    if (!f.numero) {
      a.push({ bloquant: true,
        message: `Facture sans numéro (${f.acheteur?.nom || "client inconnu"}).` });
    }
    if (!f.date_emission) {
      a.push({ bloquant: true, message: `${f.numero || "?"} : date d'émission absente.` });
    }
    if (!f.acheteur?.nom) {
      a.push({ bloquant: false, message: `${f.numero || "?"} : client sans nom.` });
    }
    if ((f.ventilation_tva || []).length === 0) {
      a.push({ bloquant: true,
        message: `${f.numero || "?"} : aucune ventilation de TVA — le journal serait faux.` });
    }
  }
  return a;
}

/** Le lot peut-il partir chez le comptable ? */
export function lotPret(factures) {
  const anomalies = controlerLot(factures);
  return {
    pret: !anomalies.some((x) => x.bloquant),
    bloquantes: anomalies.filter((x) => x.bloquant),
    avertissements: anomalies.filter((x) => !x.bloquant),
  };
}
