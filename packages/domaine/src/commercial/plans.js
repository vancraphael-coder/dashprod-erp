// =============================================================================
// Les offres commerciales — et ce qu'elles ouvrent réellement.
//
// PRINCIPE, hérité du PRODUCT_TRUTH : le prix est une CONTRAINTE TECHNIQUE
// D'ACCÈS, pas une page marketing.
//
//     PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES → LIMITES
//
// Un module fermé par le plan doit l'être EN BASE. Le masquer dans l'interface
// ne serait pas une offre commerciale, ce serait une décoration.
//
// RÈGLE DE CONSTRUCTION DES ÉCHELONS : un seul motif de montée par palier.
// Un client qui ne sait pas dire en une phrase pourquoi il passe au palier
// suivant ne montera pas. D'où :
//
//   Starter → Regular : « je veux faire signer en ligne et facturer proprement »
//   Regular → Pro     : « j'ai plusieurs équipes, ou je fais de l'international »
//
// Tout ce qui est listé ici EXISTE et fonctionne. Les modules encore à
// construire (multi-dépôts, stockage 3D) portent `livre: false` : ils ne se
// vendent pas tant qu'ils ne tournent pas.
// =============================================================================

/**
 * Les unités d'accès. Découpage par VALEUR PERÇUE, pas par écran : un client
 * n'achète pas « l'écran Comptabilite », il achète « ne plus ressaisir chez
 * mon comptable ».
 */
import { REFERENTIEL_OFFRES, offreReferentiel, paliersDemenageur,
         offresSectorielles, STATUTS_OFFRE } from "./referentiel-offres.js";

export { STATUTS_OFFRE };

export const MODULES = Object.freeze([
  // ── Le socle : ce sans quoi l'outil ne remplace pas le papier ────────────
  { cle: "crm", titre: "Clients et dossiers", socle: true, livre: true,
    valeur: "Vos clients, vos dossiers, votre historique — au lieu d'un classeur." },
  { cle: "releve", titre: "Relevé de mobilier", socle: true, livre: true,
    valeur: "Le relevé pièce par pièce, avec vos meubles pré-remplis." },
  { cle: "devis", titre: "Chiffrage et barème", socle: true, livre: true,
    valeur: "Votre barème, vos suppléments, votre marge visible avant d'envoyer." },
  { cle: "offre", titre: "Offre et conditions", socle: true, livre: true,
    valeur: "Une offre propre, avec vos conditions générales, prête à imprimer." },
  { cle: "planning", titre: "Planning d'équipe", socle: true, livre: true,
    valeur: "Missions, congés, fériés, fermetures — et les conflits signalés." },
  { cle: "terrain", titre: "Application terrain", socle: true, livre: true,
    valeur: "Vos équipes déclarent leurs heures depuis le chantier." },
  { cle: "flotte", titre: "Véhicules", socle: true, livre: true,
    valeur: "Contrôles techniques, assurances, signalements de panne." },
  { cle: "facturation", titre: "Facturation", socle: true, livre: true,
    valeur: "Facture numérotée, communication structurée, suivi des paiements." },

  // ── Ce qui fait passer de Starter à Regular ─────────────────────────────
  { cle: "signature_client", titre: "Signature en ligne", livre: true,
    valeur: "Le client lit et signe son offre à distance. Certificat opposable "
          + "à la clé — plus de relance pour un papier signé." },
  { cle: "espace_client", titre: "Espace client", livre: true,
    valeur: "Votre client suit son dossier, ses meubles et ses factures tout "
          + "seul. Autant d'appels en moins." },
  { cle: "peppol", titre: "Facturation électronique Peppol", livre: true,
    valeur: "Obligatoire en B2B belge depuis 2026. Sans elle, vous ne pouvez "
          + "plus facturer une entreprise." },
  { cle: "comptabilite", titre: "Exports comptables", livre: true,
    valeur: "Journal des ventes au PCMN belge, FEC, CSV. Votre comptable "
          + "importe au lieu de ressaisir." },
  { cle: "rapport_chantier", titre: "Rapports de chantier", livre: true,
    valeur: "Le piano non prévu remonte du terrain, chiffré, au lieu de se "
          + "perdre dans un coup de téléphone." },
  { cle: "paie", titre: "Préparation de paie", livre: true,
    valeur: "Brut calculé sur les heures réelles, coût employeur, coût horaire "
          + "qui doit guider votre barème." },
  { cle: "journal", titre: "Journal et décisions", livre: true,
    valeur: "Qui a changé quoi, quand, et pourquoi. Indispensable dès qu'on "
          + "est plusieurs à décider." },

  // ── Ce qui fait passer de Regular à Pro ─────────────────────────────────
  { cle: "international", titre: "Déménagement international", livre: true,
    valeur: "Inventaire numéroté colis par colis, liste de colisage douanière, "
          + "poids taxable maritime et aérien calculés juste." },
  { cle: "multi_depots", titre: "Centres logistiques", livre: true,
    valeur: "Plusieurs centres, chacun ses équipes, ses véhicules et son "
          + "planning. Un gestionnaire par dépôt, et la direction une vue "
          + "consolidée sur l'ensemble." },
  { cle: "gestionnaire_depot", titre: "Gestionnaire de dépôt", livre: true,
    valeur: "Un responsable par centre : il pilote son planning et ses équipes "
          + "sans voir ni toucher aux autres dépôts." },
  { cle: "stockage_3d", titre: "Stockage et garde-meubles", livre: true,
    valeur: "Plan du dépôt, zones, emplacements : où est le mobilier de qui." },
]);

