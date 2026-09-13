// =============================================================================
// LE COÛT DE SOUS-TRAITANCE — un poste à part, et pourquoi.
//
// LA DEMANDE. Un engagement confié à un indépendant est généralement rattaché
// à UN dossier. Il doit donc entrer dans les coûts de ce dossier, au même
// titre qu'un membre de l'équipe — mais avec son propre système de calcul.
//
// POURQUOI PAS DANS LA MAIN-D'ŒUVRE. Le coût d'un salarié se CALCULE : heures
// pointées × coût horaire interne. Celui d'un prestataire se CONSTATE : c'est
// un montant convenu, puis un montant facturé. Les deux ne se corrigent pas
// de la même façon et ne se contestent pas devant les mêmes personnes.
//
// Mélangés, on perdrait ce qui compte : la part du chantier qui part à
// l'extérieur. C'est le chiffre qu'un gérant regarde avant de décider
// d'embaucher plutôt que de sous-traiter.
//
// POURQUOI PAS DANS « DIVERS ». Parce que « divers » ne se pilote pas. Un
// poste dont on ne connaît pas la nature ne conduit à aucune décision.
//
// TROIS ÉTATS, TROIS NATURES DE CHIFFRE. C'est la règle centrale de ce
// module :
//
//   · PROPOSÉE   → aucun coût. Le prestataire peut refuser. Compter une
//                  proposition comme un coût gonflerait tous les chantiers en
//                  cours d'un montant qui n'existe pas encore.
//   · ACCEPTÉE / RÉALISÉE → coût ENGAGÉ. Un accord est un dû : on le doit même
//                  si la facture n'est pas arrivée. Ne pas le compter ferait
//                  paraître le chantier rentable jusqu'à l'arrivée de la
//                  facture — puis la marge s'effondrerait sans explication.
//   · FACTURÉE   → coût RÉEL, au montant de la facture reçue, qui prime sur le
//                  prix convenu. Un écart entre les deux est une information,
//                  pas une erreur à masquer : il se voit.
//   · REFUSÉE / ANNULÉE → aucun coût, et la ligne disparaît.
//
// LE PRIX EST HTVA. C'est ce qui grève réellement le chantier : la TVA d'un
// prestataire assujetti se récupère. Compter du TVAC surestimerait le coût de
// 21 % et ferait préférer l'embauche à tort.
// =============================================================================

/** Les états qui engagent une dépense. Une proposition n'en fait pas partie. */
export const ETATS_ENGAGEANTS = Object.freeze(["acceptee", "realisee", "facturee"]);

/** Les états sans aucun coût. */
export const ETATS_SANS_COUT = Object.freeze(["proposee", "refusee", "annulee"]);

const n0 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * La ligne de coût d'un engagement.
 *
 * `source` dit d'où vient le montant, et c'est la moitié de l'information :
 *   "convenu" — le prix du tarif publié au moment de l'accord ;
 *   "facture" — le montant réellement facturé par le prestataire.
 *
 * Un montant sans sa provenance ne se discute pas.
 */
export function ligneCout(engagement) {
  const e = engagement || {};
  if (!ETATS_ENGAGEANTS.includes(e.etat)) {
    return {
      engagement_id: e.id || null,
      prestataire: e.contrepartie || e.prestataire || null,
      etat: e.etat || "inconnu",
      montant_htva_centimes: 0,
      source: "aucune",
      compte: false,
    };
  }
  // La facture reçue prime sur le prix convenu : c'est elle qu'on paie.
  const facture = e.facture_htva_centimes;
  const aFacture = facture != null && n0(facture) > 0;
  return {
    engagement_id: e.id || null,
    prestataire: e.contrepartie || e.prestataire || null,
    etat: e.etat,
    date: e.date || e.date_prestation || null,
    nature: e.nature || null,
    montant_htva_centimes: aFacture ? n0(facture) : n0(e.prix_htva_centimes),
    prix_convenu_centimes: n0(e.prix_htva_centimes),
    source: aFacture ? "facture" : "convenu",
    // Un écart convenu/facturé est une information, pas une anomalie à
    // masquer. On le rend visible, on ne le corrige pas en silence.
    ecart_centimes: aFacture ? n0(facture) - n0(e.prix_htva_centimes) : 0,
    compte: true,
  };
}

/**
 * Le poste « sous-traitance » d'un dossier.
 *
 * Rend séparément l'engagé et le facturé : ce sont deux questions
 * différentes — « combien ce chantier me coûte-t-il dehors » et « combien
 * ai-je déjà reçu comme facture ». La seconde sert au rapprochement, la
 * première à la marge.
 */
export function coutSousTraitance(engagements) {
  const lignes = (Array.isArray(engagements) ? engagements : [])
    .map(ligneCout);
  const retenues = lignes.filter((l) => l.compte);

  const facturees = retenues.filter((l) => l.source === "facture");
  const attendues = retenues.filter((l) => l.source === "convenu");

  return {
    lignes,
    retenues,
    // Ce qui grève le chantier, quelle que soit l'arrivée des factures.
    engage_htva_centimes: retenues.reduce(
      (s, l) => s + l.montant_htva_centimes, 0),
    // Ce qui est déjà arrivé sous forme de facture.
    facture_htva_centimes: facturees.reduce(
      (s, l) => s + l.montant_htva_centimes, 0),
    // Ce qu'on doit encore recevoir : utile pour savoir si le chantier est
    // clôturable sans surprise.
    attendu_htva_centimes: attendues.reduce(
      (s, l) => s + l.montant_htva_centimes, 0),
    ecart_total_centimes: retenues.reduce((s, l) => s + n0(l.ecart_centimes), 0),
    nb_prestataires: new Set(retenues.map((l) => l.prestataire)).size,
    nb_sans_facture: attendues.length,
  };
}

/**
 * Le poste, en euros, pour l'entrée `reel` de `calculDefinitif`.
 *
 * `calculDefinitif` raisonne en euros sur ses postes réels ; on lui rend donc
 * des euros, et un seul nombre — le détail reste consultable par
 * `coutSousTraitance`. Deux chemins vers le même total finiraient par ne plus
 * dire la même chose.
 */
export function posteSousTraitanceEuros(engagements) {
  return Math.round(coutSousTraitance(engagements).engage_htva_centimes) / 100;
}

/**
 * Un chantier est-il clôturable sans surprise côté sous-traitance ?
 *
 * On ne bloque pas la clôture — une entreprise doit pouvoir clôturer. On
 * PRÉVIENT : une facture de prestataire qui arrive après la clôture arrive sur
 * un dossier dont la marge est déjà annoncée.
 */
export function alerteCloture(engagements) {
  const c = coutSousTraitance(engagements);
  if (c.nb_sans_facture === 0) return null;
  return {
    niveau: "attention",
    message: `${c.nb_sans_facture} engagement`
      + `${c.nb_sans_facture > 1 ? "s" : ""} sans facture reçue, pour `
      + `${(c.attendu_htva_centimes / 100).toFixed(2).replace(".", ",")} € HTVA `
      + "convenus. La marge affichée changera si les montants diffèrent.",
  };
}
