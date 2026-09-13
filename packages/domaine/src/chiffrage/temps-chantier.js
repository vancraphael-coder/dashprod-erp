// =============================================================================
// LE TEMPS D'UN CHANTIER — en étapes, pas en heure globale.
//
// CE QUI N'ALLAIT PAS. Le moteur de chiffrage recevait `heures` : un nombre
// unique, estimé de tête. Deux défauts qui coûtent de l'argent :
//
//   · on ne sait pas d'où vient le chiffre. Un devis contesté ne se défend
//     pas — « j'ai compté six heures » n'est pas un argument. Décomposé, il se
//     défend ligne par ligne : 50 minutes de route, deux heures de
//     chargement, une heure de déchargement.
//   · on oublie toujours la même chose. Estimer « une journée » pour un
//     chantier à 80 km, c'est oublier 1 h 47 de route aller-retour. L'oubli
//     n'est pas aléatoire : il porte systématiquement sur le trajet, parce
//     que c'est le seul temps où personne ne travaille.
//
// LE MODÈLE. Une suite d'ÉTAPES, dans l'ordre réel de la journée :
//
//     route 45 km → chargement 1 h 30 → route 12 km → déchargement 1 h
//
// Le temps de route se déduit des kilomètres ; les temps de manutention se
// saisissent en heures et minutes, parce que c'est ainsi qu'un déménageur les
// évalue — « deux heures à trois » et non « 0,67 heure-homme ».
//
// LA VITESSE EST UNE CONVENTION DE CALCUL, PAS UNE MESURE. 90 km/h est la
// valeur par défaut ; ce n'est ni une vitesse réelle ni une promesse. Elle
// appartient au barème (réglage `bareme`) parce qu'une entreprise qui fait du
// centre-ville et une qui fait de l'autoroute n'ont pas la même convention.
// Tant que l'entrée de barème n'existe pas, la valeur par défaut s'applique et
// le devis dit laquelle — un chiffre dont on ignore l'hypothèse est un chiffre
// qu'on ne peut pas discuter.
//
// CE QUE LE MODÈLE NE PRÉTEND PAS FAIRE. Il ne calcule pas un temps de trajet
// réel : ni trafic, ni pauses, ni chargement du camion au dépôt. Une
// majoration facultative permet de coller à la réalité d'une entreprise, mais
// elle est EXPLICITE. Un coefficient caché dans la formule serait un mensonge
// sur la nature du chiffre.
// =============================================================================

/** Convention de calcul par défaut. Appartient au barème, pas au code. */
export const VITESSE_ROUTE_KMH = 90;

/**
 * Pas de facturation, en minutes. On arrondit AU-DESSUS.
 *
 * Arrondir en dessous fait perdre de l'argent à chaque chantier, sans que ça
 * se voie jamais : personne ne remarque huit minutes. Arrondir au-dessus est
 * visible, donc discutable, donc honnête.
 */
export const PAS_FACTURATION_MINUTES = 15;

export const TYPES_ETAPE = Object.freeze(["route", "chargement", "dechargement", "attente"]);

const LIBELLES = Object.freeze({
  route: "Route",
  chargement: "Chargement",
  dechargement: "Déchargement",
  attente: "Attente",
});

const nombre = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Les minutes de route pour une distance, à la convention retenue.
 *
 * Arrondi à la minute, ÉTAPE PAR ÉTAPE et non sur le total. C'est ce qui
 * garantit que la somme des durées affichées égale le total affiché : un devis
 * doit se vérifier à la calculette. Arrondir le total donnerait parfois une
 * minute de plus que la somme des lignes, et cette minute-là est indéfendable.
 */
export function minutesDeRoute(km, vitesseKmh = VITESSE_ROUTE_KMH) {
  const v = nombre(vitesseKmh);
  if (v === 0) return 0;
  return Math.round((nombre(km) / v) * 60);
}

/**
 * Les minutes d'une étape, quel que soit son type.
 *
 * Une étape `route` porte des kilomètres, les autres des heures et des
 * minutes. Accepter les deux formes sur la même étape serait ambigu : une
 * étape dit une chose.
 */
export function minutesDeLEtape(etape, vitesseKmh = VITESSE_ROUTE_KMH) {
  if (!etape || !TYPES_ETAPE.includes(etape.type)) return 0;
  if (etape.type === "route") return minutesDeRoute(etape.km, vitesseKmh);
  return Math.round(nombre(etape.heures) * 60 + nombre(etape.minutes));
}

/** Minutes → { heures, minutes }, pour l'affichage. */
export function enHeuresMinutes(minutesTotal) {
  const m = Math.max(0, Math.round(nombre(minutesTotal)));
  return { heures: Math.floor(m / 60), minutes: m % 60 };
}

