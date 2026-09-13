// =============================================================================
// Ce qu'un membre a le droit de faire.
//
// Le mécanisme existe déjà en base (rôles + capacités individuelles, vérifiés
// par `acteur_a_capacite`). Ce qui manquait, c'est de le rendre LISIBLE et
// RÉGLABLE : un patron ne raisonne pas en « creer_affaire », il raisonne en
// « peut-il ouvrir un dossier client ? ».
//
// Ce module traduit les clés techniques en phrases, les regroupe par métier,
// et dit pour chacune si elle relève du bureau ou du terrain.
//
// DEUX AXES À NE PAS CONFONDRE — c'est la distinction qui structure Dashprod :
//   - le MÉTIER TERRAIN (déménageur, chef d'équipe, chauffeur) décrit ce que
//     la personne FAIT sur un chantier ;
//   - les CAPACITÉS décrivent ce que le logiciel lui AUTORISE.
// Un chef d'équipe sans la capacité de clôturer un chantier reste chef
// d'équipe ; il ne peut simplement pas appuyer sur le bouton.
// =============================================================================

/**
 * Le catalogue. `terrain: true` = action qui se fait sur un chantier, depuis
 * un téléphone ; les autres sont des actions de bureau.
 *
 * `sensible: true` = touche à l'argent ou aux données de tous. À n'accorder
 * qu'en connaissance de cause — l'écran l'affiche différemment.
 */
export const CAPACITES = Object.freeze([
  // ── Terrain ──────────────────────────────────────────────────────────────
  { cle: "pointer_chantier", terrain: true,
    titre: "Déclarer ses heures",
    detail: "Poser son départ, ses pauses et son arrivée sur les chantiers où "
          + "il est affecté." },
  { cle: "cloturer_chantier", terrain: true,
    titre: "Clôturer un chantier",
    detail: "Déclarer le chantier terminé pour toute l'équipe. C'est le geste "
          + "du chef d'équipe : il arrête le décompte de tout le monde." },
  { cle: "signaler_materiel", terrain: true,
    titre: "Signaler un problème de matériel",
    detail: "Remonter une panne, une casse ou un manque depuis le terrain." },
  { cle: "demander_conge", terrain: true,
    titre: "Demander un congé",
    detail: "Introduire une demande, que la direction approuve ensuite." },

  // ── Bureau ───────────────────────────────────────────────────────────────
  { cle: "creer_affaire",
    titre: "Ouvrir et modifier un dossier",
    detail: "Créer un client, faire un relevé, monter un devis." },
  { cle: "voir_prix", sensible: true,
    titre: "Voir les prix et les marges",
    detail: "Sans cette autorisation, les montants restent masqués — utile "
          + "pour une équipe terrain qui consulte un dossier." },
  { cle: "faire_signer",
    titre: "Émettre et faire signer une offre",
    detail: "Figer le document, générer le code de signature du client." },
  { cle: "gerer_planning",
    titre: "Gérer le planning",
    detail: "Affecter les équipes et les camions, publier les missions au "
          + "terrain, régler les horaires." },
  { cle: "valider_intake",
    titre: "Valider une demande entrante",
    detail: "Transformer une demande en dossier de travail." },
  { cle: "approuver_conge",
    titre: "Approuver les congés",
    detail: "Accepter ou refuser les demandes de l'équipe." },
  { cle: "emettre_facture", sensible: true,
    titre: "Émettre une facture",
    detail: "Attribuer un numéro légal — irréversible — et encaisser." },
  { cle: "voir_paie", sensible: true,
    titre: "Voir la paie de toute l'équipe",
    detail: "Salaires et coûts employeur de TOUS les membres. Chacun voit "
          + "déjà ses propres heures sans cette autorisation." },
  // DIVERGENCE TROUVÉE le 13/09/2026 en construisant l'écran des rôles : ces
  // deux capacités existent en base (table `capacites`, et distribuées dans
  // `role_capacites`) et manquaient au catalogue du domaine. Donc aucun écran
  // ne pouvait les lister ni les décrire — y compris la plus puissante de
  // toutes, celle qui commande la distribution des droits.
  { cle: "confier_les_acces", sensible: true,
    titre: "Confier les accès",
    detail: "Inviter, retirer, et distribuer les capacités des autres. C'est "
          + "la capacité qui commande toutes les autres : sans elle, plus "
          + "personne ne peut redonner de droits." },
  { cle: "cloturer_dossier",
    titre: "Clôturer un dossier",
    detail: "Déclarer une affaire terminée. Après clôture, les écritures du "
          + "dossier sont figées." },
  { cle: "gerer_referentiels", sensible: true,
    titre: "Régler les paramètres de l'entreprise",
    detail: "Barème, catalogues, textes, identité, confidentialité." },
  { cle: "voir_tresorerie", sensible: true,
    titre: "Voir la trésorerie de l'entreprise",
    detail: "Encaissements, impayés, échéances et marge, chiffrés. Réservé : "
          + "c'est la vue la plus complète sur la santé financière, et elle "
          + "n'est utile qu'à qui décide des paiements." },
  { cle: "gerer_depot",
    titre: "Gérer le dépôt et le garde-meubles",
    detail: "Boxes, zones, contrats de stockage, entrées et sorties d'un "
          + "centre logistique." },
]);

