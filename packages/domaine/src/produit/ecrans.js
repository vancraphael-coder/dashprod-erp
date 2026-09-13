// =============================================================================
// LE REGISTRE DES ÉCRANS — l'audit devient une donnée.
//
// POURQUOI. L'audit des écrans existait en prose, dans `docs/roadmap/`. Un
// texte se périme en silence : c'est exactement ce qui est arrivé au test qui
// figeait la grille de modules à la date de la migration 0075 et qui, une fois
// la décision changée, verrouillait la version périmée et REFUSAIT la
// correction. Un inventaire qui ne s'exécute pas ne protège de rien.
//
// CE QUE CHAQUE ÉCRAN DÉCLARE.
//   `module`     — la capacité achetée qui l'ouvre. `null` = socle.
//   `postures`   — QUI en a l'usage. C'est cette condition, et non le module,
//                  qui fait le tri entre les métiers : le module `facturation`
//                  est acheté par l'indépendant comme par le déménageur, mais
//                  « Coûts internes » ne concerne que la direction.
//   `aussi`      — les modules que l'écran porte sans être celui qui l'ouvre.
//                  Un module peut vivre dans plusieurs écrans sans en avoir
//                  un à lui : c'est le cas de la flotte.
//   `transverse` — écran de session ou de compte, hors posture (connexion,
//                  profil, réglages). Ni caché ni conditionné.
//   `reglages`   — les clés de configuration que l'écran consomme. C'est le
//                  lien qui rend le deuxième angle vérifiable : un écran qui
//                  dépend d'un réglage `manquant` n'est pas constructible.
//   `etat`       — `livre` | `esquisse` | `manquant`.
//                  `esquisse` = l'écran existe pour ne pas perdre l'idée. Il
//                  s'ouvre, il affiche quelque chose, mais il n'a pas été
//                  pensé depuis l'usage réel. C'est le cas le plus dangereux :
//                  il donne l'illusion que le sujet est traité.
//   `monte`      — atteignable depuis la navigation. Un écran `livre` mais non
//                  monté est du travail déjà fait qu'on s'apprête à refaire.
//   `legal`      — l'écran produit ou affiche un artefact contraint par la loi.
//                  Premier angle de la pyramide : aucune souplesse.
//   `rituel`     — écran d'ARRIVÉE d'une posture. Un rituel, pas un tableau de
//                  bord : il répond à la question du moment, en trois blocs au
//                  plus, et se termine. Voir la doctrine dans
//                  docs/roadmap/00-SYSTEME.md.
//   `blocs`      — combien de blocs l'écran présente. Plafonné à 3 pour un
//                  rituel : au-delà, on assomme.
//   `kpi`        — centre de chiffres. UN SEUL écran dans tout Dashprod a le
//                  droit de l'être, et ce n'est jamais un écran d'arrivée.
//   `capacite`   — capacité requise en plus de la posture, quand il y en a une.
//   `route`      — la clé de route utilisée par `main.jsx`, quand elle diffère
//                  de `cle`. Le registre et le routeur parlaient deux langues
//                  (`liste_affaires` ici, « liste » là-bas) : déclarer la
//                  correspondance ICI évite d'en tenir une table ailleurs.
// =============================================================================

