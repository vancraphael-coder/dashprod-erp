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
  { cle: "multi_depots", titre: "Centres logistiques", livre: false,
    valeur: "Plusieurs centres, chacun ses équipes, ses véhicules et son "
          + "planning. Un gestionnaire par dépôt, et la direction une vue "
          + "consolidée sur l'ensemble." },
  { cle: "gestionnaire_depot", titre: "Gestionnaire de dépôt", livre: false,
    valeur: "Un responsable par centre : il pilote son planning et ses équipes "
          + "sans voir ni toucher aux autres dépôts." },
  { cle: "stockage_3d", titre: "Stockage et garde-meubles", livre: false,
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
 * Les trois offres.
 *
 * `utilisateurs: null` = sans limite.
 * Les prix sont en centimes HTVA, par mois et par entreprise.
 */
export const PLANS = Object.freeze([
  {
    cle: "starter",
    nom: "Starter",
    // 180 € : la moitié de Regular, facile à annoncer. Le prix ne peut pas
    // descendre plus bas sans casser l'échelle — à 120 € pour 2 personnes, le
    // coût par utilisateur (60 €) passerait SOUS celui de Regular (72 €), et
    // monter en gamme reviendrait à payer plus cher par tête. Un test le
    // vérifie, parce qu'une grille incohérente ne se rattrape pas au discours.
    prix_centimes: 18000,
    utilisateurs: 2,
    promesse: "Sortir du papier",
    pour: "Le déménageur seul ou à deux, qui travaille encore sur Excel et "
        + "sur des devis Word.",
    modules: [...modulesSocle()],
    // Ce qui donnera envie de monter — dit en une phrase, pas en liste.
    motif_montee: "Faire signer vos offres en ligne et facturer des entreprises.",
  },
  {
    cle: "regular",
    nom: "Regular",
    prix_centimes: 36000,
    utilisateurs: 5,
    promesse: "Le circuit complet, du premier appel au paiement",
    pour: "L'entreprise établie, avec une équipe bureau et une ou deux équipes "
        + "terrain.",
    // L'international a rejoint Regular : tant que Pro est verrouillé, le
    // laisser là-haut rendrait un module LIVRÉ et testé invendable. Il
    // remontera si Pro s'ouvre avec sa propre valeur — la logistique
    // multi-sites, qui se suffit à elle-même.
    modules: [...modulesSocle(), "signature_client", "espace_client", "peppol",
              "comptabilite", "rapport_chantier", "paie", "journal",
              "international"],
    motif_montee: "Plusieurs centres logistiques, chacun son gestionnaire.",
    recommande: true,
  },
  {
    cle: "pro",
    nom: "Pro",
    prix_centimes: 72000,
    utilisateurs: null,
    promesse: "Plusieurs centres logistiques",
    pour: "L'entreprise qui exploite plusieurs dépôts, chacun avec ses équipes "
        + "et son gestionnaire.",
    modules: [...modulesSocle(), "signature_client", "espace_client", "peppol",
              "comptabilite", "rapport_chantier", "paie", "journal",
              "international", "multi_depots", "gestionnaire_depot",
              "stockage_3d"],
    motif_montee: null,   // dernier palier

    // VERROUILLÉE temporairement (décision de Raphaël, 05/08/2026). Ce qui la
    // définit — plusieurs centres logistiques avec un gestionnaire par dépôt —
    // n'est pas construit. On l'annonce sans la vendre : encaisser pour une
    // promesse est le plus sûr moyen de perdre un client au premier mois.
    disponible: false,
    verrou_motif: "Les centres logistiques et les gestionnaires de dépôt sont "
                + "en construction. Cette offre ouvrira quand ils seront prêts.",
  },
]);

export function plan(cle) {
  return PLANS.find((p) => p.cle === cle) || null;
}

/** Le plan par défaut d'une organisation sans plan défini. */
export const PLAN_DEFAUT = "regular";

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
  const max = p?.utilisateurs;
  if (max == null) return { ok: true, message: null };
  const n = Number(nbActuel) || 0;
  if (n < max) {
    return { ok: true, message: null, restants: max - n };
  }
  return {
    ok: false,
    message: `Votre offre ${p.nom} comprend ${max} utilisateur`
           + `${max > 1 ? "s" : ""}. Passez à l'offre supérieure pour agrandir `
           + `votre équipe.`,
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
  if (!p || !p.utilisateurs) return null;
  return Math.round(p.prix_centimes / p.utilisateurs / 100);
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
 * L'essai porte sur la meilleure offre SOUSCRIPTIBLE — aujourd'hui Regular,
 * puisque Pro est verrouillée. Faire essayer une offre qu'on ne peut pas
 * acheter ensuite ne crée que de la frustration. La constante suit
 * automatiquement l'ouverture de Pro.
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

  const max = cible.utilisateurs;
  const n = Number(utilisateursActifs) || 0;
  const exigences = [];

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

  return {
    possible: true,
    montee: (plan(planCible)?.prix_centimes || 0) > (plan(planActuel)?.prix_centimes || 0),
    exigences,
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
