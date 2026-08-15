// =============================================================================
// STOCKAGE — zones, boxes et leur facturation.
//
// Deux modèles bien distincts, parce qu'ils ne se vendent pas pareil :
//
//   ZONE (au sol, ou au sol avec étages)
//     On loue une surface. Le tarif ET la période sont NÉGOCIÉS au contrat :
//     un client garde 40 m² six mois à un prix, un autre 12 m² au trimestre à
//     un autre prix. Rien n'est prédéfini — c'est du sur-mesure.
//
//   BOX (numéroté, de volume connu, à un niveau donné)
//     On loue une unité du catalogue. Le prix vient du BARÈME de l'entreprise,
//     par tranche de volume : le commercial ne négocie pas, il applique.
//
// Logique PURE : ni base, ni DOM. C'est ce qui la rend vérifiable.
// =============================================================================

/** Les périodes de facturation possibles, et leur durée en mois. */
export const PERIODES = Object.freeze([
  { cle: "mensuel", nom: "Mensuelle", mois: 1 },
  { cle: "trimestriel", nom: "Trimestrielle", mois: 3 },
  { cle: "semestriel", nom: "Semestrielle", mois: 6 },
  { cle: "annuel", nom: "Annuelle", mois: 12 },
]);

export function periode(cle) {
  return PERIODES.find((p) => p.cle === cle) || PERIODES[0];
}

/** Les deux natures de zone. */
export const TYPES_ZONE = Object.freeze([
  { cle: "sol", nom: "Zone au sol",
    resume: "Une surface de plancher, sans superposition." },
  { cle: "sol_etages", nom: "Zone au sol avec étages",
    resume: "Une surface, exploitée sur plusieurs niveaux de rayonnage." },
]);

/**
 * Volume exploitable d'une zone.
 * Au sol : surface × hauteur utile. Avec étages : chaque niveau compte, mais
 * la hauteur utile se répartit entre eux — on ne multiplie donc PAS
 * naïvement le volume par le nombre de niveaux.
 *
 * @param {{type, surface_m2, hauteur_m, niveaux}} zone
 * @returns {number} m³, arrondi au dixième
 */
export function volumeZone(zone) {
  const s = Number(zone?.surface_m2) || 0;
  const h = Number(zone?.hauteur_m) || 0;
  if (s <= 0 || h <= 0) return 0;
  return Math.round(s * h * 10) / 10;
}

/**
 * Surface exploitable : c'est là que les étages changent tout. Trois niveaux
 * de rayonnage sur 20 m² au sol offrent 60 m² de pose.
 */
export function surfaceExploitable(zone) {
  const s = Number(zone?.surface_m2) || 0;
  if (zone?.type !== "sol_etages") return s;
  const n = Math.max(1, Number(zone?.niveaux) || 1);
  return Math.round(s * n * 10) / 10;
}

/**
 * Montant d'une période pour un contrat de ZONE. Le tarif est négocié : on
 * l'applique tel quel, à la période choisie.
 *
 * @param {{tarif_centimes: number, periode: string}} contrat
 * @returns {number} centimes dus pour UNE période
 */
export function montantPeriodeZone(contrat) {
  const t = Number(contrat?.tarif_centimes);
  return Number.isFinite(t) && t > 0 ? Math.round(t) : 0;
}

/**
 * Le barème des boxes : des tranches de volume, chacune avec son prix mensuel.
 * On retient la PREMIÈRE tranche dont le volume maximal couvre le box — d'où
 * le tri : un barème mal ordonné facturerait au hasard.
 *
 * @param {{jusqua_m3: number, prix_mensuel_centimes: number}[]} bareme
 * @param {number} volumeM3
 * @returns {{jusqua_m3, prix_mensuel_centimes}|null}
 */
export function trancheBox(bareme, volumeM3) {
  const v = Number(volumeM3) || 0;
  const tranches = [...(bareme || [])]
    .filter((t) => Number(t?.jusqua_m3) > 0)
    .sort((a, b) => Number(a.jusqua_m3) - Number(b.jusqua_m3));
  return tranches.find((t) => v <= Number(t.jusqua_m3)) || null;
}

/**
 * Montant d'une période pour un BOX, depuis le barème de l'entreprise.
 * Si aucune tranche ne couvre le volume, on renvoie 0 ET on le signale : mieux
 * vaut une facture visiblement à zéro qu'un montant inventé.
 *
 * @returns {{centimes: number, tranche: object|null, hors_bareme: boolean}}
 */
export function montantPeriodeBox(bareme, volumeM3, clePeriode = "mensuel") {
  const t = trancheBox(bareme, volumeM3);
  if (!t) return { centimes: 0, tranche: null, hors_bareme: true };
  const mois = periode(clePeriode).mois;
  return {
    centimes: Math.round(Number(t.prix_mensuel_centimes) * mois),
    tranche: t, hors_bareme: false,
  };
}

/**
 * Prorata d'un premier mois entamé. Un client qui entre le 20 ne paie pas le
 * mois entier : on facture les jours restants.
 *
 * @param {number} centimesPeriode montant plein de la période
 * @param {number} joursCouverts   jours réellement occupés
 * @param {number} joursPeriode    jours que compte la période
 */