export function module(cle) {
  return MODULES.find((m) => m.cle === cle) || null;
}

/** Modules du socle : présents dans TOUTES les offres. */
export function modulesSocle() {
  return MODULES.filter((m) => m.socle).map((m) => m.cle);
}

/**
 * LA COPIE COMMERCIALE des trois paliers — et rien d'autre.
 *
 * Les chiffres (prix, seuils, modules) ne sont PAS ici : ils viennent du
 * référentiel, qui est aussi la source du SQL de publication. Ce fichier
 * n'invente aucun nombre. C'est ce qui empêche les deux catalogues de
 * redivergier — la divergence précédente avait caché deux modules payés à tous
 * les clients Basique et refusé des ventes que la facturation savait encaisser.
 */
const COPIE_PALIERS = Object.freeze({
  starter: {
    promesse: "Sortir du papier",
    pour: "Le déménageur seul ou à deux, qui travaille encore sur Excel et "
        + "sur des devis Word.",
    // Ce qui donnera envie de monter — dit en une phrase, pas en liste.
    motif_montee: "Facturer des entreprises par voie électronique et sortir "
                + "votre comptabilité sans ressaisie.",
  },
  regular: {
    promesse: "Le circuit complet, du premier appel au paiement",
    pour: "L'entreprise établie, avec une équipe bureau et une ou deux équipes "
        + "terrain.",
    motif_montee: "Plusieurs centres logistiques, chacun son gestionnaire.",
    recommande: true,
  },
  pro: {
    promesse: "Plusieurs centres logistiques",
    pour: "L'entreprise qui exploite plusieurs dépôts, chacun avec ses équipes "
        + "et son gestionnaire.",
    motif_montee: null,   // dernier palier
  },
});

/**
 * Les trois paliers déménageur, dérivés du référentiel.
 *
 * `membres_inclus` = compris dans le prix de base.
 * `membres_limite` = plafond DUR ; `null` = aucun plafond, le membre
 * supplémentaire se facture. Les deux notions étaient confondues sous un seul
 * champ `utilisateurs`, ce qui faisait dire à Pro « illimité » alors qu'il
 * comprend 30 membres, et faisait refuser un 3ᵉ utilisateur en Basique alors
 * que la base l'accepte et le facture.
 */
export const PLANS = Object.freeze(paliersDemenageur().map((o) => Object.freeze({
  cle: o.code,
  nom: o.libelle,
  prix_centimes: o.prix_base_centimes,
  membres_inclus: o.membres_inclus,
  membres_limite: o.membres_limite,
  prix_membre_supp_centimes: o.prix_membre_supp_centimes,
  centres_inclus: o.centres_inclus,
  centres_limite: o.centres_limite,
  statut: o.statut,
  disponible: o.souscriptible,
  modules: Object.freeze([...o.modules]),
  ...COPIE_PALIERS[o.code],
})));