/** `fichier: null` = écran manquant, déclaré pour cesser d'être invisible. */
export const ECRANS = Object.freeze([

  // ── Session, compte, réglages — hors posture ────────────────────────────
  { cle: "connexion", fichier: "Connexion.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "inscription", fichier: "Inscription.jsx", module: null, postures: [],
    transverse: true, reglages: ["identite_verifiee"], etat: "livre",
    monte: true, legal: false },
  { cle: "non_invite", fichier: "NonInvite.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "bienvenue", fichier: "Bienvenue.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "esquisse", monte: true,
    legal: false },
  { cle: "diagnostic", fichier: "Diagnostic.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "profil", fichier: "Profil.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "mes_societes", fichier: "MesSocietes.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "parametres", fichier: "Parametres.jsx", module: null, postures: [],
    transverse: true, reglages: [], etat: "livre", monte: true, legal: false },

  // ── Les écrans de réglage, un par entrée ───────────────────────────────
  { cle: "identite", fichier: "Identite.jsx", module: null,
    postures: ["direction", "independant"], reglages: ["identite"],
    etat: "livre", monte: true, legal: true },
  { cle: "fermetures", fichier: "Fermetures.jsx", module: null,
    postures: ["direction", "coordination"], reglages: ["fermetures"],
    etat: "livre", monte: true, legal: false },
  { cle: "bareme", fichier: "Bareme.jsx", module: "devis",
    postures: ["direction", "commerce"], reglages: ["bareme", "fournitures"],
    etat: "livre", monte: true, legal: false },
  { cle: "textes_dossiers", fichier: "TextesDossiers.jsx", module: "devis",
    postures: ["direction", "commerce"], reglages: ["textes", "mentions"],
    etat: "esquisse", monte: true, legal: true },
  // Le plus structurant des dix réglages manquants. Décider ce qu'un rôle peut
  // faire n'est pas gérer une équipe : c'est définir l'entreprise. D'où sa
  // place ici et non dans Ressources — les deux écrans ne répondent pas à la
  // même question.
  { cle: "reglages_roles", fichier: "ReglagesRoles.jsx", module: null,
    postures: ["direction"], capacite: "confier_les_acces",
    reglages: ["roles"], etat: "livre", monte: true, legal: false },

  { cle: "cout", fichier: "Cout.jsx", module: null, postures: ["direction"],
    reglages: ["cout", "services"], etat: "livre", monte: true, legal: false },
  { cle: "services", fichier: "Services.jsx", module: null,
    postures: ["direction"], reglages: ["services"], etat: "livre",
    monte: true, legal: false },
  { cle: "archivage", fichier: "Archivage.jsx", module: null,
    postures: ["direction"], reglages: ["archivage", "conservation"],
    etat: "esquisse", monte: true, legal: true },
  { cle: "abonnement", fichier: "Abonnement.jsx", module: null,
    postures: ["direction", "independant"], reglages: ["abonnement"],
    etat: "livre", monte: true, legal: false },
  { cle: "apparence", fichier: "Apparence.jsx", module: null,
    postures: ["direction", "independant"], reglages: ["apparence"],
    etat: "livre", monte: true, legal: false },
  { cle: "molettes_couleur", fichier: "MolettesCouleur.jsx", module: null,
    postures: ["direction", "independant"], reglages: ["apparence"],
    etat: "livre", monte: true, legal: false },
  { cle: "confidentialite", fichier: "Confidentialite.jsx", module: null,
    postures: ["direction", "independant"],
    reglages: ["confidentialite", "conservation"], etat: "esquisse",
    monte: true, legal: true },

  // ── Commerce : du premier appel à la signature ──────────────────────────
  //
  // CES ÉCRANS RESTENT OUVERTS À L'INDÉPENDANT, et c'est une correction d'une
  // erreur de lecture de ma part. Un indépendant A des dossiers : il les
  // reçoit en sous-traitance, il y pointe, il les facture. Fermer la page des
  // dossiers l'aurait privé de son propre travail.
  //
  // Ce qu'il ne doit pas avoir, c'est la PANOPLIE DE CRÉATION : le menu « + »
  // proposait les six natures à tout le monde, dont « Déménagement » avec
  // relevé, emballage et fournitures — alors que son offre n'ouvre ni `releve`
  // ni `devis`. L'encadrement se fait donc là où le geste commence :
  // `naturesDuMenu(modules)` ne propose que ce que l'offre permet de créer.
  // Pour un indépendant, une seule nature : « Sous-traitance ».
  { cle: "carnet", fichier: "Carnet.jsx", module: "crm",
    postures: ["direction", "coordination", "commerce", "independant"],
    reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "liste_affaires", fichier: "ListeAffaires.jsx", route: "liste",
    module: "crm",
    postures: ["direction", "coordination", "commerce", "independant"],
    reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "dossier", fichier: "Dossier.jsx", module: "crm",
    postures: ["direction", "coordination", "commerce", "independant"],
    reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "releve", fichier: "Releve.jsx", module: "releve",
    postures: ["commerce", "coordination", "acces_ponctuel"],
    reglages: ["pieces"], etat: "livre", monte: true, legal: false },
  { cle: "releve_doc", fichier: "ReleveDoc.jsx", module: "releve",
    postures: ["commerce", "coordination"], reglages: ["identite", "pieces"],
    etat: "esquisse", monte: true, legal: false },
  { cle: "devis", fichier: "Devis.jsx", module: "devis",
    postures: ["commerce", "coordination", "direction"],
    reglages: ["bareme", "fournitures", "textes"], etat: "livre", monte: true,
    legal: false },
  { cle: "offre", fichier: "Offre.jsx", module: "offre",
    postures: ["commerce", "coordination"],
    reglages: ["textes", "mentions"], etat: "livre", monte: true, legal: true },
  { cle: "contrat", fichier: "Contrat.jsx", module: "offre",
    postures: ["commerce", "coordination"], reglages: ["textes", "mentions"],
    etat: "esquisse", monte: true, legal: true },
  { cle: "signature_offre", fichier: "SignatureOffre.jsx",
    module: "signature_client", postures: ["client"],
    reglages: ["mentions"], etat: "livre", monte: true, legal: true },
  { cle: "certificat_signature", fichier: "CertificatSignature.jsx",
    module: "signature_client", postures: ["commerce", "coordination"],
    reglages: [], etat: "livre", monte: true, legal: true },
  { cle: "vente_rapide", fichier: "VenteRapide.jsx", module: "facturation",
    postures: ["coordination", "direction", "independant"],
    reglages: ["fournitures", "facturation"], etat: "esquisse", monte: true,
    legal: true },

  // ── Facturation et argent ───────────────────────────────────────────────
  { cle: "facture", fichier: "Facture.jsx", module: "facturation",
    postures: ["direction", "coordination", "independant"],
    reglages: ["facturation", "sequences", "mentions"], etat: "livre",
    monte: true, legal: true },
  { cle: "facture_doc", fichier: "FactureDoc.jsx", module: "facturation",
    postures: ["direction", "coordination", "independant"],
    reglages: ["identite", "facturation", "sequences", "mentions"],
    etat: "esquisse", monte: true, legal: true },
  { cle: "facture_peppol", fichier: "FacturePeppol.jsx", module: "peppol",
    postures: ["direction", "coordination"],
    reglages: ["identite_verifiee", "peppol", "sequences"], etat: "esquisse",
    monte: true, legal: true },
  { cle: "comptabilite", fichier: "Comptabilite.jsx", module: "comptabilite",
    postures: ["direction"], reglages: ["comptabilite"], etat: "livre",
    monte: true, legal: true },
  { cle: "depenses", fichier: "Depenses.jsx", module: "comptabilite",
    postures: ["direction"], reglages: ["depenses"], etat: "livre",
    monte: true, legal: false },

  // ── Planifier et exécuter ───────────────────────────────────────────────
  { cle: "planning", fichier: "Planning.jsx", module: "planning",
    postures: ["coordination", "direction", "depot", "chef_equipe",
               "independant"],
    reglages: ["fermetures"], etat: "livre", monte: true, legal: false },
  { cle: "terrain", fichier: "Terrain.jsx", module: "terrain",
    postures: ["chef_equipe", "execution", "independant"],
    reglages: ["materiel_terrain"], etat: "esquisse", monte: true,
    legal: false },
  { cle: "terrain_profil", fichier: "TerrainProfil.jsx", module: "terrain",
    postures: ["chef_equipe", "execution"], reglages: [], etat: "esquisse",
    monte: true, legal: false },
  { cle: "rapport_chantier", fichier: "RapportChantier.jsx",
    module: "rapport_chantier",
    postures: ["chef_equipe", "execution", "independant"],
    reglages: ["textes"], etat: "esquisse", monte: true, legal: true },
  { cle: "rapports_dossier", fichier: "RapportsDossier.jsx",
    module: "rapport_chantier", postures: ["coordination", "direction"],
    reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "materiel", fichier: "Materiel.jsx", module: "terrain",
    postures: ["depot", "chef_equipe", "coordination"],
    reglages: ["materiel_terrain"], etat: "livre", monte: true, legal: false },
  { cle: "heures", fichier: "Heures.jsx", module: "paie",
    postures: ["direction", "chef_equipe"], reglages: [], etat: "livre",
    monte: true, legal: true },
  { cle: "paie", fichier: "Paie.jsx", module: "paie",
    postures: ["direction"], reglages: [], etat: "esquisse", monte: true,
    legal: true },
  // `aussi` : les modules qu'un écran porte SANS être celui qui l'ouvre. La
  // flotte n'a pas d'écran dédié — les véhicules vivent dans les ressources,
  // le planning et les centres. Le déclarer évite de conclure à tort que le
  // module `flotte` n'est nulle part.
  { cle: "ressources", fichier: "Ressources.jsx", module: null,
    aussi: ["flotte"],
    postures: ["direction", "coordination", "depot"], reglages: ["roles"],
    etat: "esquisse", monte: true, legal: false },
  { cle: "equipe", fichier: "Equipe.jsx", module: null,
    postures: ["direction", "coordination"], reglages: ["roles"],
    etat: "esquisse", monte: true, legal: false },

  // ── Dépôt et stockage ───────────────────────────────────────────────────
  { cle: "centres", fichier: "Centres.jsx", module: "multi_depots",
    postures: ["direction", "depot"], reglages: ["depots"], etat: "livre",
    monte: true, legal: false },
  { cle: "rapport_centres", fichier: "RapportCentres.jsx",
    module: "gestionnaire_depot", postures: ["direction", "depot"],
    reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "stockage", fichier: "Stockage.jsx", module: "stockage_3d",
    postures: ["direction", "depot"], reglages: ["stockage"], etat: "livre",
    monte: true, legal: false },
  { cle: "contrats_stockage", fichier: "Contrats.jsx", route: "contrats",
    module: "stockage_3d",
    postures: ["direction", "depot"], reglages: ["contrats", "mentions"],
    etat: "esquisse", monte: true, legal: true },

  // ── Échanges ────────────────────────────────────────────────────────────
  { cle: "conversations", fichier: "Conversations.jsx", module: "crm",
    postures: ["coordination", "direction", "independant"], reglages: [],
    etat: "livre", monte: true, legal: false },
  { cle: "fil_messages", fichier: "FilMessages.jsx", module: "crm",
    postures: ["coordination", "direction", "client", "independant"],
    reglages: [], etat: "livre", monte: true, legal: false },
  { cle: "mail", fichier: "Mail.jsx", module: "crm",
    postures: ["coordination", "direction"], reglages: ["notifications"],
    etat: "esquisse", monte: true, legal: false },
  { cle: "journal", fichier: "Journal.jsx", module: "journal",
    postures: ["direction"], reglages: ["journal"], etat: "livre",
    monte: true, legal: false },

  // ── Client ──────────────────────────────────────────────────────────────
  { cle: "espace_client", fichier: "EspaceClient.jsx", module: "espace_client",
    postures: ["client"], reglages: ["espace_client"], etat: "esquisse",
    monte: true, legal: false },

  // ── Réseau ──────────────────────────────────────────────────────────────
  { cle: "demandes_reseau", fichier: "DemandesReseau.jsx", module: "crm",
    postures: ["coordination", "direction"], reglages: [], etat: "esquisse",
    monte: true, legal: false },

  // ── L'écran éditeur, orphelin ───────────────────────────────────────────
  // Déclaré `monte: false` : il existe, il est complet, et il n'est importé
  // nulle part. Le test le signale comme une contradiction — c'est ce qui
  // forcera la décision de le monter ou de le supprimer.
  { cle: "societes_editeur", fichier: "Societes.jsx", module: null,
    postures: [], transverse: true, reglages: [], etat: "esquisse",
    monte: false, legal: false },

  // ══ LES MANQUANTS ═══════════════════════════════════════════════════════
  // Déclarés pour cesser d'être invisibles. Un manque déclaré se teste : tout
  // écran qui dépend d'un réglage `manquant` est signalé non constructible.

  // Lot 4 — l'indépendant
  { cle: "ma_disponibilite", fichier: null, module: "planning",
    postures: ["independant"], reglages: ["disponibilites"], etat: "manquant",
    monte: false, legal: false },
  { cle: "mes_missions", fichier: null, module: "planning",
    postures: ["independant"], reglages: ["disponibilites"], etat: "manquant",
    monte: false, legal: false },
  { cle: "mes_encours", fichier: null, module: "facturation",
    postures: ["independant", "direction"], reglages: ["facturation"],
    etat: "manquant", monte: false, legal: false },

  // Lot 5 — le miroir côté donneur d'ordre
  { cle: "mes_prestataires", fichier: null, module: "planning",
    postures: ["coordination", "direction"],
    reglages: ["prestataires", "identite_verifiee"], etat: "manquant",
    monte: false, legal: false },
  // Livré le 13/09/2026. `reglages: []` : l'écran ne lit aucun réglage — il
  // lit deux tables PUBLIABLES (vitrine, tarifs publiés) et jamais
  // `organisations`. Les commissions et le périmètre confié, eux, relèveront
  // du réglage `prestataires` quand il existera ; l'écran ne les consomme pas
  // aujourd'hui et ne doit donc pas les déclarer.
  { cle: "confier_mission", fichier: "ConfierMission.jsx", module: "planning",
    postures: ["coordination", "direction"], reglages: [],
    etat: "livre", monte: true, legal: false },
  // Livré le 13/09/2026. `reglages: []` : l'écran ne lit aucun réglage — il
  // lit les engagements et calcule le poste de coût par le domaine. Les
  // commissions relèveront du réglage `prestataires` quand il existera.
  { cle: "suivi_missions_confiees", fichier: "SuiviEngagements.jsx",
    route: "suivi_engagements", module: "planning",
    postures: ["coordination", "direction"], reglages: [],
    etat: "livre", monte: true, legal: false },
  { cle: "reception_preuve", fichier: null, module: "rapport_chantier",
    postures: ["coordination", "direction"], reglages: [], etat: "manquant",
    monte: false, legal: true },
  { cle: "facture_entrante", fichier: null, module: "comptabilite",
    postures: ["direction", "coordination"], reglages: ["prestataires"],
    etat: "manquant", monte: false, legal: true },

  // DETTE DE VENTE — le module `international` est marqué livré et vendu dans
  // Regular (360 €) comme dans Pro (720 €). Aucun écran ne le porte : ni
  // inventaire numéroté colis par colis, ni liste de colisage douanière, ni
  // poids taxable. Seul `EspaceClient.jsx` en évoque le vocabulaire. C'est la
  // même faute que « 360 € » codé en dur, en plus cher : une promesse
  // encaissée. Deux issues, toutes deux à trancher, aucune à ignorer —
  // construire l'écran, ou retirer le module des offres.
  { cle: "colisage_international", fichier: null, module: "international",
    postures: ["coordination", "commerce", "direction"],
    reglages: ["identite", "mentions"], etat: "manquant", monte: false,
    legal: true },

  // Lot 6 — les documents manquants
  { cle: "rapport_chantier_doc", fichier: null, module: "rapport_chantier",
    postures: ["coordination", "direction", "independant"],
    reglages: ["identite", "textes", "mentions"], etat: "manquant",
    monte: false, legal: true },
  { cle: "releve_heures_doc", fichier: null, module: "paie",
    postures: ["direction", "chef_equipe", "independant"],
    reglages: ["identite"], etat: "manquant", monte: false, legal: true },
  { cle: "attestation_fin_chantier", fichier: null, module: "rapport_chantier",
    postures: ["coordination", "direction"],
    reglages: ["identite", "mentions"], etat: "manquant", monte: false,
    legal: true },

  // Lot 7 — les écrans d'arrivée par posture
  { cle: "ma_journee", fichier: null, module: "terrain",
    postures: ["execution", "chef_equipe"], reglages: [], etat: "manquant", monte: false,
    legal: false, rituel: true, blocs: 3 },
  { cle: "pointage_hors_chantier", fichier: null, module: "terrain",
    postures: ["execution", "chef_equipe"], reglages: [], etat: "manquant",
    monte: false, legal: true },
  { cle: "signaler_probleme", fichier: null, module: "terrain",
    postures: ["execution", "chef_equipe"], reglages: ["materiel_terrain"],
    etat: "manquant", monte: false, legal: false },
  { cle: "vue_du_matin", fichier: null, module: "gestionnaire_depot",
    postures: ["depot"], reglages: [], etat: "manquant", monte: false,
    legal: false, rituel: true, blocs: 3 },
  { cle: "vue_de_l_argent", fichier: null, module: "facturation",
    postures: ["direction"], reglages: [], etat: "manquant", monte: false,
    legal: false, rituel: true, blocs: 3 },
  { cle: "vue_des_trous", fichier: null, module: "planning",
    postures: ["coordination"], reglages: ["fermetures"], etat: "manquant",
    monte: false, legal: false, rituel: true, blocs: 2 },

  // Le choix des canaux : à quels corps de métier je réponds. C'est ce qui
  // rend le réseau utile à un indépendant — il ne voit plus la file des
  // particuliers cherchant un déménageur, il voit son corps.
  { cle: "canaux_reseau", fichier: null, module: "crm",
    postures: ["direction", "coordination", "independant"],
    reglages: ["canaux_reseau"], etat: "manquant", monte: false,
    legal: false },

  // L'écran de réglage des licences. Un réglage sans écran est un réglage que
  // personne ne remplira — la garde des réglages orphelins l'a signalé dès sa
  // déclaration.
  { cle: "acces_profession", fichier: null, module: null,
    postures: ["direction", "independant"], reglages: ["acces_profession"],
    etat: "manquant", monte: false, legal: true },

  // ── LE SEUL CENTRE DE CHIFFRES ───────────────────────────────────────────
  // En ONGLET, jamais en écran d'arrivée. Celui qui gère la trésorerie VEUT
  // des chiffres denses et vient les chercher ; il n'a pas à les recevoir
  // à 6 h du matin comme tout le monde.
  { cle: "tableau_tresorerie", fichier: null, module: "comptabilite",
    postures: ["direction", "coordination"], capacite: "voir_tresorerie",
    reglages: ["comptabilite", "facturation"], etat: "manquant",
    monte: false, legal: false, kpi: true, blocs: 8 },

  // ── LES RITUELS D'ARRIVÉE, un par posture ────────────────────────────────
  { cle: "rituel_commerce", fichier: null, module: "crm",
    postures: ["commerce"], reglages: [], etat: "manquant", monte: false,
    legal: false, rituel: true, blocs: 2 },
  // Livré le 13/09/2026. Trois blocs : où je vais, ce qu'on me demande, ce
  // qu'il reste à facturer. L'écran d'arrivée se choisit par la posture, elle
  // -même déduite de l'offre (main.jsx interroge `postureDansOffre`).
  // `reglages: []` et c'est délibéré. La garde du deuxième angle a signalé
  // cet écran dès sa livraison parce qu'il déclarait dépendre de
  // `disponibilites`, qui n'existe pas encore. Vérification faite : il ne le
  // lit pas — il ne lit que des engagements. La dépendance appartient à
  // `ma_disponibilite`, qui la déclare déjà. La déclaration était fausse, pas
  // la garde.
  { cle: "rituel_independant", fichier: "RituelIndependant.jsx",
    module: "planning", postures: ["independant"],
    reglages: [], etat: "livre", monte: true, legal: false,
    rituel: true, blocs: 3 },

  // Lot 8 — le client réordonné
  { cle: "compte_a_rebours", fichier: null, module: "espace_client",
    postures: ["client"], reglages: ["espace_client"], etat: "manquant",
    monte: false, legal: false, rituel: true, blocs: 3 },
  { cle: "ma_liste_a_faire", fichier: null, module: "espace_client",
    postures: ["client"], reglages: ["espace_client", "textes"],
    etat: "manquant", monte: false, legal: false },
  { cle: "etat_de_paiement", fichier: null, module: "espace_client",
    postures: ["client"], reglages: ["espace_client"], etat: "manquant",
    monte: false, legal: false },
]);

