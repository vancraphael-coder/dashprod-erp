// =============================================================================
// LE RÉFÉRENTIEL DES OFFRES — les FAITS, à un seul endroit.
//
// POURQUOI CE FICHIER EXISTE. Il y avait deux catalogues qui ne se parlaient
// pas : la table `offres` en base — celle que lisent `modules_du_plan`,
// `org_a_module`, le RLS et la facturation — et les constantes de `plans.js`,
// que lisent la vitrine et les écrans. Ils ont divergé, silencieusement, sur
// des points qui coûtent de l'argent :
//
//   · `signature_client` et `espace_client` sont ouverts à TOUTES les offres
//     depuis la décision du lot 02. La base l'applique ; le domaine les
//     réservait encore à Regular. Un client Basique payait pour deux modules
//     que ses écrans lui cachaient.
//   · La base ne plafonne plus les membres (`membres_limite` nul) et facture
//     un membre supplémentaire 13 €. Le domaine refusait le 3ᵉ utilisateur en
//     Basique avec « passez à l'offre supérieure » : une vente refusée par
//     l'écran que la facturation savait encaisser.
//   · Pro comprend 30 membres en base ; le domaine disait « illimité », ce qui
//     rendait son coût par utilisateur incalculable — l'argument de montée en
//     gamme reposait sur du vide.
//   · Le repli d'un plan inconnu valait `regular` dans le domaine et `starter`
//     en base. Un repli ne doit jamais accorder plus que le minimum.
//   · La même offre s'appelait « Starter » sur la vitrine et « Basique » sur
//     la facture.
//
// LA RÈGLE POSÉE. Ce fichier porte les faits — code, libellé, rang, statut,
// prix, seuils, modules. `plans.js` y ajoute la copie commerciale et n'invente
// aucun chiffre. L'outil `outils/publier-offres.mjs` en dérive le SQL de
// publication. Un test vérifie que la migration publiée correspond bien à ce
// que l'outil produirait : le SQL ne se retouche pas à la main.
//
// CE QUI N'EST PAS ICI. La promesse, le « pour qui », les récurrents : c'est
// de la copie, elle vit dans `plans.js`. Un prix n'est pas de la copie.
//
// VERSIONNEMENT. La table `offres` est versionnée par `publie_le` et ne se
// réécrit jamais. Ce fichier décrit la version EN VIGUEUR ; l'historique reste
// en base. Corriger un barème = republier, pas éditer.
// =============================================================================

/** Les statuts possibles d'une offre. `etude` ne s'affiche pas sur la vitrine. */
export const STATUTS_OFFRE = Object.freeze(["disponible", "bientot", "etude"]);

/** Le socle : présent dans toutes les offres déménageur. */
const SOCLE = ["crm", "releve", "devis", "offre", "planning", "terrain",
               "flotte", "facturation"];

/** Ouverts à toutes les offres — décision du lot 02, appliquée en base. */
const TOUTES_OFFRES = ["signature_client", "espace_client"];

const REGULAR = [...SOCLE, ...TOUTES_OFFRES, "peppol", "comptabilite",
                 "rapport_chantier", "paie", "journal", "international"];

const PRO = [...REGULAR, "multi_depots", "gestionnaire_depot", "stockage_3d"];

/**
 * Toutes les offres, paliers déménageur et offres sectorielles confondus.
 * Prix en CENTIMES HTVA, comme partout ailleurs dans le domaine.
 *
 * `modules: []` sur une offre non souscriptible n'est pas un oubli : le
 * parcours n'existe pas, donc rien ne s'ouvre. La contrainte posée en base
 * (0179) interdit qu'une offre devienne souscriptible tant que ses modules
 * sont vides — « rien ne se vend avant d'exister » cesse d'être un commentaire
 * pour devenir une règle que la base fait respecter.
 */