/** Capacités du terrain, dans l'ordre du catalogue. */
export function capacitesTerrain() {
  return CAPACITES.filter((c) => c.terrain);
}

/** Capacités du bureau. */
export function capacitesBureau() {
  return CAPACITES.filter((c) => !c.terrain);
}

/** Retrouve une capacité par sa clé. */
export function capacite(cle) {
  return CAPACITES.find((c) => c.cle === cle) || null;
}

/**
 * Libellé lisible d'une clé inconnue du catalogue — plutôt que d'afficher
 * `machin_truc` brut à l'utilisateur.
 */
export function libelleCapacite(cle) {
  return capacite(cle)?.titre
      || String(cle || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Ce qu'un membre peut faire, à partir de ses rôles et de ses capacités
 * individuelles. L'union des deux : une capacité accordée à titre individuel
 * s'ajoute à celles du rôle, elle ne les remplace pas.
 */
export function capacitesEffectives({ capacitesDesRoles, capacitesIndividuelles } = {}) {
  return [...new Set([
    ...(capacitesDesRoles || []),
    ...(capacitesIndividuelles || []),
  ])].sort();
}

/** Le membre a-t-il cette capacité, par son rôle ou individuellement ? */
export function peut(membre, cle) {
  return capacitesEffectives(membre || {}).includes(cle);
}

/**
 * D'où vient une capacité ? Sert à l'écran : on ne propose de retirer que ce
 * qui a été accordé individuellement — retirer une capacité de rôle demande de
 * changer le rôle, ce qui est un autre geste.
 */
export function origineCapacite(membre, cle) {
  const parRole = (membre?.capacitesDesRoles || []).includes(cle);
  const perso = (membre?.capacitesIndividuelles || []).includes(cle);
  if (parRole && perso) return "role_et_individuelle";
  if (parRole) return "role";
  if (perso) return "individuelle";
  return "aucune";
}

/**
 * Résumé en une phrase, pour la fiche du membre.
 * On nomme d'abord ce qui compte : sans capacité, la personne ne peut rien.
 */
export function resumeAcces(membre) {
  const eff = capacitesEffectives(membre || {});
  if (eff.length === 0) return "Aucun accès — ce membre ne peut rien faire.";
  const t = eff.filter((c) => capacite(c)?.terrain).length;
  const b = eff.length - t;
  const bouts = [];
  if (t) bouts.push(`${t} action${t > 1 ? "s" : ""} de terrain`);
  if (b) bouts.push(`${b} action${b > 1 ? "s" : ""} de bureau`);
  return bouts.join(" · ");
}

// =============================================================================
// L'ANTI-VERROUILLAGE — étage pur.
//
// Retirer une capacité à un rôle peut faire disparaître la dernière personne
// qui la détenait. Pour deux d'entre elles, c'est irréversible depuis
// l'application : sans `confier_les_acces`, plus personne ne peut redonner de
// droits ; sans `gerer_referentiels`, plus personne ne peut reparamétrer. La
// société s'enferme dehors — par erreur, ou par malveillance d'un salarié sur
// le départ.
//
// La règle est donc calculée ici, dans un étage sans base : on compte les
// détenteurs qui RESTERAIENT, en tenant compte des deux origines — la capacité
// portée par un autre rôle, et la dérogation individuelle. La base applique
// exactement la même règle (migration 0191) ; l'avoir ici permet de l'éprouver
// sans muter quoi que ce soit, et de prévenir à l'écran avant le refus.
// =============================================================================

/** Les capacités dont la perte totale enferme la société dehors. */
export const CAPACITES_CLE_DE_VOUTE = Object.freeze([
  "confier_les_acces", "gerer_referentiels",
]);

/** Vrai si perdre cette capacité sur un rôle est irréversible. */
export function estCleDeVoute(capacite) {
  return CAPACITES_CLE_DE_VOUTE.includes(capacite);
}

/**
 * Combien de personnes porteraient encore `capacite` si on la retirait du rôle
 * `roleRetire`.
 *
 * @param membres [{ actif, retire, roles: [cle], capacitesIndividuelles: [cle] }]
 * @param capacitesParRole { [roleCle]: [capaciteCle] }
 */
export function detenteursApresRetrait(
  membres, capacitesParRole, capacite, roleRetire,
) {
  return (membres || []).filter((m) => {
    if (m.actif === false || m.retire) return false;
    if ((m.capacitesIndividuelles || []).includes(capacite)) return true;
    return (m.roles || []).some((r) =>
      r !== roleRetire && (capacitesParRole?.[r] || []).includes(capacite));
  }).length;
}

/**
 * Le retrait est-il permis ? Rend `{ permis, motif }`.
 *
 * Une capacité ordinaire se retire librement : on peut toujours la redonner.
 * Une clé de voûte ne se retire que s'il reste quelqu'un pour la porter.
 */
export function retraitPermis(
  membres, capacitesParRole, capacite, roleRetire,
) {
  if (!estCleDeVoute(capacite)) return { permis: true, motif: null };
  const restants = detenteursApresRetrait(
    membres, capacitesParRole, capacite, roleRetire);
  if (restants > 0) return { permis: true, motif: null, restants };
  return {
    permis: false,
    restants: 0,
    motif: `Plus personne ne porterait « ${capacite} ». Votre société se `
         + "verrouillerait dehors : accordez-la d'abord à quelqu'un d'autre.",
  };
}