/** « 1 h 47 », « 45 min », « 3 h ». Lisible par un client, pas par un tableur. */
export function formaterDuree(minutesTotal) {
  const { heures, minutes } = enHeuresMinutes(minutesTotal);
  if (heures === 0) return `${minutes} min`;
  if (minutes === 0) return `${heures} h`;
  return `${heures} h ${String(minutes).padStart(2, "0")}`;
}

/**
 * Le détail d'un chantier : chaque étape, son temps, et les totaux par nature.
 *
 * Rend aussi `km_total` : c'est cette valeur qui alimente le poste kilométrique
 * du moteur, et il ne faut pas la recompter ailleurs.
 */
export function detailTemps(etapes, {
  vitesseKmh = VITESSE_ROUTE_KMH, majorationPct = 0,
} = {}) {
  const liste = Array.isArray(etapes) ? etapes : [];
  const lignes = liste
    .filter((e) => e && TYPES_ETAPE.includes(e.type))
    .map((e, i) => ({
      rang: i + 1,
      type: e.type,
      libelle: e.libelle || LIBELLES[e.type],
      km: e.type === "route" ? nombre(e.km) : 0,
      minutes: minutesDeLEtape(e, vitesseKmh),
    }));

  const parType = {};
  for (const t of TYPES_ETAPE) parType[t] = 0;
  let kmTotal = 0;
  for (const l of lignes) {
    parType[l.type] += l.minutes;
    kmTotal += l.km;
  }

  const brut = lignes.reduce((s, l) => s + l.minutes, 0);
  const maj = Math.round(brut * (nombre(majorationPct) / 100));

  return {
    lignes,
    par_type: parType,
    km_total: Math.round(kmTotal * 10) / 10,
    minutes_brutes: brut,
    minutes_majoration: maj,
    minutes_total: brut + maj,
    vitesse_kmh: nombre(vitesseKmh) || VITESSE_ROUTE_KMH,
    majoration_pct: nombre(majorationPct),
  };
}

/**
 * Les heures à facturer, arrondies au pas de facturation SUPÉRIEUR.
 *
 * C'est cette valeur qui entre dans `heures` du moteur de chiffrage. Le moteur
 * ne change pas : il reçoit toujours un nombre d'heures — mais ce nombre a
 * désormais une provenance qu'on peut montrer.
 */
export function heuresFacturables(etapes, options = {}) {
  const d = detailTemps(etapes, options);
  const pas = Math.max(1, nombre(options.pasMinutes) || PAS_FACTURATION_MINUTES);
  const arrondies = Math.ceil(d.minutes_total / pas) * pas;
  return Math.round((arrondies / 60) * 100) / 100;
}

/**
 * Les étapes d'un aller-retour simple, le cas le plus courant : on part du
 * dépôt, on charge, on livre, on rentre.
 *
 * Le retour au dépôt est compté : c'est du temps payé, et c'est précisément
 * celui qu'on oublie en estimant de tête.
 */
export function allerRetourSimple({
  kmDepotChargement = 0, kmChargementLivraison = 0, kmLivraisonDepot = null,
  chargementHeures = 0, chargementMinutes = 0,
  dechargementHeures = 0, dechargementMinutes = 0,
} = {}) {
  const retour = kmLivraisonDepot === null
    // Sans distance de retour connue, on présume le trajet inverse complet.
    // Présumer zéro serait pire : ça effacerait un temps réel.
    ? nombre(kmDepotChargement) + nombre(kmChargementLivraison)
    : nombre(kmLivraisonDepot);
  return [
    { type: "route", km: nombre(kmDepotChargement), libelle: "Dépôt → chargement" },
    { type: "chargement", heures: chargementHeures, minutes: chargementMinutes },
    { type: "route", km: nombre(kmChargementLivraison), libelle: "Chargement → livraison" },
    { type: "dechargement", heures: dechargementHeures, minutes: dechargementMinutes },
    { type: "route", km: retour, libelle: "Retour dépôt" },
  ];
}

/**
 * Ce qu'on écrit sur le devis, en clair. Un client doit pouvoir vérifier le
 * total avec une calculette.
 */
export function lignesLisibles(etapes, options = {}) {
  const d = detailTemps(etapes, options);
  const out = d.lignes.map((l) => ({
    libelle: l.type === "route" ? `${l.libelle} — ${l.km} km` : l.libelle,
    duree: formaterDuree(l.minutes),
  }));
  if (d.minutes_majoration > 0) {
    out.push({
      libelle: `Majoration ${d.majoration_pct} % (trafic, pauses)`,
      duree: formaterDuree(d.minutes_majoration),
    });
  }
  return out;
}