export function plan(cle) {
  return PLANS.find((p) => p.cle === cle) || null;
}

/**
 * Le plan de REPLI d'une organisation sans plan défini.
 *
 * `starter`, comme en base (`modules_du_plan` retombe sur starter). Il valait
 * `regular` ici : un plan inconnu ouvrait donc, à l'écran, six modules de plus
 * que ce que le RLS autorisait. Un repli ne doit jamais accorder plus que le
 * minimum.
 */
export const PLAN_DEFAUT = "starter";

/** Une offre peut être annoncée sans être souscriptible. */
export function planDisponible(clePlan) {
  return plan(clePlan)?.disponible !== false;
}

/** Les offres réellement souscriptibles, dans l'ordre. */
export function plansDisponibles() {
  return PLANS.filter((p) => p.disponible !== false);
}

/**
 * La meilleure offre SOUSCRIPTIBLE. L'essai porte dessus : promettre un essai
 * sur une offre verrouillée serait une impasse — le client ne pourrait pas la
 * souscrire à la fin.
 */
export function meilleurPlanDisponible() {
  const dispo = plansDisponibles();
  return dispo[dispo.length - 1]?.cle || PLAN_DEFAUT;
}

/** Ce plan ouvre-t-il ce module ? */
export function planOuvre(clePlan, cleModule) {
  const p = plan(clePlan) || plan(PLAN_DEFAUT);
  return (p?.modules || []).includes(cleModule);
}

/**
 * Modules réellement UTILISABLES d'un plan : on écarte ce qui n'est pas encore
 * livré. Vendre une case qui ne fait rien coûte plus cher que de ne pas la
 * vendre.
 */
export function modulesUtilisables(clePlan) {
  const p = plan(clePlan) || plan(PLAN_DEFAUT);
  return (p?.modules || []).filter((c) => module(c)?.livre);
}

/** Modules annoncés mais pas encore livrés — à présenter comme « à venir ». */
export function modulesAVenir(clePlan) {
  const p = plan(clePlan) || plan(PLAN_DEFAUT);
  return (p?.modules || []).filter((c) => module(c) && !module(c).livre);
}

/**
 * Ce qu'un plan apporte DE PLUS que le précédent. C'est ce qui se vend —
 * répéter le socle à chaque colonne dilue la différence.
 */
export function gainSurPrecedent(clePlan) {
  const i = PLANS.findIndex((p) => p.cle === clePlan);
  if (i <= 0) return [];
  const avant = new Set(PLANS[i - 1].modules);
  return PLANS[i].modules.filter((c) => !avant.has(c));
}

/**
 * La limite d'utilisateurs est-elle atteinte ?
 * `null` = illimité. On répond par une DÉCISION et un message, pas par un
 * booléen nu : c'est ce message que verra l'utilisateur.
 */
export function peutAjouterUtilisateur(clePlan, nbActuel) {
  const p = plan(clePlan) || plan(PLAN_DEFAUT);
  const n = Number(nbActuel) || 0;
  const inclus = p?.membres_inclus ?? 0;
  const plafond = p?.membres_limite ?? null;

  // Plafond DUR atteint : là, et là seulement, on refuse.
  if (plafond != null && n >= plafond) {
    return {
      ok: false,
      message: `Votre offre ${p.nom} est plafonnée à ${plafond} utilisateur`
             + `${plafond > 1 ? "s" : ""}. Passez à l'offre supérieure pour `
             + `agrandir votre équipe.`,
    };
  }

  // Dans le forfait : rien à dire.
  if (n < inclus) return { ok: true, message: null, restants: inclus - n };

  // Au-delà du forfait, sans plafond : c'est OUI, et c'est facturé. Refuser
  // ici reviendrait à décliner une vente que la facturation sait encaisser —
  // c'est exactement ce que faisait la version précédente.
  const supp = p?.prix_membre_supp_centimes ?? null;
  return {
    ok: true,
    restants: null,
    supplement_centimes: supp,
    message: supp == null ? null
      : `Votre offre ${p.nom} comprend ${inclus} utilisateur`
      + `${inclus > 1 ? "s" : ""}. Au-delà, chaque utilisateur est facturé `
      + `${Math.round(supp / 100)} € HTVA par mois.`,
  };
}

