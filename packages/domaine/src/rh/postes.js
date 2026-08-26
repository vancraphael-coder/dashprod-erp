// =============================================================================
// LES POSTES — les groupes de permissions, nommés par métier de l'entreprise.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// Le mécanisme rôle → capacités existe déjà en base (`roles`,
// `role_capacites`, `utilisateur_roles`, vérifiés par `acteur_a_capacite`).
// Ce qui manquait, Raphaël l'a dit exactement : « ces postes et leurs
// permissions ne sont pas bien définis, et les permissions déjà
// transmissibles sont trop vastes pour s'y retrouver. » Treize cases à cocher
// une par une, sans logique lisible.
//
// Ce fichier est la SOURCE DE VÉRITÉ des postes : chaque poste est un paquet de
// capacités, nommé comme un vrai métier de déménageur (fondateur, gérant,
// secrétaire, chef d'équipe, …), justifié, et RANGÉ. On ne coche plus des
// capacités : on choisit un poste, et l'on peut promouvoir ou rétrograder d'un
// cran. Raphaël retouchera — d'où un fichier lisible, pas un schéma figé.
//
// DEUX AXES À NE JAMAIS CONFONDRE (déjà posés dans `capacites.js`) :
//   · le MÉTIER TERRAIN décrit ce que la personne FAIT sur un chantier
//     (chauffeur, liftier, monteur…) ;
//   · les CAPACITÉS décrivent ce que le logiciel l'AUTORISE à faire.
// Conséquence directe et assumée : cinq métiers d'exécution — déménageur,
// livreur, monteur, chauffeur, liftier — partagent EXACTEMENT le même paquet de
// capacités logicielles. Ils se distinguent par le métier, pas par les droits.
// Les séparer en droits identiques ne ferait qu'ajouter du bruit ; on garde le
// métier comme étiquette, et le poste comme permission.
//
// CE QUE CE FICHIER NE FAIT PAS
// -----------------------------
// Il n'accorde rien tout seul : l'autorisation reste vérifiée en base par
// `acteur_a_capacite`. Ce module DÉCRIT ce qu'un poste devrait porter ; une
// migration synchronise `role_capacites` à partir d'ici (comme le référentiel
// `offres`). Tant que la migration n'est pas passée, ceci est la cible, pas
// l'état effectif.
// =============================================================================

import { CAPACITES } from "./capacites.js";

/** Toutes les clés de capacité connues — pour valider qu'un poste n'invente
 *  pas une capacité fantôme. */
const CLES_CAPACITE = new Set(CAPACITES.map((c) => c.cle));

// -----------------------------------------------------------------------------
// LES PAQUETS DE BASE, composés par empilement. Un poste supérieur REPREND le
// paquet du poste terrain et y ajoute — écrire les listes en dur les ferait
// diverger au premier ajout de capacité.
// -----------------------------------------------------------------------------

// Ce que TOUT membre de terrain peut faire : déclarer ses heures, remonter un
// souci de matériel, demander un congé. Le socle de l'exécution.
const SOCLE_TERRAIN = ["pointer_chantier", "signaler_materiel", "demander_conge"];

// Le chef d'équipe : le terrain, plus le geste qui arrête le décompte de toute
// l'équipe.
const ENCADREMENT_TERRAIN = [...SOCLE_TERRAIN, "cloturer_chantier"];

// Le bureau qui monte des dossiers et fait signer, sans toucher à l'argent de
// tous ni aux réglages de l'entreprise.
const ADMINISTRATION = [
  ...SOCLE_TERRAIN,
  "creer_affaire", "voir_prix", "faire_signer",
  "valider_intake", "gerer_planning", "approuver_conge",
];

// La direction opérationnelle : l'administration, plus l'argent (facturation,
// paie) et les paramètres de l'entreprise.
const DIRECTION = [
  ...ADMINISTRATION,
  "emettre_facture", "voir_paie", "gerer_referentiels",
];