export const REFERENTIEL_OFFRES = Object.freeze([
  {
    code: "starter", libelle: "Basique", rang: 1,
    statut: "disponible", souscriptible: true, secteur: null, unite: "par mois",
    prix_base_centimes: 18000, remise_annuelle_pct: 5,
    membres_inclus: 2, membres_limite: null, prix_membre_supp_centimes: 1300,
    centres_inclus: 0, centres_limite: 0, prix_centre_supp_centimes: null,
    modules: SOCLE.concat(TOUTES_OFFRES),
  },
  {
    code: "regular", libelle: "Regular", rang: 2,
    statut: "disponible", souscriptible: true, secteur: null, unite: "par mois",
    prix_base_centimes: 36000, remise_annuelle_pct: 5,
    membres_inclus: 5, membres_limite: null, prix_membre_supp_centimes: 1300,
    centres_inclus: 0, centres_limite: 0, prix_centre_supp_centimes: null,
    modules: REGULAR,
  },
  {
    code: "pro", libelle: "Pro", rang: 3,
    statut: "disponible", souscriptible: true, secteur: null, unite: "par mois",
    prix_base_centimes: 72000, remise_annuelle_pct: 5,
    membres_inclus: 30, membres_limite: null, prix_membre_supp_centimes: 1300,
    centres_inclus: 1, centres_limite: null, prix_centre_supp_centimes: 5000,
    modules: PRO,
  },

  // ── Offres sectorielles : annoncées, pas encore souscriptibles ───────────
  {
    code: "donneur_ordre", libelle: "Donneur d'ordre", rang: 10,
    statut: "bientot", souscriptible: false,
    secteur: "Cuisiniste, mobilier, industrie", unite: "gratuit",
    prix_base_centimes: 0, remise_annuelle_pct: null,
    membres_inclus: 0, membres_limite: 0, prix_membre_supp_centimes: null,
    centres_inclus: 0, centres_limite: 0, prix_centre_supp_centimes: null,
    modules: [],
  },
  {
    code: "independant_manutention", libelle: "Indépendant manutention", rang: 11,
    statut: "bientot", souscriptible: false,
    secteur: "Manutention et services", unite: "par mois",
    prix_base_centimes: 6000, remise_annuelle_pct: null,
    membres_inclus: 1, membres_limite: 1, prix_membre_supp_centimes: null,
    centres_inclus: 0, centres_limite: 0, prix_centre_supp_centimes: null,
    modules: [],
  },
  {
    code: "garde_meubles", libelle: "Garde-meubles", rang: 12,
    statut: "bientot", souscriptible: false,
    secteur: "Self-storage", unite: "par mois",
    prix_base_centimes: 24000, remise_annuelle_pct: null,
    membres_inclus: 5, membres_limite: 5, prix_membre_supp_centimes: null,
    centres_inclus: 1, centres_limite: 1, prix_centre_supp_centimes: null,
    modules: [],
  },
  {
    code: "groupe_liftier", libelle: "Groupe liftier", rang: 13,
    statut: "bientot", souscriptible: false,
    secteur: "Levage et monte-meubles", unite: "par mois, 5 accès bureau",
    prix_base_centimes: 45000, remise_annuelle_pct: null,
    // Plafond dur à 15 accès bureau : décision du dossier 16, reprise telle
    // quelle. Les opérateurs sur machine ne comptent pas comme utilisateurs.
    membres_inclus: 5, membres_limite: 15, prix_membre_supp_centimes: 3000,
    centres_inclus: 0, centres_limite: 0, prix_centre_supp_centimes: null,
    modules: [],
  },
  {
    code: "logistique_mobilier", libelle: "Logistique mobilier", rang: 14,
    statut: "etude", souscriptible: false,
    secteur: "Débit industriel", unite: "par mois, 1 dépôt",
    prix_base_centimes: 90000, remise_annuelle_pct: null,
    membres_inclus: 5, membres_limite: 5, prix_membre_supp_centimes: null,
    centres_inclus: 1, centres_limite: 1, prix_centre_supp_centimes: null,
    modules: [],
  },
]);

/** Une offre par son code. `null` plutôt qu'un défaut inventé. */
export function offreReferentiel(code) {
  return REFERENTIEL_OFFRES.find((o) => o.code === code) || null;
}

/**
 * Les trois paliers déménageur, dans l'ordre. Ce sont les seules offres qui
 * forment une ÉCHELLE : on monte de l'une à l'autre.
 */
export function paliersDemenageur() {
  return REFERENTIEL_OFFRES.filter((o) => o.secteur === null)
    .slice().sort((a, b) => a.rang - b.rang);
}

/** Les offres sectorielles, hors échelle déménageur. */
export function offresSectorielles() {
  return REFERENTIEL_OFFRES.filter((o) => o.secteur !== null)
    .slice().sort((a, b) => a.rang - b.rang);
}
