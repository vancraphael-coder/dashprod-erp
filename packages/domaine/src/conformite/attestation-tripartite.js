// =============================================================================
// TROIS SORTIES POUR UNE MÊME SÉRIE DE FAITS.
//
// LE PRINCIPE. Une mission confiée produit UNE série d'événements et de
// preuves. Elle doit produire TROIS documents, parce que trois lecteurs
// différents ont besoin de trois choses différentes :
//
//   1. LA VUE DU PRESTATAIRE — « voici ce que j'ai fait et ce que j'ai
//      constaté ». Sa preuve d'avoir exécuté, avec ses propres fichiers, à
//      opposer à un donneur d'ordre qui contesterait.
//   2. LA VUE DU DONNEUR D'ORDRE — « voici ce que j'ai reçu ». Sa preuve
//      envers son PROPRE client, qui n'a jamais entendu parler du
//      sous-traitant.
//   3. L'ATTESTATION COMMUNE — ce que l'exploitant de la plateforme constate,
//      et seulement ça.
//
// POURQUOI LA TROISIÈME COMPTE AUTANT. Elle limite la responsabilité de
// l'exploitant, à condition d'être écrite juste. Dashprod est un TIERS
// TECHNIQUE, pas un témoin : il atteste qu'une donnée a été enregistrée à tel
// instant par tel acteur et qu'elle n'a pas bougé depuis. Il n'atteste pas que
// le travail a été bien fait, ni que les photos montrent ce qu'on prétend, ni
// qui a raison.
//
// ET CETTE LIMITE DOIT FIGURER SUR LE DOCUMENT. Un document qui ne dit pas ce
// qu'il ne certifie PAS sera lu comme certifiant tout. C'est le seul endroit
// où une clause de non-certification protège vraiment : sur la pièce elle-même,
// pas dans des conditions générales que personne ne rouvre.
//
// LES EMPREINTES, PAS LES FICHIERS. Chaque preuve est identifiée par son
// SHA-256. Le fichier reste chez son producteur. Le donneur d'ordre peut donc
// vérifier qu'une photo qu'on lui montre est celle enregistrée sur place, sans
// qu'aucune donnée personnelle du client final ne traverse la cloison.
//
// (Ce cadrage réduit l'exposition évidente. Ce n'est pas un avis juridique et
// il ne remplace pas un conseil qualifié en droit belge.)
// =============================================================================

/** Ce que l'attestation commune NE certifie PAS. À imprimer, littéralement. */
export const NON_CERTIFIE = Object.freeze([
  "que la prestation a été correctement exécutée",
  "que les pièces déposées représentent ce qu'elles prétendent représenter",
  "l'identité réelle des personnes ayant signé sur place",
  "le bien-fondé d'une réclamation de l'une ou l'autre partie",
]);

/** Ce qu'elle certifie, et rien de plus. */
export const CERTIFIE = Object.freeze([
  "la date et l'heure d'enregistrement de chaque pièce",
  "l'organisation qui a déposé chaque pièce",
  "l'empreinte numérique de chaque pièce au moment du dépôt",
  "l'intégrité de la chaîne d'événements depuis la proposition",
]);

const LIBELLES_TYPE = Object.freeze({
  signature: "Signature du client sur place",
  photo_avant: "Photo — état avant intervention",
  photo_apres: "Photo — état après intervention",
  reserve: "Réserve émise",
  document: "Document joint",
});

const horodatage = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * La vue d'une PARTIE : ce qu'elle a déposé, ce qu'elle a reçu de l'autre.
 *
 * La distinction compte : « j'ai pris ces photos » et « on m'a transmis ces
 * photos » ne se défendent pas de la même façon. Les mélanger affaiblirait les
 * deux.
 */
