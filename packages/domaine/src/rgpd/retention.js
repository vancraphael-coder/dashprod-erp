// =============================================================================
// RGPD — politique de rétention (limitation de conservation, art. 5.1.e).
//
// Un ERP de déménagement traite des données sensibles de particuliers :
// inventaire précis de leur mobilier, adresses de départ et d'arrivée, valeur
// déclarée des biens. Le RGPD impose de ne les garder que le temps nécessaire
// à leur finalité.
//
// DEUX HORLOGES, à ne jamais confondre :
//
//   1. Données OPÉRATIONNELLES (inventaire, adresses de chantier)
//      Finalité : exécuter le déménagement. Une fois le dossier clos et une
//      fenêtre de litige écoulée, elles n'ont plus de raison d'être conservées.
//      → purge après RETENTION_OPERATIONNELLE_MOIS suivant l'archivage.
//
//   2. Données FISCALES (factures, identité de facturation)
//      Finalité : obligation légale de conservation comptable. En Belgique,
//      le délai est de 7 ans.
//      → conservées RETENTION_FISCALE_ANNEES, puis purgeables.
//
// Purger l'inventaire ne touche JAMAIS la facture : ce sont deux finalités,
// deux durées. Confondre les deux, c'est soit violer le RGPD (garder trop
// longtemps le mobilier), soit violer le fisc (purger une facture trop tôt).
//
// Ce module ne supprime rien : il DÉCIDE ce qui est purgeable. La suppression
// est faite en base, sous contrôle (voir 0057_retention_rgpd.sql).
// =============================================================================

/** Fenêtre de conservation des données opérationnelles après archivage. */
export const RETENTION_OPERATIONNELLE_MOIS = 12;

/** Délai légal belge de conservation comptable. */
export const RETENTION_FISCALE_ANNEES = 7;

const jours = (ms) => ms / 86_400_000;

/** Ajoute des mois à une date ISO, renvoie une Date. */
function plusMois(dateIso, mois) {
  const d = new Date(`${String(dateIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + mois);
  return d;
}

/**
 * Statut de rétention des données OPÉRATIONNELLES d'un dossier.
 *
 * Un dossier non archivé est toujours « actif » : on ne purge jamais un
 * déménagement en cours, même vieux. Le point de départ de l'horloge est la
 * date d'archivage, pas la date du déménagement — c'est l'archivage qui
 * matérialise la clôture.
 */
export function statutOperationnel(affaire, maintenant = new Date(),
                                    moisRetention = RETENTION_OPERATIONNELLE_MOIS) {
  const archiveLe = affaire?.archive_le;
  if (!archiveLe) {
    return { purgeable: false, motif: "dossier actif (non archivé)",
             echeance: null };
  }
  const echeance = plusMois(archiveLe, moisRetention);
  if (!echeance) {
    return { purgeable: false, motif: "date d'archivage illisible", echeance: null };
  }
  const purgeable = maintenant >= echeance;
  return {
    purgeable,
    motif: purgeable
      ? "délai opérationnel écoulé — inventaire et adresses purgeables"
      : "dans le délai de conservation opérationnelle",
    echeance: echeance.toISOString().slice(0, 10),
    jours_restants: purgeable ? 0 : Math.ceil(jours(echeance - maintenant)),
  };
}

/**
 * Statut de rétention des données FISCALES (une facture).
 * Point de départ : la date d'émission. Une facture reste intouchable pendant
 * tout le délai légal, quel que soit l'état du dossier.
 */
export function statutFiscal(facture, maintenant = new Date(),
                             anneesRetention = RETENTION_FISCALE_ANNEES) {
  const emission = facture?.date_emission;
  if (!emission) {
    return { purgeable: false, motif: "facture sans date d'émission", echeance: null };
  }
  const d = new Date(`${String(emission).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return { purgeable: false, motif: "date d'émission illisible", echeance: null };
  }
  d.setUTCFullYear(d.getUTCFullYear() + anneesRetention);
  const purgeable = maintenant >= d;
  return {
    purgeable,
    motif: purgeable
      ? "délai légal de conservation écoulé"
      : `à conserver jusqu'en ${d.getUTCFullYear()} (obligation comptable)`,
    echeance: d.toISOString().slice(0, 10),
  };
}

/**
 * Ce qui doit disparaître lors d'une purge opérationnelle, nommé explicitement.
 * Une liste FERMÉE : on ne purge que ça, jamais « tout le dossier ». La facture
 * et l'identité de facturation n'y figurent pas — elles relèvent de l'horloge
 * fiscale.
 */
export const CHAMPS_PURGE_OPERATIONNELLE = Object.freeze([
  "affaires.releve",              // inventaire du mobilier
  "affaire_adresses.adresse",     // rue de départ / arrivée
  "affaire_adresses.etage",
  "affaire_adresses.code_postal",
  "affaire_adresses.remarque",
]);

/**
 * Le journal d'audit (table evenements) ne se purge PAS avec le reste : c'est
 * la preuve que la purge a eu lieu, et il ne contient pas de données sensibles
 * détaillées. Le supprimer effacerait la traçabilité de notre propre
 * conformité.
 */
export const CONSERVER_TOUJOURS = Object.freeze([
  "evenements",                   // journal d'audit en insertion seule
]);

/**
 * Résume, pour un lot de dossiers, ce qui est purgeable maintenant.
 * Sert au tableau de bord de conformité et au contrôle avant purge réelle.
 */
export function planPurge(affaires, maintenant = new Date(),
                          moisRetention = RETENTION_OPERATIONNELLE_MOIS) {
  const lignes = (affaires || []).map((a) => ({
    affaire_id: a.id,
    ...statutOperationnel(a, maintenant, moisRetention),
  }));
  return {
    total: lignes.length,
    purgeables: lignes.filter((l) => l.purgeable).length,
    lignes,
  };
}
