// =============================================================================
// LA PORTÉE DES RÉGLAGES — le deuxième angle, rendu vérifiable.
//
// LE MODÈLE, corrigé le 10/09/2026. La pyramide de Dashprod a trois angles :
//
//   1. LE LÉGAL — le produit final. Une facture, un contrat, une numérotation
//      continue : ce qui doit être juste devant un contrôleur ou un tribunal.
//      Aucune souplesse.
//   2. LE PARAMÉTRAGE — le point de vérité. Ce que l'entreprise déclare, et
//      dont tout le reste dérive.
//   3. LA PRISE EN MAIN — la compréhension rapide. Ce qu'un vrai utilisateur
//      comprend en arrivant, sans qu'on lui explique.
//
//   Le légal contraint le paramétrage ; le paramétrage rend la prise en main
//   possible. Si le paramétrage manque, l'angle légal se met à vivre dans du
//   code écrit en dur et l'angle de la prise en main s'effondre — c'est
//   exactement ce qui s'est passé avec les mentions de facture, réparties
//   entre le code et les textes de dossier.
//
// CE QUE CE FICHIER CHANGE. Il y avait UNE taxonomie de réglages pour tout le
// monde. Or un réglage qui existe chez l'un ne doit pas forcément apparaître
// chez l'autre : « Coûts internes » n'a aucun sens pour un indépendant seul,
// « Centres logistiques » n'existe pas dans une entreprise sans dépôt, et un
// groupe liftier n'a pas de barème de déménagement.
//
// DEUX CONDITIONS, PAS UNE.
//   · `module` — la capacité est-elle achetée. `null` = socle, toutes offres.
//   · `postures` — cette personne-là en a-t-elle l'usage.
//
// Le module dit ce que l'offre a payé ; la posture fait le tri entre les
// MÉTIERS. C'est la posture qui exclut « Coûts internes » chez l'indépendant,
// pas le module — parce que le module `facturation`, lui, est bien acheté.
// Sans cette seconde condition, tout métier verrait les réglages de tous les
// autres.
//
// LES OFFRES NE SONT PAS LISTÉES ICI, volontairement : elles se DÉDUISENT du
// module (quelles offres le portent) croisé avec les postures (lesquelles
// existent dans ces offres). Une liste d'offres écrite à la main serait une
// seconde saisie, et toute seconde saisie finit par diverger.
// =============================================================================

/**
 * Les réglages, avec leur portée.
 *
 * `legal: true` marque un réglage dont dépend un artefact contraint par la
 * loi — mentions de facture, numérotation, identité de l'entreprise. Ceux-là
 * ne peuvent JAMAIS rester en dur dans le code, et un écran qui les consomme
 * sans qu'ils existent est un défaut bloquant, pas une imperfection.
 */