/**
 * LE CATALOGUE.
 *
 * `rang` ordonne la hiérarchie, du plus haut (fondateur) au plus bas
 * (intérimaire). C'est lui qui permet « promouvoir » (rang − 1) et
 * « rétrograder » (rang + 1) sans raisonner en capacités.
 *
 * `metier` rattache le poste à un métier terrain quand il en a un, pour les
 * cinq profils d'exécution qui partagent les mêmes droits.
 *
 * `confie_les_acces` : ce poste peut-il attribuer un poste à autrui ?
 *   true          — de plein droit (fondateur, gérant) ;
 *   "si_octroye"  — seulement si un supérieur le lui a explicitement accordé
 *                   (la secrétaire) ;
 *   false         — jamais (le terrain).
 * C'est la règle de Raphaël : « assignable par gérant, et secrétaire si cette
 * permission lui est octroyée par fondateur et/ou gérance ».
 */
export const POSTES = Object.freeze([
  {
    cle: "fondateur", titre: "Fondateur", rang: 0,
    famille: "direction", confie_les_acces: true,
    capacites: DIRECTION,
    resume: "Le propriétaire. Tout est ouvert, y compris confier les accès.",
  },
  {
    cle: "gerant", titre: "Gérant", rang: 1,
    famille: "direction", confie_les_acces: true,
    capacites: DIRECTION,
    resume: "Dirige l'entreprise au quotidien. Peut confier les accès à tous.",
  },
  {
    cle: "secretaire", titre: "Secrétaire", rang: 2,
    famille: "administration", confie_les_acces: "si_octroye",
    capacites: ADMINISTRATION,
    resume: "Monte les dossiers, planifie, fait signer. Ne touche ni à la "
          + "facturation ni à la paie. Peut confier les accès UNIQUEMENT si un "
          + "fondateur ou un gérant le lui a octroyé.",
  },
  {
    cle: "chef_equipe", titre: "Chef d'équipe", rang: 3,
    famille: "terrain", metier: "chef_equipe", confie_les_acces: false,
    capacites: ENCADREMENT_TERRAIN,
    resume: "Mène l'équipe sur le chantier et clôture pour tout le monde.",
  },
  // ── Les cinq métiers d'exécution : MÊMES droits, métier différent. ─────────
  {
    cle: "livreur", titre: "Livreur", rang: 4,
    famille: "terrain", metier: "livreur", confie_les_acces: false,
    capacites: SOCLE_TERRAIN,
    resume: "Assure les livraisons. Droits de terrain.",
  },
  {
    cle: "monteur", titre: "Monteur", rang: 4,
    famille: "terrain", metier: "monteur", confie_les_acces: false,
    capacites: SOCLE_TERRAIN,
    resume: "Monte et démonte le mobilier. Droits de terrain.",
  },
  {
    cle: "chauffeur", titre: "Chauffeur", rang: 4,
    famille: "terrain", metier: "chauffeur", confie_les_acces: false,
    capacites: SOCLE_TERRAIN,
    resume: "Conduit les véhicules. Droits de terrain.",
  },
  {
    cle: "liftier", titre: "Liftier", rang: 4,
    famille: "terrain", metier: "liftier", confie_les_acces: false,
    capacites: SOCLE_TERRAIN,
    resume: "Opère le monte-meubles. Droits de terrain.",
  },
  {
    cle: "demenageur", titre: "Déménageur", rang: 4,
    famille: "terrain", metier: "demenageur", confie_les_acces: false,
    capacites: SOCLE_TERRAIN,
    resume: "Porte et charge. Le métier de base du terrain.",
  },
  // ── Les deux accès les plus restreints. ────────────────────────────────────
  {
    cle: "interimaire", titre: "Intérimaire", rang: 5,
    famille: "terrain", metier: "demenageur", confie_les_acces: false,
    // Un intérimaire déclare ses heures et signale le matériel, mais ne demande
    // pas de congé par l'outil : il n'accumule pas de droits chez le client.
    capacites: ["pointer_chantier", "signaler_materiel"],
    resume: "Renfort temporaire. Déclare ses heures, signale le matériel. Pas "
          + "de demande de congé par l'outil.",
  },
  {
    cle: "visite_terrain", titre: "Visite terrain", rang: 6,
    famille: "sur_mesure", metier: null, confie_les_acces: false,
    // AUCUNE capacité de base : c'est un accès en LECTURE, complété page par
    // page. Voir `PAGES_MODIFIABLES` et `accesVisiteTerrain()`.
    capacites: [],
    sur_mesure: true,
    resume: "Accès minimal en consultation. On choisit ensuite, page par page, "
          + "ce que la personne peut modifier. Pour un renfort ponctuel ou un "
          + "prestataire qui n'intervient que sur une partie de l'outil.",
  },
]);