export function vuePartie({ engagement, preuves = [], moi = null } = {}) {
  const e = engagement || {};
  const lignes = preuves.map((p) => ({
    rang: p.rang,
    type: p.type,
    libelle: p.libelle || LIBELLES_TYPE[p.type] || p.type,
    empreinte: p.empreinte,
    au: horodatage(p.au),
    origine: p.par_org === moi || p.est_moi === true ? "moi" : "l_autre",
  }));
  return {
    role: e.org_donneur === moi ? "donneur_ordre"
      : e.org_prestataire === moi ? "prestataire" : "inconnu",
    contrepartie: e.contrepartie || null,
    date_prestation: e.date_prestation || e.date || null,
    nature: e.nature || null,
    prix_htva_centimes: e.prix_htva_centimes ?? null,
    deposees_par_moi: lignes.filter((l) => l.origine === "moi"),
    deposees_par_l_autre: lignes.filter((l) => l.origine === "l_autre"),
    total: lignes.length,
  };
}

/**
 * L'ATTESTATION COMMUNE. Neutre, sans point de vue, et explicite sur ses
 * limites.
 *
 * Aucun montant n'y figure : le prix convenu entre deux organisations ne
 * concerne pas un tiers qui lirait l'attestation, et l'y mettre transformerait
 * un constat technique en pièce commerciale.
 *
 * Les organisations y sont NOMMÉES — sinon l'attestation ne prouve rien
 * d'utile — mais aucun client final n'y apparaît : il n'est pas partie à
 * l'engagement.
 */
export function attestationCommune({
  engagement, preuves = [], evenements = [], chaine = null, emisLe = new Date(),
} = {}) {
  const e = engagement || {};
  const pieces = preuves.slice().sort((a, b) => a.rang - b.rang).map((p) => ({
    rang: p.rang,
    nature: LIBELLES_TYPE[p.type] || p.type,
    empreinte_sha256: p.empreinte,
    deposee_le: horodatage(p.au),
    deposee_par: p.par_org,
  }));

  const etapes = evenements.slice()
    .sort((a, b) => a.rang - b.rang)
    .map((v) => ({
      rang: v.rang, type: v.type, au: horodatage(v.au), par: v.par_org,
      empreinte: v.empreinte,
    }));

  return {
    titre: "Constat d'enregistrement",
    emis_le: horodatage(emisLe),
    // Le constat porte sur un engagement, identifié sans ambiguïté.
    engagement: {
      reference: e.id || null,
      date_prestation: e.date_prestation || e.date || null,
      nature: e.nature || null,
      commune: e.ville || null,
    },
    parties: {
      donneur_ordre: e.nom_donneur || e.org_donneur || null,
      prestataire: e.nom_prestataire || e.org_prestataire || null,
    },
    pieces,
    etapes,
    // L'intégrité est un FAIT vérifiable, pas une opinion. Si la chaîne est
    // rompue, l'attestation le dit — elle ne se refuse pas à exister.
    integrite: chaine && chaine.ok === false
      ? { verifiee: false, rang_rompu: chaine.rang_rompu ?? null }
      : { verifiee: true, maillons: chaine?.maillons ?? etapes.length },
    certifie: [...CERTIFIE],
    ne_certifie_pas: [...NON_CERTIFIE],
    mention:
      "Ce document est un constat technique établi par la plateforme "
      + "Dashprod, qui agit comme tiers d'enregistrement. Il atteste de ce qui "
      + "a été enregistré, quand et par qui. Il n'atteste ni de la réalité "
      + "matérielle des faits rapportés, ni de la bonne exécution de la "
      + "prestation, et ne préjuge d'aucun litige entre les parties.",
  };
}

/**
 * Les trois sorties d'un coup, pour un engagement donné.
 *
 * Une seule fonction pour éviter que les trois documents se construisent à
 * partir de trois lectures différentes des mêmes faits — c'est ainsi que deux
 * pièces censées décrire la même chose finissent par se contredire, et une
 * contradiction entre nos propres documents est indéfendable.
 */
export function troisSorties(sources = {}) {
  const { engagement } = sources;
  return {
    prestataire: vuePartie({ ...sources, moi: engagement?.org_prestataire }),
    donneur_ordre: vuePartie({ ...sources, moi: engagement?.org_donneur }),
    commune: attestationCommune(sources),
  };
}
