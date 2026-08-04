// =============================================================================
// Le journal, en français.
//
// La base enregistre des types techniques : `Dossier.Modifie`,
// `Membre.CapaciteAccordee`, `Affaire.Confirme`. Utilisables par une machine,
// illisibles pour un associé qui cherche à comprendre ce qui s'est passé la
// semaine dernière.
//
// Ce module traduit. Il ne décide de rien et ne filtre rien : la base a déjà
// tranché ce que l'appelant a le droit de voir.
//
// Principe de rédaction : on nomme l'ACTE, pas la table. « Dossier modifié »
// et non « affaires UPDATE ». Et quand l'événement porte un détail utile
// (quels champs, quelle capacité, quel montant), on le dit — c'est justement
// ce qu'on cherche quand on ouvre un journal.
// =============================================================================

/**
 * Familles d'événements, pour filtrer et colorer.
 * L'ordre compte : le premier motif qui correspond gagne.
 */
export const FAMILLES = Object.freeze([
  { cle: "decision", libelle: "Décisions", motif: /^Decision\./, ton: "decision" },
  { cle: "argent", libelle: "Argent", motif: /^(Facture|Paiement)\./, ton: "argent" },
  { cle: "dossier", libelle: "Dossiers", motif: /^(Dossier|Affaire|Client|Devis|Document|Signature|Offre|AccesClient)\./, ton: "dossier" },
  // Attention au point final : `Membre\.(Affecte|Desaffecte)` suivi de `\.`
  // exigerait « Membre.Affecte. » — un point de trop. On sort donc ce cas de
  // l'alternation générale.
  { cle: "planning", libelle: "Planning",
    motif: /^(?:(?:Mission|Chantier|Pointage|Pause|Chrono)\.|Membre\.(?:Affecte|Desaffecte)$)/,
    ton: "planning" },
  { cle: "equipe", libelle: "Équipe", motif: /^(Membre|Utilisateur|Role|Conge|Véhicule|Vehicule)\./, ton: "equipe" },
  { cle: "entreprise", libelle: "Entreprise", motif: /^(Organisation|RGPD|Parametres)\./, ton: "entreprise" },
]);

/** Famille d'un type d'événement ; « autre » si aucun motif ne correspond. */
export function familleDe(type) {
  const t = String(type || "");
  return FAMILLES.find((f) => f.motif.test(t))?.cle || "autre";
}

/** Nom lisible d'un champ technique. */
const CHAMPS = {
  heure_souhaitee: "heure", date_souhaitee: "date", date_visite: "date de visite",
  date_emballage: "date d'emballage", heure_emballage: "heure d'emballage",
  releve: "relevé", etat: "état", archive_le: "archivage",
  equipe: "équipe", camions: "camions", formule: "formule",
  heure_depart_prevue: "heure de départ", heure_arrivee_prevue: "heure d'arrivée",
  tva_num: "numéro de TVA", fact_lignes: "adresse de facturation",
  entrees: "paramètres du devis", resultats: "résultat du devis",
  retenu: "scénario retenu", montant_centimes: "montant", moyen: "moyen de paiement",
  taux_horaire: "taux horaire", precompte_pct: "précompte",
};

function nommerChamps(liste) {
  const noms = (liste || []).map((c) => CHAMPS[c] || String(c).replace(/_/g, " "));
  if (noms.length === 0) return "";
  if (noms.length === 1) return noms[0];
  if (noms.length === 2) return `${noms[0]} et ${noms[1]}`;
  return `${noms.slice(0, 2).join(", ")} et ${noms.length - 2} autre${noms.length > 3 ? "s" : ""}`;
}

/**
 * Une phrase pour un événement. Toujours au passé et impersonnelle : le nom de
 * l'auteur est affiché à côté, le répéter alourdirait la lecture.
 */
export function phraseEvenement(e) {
  const t = String(e?.type || "");
  const d = e?.details || {};

  // Les décisions sont écrites par un humain : on rend le texte tel quel.
  if (t === "Decision.Notee") return String(d.texte || "").trim() || "Décision notée";

  // Modifications directes : ce qui change est l'information utile.
  if (/\.Modifie$/.test(t)) {
    const quoi = t.split(".")[0];
    const champs = nommerChamps(d.champs);
    return champs ? `${quoi} modifié — ${champs}` : `${quoi} modifié`;
  }
  if (/\.Cree$/.test(t)) return `${t.split(".")[0]} créé`;
  if (/\.Supprime$/.test(t)) return `${t.split(".")[0]} supprimé`;

  const dit = {
    "Affaire.Annulee": "Dossier annulé",
    "Affaire.Reprise": "Annulation reprise",
    "Facture.Emise": d.numero ? `Facture ${d.numero} émise` : "Facture émise",
    "Document.Instancie": "Offre préparée",
    "Document.Envoye": "Offre envoyée au client",
    "Signature.Recueillie": "Offre signée",
    "Offre.SigneeParClient": d.signataire
      ? `Offre signée en ligne par ${d.signataire}` : "Offre signée en ligne",
    "AccesClient.Cree": "Code de signature généré",
    "Chantier.Termine": "Chantier clôturé",
    "Pointage.Declare": "Heures déclarées",
    "Pause.Declaree": "Pause déclarée",
    "Pause.Retiree": "Pause retirée",
    "Mission.CreeeALaConfirmation": "Mission créée",
    "Mission.HorairesDefinis": "Horaires de mission définis",
    "Membre.Affecte": "Membre affecté à une mission",
    "Membre.Desaffecte": "Membre retiré d'une mission",
    "Membre.CapaciteAccordee": d.capacite
      ? `Autorisation accordée : ${d.capacite}` : "Autorisation accordée",
    "Membre.CapaciteRetiree": d.capacite
      ? `Autorisation retirée : ${d.capacite}` : "Autorisation retirée",
    "Utilisateur.Invite": "Membre invité",
    "Utilisateur.MetierDefini": "Métier terrain défini",
    "Role.Affecte": "Rôle attribué",
    "Organisation.Inscription": "Société créée",
    "RGPD.PurgeOperationnelle": d.dossiers
      ? `Purge RGPD : ${d.dossiers} dossier(s)` : "Purge RGPD",
  };
  if (dit[t]) return dit[t];

  // Transitions d'état : « Affaire.Confirme » → « Dossier confirmé ».
  const m = /^Affaire\.([A-Za-z_]+)$/.exec(t);
  if (m) {
    const etats = { Devis: "passé en devis", Envoye: "envoyé au client",
      Confirme: "confirmé", Planifie: "planifié", En_cours: "démarré",
      Effectue: "effectué", Clos: "clos", Reporte: "reporté" };
    return `Dossier ${etats[m[1]] || m[1].toLowerCase()}`;
  }

  // Rien de prévu : on reste lisible plutôt que d'afficher la clé brute.
  return t.replace(/\./g, " ").replace(/_/g, " ");
}

/** Regroupe les entrées par jour, du plus récent au plus ancien. */
export function parJour(entrees) {
  const jours = new Map();
  for (const e of entrees || []) {
    const j = String(e.quand || "").slice(0, 10);
    if (!j) continue;
    jours.set(j, [...(jours.get(j) || []), e]);
  }
  return [...jours.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Filtre par famille, sans toucher à l'ordre. */
export function filtrerParFamille(entrees, famille) {
  if (!famille || famille === "tout") return entrees || [];
  return (entrees || []).filter((e) => familleDe(e.type) === famille);
}