/**
 * LES PAGES qu'un accès « visite terrain » peut se voir ouvrir en MODIFICATION.
 *
 * Raphaël : « je veux pouvoir définir la sélection multiple des pages que
 * l'acteur pourra modifier. » Un accès sur mesure voit tout en lecture ; on lui
 * ouvre l'écriture sur une sélection de pages, et rien d'autre.
 *
 * La liste colle aux vraies pages de l'application (barre de navigation +
 * écrans de travail). Une page absente d'ici ne peut pas être ouverte — c'est
 * volontaire : on n'accorde pas l'écriture sur un écran qu'on n'a pas
 * explicitement rendu partageable.
 */
export const PAGES_MODIFIABLES = Object.freeze([
  { cle: "dossiers", titre: "Dossiers", detail: "Clients, relevés, devis." },
  { cle: "planning", titre: "Planning", detail: "Dates, équipes, affectations." },
  { cle: "releve", titre: "Relevé", detail: "Inventaire du mobilier à déménager." },
  { cle: "materiel", titre: "Matériel", detail: "Fournitures et emballage du dossier." },
  { cle: "stockage", titre: "Garde-meubles", detail: "Boxes, zones, contrats." },
  { cle: "carnet", titre: "Carnet de contacts", detail: "Fournisseurs, partenaires." },
  { cle: "conversations", titre: "Messages", detail: "Échanges avec les clients." },
]);

const CLES_PAGE = new Set(PAGES_MODIFIABLES.map((p) => p.cle));

// -----------------------------------------------------------------------------
// LECTURE
// -----------------------------------------------------------------------------

/** Un poste par sa clé, ou null — jamais un défaut silencieux qui accorderait
 *  des droits qu'on n'a pas demandés. */
export function poste(cle) {
  return POSTES.find((p) => p.cle === cle) || null;
}

/**
 * Les capacités d'un poste, dédoublonnées et triées.
 * Pour « visite terrain », les capacités dépendent des pages ouvertes : passer
 * par `accesVisiteTerrain()`.
 */
export function capacitesDuPoste(cle) {
  const p = poste(cle);
  if (!p) return [];
  return [...new Set(p.capacites)].sort();
}

/** Vrai si le poste porte cette capacité. */
export function posteADroit(cle, capacite) {
  return capacitesDuPoste(cle).includes(capacite);
}

// -----------------------------------------------------------------------------
// HIÉRARCHIE — promouvoir / rétrograder
// -----------------------------------------------------------------------------

/**
 * Les postes « ordinaires » (hors sur-mesure), triés du plus haut au plus bas.
 * L'accès sur mesure n'entre pas dans l'échelle : on ne « promeut » pas
 * quelqu'un EN visite terrain, on l'y bascule explicitement.
 */
function echelle() {
  return POSTES.filter((p) => !p.sur_mesure).sort((a, b) => a.rang - b.rang);
}

/**
 * Le poste immédiatement SUPÉRIEUR (promotion), ou null si déjà au sommet.
 * Plusieurs postes partagent le rang 4 (les métiers d'exécution) : promouvoir
 * l'un d'eux mène au rang 3 (chef d'équipe), et non à un autre métier de même
 * rang. On saute donc au premier rang STRICTEMENT inférieur.
 */
