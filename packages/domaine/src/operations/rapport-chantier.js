// =============================================================================
// Rapport de chantier et boucle d'écart.
//
// Le Bureau prévoit ; le Terrain constate. Entre les deux, il y a toujours un
// écart : le piano dont personne n'avait parlé, les quinze cartons en plus,
// l'escalier impraticable. Aujourd'hui cet écart se règle par un appel
// téléphonique et se perd — puis on facture au forfait prévu, ou on discute.
//
// LA BOUCLE (EX-10) :
//
//   PLANIFIÉ  →  EXÉCUTÉ  →  RÉALITÉ OBSERVÉE  →  ÉCART  →  VALIDATION  →  AJUSTEMENT
//   (bureau)     (terrain)      (terrain)        (terrain)   (bureau)     (bureau)
//
// Le principe qui tient tout (verrou n° 11 du PRODUCT_TRUTH) : le Terrain
// **crée des constats**, pas des objets commerciaux. Il déclare « piano non
// prévu, 45 min de plus » ; il ne crée pas une ligne de facture. C'est le
// Bureau qui décide si l'écart devient un supplément, un geste commercial ou
// rien du tout.
//
// Conséquence directe sur ce module : un écart porte une ESTIMATION d'impact
// (temps, volume), jamais un montant. Le prix se calcule au bureau, avec le
// barème — jamais dans la poche d'un déménageur.
// =============================================================================

/**
 * Nature d'un constat. Chacune répond à une question différente du bureau,
 * et c'est pour ça qu'on ne les fond pas en « remarque libre ».
 */
export const NATURES = Object.freeze([
  { cle: "objet_non_prevu", titre: "Objet non prévu",
    aide: "Un meuble ou des cartons qui ne figuraient pas au relevé.",
    facturable: true },
  { cle: "acces_difficile", titre: "Accès plus difficile que prévu",
    aide: "Escalier impraticable, stationnement éloigné, ascenseur en panne.",
    facturable: true },
  { cle: "temps_supplementaire", titre: "Temps supplémentaire",
    aide: "Attente sur place, contretemps indépendant de l'équipe.",
    facturable: true },
  { cle: "dommage", titre: "Dommage constaté",
    aide: "Un bien abîmé — avant ou pendant. À signaler immédiatement.",
    facturable: false },
  { cle: "reserve", titre: "Réserve",
    aide: "Ce que l'équipe refuse d'assumer : meuble déjà fêlé, emballage client.",
    facturable: false },
  { cle: "incident", titre: "Incident",
    aide: "Panne, accident, tout ce qui a interrompu le chantier.",
    facturable: false },
]);

/** États d'un constat : c'est le Bureau qui les fait avancer. */
export const ETATS_CONSTAT = Object.freeze(["declare", "valide", "refuse", "ajuste"]);

export function nature(cle) {
  return NATURES.find((n) => n.cle === cle) || null;
}

/** Natures qui peuvent donner lieu à un ajustement de prix. */
export function naturesFacturables() {
  return NATURES.filter((n) => n.facturable);
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

/**
 * Normalise un constat. `minutes` et `volume_m3` sont des ESTIMATIONS du
 * terrain — pas des mesures, et surtout pas des montants.
 */
export function constat(brut) {
  const n = nature(brut?.nature);
  return {
    id: brut?.id ?? null,
    nature: n ? brut.nature : "incident",
    description: String(brut?.description ?? "").trim(),
    minutes: num(brut?.minutes),
    volume_m3: num(brut?.volume_m3),
    etat: ETATS_CONSTAT.includes(brut?.etat) ? brut.etat : "declare",
    declare_par: brut?.declare_par ?? null,
    declare_le: brut?.declare_le ?? null,
  };
}

/**
 * Un constat est-il exploitable par le bureau ?
 * On exige une description : « objet non prévu » sans dire lequel ne permet
 * ni de facturer, ni de discuter avec le client.
 */
export function constatValide(c) {
  const x = constat(c);
  if (x.description.length < 5) {
    return { ok: false, message: "Décrivez ce que vous avez constaté." };
  }
  if (nature(x.nature)?.facturable && x.minutes === 0 && x.volume_m3 === 0) {
    return { ok: false,
      message: "Estimez le temps ou le volume en plus — sinon le bureau ne peut rien en faire." };
  }
  return { ok: true, message: null };
}

/**
 * Ce que le bureau doit trancher. Un rapport dont tous les constats sont
 * traités ne réclame plus rien.
 */
export function aTraiter(constats) {
  return (constats || []).map(constat).filter((c) => c.etat === "declare");
}

/**
 * Impact CUMULÉ des écarts validés, en temps et en volume.
 * Volontairement sans montant : le prix se calcule au bureau, avec le barème
 * et les suppléments — jamais depuis le terrain.
 */
export function impactValide(constats) {
  const retenus = (constats || []).map(constat)
    .filter((c) => c.etat === "valide" || c.etat === "ajuste")
    .filter((c) => nature(c.nature)?.facturable);
  return {
    minutes: retenus.reduce((t, c) => t + c.minutes, 0),
    volume_m3: Math.round(retenus.reduce((t, c) => t + c.volume_m3, 0) * 100) / 100,
    nb: retenus.length,
  };
}

/** Heures supplémentaires déduites de l'impact, arrondies à la minute. */
export function heuresSupplementaires(constats) {
  return Math.round(impactValide(constats).minutes / 60 * 100) / 100;
}

/**
 * Synthèse d'un rapport, telle que le bureau la lit dans le dossier.
 * Les constats NON facturables (dommage, réserve, incident) comptent aussi :
 * ils n'ajustent pas le prix mais ils engagent la responsabilité.
 */
export function syntheseRapport(rapport) {
  const cs = (rapport?.constats || []).map(constat);
  const parNature = new Map();
  for (const c of cs) parNature.set(c.nature, (parNature.get(c.nature) || 0) + 1);

  const sensibles = cs.filter((c) => !nature(c.nature)?.facturable);
  return {
    nb_constats: cs.length,
    a_traiter: aTraiter(cs).length,
    impact: impactValide(cs),
    heures_sup: heuresSupplementaires(cs),
    // Un dommage ou une réserve doit remonter même si le prix ne bouge pas.
    sensibles: sensibles.length,
    detail: [...parNature.entries()].map(([cle, n]) => ({
      nature: cle, titre: nature(cle)?.titre || cle, nb: n,
    })),
  };
}

/** Le rapport appelle-t-il une action du bureau ? */
export function demandeAction(rapport) {
  const s = syntheseRapport(rapport);
  return s.a_traiter > 0;
}
