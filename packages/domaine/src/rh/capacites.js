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
  { cle: "gerer_referentiels", sensible: true,
    titre: "Régler les paramètres de l'entreprise",
    detail: "Barème, catalogues, textes, identité, confidentialité." },
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