export function postePromu(cle) {
  const p = poste(cle);
  if (!p || p.sur_mesure) return null;
  const rangs = [...new Set(echelle().map((x) => x.rang))].sort((a, b) => a - b);
  const rangSup = [...rangs].reverse().find((r) => r < p.rang);
  if (rangSup === undefined) return null;
  return echelle().find((x) => x.rang === rangSup) || null;
}

/** Le poste immédiatement INFÉRIEUR (rétrogradation), ou null si déjà en bas. */
export function posteRetrograde(cle) {
  const p = poste(cle);
  if (!p || p.sur_mesure) return null;
  const rangs = [...new Set(echelle().map((x) => x.rang))].sort((a, b) => a - b);
  const rangInf = rangs.find((r) => r > p.rang);
  if (rangInf === undefined) return null;
  return echelle().find((x) => x.rang === rangInf) || null;
}

// -----------------------------------------------------------------------------
// QUI PEUT CONFIER UN ACCÈS
// -----------------------------------------------------------------------------

/**
 * L'auteur (dont on connaît le poste et l'octroi éventuel) peut-il attribuer un
 * poste à autrui ?
 *
 * Règle de Raphaël : le gérant (et le fondateur) le peuvent de plein droit ;
 * la secrétaire seulement si un fondateur ou un gérant le lui a octroyé.
 *
 * @param {string} posteAuteur      le poste de celui qui veut attribuer
 * @param {boolean} octroiSecretaire ce membre a-t-il reçu l'octroi explicite
 * @returns {boolean}
 */
export function peutConfierAcces(posteAuteur, octroiSecretaire = false) {
  const p = poste(posteAuteur);
  if (!p) return false;
  if (p.confie_les_acces === true) return true;
  if (p.confie_les_acces === "si_octroye") return Boolean(octroiSecretaire);
  return false;
}

/**
 * L'octroi de « confier les accès » à une secrétaire ne peut venir QUE d'un
 * fondateur ou d'un gérant. Un octroi accordé par quelqu'un d'autre serait une
 * élévation de privilège par la bande.
 */
export function peutOctroyerConfiance(posteAuteur) {
  return ["fondateur", "gerant"].includes(posteAuteur);
}

// -----------------------------------------------------------------------------
// L'ACCÈS SUR MESURE « VISITE TERRAIN »
// -----------------------------------------------------------------------------

/**
 * Construit l'accès effectif d'une visite terrain à partir des pages qu'on lui
 * ouvre en modification.
 *
 * On IGNORE les pages inconnues plutôt que de les accepter : ouvrir l'écriture
 * sur un écran non déclaré partageable serait une porte dérobée.
 *
 * @param {string[]} pagesModifiables clés de PAGES_MODIFIABLES
 * @returns {{ lectureSeule: boolean, pagesModifiables: string[] }}
 */
export function accesVisiteTerrain(pagesModifiables = []) {
  const retenues = [...new Set(pagesModifiables)].filter((c) => CLES_PAGE.has(c));
  return {
    lectureSeule: retenues.length === 0,
    pagesModifiables: retenues.sort(),
  };
}

/** Une visite terrain peut-elle MODIFIER cette page ? */
export function visiteTerrainPeutModifier(pagesModifiables, page) {
  return accesVisiteTerrain(pagesModifiables).pagesModifiables.includes(page);
}

// -----------------------------------------------------------------------------
// COHÉRENCE INTERNE — vérifiée au chargement du module par le test dédié
// -----------------------------------------------------------------------------

/** Toute capacité citée par un poste existe-t-elle vraiment ? Renvoie les
 *  fautes (vide = sain). Sert au test, et documente l'invariant. */
export function capacitesFantomes() {
  const fautes = [];
  for (const p of POSTES) {
    for (const c of p.capacites) {
      if (!CLES_CAPACITE.has(c)) fautes.push(`${p.cle} → ${c}`);
    }
  }
  return fautes;
}