/** Prix mensuel formaté, HTVA. */
export function prixMensuel(clePlan) {
  const p = plan(clePlan);
  if (!p) return "";
  return `${Math.round(p.prix_centimes / 100)} € HTVA / mois`;
}

/**
 * Coût par utilisateur inclus — l'argument qui fait monter en gamme.
 * Il DOIT décroître d'un palier à l'autre, sinon l'échelle n'a aucun sens
 * commercial : un test le vérifie.
 */
export function coutParUtilisateur(clePlan) {
  const p = plan(clePlan);
  if (!p || !p.membres_inclus) return null;
  return Math.round(p.prix_centimes / p.membres_inclus / 100);
}

/**
 * Le plan minimal qui ouvre un module. Sert à dire « disponible à partir de
 * l'offre Regular » plutôt qu'un « accès refusé » sans issue.
 */
export function planMinimalPour(cleModule) {
  return PLANS.find((p) => p.modules.includes(cleModule))?.cle || null;
}

// =============================================================================
// PÉRIODICITÉ, ESSAI, ET CHANGEMENT D'OFFRE
// =============================================================================

/** Remise consentie pour un paiement annuel d'avance. */
export const REMISE_ANNUELLE_PCT = 5;

/** Durée de l'essai, et l'offre sur laquelle il porte. */
export const ESSAI_JOURS = 5;
/**
 * L'essai porte sur la meilleure offre SOUSCRIPTIBLE. Pro étant désormais
 * ouverte (13/08/2026), l'essai porte sur Pro — comme prévu par ce calcul, qui
 * suit l'ouverture de l'offre. (Épingler l'essai sur Regular = remplacer par
 * le plan `recommande` si l'on préfère ne pas faire essayer le haut de gamme.)
 */
export const ESSAI_PLAN = meilleurPlanDisponible();

/**
 * Prix d'une période. L'annuel se règle d'avance, remise déduite.
 * On arrondit à l'euro : facturer 4 104,00 € plutôt que 4 103,99 € évite des
 * questions inutiles.
 */
export function prixPeriode(clePlan, periodicite = "mensuel") {
  const p = plan(clePlan);
  if (!p) return null;
  if (periodicite !== "annuel") {
    return { periodicite: "mensuel", total_centimes: p.prix_centimes,
             economie_centimes: 0, remise_pct: 0 };
  }
  const plein = p.prix_centimes * 12;
  const total = Math.round(plein * (100 - REMISE_ANNUELLE_PCT) / 100 / 100) * 100;
  return {
    periodicite: "annuel",
    total_centimes: total,
    economie_centimes: plein - total,
    remise_pct: REMISE_ANNUELLE_PCT,
    equivalent_mensuel_centimes: Math.round(total / 12),
  };
}

/** Fin d'un essai démarré à une date donnée. */
export function finEssai(depuis = new Date(), jours = ESSAI_JOURS) {
  const d = new Date(depuis);
  d.setDate(d.getDate() + jours);
  return d;
}

/** L'essai est-il encore en cours ? */
export function essaiActif(finIso, maintenant = new Date()) {
  if (!finIso) return false;
  const f = new Date(finIso);
  return !Number.isNaN(f.getTime()) && f > maintenant;
}

/** Jours restants d'essai, jamais négatif. */
export function joursEssaiRestants(finIso, maintenant = new Date()) {
  if (!essaiActif(finIso, maintenant)) return 0;
  return Math.max(0, Math.ceil((new Date(finIso) - maintenant) / 86400000));
}

