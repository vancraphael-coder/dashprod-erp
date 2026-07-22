// =============================================================================
// Documents — Conditions générales (CGV) versionnées
// Source : modèle validé roovers-mobile.jsx (CGV, l. 106-113) — texte fourni
// par le fondateur, PAS rédigé ici (aucun contenu juridique inventé).
//
// Pourquoi une CONSTANTE VERSIONNÉE et pas un texte libre : une offre signée
// doit pouvoir être rejouée à l'identique des années plus tard (C-02). Le
// contenu figé de l'instance mémorise `cgvVersion` ; le rendu va chercher CETTE
// version, jamais la dernière. Une évolution des CGV = une NOUVELLE version
// ajoutée ici, l'ancienne restant intacte (append-only, comme les référentiels).
//
// Note d'architecture : à terme, ces textes ont vocation à vivre dans le
// gabarit versionné (documents_modele_versions.gabarit, I-6) pour être
// propres à chaque organisation. Tant qu'il n'y a qu'un tenant, la constante
// versionnée offre la même garantie d'immuabilité pour un coût nul.
// La C.B.D. complète (PDF déposé en Storage) reste jointe séparément : ces
// CGV en sont le résumé lisible sur le document, elles ne la remplacent pas.
// =============================================================================

const CGV_V1 = Object.freeze([
  "1. Acompte & réservation. La date est réservée à réception d'un acompte de 30 %. Le solde est payable au plus tard le jour de la prestation, par virement (IBAN ci-dessous).",
  "2. Tarif horaire. Les heures sont décomptées du départ du dépôt jusqu'au retour, par tranche commencée. Le devis horaire est une estimation ; seules les heures réellement prestées sont facturées.",
  "3. Accès & stationnement. Le client garantit un accès libre et un emplacement de stationnement aux deux adresses. Les frais, attentes ou portages supplémentaires dus à un accès non conforme sont à sa charge.",
  "4. Responsabilité & assurance. Roovers est assurée pour les dommages causés par sa faute lors de la manutention. Les objets de valeur, documents, espèces et biens fragiles non signalés restent sous la garde du client.",
  "5. Réclamations. Tout dommage apparent doit être signalé le jour même et confirmé par écrit dans les 48 heures ; à défaut, la prestation est réputée conforme.",
  "6. Annulation. Toute annulation à moins de 7 jours peut donner lieu à la retenue de l'acompte au titre de l'immobilisation de l'équipe.",
  "7. Droit applicable. Le présent contrat est régi par le droit belge ; tout litige relève des tribunaux compétents de l'arrondissement du siège. TVA 21 % applicable.",
]);

// v2 — identique à la v1, sauf l'article 4 qui nommait une entreprise en dur.
// La v1 N'EST PAS modifiée : les documents déjà signés gardent leur empreinte
// (C-02). Toute correction de texte = nouvelle version, jamais un UPDATE.
const CGV_V2 = Object.freeze(
  CGV_V1.map((a) => a.startsWith("4.")
    ? "4. Responsabilité & assurance. L'entreprise est assurée pour les dommages causés par sa faute lors de la manutention. Les objets de valeur, documents, espèces et biens fragiles non signalés restent sous la garde du client."
    : a));

const VERSIONS = Object.freeze({ 1: CGV_V1, 2: CGV_V2 });

/** Version des CGV appliquée aux NOUVELLES offres. */
export const CGV_VERSION_COURANTE = 2;

/**
 * Renvoie les articles des CGV d'une version donnée.
 * Une version inconnue renvoie un tableau vide plutôt que la dernière : mieux
 * vaut un document visiblement incomplet qu'un document silencieusement faux.
 * @param {number} version
 * @returns {readonly string[]}
 */
export function cgv(version = CGV_VERSION_COURANTE, articlesPerso = null) {
  const base = VERSIONS[version] || [];
  // L'entreprise peut RÉÉCRIRE, AJOUTER, SUPPRIMER et RÉORDONNER ses articles.
  // On stocke donc la liste résolue complète, pas un diff : c'est la seule
  // forme qui survit à une suppression sans décaler les index restants.
  //
  // Le numéro de version ne bouge pas : il identifie le socle légal, pas la
  // rédaction. Un document signé porte SA liste figée (voir composerOffre),
  // jamais celle en vigueur aujourd'hui.
  if (Array.isArray(articlesPerso) && articlesPerso.length > 0) {
    return articlesPerso.filter((a) => typeof a === "string" && a.trim());
  }
  return base;
}

/** Articles d'une version, pour l'écran de réglage. */
export function articlesCgv(version = CGV_VERSION_COURANTE, articlesPerso = null) {
  return cgv(version, articlesPerso).map((texte, i) => ({
    index: i,
    numero: (texte.match(/^\s*(\d+)\./) || [])[1] || String(i + 1),
    titre: (texte.match(/^\s*\d+\.\s*([^.]+)\./) || [])[1] || `Article ${i + 1}`,
    texte,
  }));
}

/**
 * Renumérote les articles après ajout, suppression ou déplacement.
 * Un article qui commençait par « 4. » et se retrouve en 3e position doit
 * afficher « 3. » — sinon le document contient une numérotation fausse.
 */
export function renumeroter(articles) {
  return (articles || [])
    .filter((a) => typeof a === "string" && a.trim())
    .map((texte, i) => texte.replace(/^\s*\d+\.\s*/, "").trim())
    .map((corps, i) => `${i + 1}. ${corps}`);
}

/** Prestations toujours incluses (rendues avec une coche sur l'offre). */
export const PRESTATIONS_INCLUSES = Object.freeze([
  "Mise à disposition de l'équipe et du matériel de manutention",
  "Chargement, transport et déchargement",
  "Démontage et remontage du mobilier standard",
]);

/** Validité commerciale de l'offre (mentionnée sur le document). */
export const VALIDITE_JOURS_OUVRABLES = 10;

/** Acompte de réservation (CGV art. 1) — en pourcentage du TVAC. */
export const ACOMPTE_PCT = 30;
