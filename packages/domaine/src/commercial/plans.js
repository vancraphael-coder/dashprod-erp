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
  { cle: "multi_depots", titre: "Multi-dépôts", livre: false,
    valeur: "Chaque dépôt ses équipes, ses véhicules, son planning — et la "
          + "direction une vue consolidée." },
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
    modules: [...modulesSocle(), "signature_client", "espace_client", "peppol",
              "comptabilite", "rapport_chantier", "paie", "journal"],
    motif_montee: "Plusieurs équipes, ou des déménagements à l'international.",
    recommande: true,
  },
  {
    cle: "pro",
    nom: "Pro",
    prix_centimes: 72000,
    utilisateurs: null,
    promesse: "Plusieurs équipes, l'international",
    pour: "L'entreprise qui tourne avec plusieurs équipes, ou qui expédie à "
        + "l'étranger.",
    modules: [...modulesSocle(), "signature_client", "espace_client", "peppol",
              "comptabilite", "rapport_chantier", "paie", "journal",
              "international", "multi_depots", "stockage_3d"],
    motif_montee: null,   // dernier palier
  },
]);

export function plan(cle) {
  return PLANS.find((p) => p.cle === cle) || null;
}

/** Le plan par défaut d'une organisation sans plan défini. */
export const PLAN_DEFAUT = "regular";

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