/**
 * Ce qu'un changement d'offre EXIGE avant d'être appliqué.
 *
 * Principe posé par Raphaël, et qui structure tout : **on n'efface jamais de
 * données**. Une entreprise qui redescend d'offre garde tout ; ce qui dépasse
 * la nouvelle limite est ARCHIVÉ, pas supprimé. C'est précisément ce qui lui
 * permettra de remonter plus tard sans avoir rien perdu.
 *
 * On ne choisit pas non plus à sa place : la fonction dit COMBIEN il faut
 * archiver, l'écran laisse l'utilisateur désigner lesquels.
 */
export function exigencesChangement({ planActuel, planCible, utilisateursActifs }) {
  const cible = plan(planCible);
  if (!cible) return { possible: false, message: "Offre inconnue." };

  const plafond = cible.membres_limite;
  const inclus = cible.membres_inclus ?? 0;
  const n = Number(utilisateursActifs) || 0;
  const exigences = [];

  // Seul un plafond DUR impose de désigner qui reste. Dépasser le forfait ne
  // bloque rien : le membre supplémentaire se facture.
  const max = plafond;
  if (max != null && n > max) {
    exigences.push({
      type: "utilisateurs",
      titre: "Trop d'utilisateurs actifs",
      detail: `L'offre ${cible.nom} comprend ${max} utilisateur`
            + `${max > 1 ? "s" : ""}. Vous en avez ${n} en activité : `
            + `désignez ${max} personne${max > 1 ? "s" : ""} à conserver.`,
      a_conserver: max,
      a_archiver: n - max,
    });
  }

  // Les modules perdus ne demandent AUCUN arbitrage : leurs données restent
  // en base, simplement inaccessibles. Elles reviennent telles quelles si
  // l'entreprise remonte d'offre. On l'annonce plutôt que de le taire.
  const perdus = (plan(planActuel)?.modules || [])
    .filter((c) => !cible.modules.includes(c))
    .filter((c) => module(c)?.livre);

  // Le surcoût annoncé AVANT le changement : descendre d'offre avec dix
  // personnes ne se refuse pas, mais ne doit pas se découvrir sur la facture.
  const au_dela = Math.max(n - inclus, 0);
  const supplement_mensuel_centimes =
    au_dela > 0 && cible.prix_membre_supp_centimes != null
      ? au_dela * cible.prix_membre_supp_centimes : 0;

  return {
    possible: true,
    montee: (plan(planCible)?.prix_centimes || 0) > (plan(planActuel)?.prix_centimes || 0),
    exigences,
    membres_au_dela_du_forfait: au_dela,
    supplement_mensuel_centimes,
    modules_perdus: perdus,
    // Rien à trancher : le changement s'applique directement.
    immediat: exigences.length === 0,
  };
}

/** Une sélection de personnes à conserver est-elle recevable ? */
export function selectionRecevable(exigence, nbChoisis) {
  const attendu = exigence?.a_conserver ?? 0;
  const n = Number(nbChoisis) || 0;
  if (n > attendu) {
    return { ok: false,
      message: `Vous avez désigné ${n} personnes pour ${attendu} place${attendu > 1 ? "s" : ""}.` };
  }
  if (n < attendu) {
    return { ok: true, message: `Il reste ${attendu - n} place${attendu - n > 1 ? "s" : ""} disponible${attendu - n > 1 ? "s" : ""}.` };
  }
  return { ok: true, message: null };
}

// =============================================================================
// LES OFFRES SECTORIELLES — l'écosystème (voir 15-MOTEUR-OFFRES et
// 16-STRUCTURE-PRIX-RESEAU).
//
// RÈGLE ABSOLUE, tenue par un test : rien ne s'annonce comme DISPONIBLE tant
// que son parcours n'existe pas de bout en bout. Une offre annoncée et vide
// coûte plus cher qu'une offre absente — c'est la crédibilité de la landing qui
// est en jeu, et elle ne se répare pas.
//
// `statut` a trois valeurs, et une seule autorise la vente :
//   · "disponible" — le parcours existe, on peut souscrire ;
//   · "bientot"    — annonçable, avec liste d'attente, JAMAIS souscriptible ;
//   · "etude"      — ne s'affiche pas sur la landing.
// =============================================================================

// STATUTS_OFFRE est réexporté depuis le référentiel, en tête de fichier.

