// =============================================================================
// LE PARCOURS DE CHAQUE OFFRE — ce qu'on traverse, écran par écran.
//
// POURQUOI CE FICHIER. Une carte de prix ne fait pas comprendre un produit.
// Un visiteur ne se demande pas « combien de modules » : il se demande « il se
// passe quoi, chez moi, du premier appel jusqu'à l'argent sur le compte ». La
// landing listait des cases à cocher. Ce fichier décrit un TRAJET.
//
// TROIS CHOSES, PAS UNE :
//   · `parcours` — les étapes réelles, dans l'ordre où elles arrivent. Chaque
//     étape nomme l'ÉCRAN où elle se passe : c'est ce qui rend la promesse
//     vérifiable plutôt que publicitaire.
//   · `ecrans` — dérivé du parcours, jamais saisi deux fois.
//   · `pas_inclus` — dit franchement. Une offre dont on ne connaît pas les
//     limites se vend une fois et se rembourse ensuite.
//
// L'INVARIANT QUI COMPTE. Quand une offre porte des modules, chaque étape de
// son parcours doit s'appuyer sur un module qu'elle ouvre RÉELLEMENT. Sans ça
// la landing promettrait un écran que le RLS referme — exactement le genre
// d'écart qui a coûté cher sur le catalogue. Un test le tient.
//
// Les offres encore à `modules: []` décrivent un parcours à CONSTRUIRE. Elles
// ne sont pas souscriptibles, et la contrainte en base l'interdit tant que
// leurs modules sont vides : la promesse est datée « bientôt », pas vendue.
// =============================================================================

/**
 * Chaque entrée : { accroche, parcours: [{ etape, texte, ecran, module }],
 *                   pas_inclus: [texte] }
 */