/** La clé de route d'un écran. Par défaut, sa propre clé. */
export function routeDeLEcran(cle) {
  const e = ECRANS.find((x) => x.cle === cle);
  return e ? (e.route || e.cle) : null;
}

/** Un écran par sa clé. `null` plutôt qu'un défaut inventé. */
export function ecran(cle) {
  return ECRANS.find((e) => e.cle === cle) || null;
}

/** Les écrans d'une posture. */
export function ecransDeLaPosture(cle) {
  return ECRANS.filter((e) => e.postures.includes(cle));
}

/** Les écrans par état, pour mesurer où en est le produit. */
export function ecransParEtat(etat) {
  return ECRANS.filter((e) => e.etat === etat);
}

/**
 * Un écran est constructible quand tous les réglages dont il dépend existent.
 * Rend la liste des réglages manquants — vide si l'écran est constructible.
 *
 * C'est le deuxième angle rendu opérationnel : construire un écran sur un
 * réglage absent, c'est coder sa configuration en dur, donc refaire l'écran.
 * Trois précédents dans ce projet, tous corrigés à perte.
 */
export function reglagesManquantsDe(cleEcran, estLivre) {
  const e = ecran(cleEcran);
  if (!e) return [];
  return e.reglages.filter((r) => !estLivre(r));
}