export const REGLAGES = Object.freeze([
  // ── Mon entreprise ──────────────────────────────────────────────────────
  { cle: "identite", titre: "Identité de l'entreprise", module: null,
    postures: ["direction", "independant"], legal: true, etat: "livre" },
  { cle: "depots", titre: "Centres logistiques", module: "multi_depots",
    postures: ["direction", "depot"], legal: false, etat: "livre" },
  { cle: "fermetures", titre: "Fermetures de l'entreprise", module: null,
    postures: ["direction", "coordination"], legal: false, etat: "livre" },

  // ── Vendre et facturer ──────────────────────────────────────────────────
  { cle: "bareme", titre: "Barème (prix client)", module: "devis",
    postures: ["direction", "commerce"], legal: false, etat: "livre" },
  { cle: "facturation", titre: "Réglages de facturation", module: "facturation",
    postures: ["direction", "independant"], legal: true, etat: "livre" },
  { cle: "textes", titre: "Textes des dossiers", module: "devis",
    postures: ["direction", "commerce"], legal: true, etat: "livre" },

  // ── Coûts et grilles négociées ──────────────────────────────────────────
  // Pas de posture `independant` : un indépendant seul n'a pas de coût
  // interne à ventiler, il a un tarif.
  { cle: "cout", titre: "Coûts internes", module: null,
    postures: ["direction"], legal: false, etat: "livre" },
  { cle: "services", titre: "Grilles de services", module: null,
    postures: ["direction"], legal: false, etat: "livre" },

  // ── Mes listes ──────────────────────────────────────────────────────────
  { cle: "pieces", titre: "Pièces du relevé", module: "releve",
    postures: ["direction", "commerce"], legal: false, etat: "livre" },
  { cle: "fournitures", titre: "Fournitures d'emballage", module: "devis",
    postures: ["direction", "commerce"], legal: false, etat: "livre" },
  { cle: "materiel_terrain", titre: "Matériel de terrain", module: "terrain",
    postures: ["direction", "depot", "chef_equipe"], legal: false,
    etat: "livre" },

  // ── Mon dépôt ───────────────────────────────────────────────────────────
  { cle: "stockage", titre: "Zones et boxes", module: "stockage_3d",
    postures: ["direction", "depot"], legal: false, etat: "livre" },
  { cle: "contrats", titre: "Contrats de stockage", module: "stockage_3d",
    postures: ["direction", "depot"], legal: true, etat: "livre" },

  // ── Consulter ───────────────────────────────────────────────────────────
  { cle: "comptabilite", titre: "Comptabilité", module: "comptabilite",
    postures: ["direction"], legal: true, etat: "livre" },
  { cle: "depenses", titre: "Dépenses & dettes", module: "comptabilite",
    postures: ["direction"], legal: false, etat: "livre" },
  { cle: "journal", titre: "Journal", module: "journal",
    postures: ["direction"], legal: false, etat: "livre" },
  { cle: "archivage", titre: "Archivage", module: null,
    postures: ["direction"], legal: true, etat: "livre" },

  // ── Dashprod ────────────────────────────────────────────────────────────
  { cle: "abonnement", titre: "Mon offre", module: null,
    postures: ["direction", "independant"], legal: false, etat: "livre" },
  { cle: "apparence", titre: "Apparence", module: null,
    postures: ["direction", "independant"], legal: false, etat: "livre" },
  { cle: "confidentialite", titre: "Confidentialité & données", module: null,
    postures: ["direction", "independant"], legal: true, etat: "livre" },

  // ── LES DIX MANQUES, déclarés pour qu'ils cessent d'être invisibles ─────
  // Un manque déclaré est un manque qu'on peut tester. Tant qu'il vaut
  // `manquant`, tout écran qui en dépend est signalé comme non constructible.

  // Le manque le plus structurant : la pyramide passe par les rôles, et le
  // point de vérité ne les expose pas. `Equipe.jsx` les gère depuis
  // `Ressources` — qui peut quoi n'est pas un réglage d'équipe, c'est la
  // définition de l'entreprise.
  { cle: "roles", titre: "Rôles et capacités", module: null,
    postures: ["direction"], legal: false, etat: "manquant" },

  // Le moteur `bce.js` produit un `statutConfiance` que rien n'affiche.
  { cle: "identite_verifiee", titre: "Identité vérifiée (BCE, TVA)",
    module: null, postures: ["direction", "independant"], legal: true,
    etat: "manquant" },

  // Table `sequences` existante, aucune surface : une entreprise ne peut pas
  // voir sa propre numérotation, qui est pourtant une contrainte légale.
  { cle: "sequences", titre: "Séquences de numérotation",
    module: "facturation", postures: ["direction", "independant"],
    legal: true, etat: "manquant" },

  { cle: "espace_client", titre: "Ce que le client voit",
    module: "espace_client", postures: ["direction", "coordination"],
    legal: false, etat: "manquant" },

  { cle: "mentions", titre: "Mentions obligatoires et assurance",
    module: "facturation", postures: ["direction", "independant"],
    legal: true, etat: "manquant" },

  // Premier écran du parcours de l'indépendant : c'est un réglage.
  { cle: "disponibilites", titre: "Disponibilités et tarifs",
    module: "planning", postures: ["independant"], legal: false,
    etat: "manquant" },

  { cle: "prestataires", titre: "Prestataires externes et commissions",
    module: "planning", postures: ["direction", "coordination"],
    legal: false, etat: "manquant" },

  { cle: "peppol", titre: "Point d'accès Peppol", module: "peppol",
    postures: ["direction"], legal: true, etat: "manquant" },

  { cle: "notifications", titre: "Mail sortant et notifications",
    module: null, postures: ["direction", "coordination"], legal: false,
    etat: "manquant" },

  { cle: "conservation", titre: "Conservation et purge", module: null,
    postures: ["direction"], legal: true, etat: "manquant" },

  // Les documents qui prouvent le DROIT D'EXERCER : licence de transport,
  // accès à la profession de déménageur, attestation d'assurance RC. Même
  // famille que `identite_verifiee` — qu'est-ce qui atteste que cette société
  // peut légalement faire ce qu'elle vend.
  //
  // Ni un document de dossier (il ne concerne aucun client en particulier), ni
  // une pièce comptable (il ne se facture pas). Avec une date d'échéance et un
  // rappel : un document périmé est plus dangereux qu'un document absent,
  // parce qu'on croit l'avoir.
  // Les canaux du réseau auxquels on s'abonne. Un par corps de métier — le
  // réseau est HORIZONTAL : aucun corps ne commande les autres, et un
  // déménageur peut être donneur d'ordre le lundi et prestataire le mardi.
  // Réglage, et pas effet du plan : deux sociétés de la même offre ne
  // travaillent pas forcément les mêmes corps.
  { cle: "canaux_reseau", titre: "Canaux du réseau (corps de métier)",
    module: "crm", postures: ["direction", "coordination", "independant"],
    legal: false, etat: "manquant" },

  { cle: "acces_profession", titre: "Accès à la profession et licences",
    module: null, postures: ["direction", "independant"], legal: true,
    etat: "manquant" },
]);

/** Un réglage par sa clé. `null` plutôt qu'un défaut inventé. */
export function reglage(cle) {
  return REGLAGES.find((r) => r.cle === cle) || null;
}

/** Toutes les clés déclarées — la référence de ce qui est réglable. */
export const CLES_REGLAGES = Object.freeze(REGLAGES.map((r) => r.cle));

/** Les réglages livrés, par opposition à ceux encore déclarés `manquant`. */
export function reglagesLivres() {
  return REGLAGES.filter((r) => r.etat === "livre");
}

/** Les réglages dont dépend un artefact contraint par la loi. */
export function reglagesLegaux() {
  return REGLAGES.filter((r) => r.legal);
}
