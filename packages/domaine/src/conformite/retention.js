// =============================================================================
// Conformité — Échéances légales
// Source : RGPD (art. 12.3 : délai de réponse d'un mois aux demandes des
// personnes concernées ; art. 33 : notification d'une violation à l'autorité
// sous 72h). Logique PURE, réutilise le principe de qualifierEcheance (commun)
// mais exprimée en jours/heures écoulés depuis un fait déclencheur — pas une
// date future fixe.
// =============================================================================

const JOUR_MS = 86400000;
const HEURE_MS = 3600000;

/**
 * Échéance d'une demande RGPD : un mois (30 jours) à compter de la réception.
 * @param {string} recueLe  date ISO de réception de la demande
 * @param {string|Date} [reference]  aujourd'hui par défaut
 * @param {number} [joursLegal=30]
 * @returns {{joursRestants: number, depassee: boolean, echeance: string}}
 */
export function echeanceDemandeRGPD(recueLe, reference = new Date(), joursLegal = 30) {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const debut = new Date(recueLe);
  const echeance = new Date(debut.getTime() + joursLegal * JOUR_MS);
  const joursRestants = Math.ceil((echeance.getTime() - ref.getTime()) / JOUR_MS);
  return { joursRestants, depassee: joursRestants < 0, echeance: echeance.toISOString().slice(0, 10) };
}

/**
 * Échéance de notification d'un incident de sécurité à l'autorité (72h RGPD
 * art. 33) à compter de sa découverte.
 * @param {string} decouverteLe  horodatage ISO de découverte
 * @param {string|Date} [reference]
 * @param {number} [heuresLegal=72]
 * @returns {{heuresRestantes: number, depassee: boolean, echeance: string}}
 */
export function echeanceNotificationIncident(decouverteLe, reference = new Date(), heuresLegal = 72) {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const debut = new Date(decouverteLe);
  const echeance = new Date(debut.getTime() + heuresLegal * HEURE_MS);
  const heuresRestantes = Math.ceil((echeance.getTime() - ref.getTime()) / HEURE_MS);
  return { heuresRestantes, depassee: heuresRestantes < 0, echeance: echeance.toISOString() };
}

/**
 * Indique si des données sont éligibles à la minimisation (anonymisation) :
 * un prospect/client sans affaire engagée, inactif depuis plus de dureeAns.
 * Ne s'applique JAMAIS aux données sous obligation de conservation légale
 * (factures : 7 ans en droit comptable belge) — cette fonction ne les couvre
 * pas, elle qualifie uniquement la donnée commerciale « froide ».
 * @param {string} derniereActiviteLe  date ISO du dernier événement lié
 * @param {string|Date} [reference]
 * @param {number} [dureeAns=3]  durée d'inactivité avant minimisation (v1 : 3 ans)
 * @returns {boolean}
 */
export function eligibleMinimisation(derniereActiviteLe, reference = new Date(), dureeAns = 3) {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const derniere = new Date(derniereActiviteLe);
  const seuil = new Date(derniere);
  seuil.setFullYear(seuil.getFullYear() + dureeAns);
  return ref.getTime() >= seuil.getTime();
}
