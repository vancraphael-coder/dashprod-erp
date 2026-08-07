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
// États où le déménagement n'est pas encore accompli : il y a un chantier à
// mener. « effectue » n'y est PAS — le chantier est fait — mais le dossier n'en
// est pas fini pour autant : il reste à facturer, encaisser, et clôturer.
export const ETATS_ACTIFS = Object.freeze([
  "brouillon", "devis", "envoye", "confirme", "planifie", "en_cours", "reporte",
]);

// Un dossier « effectué » a fini son chantier mais garde une suite administrative
// (facture, encaissement, litiges, clôture). Il reste donc « à s'occuper » tant
// qu'il n'est pas réellement clos ou annulé. RÈGLE : un dossier ne peut être
// clos que payé ET sans litige ouvert (vérifiée en base par cmd_exigences_cloture,
// migration 0086) ; « payé » peut exister sans « effectué », et n'est pas un état
// du déménagement mais du cycle de facturation.
export const ETATS_SUITE_ADMIN = Object.freeze(["effectue"]);

/** États qui ferment vraiment le dossier : plus rien à s'occuper. */
export const ETATS_CLOS = Object.freeze(["clos", "annule"]);

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
  const e = affaire?.etat;
  // Actif (chantier à mener) OU en suite administrative (effectué mais pas
  // encore payé/clôturé). Un dossier ne quitte « à s'occuper » qu'une fois clos
  // ou annulé.
  return ETATS_ACTIFS.includes(e) || ETATS_SUITE_ADMIN.includes(e);
}

/**
 * Priorité d'un dossier « à clôturer » : plus le nombre est haut, plus ça
 * presse. Un litige ouvert domine tout (il bloque ET engage un risque) ; vient
 * ensuite l'impayé (l'argent dehors), puis l'absence de facture (rien n'a été
 * demandé). Un dossier prêt à clôturer (facturé, payé, sans litige) descend en
 * bas : il ne demande qu'un dernier geste.
 */
export function rangCloture(a) {
  if (!a) return 0;
  const litiges = Number(a.litiges_ouverts) || 0;
  const solde = Number(a.solde_centimes) || 0;
  const facture = a.a_facture === true;
  let r = 0;
  if (litiges > 0) r += 1000 + Math.min(litiges, 9);
  if (solde > 0) r += 100;
  if (!facture) r += 10;
  return r;
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

    // Un dossier effectué a fini son chantier : il ne se range pas par date de
    // déménagement (passée) mais dans un groupe « À clôturer », en tête, où
    // remontent d'abord les impayés et les litiges — ce qui empêche la clôture.
    if (ETATS_SUITE_ADMIN.includes(a.etat)) {
      const cle = "a_cloturer";
      if (!groupes.has(cle)) {
        groupes.set(cle, { cle, titre: "À clôturer", rang: -1, dossiers: [] });
      }
      groupes.get(cle).dossiers.push(a);
      continue;
    }

    const h = horizon(dateDe(a), maintenant);
    if (!groupes.has(h.cle)) {
      groupes.set(h.cle, { ...h, dossiers: [] });
    }
    groupes.get(h.cle).dossiers.push(a);
  }

  // Dans chaque groupe, la date la plus proche d'abord ; un dossier sans date
  // se range par nom, faute de mieux. EXCEPTION : le groupe « À clôturer » se
  // trie par ce qui bloque la clôture — litige, puis impayé, puis à facturer.
  for (const g of groupes.values()) {
    if (g.cle === "a_cloturer") {
      g.dossiers.sort((x, y) => rangCloture(y) - rangCloture(x));
      continue;
    }
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