export function prorata(centimesPeriode, joursCouverts, joursPeriode) {
  const p = Number(joursPeriode) || 0;
  if (p <= 0) return 0;
  const j = Math.max(0, Math.min(Number(joursCouverts) || 0, p));
  return Math.round((Number(centimesPeriode) || 0) * (j / p));
}

/**
 * Les échéances d'un contrat sur une plage : à quelles dates facturer, et
 * combien. On s'arrête à la fin du contrat si elle est connue.
 *
 * @returns {{date: string, centimes: number}[]}
 */
export function echeances(contrat, jusqua) {
  const debut = new Date(`${contrat?.debut}T00:00:00`);
  if (Number.isNaN(debut.getTime())) return [];
  const fin = contrat?.fin ? new Date(`${contrat.fin}T00:00:00`) : null;
  const butoir = new Date(`${jusqua}T00:00:00`);
  if (Number.isNaN(butoir.getTime())) return [];

  const pas = periode(contrat?.periode).mois;
  const montant = Number(contrat?.montant_centimes) || 0;
  const sorties = [];
  const curseur = new Date(debut);

  // Garde-fou : une période nulle boucherait à l'infini.
  if (pas <= 0) return [];
  while (curseur <= butoir && (!fin || curseur <= fin) && sorties.length < 240) {
    sorties.push({
      date: curseur.toISOString().slice(0, 10),
      centimes: montant,
    });
    curseur.setMonth(curseur.getMonth() + pas);
  }
  return sorties;
}

/** Occupation d'un dépôt : ce qui est pris, ce qui reste. */
export function tauxOccupation(boxes) {
  const liste = boxes || [];
  const total = liste.length;
  if (total === 0) return { total: 0, occupes: 0, libres: 0, taux: 0 };
  const occupes = liste.filter((b) => b.occupe).length;
  return {
    total, occupes, libres: total - occupes,
    taux: Math.round((occupes / total) * 100),
  };
}

// =============================================================================
// LE MONTANT D'UNE ÉCHÉANCE RÉELLE.
//
// Assemble ce qui existe déjà — tranches de box, forfait de zone, prorata —
// pour répondre à la seule question qui compte au moment de facturer : que
// doit ce client, pour ce mois-là ?
//
// Deux modèles distincts, et c'est voulu :
//   · BOXE — le prix suit le VOLUME, box par box, par tranches de m³. Deux
//     boxes se cumulent : ce sont deux emplacements loués.
//   · ZONE — un forfait NÉGOCIÉ pour le contrat entier, quel que soit le
//     nombre de zones. Attacher une deuxième zone à un client n'en double
//     donc pas le prix : c'est le sens même d'un forfait.
// =============================================================================

/**
 * Ce qui est dû pour une échéance rendue par `cmd_stock_echeances`.
 *
 * @param {object} e échéance : nature, tarif_centimes, boxes[], zones[],
 *                   jours_couverts, jours_mois
 * @param {Array} bareme tranches de box de l'entreprise
 * @returns {{centimes, plein_centimes, proratise, lignes[], hors_bareme}}
 */
export function montantEcheance(e, bareme) {
  if (!e) return { centimes: 0, plein_centimes: 0, proratise: false,
                   lignes: [], hors_bareme: false };

  const lignes = [];
  let plein = 0;
  let horsBareme = false;

  if (e.nature === "box") {
    for (const b of e.boxes || []) {
      const m = montantPeriodeBox(bareme, b.volume_m3, e.periode || "mensuel");
      if (m.hors_bareme) horsBareme = true;
      plein += m.centimes;
      lignes.push({
        cle: `box:${b.id}`,
        libelle: `Box ${b.numero}${b.volume_m3 ? ` — ${b.volume_m3} m³` : ""}`,
        centimes: m.centimes,
        hors_bareme: m.hors_bareme,
      });
    }
  } else {
    // Le forfait porte sur le CONTRAT, pas sur chaque zone.
    plein = montantPeriodeZone(e);
    const noms = (e.zones || []).map((z) => z.nom).filter(Boolean);
    lignes.push({
      cle: "zone",
      libelle: noms.length
        ? `Zone${noms.length > 1 ? "s" : ""} ${noms.join(", ")} — forfait`
        : "Forfait de zone",
      centimes: plein,
    });
  }

  // Le prorata ne s'applique QUE si le contrat ne couvre pas tout le mois.
  // `jours_couverts` absent ne vaut pas zéro : sans information, on facture le
  // mois plein plutôt qu'un montant nul que personne ne remarquerait.
  const jours = Number(e.jours_couverts);
  const mois = Number(e.jours_mois);
  const partiel = Number.isFinite(jours) && Number.isFinite(mois)
                && mois > 0 && jours < mois;

  return {
    centimes: partiel ? prorata(plein, jours, mois) : plein,
    plein_centimes: plein,
    proratise: partiel,
    jours_couverts: partiel ? jours : null,
    jours_mois: partiel ? mois : null,
    lignes,
    hors_bareme: horsBareme,
  };
}

/** Une échéance déjà facturée ne se refacture pas. */
export function estFacturee(e) {
  return Boolean(e?.facturee_le);
}

/** Ce qui reste à facturer, dans l'ordre chronologique. */
export function echeancesDues(liste) {
  return (liste || []).filter((e) => !estFacturee(e));
}