/**
 * Les offres par SECTEUR (au-delà des trois paliers déménageur).
 * Prix HTVA mensuels. Les décidés sont marqués ; les autres sont proposés et
 * attendent validation (T3, T4, T5 de 16-STRUCTURE-PRIX-RESEAU).
 */
/**
 * La COPIE des offres sectorielles. Les chiffres — prix, statut, secteur,
 * unité, seuils — viennent du référentiel, comme pour les paliers.
 */
const COPIE_SECTEURS = Object.freeze({
  donneur_ordre: {
    promesse: "Envoyer, suivre, prouver.",
    pour: "Vous confiez des livraisons, du levage ou de la manutention à des "
        + "prestataires, et vous passez vos journées à courir après l'info.",
    // Ce qui est vendu : les récurrents, pas un temps gagné inventé.
    recurrents: ["Heure d'arrivée réelle", "Qui est intervenu",
                 "Preuve de livraison signée", "État des biens en photo"],
    note_prix: "Gratuit : vous apportez le volume. Une commission s'applique "
             + "aux missions confiées via le réseau.",
  },
  independant_manutention: {
    promesse: "Des bras professionnels, quand vous en avez besoin.",
    pour: "L'indépendant qui vend son temps et son savoir-faire, et veut être "
        + "trouvé, planifié et payé sans relancer.",
    produits: ["1 manutentionnaire", "Équipe joignable", "Demi-journée",
               "Journée", "Taux horaire", "Intervention ponctuelle"],
    recurrents: ["Heures réellement prestées", "Accord du client",
                 "Ce qui reste dû"],
    note_prix: "Vérification du numéro d'entreprise à l'inscription.",
  },
  garde_meubles: {
    promesse: "Vos contrats se facturent tout seuls, chaque mois.",
    pour: "L'exploitant de boxes qui veut des contrats, des unités attribuées "
        + "et une facturation récurrente qui ne saute jamais un mois.",
    recurrents: ["Échéance de chaque période", "Prorata d'entrée et de sortie",
                 "Référence de paiement", "Ce qui reste dû"],
  },
  groupe_liftier: {
    promesse: "Votre flotte, vos couronnes, vos équipes — au même endroit.",
    pour: "L'entreprise qui exploite une flotte de lifts et vend du levage à "
        + "d'autres professionnels.",
    recurrents: ["Machine affectée", "Heure d'arrivée", "Hauteur et couronne",
                 "Preuve d'intervention"],
    note_prix: "On facture les ACCÈS bureau, pas les opérateurs sur machine : "
             + "5 inclus, +30 €/accès, plafond dur à 15. Les opérateurs "
             + "pointent sans compter comme utilisateurs.",
  },
  logistique_mobilier: {
    promesse: "Arrivages, quais, zones : le débit sous contrôle.",
    pour: "Le grand acteur du mobilier ou de la cuisine, en flux tendu, avec "
        + "plusieurs quais sur un même dépôt.",
    recurrents: ["Créneau de quai", "Arrivage attendu", "Zone occupée",
                 "Livraison prouvée"],
  },
});

/** Les offres par SECTEUR, dérivées du référentiel. Prix en centimes HTVA. */
export const OFFRES_SECTEURS = Object.freeze(offresSectorielles().map((o) =>
  Object.freeze({
    cle: o.code,
    nom: o.libelle,
    secteur: o.secteur,
    prix_centimes: o.prix_base_centimes,
    unite: o.unite,
    statut: o.statut,
    souscriptible: o.souscriptible,
    membres_inclus: o.membres_inclus,
    membres_limite: o.membres_limite,
    modules: Object.freeze([...o.modules]),
    ...COPIE_SECTEURS[o.code],
  })));

/** Une offre sectorielle par sa clé. `null` plutôt qu'un défaut inventé. */
export function offreSecteur(cle) {
  return OFFRES_SECTEURS.find((o) => o.cle === cle) || null;
}

/**
 * Les offres à MONTRER sur la landing : tout sauf celles à l'étude.
 * L'ordre suit le prix croissant — le visiteur lit du plus accessible au plus
 * engageant.
 */
