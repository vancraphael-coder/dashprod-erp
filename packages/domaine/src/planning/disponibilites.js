// =============================================================================
// LES DISPONIBILITÉS — ce qu'on publie, et ce qu'on en déduit.
//
// LE PRINCIPE : ON PUBLIE UNE DISPONIBILITÉ, JAMAIS UNE OCCUPATION.
//
// C'est la décision qui gouverne tout ce module. Un créneau est soit déclaré
// disponible, soit absent — et l'absence ne dit PAS pourquoi. Publier un
// agenda d'occupation reviendrait à dire à un donneur d'ordre quand on
// travaille pour un autre, et pour qui probablement. C'est une information
// commerciale, elle n'a pas à traverser la cloison.
//
// Conséquence pratique : un indépendant très occupé et un indépendant en
// vacances présentent la même chose — rien. Personne ne peut distinguer les
// deux, et c'est voulu.
//
// TROIS SOURCES, UNE SEULE SAISIE.
//
//   1. les RÈGLES — le rythme habituel : « du lundi au vendredi, journée ».
//      Saisi une fois, ça vaut pour toutes les semaines.
//   2. les EXCEPTIONS — une date précise, rendue indisponible (congé) ou
//      exceptionnellement disponible (un samedi).
//   3. les ENGAGEMENTS acceptés — ils occupent le créneau AUTOMATIQUEMENT.
//
// Le troisième point est ce qui évite la double saisie. Sans lui, il faudrait
// penser à retirer sa disponibilité après chaque acceptation — et on
// l'oublierait, donc on recevrait des propositions pour des jours déjà pris.
// Un agenda qu'il faut entretenir à la main finit toujours par mentir.
//
// LE MOTIF D'UNE EXCEPTION NE SE PUBLIE PAS. « Congé », « formation »,
// « chantier pour un autre » : ça reste chez soi. Seul le booléen traverse.
// =============================================================================

/** Lundi = 1, dimanche = 7. Convention ISO, pour ne pas avoir à y penser. */
export const JOURS = Object.freeze([
  { num: 1, cle: "lundi", court: "Lun" },
  { num: 2, cle: "mardi", court: "Mar" },
  { num: 3, cle: "mercredi", court: "Mer" },
  { num: 4, cle: "jeudi", court: "Jeu" },
  { num: 5, cle: "vendredi", court: "Ven" },
  { num: 6, cle: "samedi", court: "Sam" },
  { num: 7, cle: "dimanche", court: "Dim" },
]);

/** Délai de prévenance par défaut. Appartient au réglage, pas au code. */
export const PREVENANCE_HEURES_DEFAUT = 48;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Jour ISO d'une date `AAAA-MM-JJ`. Lundi = 1. */
export function jourSemaine(iso) {
  if (!ISO.test(String(iso || ""))) return null;
  const j = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return j === 0 ? 7 : j;
}