export const PARCOURS_OFFRES = Object.freeze({

  // ── Les trois paliers déménageur ─────────────────────────────────────────
  starter: {
    accroche: "Sortir du papier sans changer de métier.",
    parcours: [
      { etape: "Un particulier appelle",
        texte: "Vous notez qui, quoi, où, quand — une fois. Ça ne se ressaisit "
             + "plus nulle part ensuite.",
        ecran: "Carnet", module: "crm" },
      { etape: "Vous allez voir sur place",
        texte: "Pièce par pièce, le volume se calcule pendant que vous "
             + "marchez. Plus de mètres cubes estimés au doigt mouillé.",
        ecran: "Relevé", module: "releve" },
      { etape: "Le devis part le soir même",
        texte: "Les volumes relevés deviennent un prix. Vos tarifs, votre "
             + "papier à en-tête, aucun calcul refait à la main.",
        ecran: "Devis", module: "devis" },
      { etape: "Le client signe en ligne",
        texte: "Un lien, une signature, une trace horodatée. Pas d'imprimante, "
             + "pas de scan, pas de « je n'ai jamais reçu ».",
        ecran: "Offre", module: "signature_client" },
      { etape: "Le jour J, l'équipe sait",
        texte: "Le planning est sur le téléphone des déménageurs, avec "
             + "l'adresse, l'accès, le matériel. Vous n'appelez plus pour "
             + "expliquer.",
        ecran: "Planning et Terrain", module: "planning" },
      { etape: "La facture suit le chantier",
        texte: "Ce qui a été fait devient la facture, numérotée dans une "
             + "séquence continue. Rien à recopier.",
        ecran: "Facture", module: "facturation" },
    ],
    pas_inclus: [
      "La facturation électronique vers les entreprises (Peppol) — c'est Regular.",
      "L'export comptable sans ressaisie — c'est Regular.",
      "La paie et les heures d'équipe — c'est Regular.",
      "Plusieurs centres logistiques — c'est Pro.",
    ],
  },

  regular: {
    accroche: "Le circuit complet, du premier appel jusqu'à l'argent encaissé.",
    parcours: [
      { etape: "Tout ce que fait Basique",
        texte: "Le carnet, le relevé, le devis, la signature, le planning, la "
             + "facture. Rien ne disparaît en montant.",
        ecran: "Le socle", module: "crm" },
      { etape: "Vous facturez des entreprises",
        texte: "La facture part au format structuré vers le service "
             + "comptable du client, sans PDF perdu dans une boîte mail.",
        ecran: "Facture Peppol", module: "peppol" },
      { etape: "Votre comptable ne ressaisit plus",
        texte: "Les pièces sortent dans son format. Fini l'enveloppe de "
             + "tickets à la fin du trimestre.",
        ecran: "Comptabilité", module: "comptabilite" },
      { etape: "Les heures se comptent toutes seules",
        texte: "L'équipe pointe sur le chantier. Les heures nourrissent la "
             + "paie sans passer par un tableur.",
        ecran: "Heures et Paie", module: "paie" },
      { etape: "Chaque chantier laisse une preuve",
        texte: "Photos avant/après, réserves, signature du client sur place. "
             + "Le litige se règle avec un document, pas avec une discussion.",
        ecran: "Rapport de chantier", module: "rapport_chantier" },
      { etape: "Vous retrouvez qui a fait quoi",
        texte: "Chaque action est tracée et consultable. Utile en cas de "
             + "contrôle, utile en cas de doute.",
        ecran: "Journal", module: "journal" },
    ],
    pas_inclus: [
      "Plusieurs centres logistiques, chacun son gestionnaire — c'est Pro.",
      "Le plan 3D des boxes de stockage — c'est Pro.",
    ],
  },

  pro: {
    accroche: "Plusieurs dépôts, chacun ses équipes, une seule vue d'ensemble.",
    parcours: [
      { etape: "Tout ce que fait Regular",
        texte: "Le circuit complet reste identique sur chaque site.",
        ecran: "Le circuit complet", module: "facturation" },
      { etape: "Chaque dépôt a son périmètre",
        texte: "Un gestionnaire voit son centre, ses équipes, ses chantiers — "
             + "et rien du centre d'à côté.",
        ecran: "Centres logistiques", module: "multi_depots" },
      { etape: "Vous gardez la vue d'ensemble",
        texte: "Où en est chaque centre, en un écran, sans appeler les "
             + "responsables un par un.",
        ecran: "Rapport des centres", module: "gestionnaire_depot" },
      { etape: "Le garde-meubles se voit",
        texte: "Les boxes, les zones, ce qui est occupé et par qui — sur un "
             + "plan, pas sur un tableur.",
        ecran: "Stockage", module: "stockage_3d" },
      { etape: "L'international entre dans le circuit",
        texte: "Les dossiers hors frontières suivent le même chemin que les "
             + "autres, avec leurs documents propres.",
        ecran: "International", module: "international" },
    ],
    pas_inclus: [
      "Un développement sur mesure : Dashprod est un produit, pas une agence.",
    ],
  },

  // ── Les offres sectorielles — parcours à construire ──────────────────────
  independant_manutention: {
    accroche: "Être trouvé, planifié, prouvé, payé — sans relancer personne.",
    parcours: [
      { etape: "On sait quand vous êtes libre",
        texte: "Vous posez vos disponibilités et vos tarifs une fois. Les "
             + "donneurs d'ordre voient les créneaux réels, pas une promesse.",
        ecran: "Ma disponibilité", module: "planning" },
      { etape: "Une mission vous arrive",
        texte: "Date, adresse, durée prévue, ce qu'il y a à faire, qui "
             + "commande. Vous acceptez ou vous refusez — en un geste, pas en "
             + "trois appels.",
        ecran: "Mes missions", module: "planning" },
      { etape: "Vous pointez sur place",
        texte: "Arrivée, départ, pauses. C'est ce compteur qui se facturera, "
             + "pas une estimation reconstituée le lendemain.",
        ecran: "Terrain", module: "terrain" },
      { etape: "Vous repartez avec la preuve",
        texte: "Photos de l'état des biens, réserves éventuelles, signature du "
             + "client sur votre téléphone. Le litige devient un document.",
        ecran: "Rapport d'intervention", module: "rapport_chantier" },
      { etape: "La facture sort des heures acceptées",
        texte: "Les heures validées deviennent la facture, numérotée et "
             + "conforme. Vous ne recomptez rien.",
        ecran: "Ma facturation", module: "facturation" },
      { etape: "Vous voyez ce qui reste dû",
        texte: "Qui a payé, qui doit encore, depuis combien de jours. La "
             + "relance part d'ici.",
        ecran: "Mes encours", module: "facturation" },
    ],
    pas_inclus: [
      "Le relevé de volume et le devis de déménagement : ce n'est pas votre métier.",
      "La paie : vous êtes indépendant, il n'y a personne à payer.",
      "Un seul accès — l'offre est faite pour une personne, pas pour une équipe.",
      "Le numéro d'entreprise est vérifié à l'inscription : sans BCE valide, "
        + "pas de compte.",
    ],
  },

  donneur_ordre: {
    accroche: "Envoyer une mission, la suivre, en garder la preuve.",
    parcours: [
      { etape: "Vous confiez une mission",
        texte: "Ce qu'il y a à faire, où, quand, pour quel client. Une fois, "
             + "au bon endroit.",
        ecran: "Nouvelle mission" },
      { etape: "Un prestataire l'accepte",
        texte: "Vous voyez qui prend, et quand. Plus d'appels pour savoir si "
             + "c'est couvert.",
        ecran: "Suivi des missions" },
      { etape: "Vous suivez sans téléphoner",
        texte: "Heure d'arrivée réelle, qui est intervenu, où ça en est.",
        ecran: "Suivi des missions" },
      { etape: "La livraison est prouvée",
        texte: "Signature du destinataire, photos de l'état des biens. Le "
             + "litige se traite avec un document.",
        ecran: "Preuves" },
    ],
    pas_inclus: [
      "La gestion de votre propre flotte et de vos propres équipes : "
        + "c'est une offre déménageur.",
      "Gratuit à l'usage, mais une commission s'applique aux missions "
        + "confiées via le réseau.",
    ],
  },

  garde_meubles: {
    accroche: "Vos contrats se facturent chaque mois, sans y penser.",
    parcours: [
      { etape: "Un client réserve un box",
        texte: "Unité attribuée, durée, tarif. Le contrat existe, daté.",
        ecran: "Contrats" },
      { etape: "L'échéance tombe toute seule",
        texte: "Chaque période génère sa facture, avec le prorata d'entrée et "
             + "de sortie calculé.",
        ecran: "Échéances" },
      { etape: "Vous voyez ce qui est occupé",
        texte: "Quel box, par qui, jusqu'à quand. Sur un plan.",
        ecran: "Stockage" },
      { etape: "Vous suivez les impayés",
        texte: "Référence de paiement, ce qui reste dû, depuis quand.",
        ecran: "Encours" },
    ],
    pas_inclus: [
      "Le déménagement lui-même : si vous transportez aussi, c'est une offre déménageur.",
    ],
  },

  groupe_liftier: {
    accroche: "Votre flotte, vos couronnes, vos équipes — au même endroit.",
    parcours: [
      { etape: "Une demande de levage arrive",
        texte: "Hauteur, accès, durée, ce qu'il y a à monter.",
        ecran: "Demandes" },
      { etape: "Vous affectez une machine",
        texte: "Quel lift, quelle couronne, quel opérateur. Sans double "
             + "réservation.",
        ecran: "Planning machines" },
      { etape: "L'opérateur pointe",
        texte: "Arrivée sur site, durée réelle. Il pointe sans compter comme "
             + "un accès bureau facturé.",
        ecran: "Terrain" },
      { etape: "L'intervention est prouvée",
        texte: "Photos, signature, hauteur atteinte. Le professionnel qui "
             + "vous a mandaté reçoit la même chose.",
        ecran: "Preuves" },
    ],
    pas_inclus: [
      "Les opérateurs sur machine ne sont pas des accès bureau : 5 accès "
        + "inclus, +30 € par accès, plafond dur à 15.",
    ],
  },

  logistique_mobilier: {
    accroche: "Arrivages, quais, zones : le débit sous contrôle.",
    parcours: [
      { etape: "Un arrivage est annoncé",
        texte: "Quoi, quand, pour quel client final.",
        ecran: "Arrivages" },
      { etape: "Un créneau de quai est réservé",
        texte: "Le camion sait quand se présenter, le quai sait qui arrive.",
        ecran: "Quais" },
      { etape: "La marchandise prend une zone",
        texte: "Où c'est posé, combien de temps, pour qui.",
        ecran: "Zones" },
      { etape: "La livraison sort et se prouve",
        texte: "Signature, état des biens, horodatage.",
        ecran: "Sorties" },
    ],
    pas_inclus: [
      "Offre encore à l'étude : elle ne s'affiche pas comme annonçable.",
    ],
  },
});

/** Le parcours d'une offre. `null` plutôt qu'un objet vide trompeur. */
export function parcoursOffre(code) {
  return PARCOURS_OFFRES[code] || null;
}

/**
 * Les écrans traversés, dans l'ordre, sans doublon. DÉRIVÉ du parcours : un
 * écran ne se saisit qu'une fois, à l'étape où il sert.
 */
export function ecransOffre(code) {
  const p = parcoursOffre(code);
  if (!p) return [];
  const vus = new Set();
  const out = [];
  for (const e of p.parcours) {
    if (vus.has(e.ecran)) continue;
    vus.add(e.ecran);
    out.push({ nom: e.ecran, role: e.etape, module: e.module ?? null });
  }
  return out;
}