export function offresVitrine() {
  return OFFRES_SECTEURS
    .filter((o) => o.statut !== "etude")
    .slice()
    .sort((a, b) => a.prix_centimes - b.prix_centimes);
}

/**
 * Peut-on SOUSCRIRE à cette offre ? Une seule réponse possible : le statut.
 * Ce garde-fou est la traduction en code de « rien ne se vend avant d'exister ».
 */
export function offreSouscriptible(cle) {
  // Vaut pour toute offre, palier ou secteur : c'est le référentiel — et donc
  // la base, qui en est dérivée — qui décide. Une seule réponse possible.
  return offreReferentiel(cle)?.souscriptible === true;
}

/** Le libellé de statut affiché, sans ambiguïté pour le visiteur. */
export function libelleStatut(cle) {
  const s = offreSecteur(cle)?.statut;
  if (s === "disponible") return null;          // rien à signaler : c'est vendable
  if (s === "bientot") return "Bientôt disponible";
  return null;
}

// =============================================================================
// LE PARRAINAGE — fidélité récompensée, mais la maison ne perd jamais.
//
// DOCTRINE (Raphaël, « le casino est toujours gagnant ») :
//   · le crédit de parrainage est PLAFONNÉ à UNE mensualité — jamais gratuité
//     totale, jamais travail à perte ;
//   · il ne se déclenche qu'au PREMIER PAIEMENT ENCAISSÉ du filleul : on ne
//     récompense pas une inscription qui ne paiera jamais ;
//   · le plafond est ANNUEL (une mensualité offerte au maximum sur 12 mois) :
//     sinon douze parrains offriraient une année entière ;
//   · un crédit ne dépasse jamais le montant de la prochaine facture (pas de
//     solde qui « déborde » en trésorerie versée).
//
// Résultat : on échange AU PIRE une mensualité contre un client acquis à coût
// d'acquisition nul, qui paiera des mois. Le casino reste gagnant.
// =============================================================================

/** Le crédit gagné par filleul qui paie : une fraction de SA mensualité,
 *  reversée au parrain. 25 % par défaut → il faut 4 filleuls pour un mois. */
export const PART_PARRAINAGE = 0.25;

/**
 * Le crédit de parrainage applicable à la prochaine facture d'un parrain.
 *
 * @param {object} p
 * @param {number} p.mensualite_centimes         la mensualité du PARRAIN (le plafond)
 * @param {Array<{paye:boolean, mensualite_centimes:number}>} p.filleuls
 * @param {number} p.credit_deja_utilise_centimes  cumul déjà consommé cette année
 * @returns {{credit_centimes:number, plafond_atteint:boolean, filleuls_payants:number}}
 */
export function creditParrainage({ mensualite_centimes = 0, filleuls = [],
                                   credit_deja_utilise_centimes = 0 } = {}) {
  const mensualite = Math.max(0, Number(mensualite_centimes) || 0);
  // Plafond ANNUEL : une mensualité du parrain, moins ce qui a déjà servi.
  const plafondRestant = Math.max(0, mensualite - Math.max(0, credit_deja_utilise_centimes));

  // Seuls les filleuls qui ONT PAYÉ comptent — jamais une inscription non payante.
  const payants = (filleuls || []).filter((f) => f?.paye === true);
  const brut = payants.reduce((s, f) =>
    s + Math.round((Number(f?.mensualite_centimes) || 0) * PART_PARRAINAGE), 0);

  // Le crédit ne dépasse NI le plafond annuel, NI la prochaine facture.
  const credit = Math.min(brut, plafondRestant, mensualite);
  return {
    credit_centimes: credit,
    plafond_atteint: plafondRestant <= 0 || credit >= plafondRestant,
    filleuls_payants: payants.length,
  };
}

/**
 * La facture nette après application du crédit. Ne descend JAMAIS sous zéro :
 * un crédit n'est pas un versement, il réduit une dette.
 */
export function factureApresParrainage(mensualite_centimes, credit_centimes) {
  const m = Math.max(0, Number(mensualite_centimes) || 0);
  const c = Math.max(0, Math.min(Number(credit_centimes) || 0, m));
  return m - c;                              // >= 0 par construction
}