/** Les dates d'une plage, bornes incluses. Rend `[]` si la plage est absurde. */
export function datesDeLaPlage(du, au, maxJours = 120) {
  if (!ISO.test(String(du || "")) || !ISO.test(String(au || ""))) return [];
  const out = [];
  const d = new Date(`${du}T00:00:00Z`);
  const fin = new Date(`${au}T00:00:00Z`);
  if (fin < d) return [];
  while (d <= fin && out.length < maxJours) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/**
 * L'état d'une journée. Quatre valeurs, et chacune dit exactement ce qu'on
 * sait :
 *
 *   "libre"     — déclaré disponible, rien de pris
 *   "pris"      — un engagement accepté occupe la journée
 *   "ferme"     — exception d'indisponibilité posée
 *   "hors_regle" — aucune règle ne couvre ce jour de la semaine
 *
 * Vu de l'extérieur, seuls « libre » compte : les trois autres se présentent
 * identiquement — absents. La distinction sert à l'indépendant lui-même, sur
 * son propre écran.
 */
export function etatDuJour(iso, { regles = [], exceptions = [], engagements = [] } = {}) {
  const j = jourSemaine(iso);
  if (j === null) return "hors_regle";

  // Un engagement accepté l'emporte sur tout : la journée est prise, même si
  // une règle la déclare libre. C'est ce qui évite d'avoir à retirer sa
  // disponibilité à la main après chaque acceptation.
  const pris = engagements.some((e) =>
    (e.date || e.date_prestation) === iso
    && ["acceptee", "realisee", "facturee"].includes(e.etat));
  if (pris) return "pris";

  const exc = exceptions.find((x) => x.date === iso);
  if (exc && exc.disponible === false) return "ferme";
  if (exc && exc.disponible === true) return "libre";

  const couvert = regles.some((r) => Number(r.jour) === j);
  return couvert ? "libre" : "hors_regle";
}

/**
 * Le calendrier d'une plage, pour l'écran de l'indépendant : chaque jour avec
 * son état et, s'il est pris, par qui.
 */
export function calendrier(du, au, sources = {}) {
  const { engagements = [] } = sources;
  return datesDeLaPlage(du, au).map((iso) => {
    const etat = etatDuJour(iso, sources);
    const e = etat === "pris"
      ? engagements.find((x) => (x.date || x.date_prestation) === iso
          && ["acceptee", "realisee", "facturee"].includes(x.etat))
      : null;
    return {
      date: iso,
      jour: jourSemaine(iso),
      etat,
      pour: e ? (e.contrepartie || null) : null,
      // Le motif d'une exception reste ici, sur l'écran de son propriétaire.
      // Il ne figure dans aucune sortie publiable.
      motif: etat === "ferme"
        ? ((sources.exceptions || []).find((x) => x.date === iso)?.motif || null)
        : null,
    };
  });
}

/**
 * Ce qui est PUBLIABLE : uniquement les dates libres, sans rien d'autre.
 *
 * Pas d'état, pas de motif, pas de nom de client. Un donneur d'ordre voit des
 * dates possibles ; il ne peut pas reconstituer l'activité de l'indépendant à
 * partir des trous.
 */
export function datesPubliables(du, au, sources = {}) {
  return calendrier(du, au, sources)
    .filter((j) => j.etat === "libre")
    .map((j) => j.date);
}

/**
 * Une date est-elle proposable, compte tenu du délai de prévenance ?
 *
 * Le délai protège l'indépendant : recevoir à 22 h une proposition pour le
 * lendemain 7 h n'est pas une opportunité, c'est une pression. Il se règle
 * (`disponibilites`) parce que 48 h pour un manutentionnaire et 48 h pour un
 * liftier ne sont pas la même contrainte.
 *
 * Le délai se compte jusqu'au DÉBUT DE LA JOURNÉE, pas jusqu'à l'heure du
 * chantier. C'est cohérent avec la granularité de la disponibilité, qui est
 * la journée : on ne déclare pas « libre de 14 h à 18 h ». Compter jusqu'à
 * l'heure de début supposerait une précision que la déclaration n'a pas.
 */
export function proposable(iso, {
  maintenant = new Date(), prevenanceHeures = PREVENANCE_HEURES_DEFAUT,
  ...sources
} = {}) {
  if (!ISO.test(String(iso || ""))) {
    return { ok: false, motif: "date invalide" };
  }
  const etat = etatDuJour(iso, sources);
  if (etat !== "libre") {
    return {
      ok: false,
      // Le motif rendu à l'extérieur reste volontairement pauvre : « pas
      // disponible » ne dit ni pourquoi, ni pour qui.
      motif: "le prestataire n'est pas disponible ce jour-là",
    };
  }
  const heures = (new Date(`${iso}T00:00:00`) - new Date(maintenant)) / 3600000;
  const seuil = Number(prevenanceHeures);
  const p = Number.isFinite(seuil) && seuil >= 0 ? seuil : PREVENANCE_HEURES_DEFAUT;
  if (heures < p) {
    return {
      ok: false,
      motif: `ce prestataire demande ${Math.round(p)} h de prévenance`,
    };
  }
  return { ok: true, motif: null };
}

/** Résumé lisible d'un rythme : « Lun, Mar, Mer, Jeu, Ven ». */
export function resumeRegles(regles = []) {
  const nums = new Set(regles.map((r) => Number(r.jour)));
  const jours = JOURS.filter((j) => nums.has(j.num));
  if (jours.length === 0) return "Aucun jour déclaré";
  if (jours.length === 7) return "Tous les jours";
  return jours.map((j) => j.court).join(", ");
}
