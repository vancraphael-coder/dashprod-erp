// =============================================================================
// « À s'occuper » — les dossiers rangés par horizon.
//
// Une liste de dossiers triée par date ne dit pas ce qui PRESSE. Un déménageur
// ouvre son écran le matin avec une seule question : qu'est-ce que je dois
// traiter aujourd'hui, et qu'est-ce qui vient ensuite ?
//
// D'où un regroupement par horizon plutôt qu'un tri :
//
//   En retard   → la date est passée et le dossier n'est pas terminé.
//                 En TÊTE, toujours : c'est ce qui coûte de l'argent.
//   Aujourd'hui
//   Demain
//   Cette semaine  → le reste de la semaine en cours
//   Semaine du 10 au 16 août   → une entrée par semaine suivante
//   Septembre                  → au-delà d'un mois, on regroupe au mois
//   Sans date                  → en DERNIER, mais jamais masqué : un dossier
//                                sans date est un dossier oublié.
//
// Le passé lointain n'apparaît pas dans « à s'occuper » : un dossier effectué
// il y a trois mois n'a rien à y faire. Il reste accessible par les filtres
// d'état.
// =============================================================================

/** États pour lesquels un dossier appelle encore une action. */
export const ETATS_ACTIFS = Object.freeze([
  "brouillon", "devis", "envoye", "confirme", "planifie", "en_cours", "reporte",
]);

/** États qui ferment le dossier : plus rien à s'occuper. */
export const ETATS_CLOS = Object.freeze(["effectue", "clos", "annule"]);

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];

const jour = (d) => d.toISOString().slice(0, 10);

/** Minuit du jour d'une date, en local. */
function debutJour(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lundi de la semaine d'une date — la semaine belge commence lundi. */
export function lundiDe(date) {
  const d = debutJour(date);
  const decalage = (d.getDay() + 6) % 7;   // dimanche = 6, lundi = 0
  d.setDate(d.getDate() - decalage);
  return d;
}

/** « du 10 au 16 août » — et « du 28 juillet au 3 août » à cheval sur deux mois. */
export function libelleSemaine(lundi) {
  const fin = new Date(lundi);
  fin.setDate(fin.getDate() + 6);
  const memeMois = lundi.getMonth() === fin.getMonth();
  return memeMois
    ? `du ${lundi.getDate()} au ${fin.getDate()} ${MOIS[fin.getMonth()]}`
    : `du ${lundi.getDate()} ${MOIS[lundi.getMonth()]} au ${fin.getDate()} ${MOIS[fin.getMonth()]}`;
}

/**
 * L'horizon d'une date, vu depuis `maintenant`.
 * Renvoie { cle, titre, rang } — `rang` sert au tri des groupes entre eux.
 */
export function horizon(dateIso, maintenant = new Date()) {
  if (!dateIso) return { cle: "sans_date", titre: "Sans date", rang: 9000 };

  const d = debutJour(new Date(String(dateIso).slice(0, 10) + "T12:00:00"));
  if (Number.isNaN(d.getTime())) {
    return { cle: "sans_date", titre: "Sans date", rang: 9000 };
  }
  const auj = debutJour(maintenant);
  const ecart = Math.round((d - auj) / 86400000);

  if (ecart < 0) return { cle: "retard", titre: "En retard", rang: 0 };
  if (ecart === 0) return { cle: "aujourdhui", titre: "Aujourd'hui", rang: 1 };
  if (ecart === 1) return { cle: "demain", titre: "Demain", rang: 2 };

  const lundiCourant = lundiDe(auj);
  const lundiDate = lundiDe(d);
  const semaines = Math.round((lundiDate - lundiCourant) / (7 * 86400000));

  // Le reste de la semaine en cours.
  if (semaines === 0) return { cle: "cette_semaine", titre: "Cette semaine", rang: 3 };

  // Les quatre semaines suivantes, nommées : c'est l'horizon où l'on planifie.
  if (semaines <= 4) {
    return {
      cle: `semaine_${jour(lundiDate)}`,
      titre: `Semaine ${libelleSemaine(lundiDate)}`,
      rang: 3 + semaines,
    };
  }

  // Au-delà, le mois suffit — personne ne pilote à la semaine à trois mois.
  // Le rang est RELATIF au mois courant : une valeur absolue (année × 12)
  // dépasserait celle de « sans date » et le ferait remonter avant les
  // échéances lointaines.
  const moisEcart = (d.getFullYear() - auj.getFullYear()) * 12
                  + (d.getMonth() - auj.getMonth());
  return {
    cle: `mois_${d.getFullYear()}_${d.getMonth() + 1}`,
    titre: `${MOIS[d.getMonth()]} ${d.getFullYear()}`,
    rang: 100 + moisEcart,
  };
}

/**
 * Un dossier appelle-t-il encore une action ?
 * Un dossier clos ou annulé ne figure pas dans « à s'occuper », même si sa
 * date est proche.
 */
export function aSOccuper(affaire) {
  return ETATS_ACTIFS.includes(affaire?.etat);
}

/**
 * Regroupe les dossiers par horizon.
 *
 * `dateDe` permet de choisir la date qui compte : par défaut la date souhaitée
 * du déménagement, mais une visite technique à venir peut primer.
 */
export function regrouperParHorizon(affaires, {
  maintenant = new Date(),
  dateDe = (a) => a.date_souhaitee,
  seulementActifs = true,
} = {}) {
  const groupes = new Map();

  for (const a of affaires || []) {
    if (seulementActifs && !aSOccuper(a)) continue;
    const h = horizon(dateDe(a), maintenant);
    if (!groupes.has(h.cle)) {
      groupes.set(h.cle, { ...h, dossiers: [] });
    }
    groupes.get(h.cle).dossiers.push(a);
  }

  // Dans chaque groupe, la date la plus proche d'abord ; un dossier sans date
  // se range par nom, faute de mieux.
  for (const g of groupes.values()) {
    g.dossiers.sort((x, y) => {
      const dx = dateDe(x), dy = dateDe(y);
      if (dx && dy) return String(dx).localeCompare(String(dy));
      if (dx) return -1;
      if (dy) return 1;
      return String(x.client?.nom || "").localeCompare(String(y.client?.nom || ""));
    });
  }

  return [...groupes.values()].sort((a, b) => a.rang - b.rang);
}

/**
 * Ce qui presse : le retard et le jour même. C'est le compteur qu'on affiche
 * en tête d'écran, pas le total des dossiers — un total ne dit rien.
 */
export function compteurUrgent(affaires, maintenant = new Date()) {
  let retard = 0, aujourdhui = 0;
  for (const a of affaires || []) {
    if (!aSOccuper(a)) continue;
    const h = horizon(a.date_souhaitee, maintenant);
    if (h.cle === "retard") retard++;
    else if (h.cle === "aujourdhui") aujourdhui++;
  }
  return { retard, aujourdhui, total: retard + aujourdhui };
}
