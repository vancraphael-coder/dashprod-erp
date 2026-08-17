// =============================================================================
// LE CARNET DE CONTACTS.
//
// Le carnet n'est pas une donnée nouvelle : c'est une LECTURE de `clients`,
// enrichie de ce que le client a commandé. Une table « carnet » à côté aurait
// créé deux fiches pour une même personne — deux numéros à tenir à jour, et
// un jour l'un des deux faux sans qu'on sache lequel.
//
// Ce module décide de l'ORGANISATION : quels groupes, dans quel ordre, et ce
// qui fait qu'un contact est « du type sous-traitance ».
// =============================================================================

import { nature as natureDe } from "../commercial/natures.js";

/**
 * Les quatre groupes demandés, dans l'ordre où le bureau les regarde : ce qui
 * arrive avant ce qui est fait. Les PISTES (brouillon, devis, envoyé) sont à
 * part : ce ne sont pas des missions, et les mêler gonflerait le carnet de
 * choses qui n'ont jamais eu lieu.
 */
export const GROUPES = Object.freeze([
  { cle: "en_cours", titre: "En cours" },
  { cle: "confirmees", titre: "Confirmées" },
  { cle: "planifiees", titre: "Planifiées" },
  { cle: "effectuees", titre: "Effectuées" },
  { cle: "pistes", titre: "Devis en attente" },
]);

/** Les états d'affaire, rangés dans leur groupe. Source unique. */
export const GROUPE_PAR_ETAT = Object.freeze({
  en_cours: "en_cours",
  confirme: "confirmees",
  planifie: "planifiees",
  effectue: "effectuees",
  facture: "effectuees",
  paye: "effectuees",
  clos: "effectuees",
  brouillon: "pistes",
  devis: "pistes",
  envoye: "pistes",
  reporte: "planifiees",   // reporté reste attendu, pas fait
});

export function groupeDe(etat) {
  return GROUPE_PAR_ETAT[etat] || "pistes";
}

/**
 * Les missions d'un contact rangées par groupe. On ne rend que les groupes
 * NON VIDES : afficher « Effectuées (0) » sur un nouveau client n'apprend
 * rien et allonge la fiche.
 */
export function parGroupe(missions) {
  const paquets = new Map();
  for (const m of missions || []) {
    const g = m.groupe || groupeDe(m.etat);
    if (!paquets.has(g)) paquets.set(g, []);
    paquets.get(g).push(m);
  }
  return GROUPES
    .filter((g) => paquets.has(g.cle))
    .map((g) => ({ ...g, missions: paquets.get(g.cle) }));
}

/** Le nombre de missions réelles — les pistes n'en sont pas. */
export function nbMissions(missions) {
  return (missions || []).filter((m) => (m.groupe || groupeDe(m.etat)) !== "pistes").length;
}

/**
 * Ce qu'un contact commande habituellement, en clair : « Sous-traitance,
 * Lift ». C'est ce qui distingue un client récurrent d'un particulier de
 * passage, et ce qui rend le pré-remplissage utile.
 */
export function typesHabituels(natures) {
  return (natures || [])
    .map((c) => natureDe(c)?.titre)
    .filter(Boolean);
}

/**
 * La nature à proposer par défaut pour une nouvelle mission : la plus
 * fréquente chez ce contact. Un vendeur de mobilier qui ne commande que de la
 * sous-traitance ne devrait pas repartir d'un déménagement à chaque fois.
 *
 * Rend `null` si rien ne se dégage — mieux vaut ne rien proposer qu'imposer
 * un mauvais parcours.
 */
export function natureHabituelle(missions) {
  const compte = new Map();
  for (const m of missions || []) {
    if (!m.nature) continue;
    compte.set(m.nature, (compte.get(m.nature) || 0) + 1);
  }
  if (compte.size === 0) return null;

  let meilleure = null; let max = 0; let exaequo = false;
  for (const [cle, n] of compte) {
    if (n > max) { meilleure = cle; max = n; exaequo = false; }
    else if (n === max) { exaequo = true; }
  }
  // En cas d'égalité, on ne devine pas : deux natures aussi fréquentes ne
  // désignent aucune habitude.
  return exaequo ? null : meilleure;
}

/**
 * De quoi pré-remplir une nouvelle mission depuis un contact. On ne rend que
 * ce qu'on SAIT : un champ inventé serait plus coûteux qu'un champ vide.
 */
export function preRemplissage(contact) {
  if (!contact) return null;
  return {
    clientId: contact.id,
    clientNom: contact.nom || "",
    tel: contact.tel || "",
    email: contact.email || "",
    societe: contact.societe || "",
    nature: natureHabituelle(contact.missions),
  };
}

/** Un contact sans coordonnées ne sert pas de raccourci : on le signale. */
export function coordonneesManquantes(contact) {
  const out = [];
  if (!contact?.tel) out.push("téléphone");
  if (!contact?.email) out.push("e-mail");
  return out;
}
