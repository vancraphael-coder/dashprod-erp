// =============================================================================
// Adaptateur de données — deux modes (Réf. 3 · T0 : adaptateur au bord).
// Mode « réel » : Supabase branché et session ouverte → la base, via les
// commandes gardées. Mode « démo » : base absente → magasin local (localStorage)
// avec données de démonstration, pour voir et manipuler les écrans sans
// attendre le branchement. Les écrans consomment CET adaptateur, jamais
// Supabase directement : au branchement, rien ne change côté écrans.
// =============================================================================

import { supabase, configPresente } from "./supabase.js";
import { figerInstance, empreinte } from "@domaine/documents/instances.js";
import { resoudreCbd } from "@domaine/documents/modeles.js";
import { CGV_VERSION_COURANTE } from "@domaine/documents/cgv.js";
import { volumeTotal, articlesADemonter } from "@domaine/releve/volumetrie.js";
import { briefMission } from "@domaine/communication/brief.js";

const CLE = "dashprod-demo-v1";

/** Mode courant des données. */
export function modeDonnees() {
  return configPresente ? "reel" : "demo";
}

// ── Magasin de démonstration ──────────────────────────────────────────────────

const DEMO_INITIAL = {
  clients: [
    { id: "c1", nom: "Famille Lambert", tel: "0475 11 22 33", email: "lambert@exemple.be" },
    { id: "c2", nom: "SPRL Delcourt", tel: "010 45 67 89", email: "info@delcourt.be" },
  ],
  affaires: [
    { id: "a1", clientId: "c1", etat: "confirme", formule: "tarifaire",
      creeLe: "2026-07-01",
      faits: { formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 18, elevateur: true },
      couts: { mainOeuvreEuros: 400, carburantEuros: 45, materielEuros: 30 },
      tvac_centimes: 114950, marge_pct: 33.7 },
    { id: "a2", clientId: "c2", etat: "devis", formule: "forfait",
      creeLe: "2026-07-04",
      faits: { formule: "forfait", forfaitTvacEuros: 2420 },
      couts: { mainOeuvreEuros: 900, carburantEuros: 120, materielEuros: 150 },
      tvac_centimes: 242000, marge_pct: 41.5 },
  ],
  missions: [
    { id: "m1", affaire_id: "a1", date: "2026-07-14", heure: "08:00", type: "demenagement",
      etat: "planifiee", client: "Famille Lambert",
      affectations: [{ utilisateur_id: "t1" }, { utilisateur_id: "t2" }, { utilisateur_id: "t3" }] },
    { id: "m2", affaire_id: "a2", date: "2026-07-14", heure: "13:30", type: "demenagement",
      etat: "planifiee", client: "SPRL Delcourt",
      affectations: [{ utilisateur_id: "t1" }] },
    { id: "m3", affaire_id: "a2", date: "2026-07-16", heure: "09:00", type: "emballage",
      etat: "planifiee", client: "SPRL Delcourt", affectations: [] },
  ],
};

function lireDemo() {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return JSON.parse(brut);
  } catch { /* stockage indisponible : repartir du seed */ }
  const copie = JSON.parse(JSON.stringify(DEMO_INITIAL));
  ecrireDemo(copie);
  return copie;
}

function ecrireDemo(donnees) {
  try { localStorage.setItem(CLE, JSON.stringify(donnees)); } catch { /* mode privé */ }
}

function idDemo() {
  return "d" + Math.random().toString(36).slice(2, 10);
}

// ── API de l'adaptateur ───────────────────────────────────────────────────────

/** Liste les clients (pour le dédoublonnage à la création). */
export async function listerClients() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("clients").select("id, nom, tel, email");
    if (error) throw error;
    return data || [];
  }
  return lireDemo().clients;
}

/** Liste les affaires avec leur client (pour la liste des dossiers). */
export async function listerAffaires() {
  // Tri métier : le bureau vit dans l'ordre chronologique des CHANTIERS
  // (date souhaitée), les dossiers sans date en fin, puis créations récentes.
  const trier = (liste) => liste.sort((x, y) => {
    if (x.date_souhaitee && y.date_souhaitee)
      return x.date_souhaitee.localeCompare(y.date_souhaitee);
    if (x.date_souhaitee) return -1;
    if (y.date_souhaitee) return 1;
    return (y.creeLe || "").localeCompare(x.creeLe || "");
  });

  if (modeDonnees() === "reel") {
    const { data, error } = await supabase
      .from("affaires")
      .select("id, etat, formule, created_at, date_souhaitee, clients(id, nom, tel), scenarios(retenu, resultats)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return trier((data || []).map((a) => {
      // Montants depuis le scénario retenu (corrige : les cartes réelles
      // n'affichaient jamais aucun montant).
      const retenu = (a.scenarios || []).find((sc) => sc.retenu) || (a.scenarios || [])[0];
      const r = retenu?.resultats || {};
      return {
        id: a.id, etat: a.etat, formule: a.formule, creeLe: a.created_at,
        date_souhaitee: a.date_souhaitee || null,
        client: a.clients,
        tvac_centimes: r.tvac_centimes ?? null,
        marge_pct: r.marge_pct ?? null,
        faits: null, couts: null,
      };
    }));
  }
  const d = lireDemo();
  return trier(d.affaires
    .map((a) => ({
      ...a,
      client: d.clients.find((c) => c.id === a.clientId),
      date_souhaitee: a.contact?.date || null,
    })));
}

/** Récupère une affaire complète. */
export async function obtenirAffaire(id) {
  const liste = await listerAffaires();
  return liste.find((a) => a.id === id) || null;
}

/**
 * Crée une affaire (et son client si nouveau). En mode réel, passe par les
 * tables clients/affaires (les commandes gardées prennent le relais au
 * branchement) ; en démo, écrit le magasin local.
 * @returns {Promise<string>} id de l'affaire créée
 */
export async function creerAffaire({ clientId, clientNom, tel, email }) {
  if (modeDonnees() === "reel") {
    let cid = clientId;
    if (!cid) {
      const { data, error } = await supabase.from("clients")
        .insert({ nom: clientNom, tel, email }).select("id").single();
      if (error) throw error;
      cid = data.id;
    }
    const { data: aff, error: e2 } = await supabase.from("affaires")
      .insert({ client_id: cid, etat: "brouillon" }).select("id").single();
    if (e2) throw e2;
    return aff.id;
  }
  const d = lireDemo();
  let cid = clientId;
  if (!cid) {
    cid = idDemo();
    d.clients.push({ id: cid, nom: clientNom, tel: tel || "", email: email || "" });
  }
  const aid = idDemo();
  d.affaires.push({
    id: aid, clientId: cid, etat: "devis", formule: "tarifaire",
    creeLe: new Date().toISOString().slice(0, 10),
    faits: null, couts: null, tvac_centimes: null, marge_pct: null,
  });
  ecrireDemo(d);
  return aid;
}

/**
 * Enregistre le chiffrage d'une affaire (faits, coûts, résultat calculé).
 * En mode réel : table scenarios (retenu) — câblage vérifié au branchement.
 */
export async function enregistrerChiffrage(affaireId, { faits, couts, resultat }) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("scenarios").insert({
      affaire_id: affaireId, nom: "Scénario retenu", retenu: true,
      entrees: { ...faits, couts }, resultats: resultat,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) {
    a.faits = faits; a.couts = couts; a.formule = faits.formule;
    a.tvac_centimes = resultat.tvac_centimes;
    a.marge_pct = resultat.marge_pct;
    ecrireDemo(d);
  }
}

// ── Profil, invitations et gestion d'équipe (réel uniquement — l'auth réelle
// n'a pas de sens en mode démonstration) ──────────────────────────────────────

/**
 * Réclame l'invitation en attente pour l'email Google connecté (lie
 * auth.uid() à la ligne créée par le master). Idempotent.
 * @returns {Promise<{statut: "lie"|"deja_lie", org_id: string}>}
 */
export async function reclamerInvitation() {
  const { data, error } = await supabase.rpc("cmd_reclamer_invitation");
  if (error) throw error;
  return data;
}

/** Profil courant : identité, organisation, capacités (S9). */
export async function monProfil() {
  const { data, error } = await supabase.rpc("mon_profil");
  if (error) throw error;
  return data;
}

/** Liste les membres de l'organisation avec leurs rôles (pour l'admin). */
export async function listerMembres() {
  const { data, error } = await supabase
    .from("utilisateurs")
    .select("id, nom, email, actif, utilisateur_roles(roles(cle, libelle))");
  if (error) throw error;
  return (data || []).map((u) => ({
    id: u.id, nom: u.nom, email: u.email, actif: u.actif,
    roles: (u.utilisateur_roles || []).map((r) => r.roles?.cle).filter(Boolean),
  }));
}

/**
 * Invite un membre (email + rôle) — le master décide qui rejoint quel secteur.
 * Deux commandes gardées enchaînées : provisionner puis affecter (cmd_*, 0004).
 */
export async function inviterMembre({ email, nom, roleCle }) {
  const { data: id, error } = await supabase.rpc("cmd_inviter_utilisateur", {
    p_email: email, p_nom: nom,
  });
  if (error) throw error;
  const { error: e2 } = await supabase.rpc("cmd_affecter_role", {
    p_utilisateur: id, p_role_cle: roleCle,
  });
  if (e2) throw e2;
  return id;
}

// ── Offre & Signature (résout C-02, C-26) ─────────────────────────────────────

/**
 * Prépare et fige une instance d'offre (résout C-02). En mode réel : appelle
 * cmd_instancier_offre (C.B.D. obligatoire, non désactivable, S6). En mode
 * démo : utilise le domaine PUR (figerInstance/resoudreCbd) directement — la
 * même garantie d'immuabilité, sans base.
 */
export async function envoyerOffre(affaireId, { type, contenu }) {
  if (modeDonnees() === "reel") {
    const empreinteLocale = empreinte(contenu);
    const { data: id, error } = await supabase.rpc("cmd_instancier_offre", {
      p_affaire: affaireId, p_type: type, p_contenu: contenu, p_empreinte: empreinteLocale,
    });
    if (error) throw error;
    const { error: e2 } = await supabase.rpc("cmd_geler_instance", { p_instance: id });
    if (e2) throw e2;
    return { id, empreinte: empreinteLocale };
  }
  // Démo : la C.B.D. est jointe symboliquement (aucun fichier réel en local).
  const verifCbd = resoudreCbd(
    [{ id: "cbd-demo", type: "cbd", version: 1, actif: true, langue: "fr", juridiction: "BE" }],
    type
  );
  if (verifCbd.erreur) throw new Error("C.B.D. active absente — offre non instanciable.");
  const instance = figerInstance({
    modeleVersionId: `${type}-demo`, cbdVersionId: verifCbd.cbdVersionId,
    contenu, horodatage: new Date().toISOString(),
  });
  const d = lireDemo();
  d.instances = d.instances || {};
  d.instances[affaireId] = { ...instance, id: idDemo(), statut: "envoyee" };
  ecrireDemo(d);
  return { id: d.instances[affaireId].id, empreinte: instance.empreinte };
}

/** Récupère l'instance d'offre d'une affaire (figée), si elle existe. */
export async function obtenirInstance(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("documents_instances")
      .select("id, contenu, empreinte_sha256, statut, envoye_le, signatures(signataire_nom, image_trait, horodatage)")
      .eq("affaire_id", affaireId).order("genere_le", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const sig = (data.signatures && data.signatures[0]) || null;
    return {
      ...data,
      signature: sig ? { nom: sig.signataire_nom, image: sig.image_trait, date: sig.horodatage } : null,
    };
  }
  const d = lireDemo();
  return (d.instances && d.instances[affaireId]) || null;
}

/**
 * Recueille la signature (dossier de preuve, C-26). En mode réel : commande
 * gardée cmd_signer_instance. En mode démo : simule le scellement local.
 */
export async function signerOffre(instanceId, { affaireId, nom, canal, image }) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_signer_instance", {
      p_instance: instanceId, p_nom: nom, p_canal: canal || "ecran", p_image: image,
    });
    if (error) throw error;
    // La signature déverrouille la garde : transition de l'affaire vers 'confirme'.
    const { error: e2 } = await supabase.rpc("cmd_transition_affaire", {
      p_affaire: affaireId, p_cible: "confirme", p_contexte: { instanceSignee: true },
    });
    if (e2) throw e2;
    return;
  }
  const d = lireDemo();
  if (d.instances?.[affaireId]) {
    d.instances[affaireId].statut = "signee";
    d.instances[affaireId].signature = { nom, image, date: new Date().toISOString() };
  }
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) a.etat = "confirme";
  ecrireDemo(d);
}

// ── Relevé volumétrique ───────────────────────────────────────────────────────

/** Enregistre l'inventaire d'une affaire (volume calculé côté domaine). */
export async function enregistrerReleve(affaireId, inventaire) {
  if (modeDonnees() === "reel") {
    // En réel : persistance dans une colonne jsonb de l'affaire (releve).
    const { error } = await supabase.from("affaires")
      .update({ releve: inventaire }).eq("id", affaireId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.releve = inventaire; ecrireDemo(d); }
}

/** Récupère l'inventaire d'une affaire, ou tableau vide. */
export async function obtenirReleve(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("releve").eq("id", affaireId).maybeSingle();
    if (error) throw error;
    return data?.releve || [];
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return (a && a.releve) || [];
}

// ── Planning / Missions ───────────────────────────────────────────────────────

const MEMBRES_DEMO = [
  { id: "t1", nom: "Marco", metier: "chef_equipe" },
  { id: "t2", nom: "Yassine", metier: "chauffeur" },
  { id: "t3", nom: "David", metier: "demenageur" },
  { id: "t4", nom: "Sofiane", metier: "demenageur" },
];

/** Membres de l'organisation (pour l'affectation). */
export async function listerMembresSimples() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("utilisateurs")
      .select("id, nom, metier").eq("actif", true);
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  return MEMBRES_DEMO.map((m) => ({ ...m, metier: (d.metiers || {})[m.id] || m.metier }));
}

/** Liste les missions (avec affectations) — planning bureau. */
export async function listerMissions() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("missions")
      .select("id, date, heure, type, etat, affaire_id, affaires(clients(nom)), mission_affectations(utilisateur_id)")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data || []).map((m) => ({
      id: m.id, date: m.date, heure: m.heure, type: m.type, etat: m.etat,
      client: m.affaires?.clients?.nom,
      affectations: (m.mission_affectations || []).map((a) => ({ utilisateur_id: a.utilisateur_id })),
    }));
  }
  const d = lireDemo();
  return d.missions || [];
}

/** Crée une mission pour une affaire (planification). */
export async function creerMission(affaireId, { date, heure, type }) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_creer_mission", {
      p_affaire: affaireId, p_type: type || "demenagement", p_date: date, p_heure: heure,
    });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  d.missions = d.missions || [];
  const aff = d.affaires.find((a) => a.id === affaireId);
  const client = aff && d.clients.find((c) => c.id === aff.clientId);
  const id = idDemo();
  d.missions.push({
    id, affaire_id: affaireId, date, heure: heure || "08:00",
    type: type || "demenagement", etat: "planifiee",
    client: client?.nom, affectations: [],
  });
  ecrireDemo(d);
  return id;
}

/** Affecte (ou désaffecte) un membre à une mission — bascule. */
export async function basculerAffectation(missionId, utilisateurId, roleMission) {
  if (modeDonnees() === "reel") {
    // En réel, l'affectation est idempotente côté commande ; la désaffectation
    // serait une commande dédiée (à ajouter). Ici on affecte.
    const { error } = await supabase.rpc("cmd_affecter_membre", {
      p_mission: missionId, p_utilisateur: utilisateurId, p_role: roleMission || "demenageur",
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (!m) return;
  m.affectations = m.affectations || [];
  const existe = m.affectations.find((a) => a.utilisateur_id === utilisateurId);
  if (existe) m.affectations = m.affectations.filter((a) => a.utilisateur_id !== utilisateurId);
  else m.affectations.push({ utilisateur_id: utilisateurId });
  ecrireDemo(d);
}

// ── Facturation ───────────────────────────────────────────────────────────────

/**
 * Construit les lignes de facture proposées pour une affaire : la prestation
 * (depuis le chiffrage retenu) et, à terme, le matériel consommé (Stocks).
 * En démo, dérive du montant TVAC déjà calculé.
 */
export async function lignesFacturePour(affaireId) {
  const a = await obtenirAffaire(affaireId);
  if (!a) return [];
  const lignes = [];
  if (a.faits) {
    // Recompose la prestation HTVA depuis le TVAC connu (démo) ou le scénario (réel).
    const htva = a.tvac_centimes ? Math.round(a.tvac_centimes / 1.21) : 0;
    lignes.push({ type: "prestation", libelle: `Déménagement — ${a.client?.nom || ""}`.trim(),
                  montant_htva_centimes: htva });
  }
  return lignes;
}

/** Liste les factures d'une organisation avec leur solde (vue). */
export async function listerFactures() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("factures")
      .select("id, numero, type, date_emission, tvac_centimes, emise, affaire_id, affaires(clients(nom))")
      .order("date_emission", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  return (d.factures || []).slice().sort((x, y) => (y.date_emission || "").localeCompare(x.date_emission || ""));
}

/** Émet une facture pour une affaire (numéro légal + gel). */
export async function emettreFacture(affaireId, lignes, tauxTva = 21) {
  if (modeDonnees() === "reel") {
    // En réel : insérer la facture + lignes, puis cmd_emettre_facture (séquence).
    // Le détail d'insertion est vérifié au branchement ; ici l'appel de commande.
    const { data: fid, error } = await supabase.from("factures")
      .insert({ affaire_id: affaireId, type: "facture" }).select("id").single();
    if (error) throw error;
    for (const [i, l] of lignes.entries()) {
      await supabase.from("facture_lignes").insert({
        facture_id: fid.id, type: l.type, libelle: l.libelle,
        montant_htva_centimes: l.montant_htva_centimes, ordre: i + 1,
      });
    }
    const { data: numero, error: e2 } = await supabase.rpc("cmd_emettre_facture", { p_facture: fid.id });
    if (e2) throw e2;
    return { id: fid.id, numero };
  }
  const d = lireDemo();
  d.factures = d.factures || [];
  d.seqFacture = (d.seqFacture || 0) + 1;
  const annee = new Date().getFullYear();
  const numero = `${annee}-${String(d.seqFacture).padStart(6, "0")}`;
  const htva = lignes.reduce((s, l) => s + l.montant_htva_centimes, 0);
  const tva = Math.round(htva * tauxTva / 100);
  const aff = d.affaires.find((a) => a.id === affaireId);
  const client = aff && d.clients.find((c) => c.id === aff.clientId);
  const id = idDemo();
  d.factures.push({
    id, affaire_id: affaireId, numero, type: "facture",
    date_emission: new Date().toISOString().slice(0, 10),
    htva_centimes: htva, tva_centimes: tva, tvac_centimes: htva + tva,
    emise: true, lignes, paiements: [], client: client?.nom,
  });
  if (aff) aff.etat = "facture";
  ecrireDemo(d);
  return { id, numero };
}

/** Récupère une facture avec ses paiements. */
export async function obtenirFacture(factureId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("factures")
      .select("*, facture_lignes(*), paiements(*)").eq("id", factureId).single();
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  return (d.factures || []).find((f) => f.id === factureId) || null;
}

/** Enregistre un paiement (ou remboursement si négatif) sur une facture. */
export async function enregistrerPaiement(factureId, { montant_centimes, moyen, date }) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("paiements").insert({
      facture_id: factureId, montant_centimes, moyen, date_paiement: date,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const f = (d.factures || []).find((x) => x.id === factureId);
  if (f) {
    f.paiements = f.paiements || [];
    f.paiements.push({ montant_centimes, moyen, date: date || new Date().toISOString().slice(0, 10) });
    ecrireDemo(d);
  }
}

// ── Dossier : contact, adresses, date souhaitée ───────────────────────────────

/**
 * Récupère le volet Contact d'une affaire : adresses de chargement et de
 * déchargement (étage, ascenseur, monte-meubles — table affaire_adresses,
 * Module 3), date/heure souhaitées, remarques.
 */
export async function obtenirContact(affaireId) {
  if (modeDonnees() === "reel") {
    const { data: a, error } = await supabase.from("affaires")
      .select("date_souhaitee, heure_souhaitee, notes_commerciales")
      .eq("id", affaireId).single();
    if (error) throw error;
    const { data: adr, error: e2 } = await supabase.from("affaire_adresses")
      .select("*").eq("affaire_id", affaireId).order("ordre");
    if (e2) throw e2;
    const map = (sens) => (adr || []).filter((x) => x.sens === sens).map((x) => ({
      id: x.id, adresse: x.adresse || "", type: x.type_lieu || "maison",
      etage: x.etage || "", ascenseur: !!x.ascenseur, monteMeubles: !!x.monte_meubles,
    }));
    return {
      charges: map("chargement"), decharges: map("dechargement"),
      date: a?.date_souhaitee || "", heure: (a?.heure_souhaitee || "08:00").slice(0, 5),
      notes: a?.notes_commerciales || "",
    };
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return (a && a.contact) || { charges: [], decharges: [], date: "", heure: "08:00", notes: "" };
}

/**
 * Sauve le volet Contact : remplace les adresses de l'affaire (stratégie
 * simple delete+insert — volumes minuscules), met à jour date/heure/notes.
 */
export async function sauverContact(affaireId, { charges, decharges, date, heure, notes }) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("affaires").update({
      date_souhaitee: date || null, heure_souhaitee: heure || null,
      notes_commerciales: notes || null,
    }).eq("id", affaireId);
    if (error) throw error;
    const { error: eDel } = await supabase.from("affaire_adresses")
      .delete().eq("affaire_id", affaireId);
    if (eDel) throw eDel;
    const lignes = [];
    (charges || []).forEach((c, i) => lignes.push({
      affaire_id: affaireId, sens: "chargement", ordre: i + 1, adresse: c.adresse,
      type_lieu: c.type, etage: c.etage, ascenseur: c.ascenseur, monte_meubles: c.monteMeubles,
    }));
    (decharges || []).forEach((c, i) => lignes.push({
      affaire_id: affaireId, sens: "dechargement", ordre: i + 1, adresse: c.adresse,
      type_lieu: c.type, etage: c.etage, ascenseur: c.ascenseur, monte_meubles: c.monteMeubles,
    }));
    if (lignes.length) {
      const { error: eIns } = await supabase.from("affaire_adresses").insert(lignes);
      if (eIns) throw eIns;
    }
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.contact = { charges, decharges, date, heure, notes }; ecrireDemo(d); }
}

// ── Organisation (paramètres d'en-tête des documents) ─────────────────────────

const ORG_DEMO = {
  nom: "Déménagements Roovers", bce: "BE 0478.363.616", tva: "BE0478363616",
  adresse: "Rue de l'Avenir 9", cp: "1370", ville: "Jodoigne",
  tel: "0455/17.16.79", email: "raphael.roovers@gmail.com",
  iban: "BE73 3101 6268 5860",
};

/** Paramètres de l'organisation courante (identité imprimée sur les documents). */
export async function obtenirOrganisation() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("organisations")
      .select("nom, tva, bce, adresse, cp, ville, tel, email, iban").limit(1).maybeSingle();
    if (error) throw error;
    return data || {};
  }
  return ORG_DEMO;
}

/**
 * Compose le CONTENU de l'offre : l'objet complet qui sera FIGÉ à l'envoi
 * (empreinte calculée dessus) et qui suffira ensuite à rejouer le document à
 * l'identique, des années plus tard, sans dépendre de l'état courant de la
 * base (C-02). Tout ce qui s'imprime sur le contrat vient d'ici.
 */
export async function composerOffre(affaireId) {
  const [affaire, contact, inventaire, org] = await Promise.all([
    obtenirAffaire(affaireId), obtenirContact(affaireId),
    obtenirReleve(affaireId), obtenirOrganisation(),
  ]);
  const faits = affaire?.faits || {};
  const tvac = affaire?.tvac_centimes || 0;
  const htva = Math.round(tvac / 1.21);
  return {
    version: 1,
    emis_le: new Date().toISOString(),
    cgv_version: CGV_VERSION_COURANTE,
    organisation: org,
    client: {
      nom: affaire?.client?.nom || "", tel: affaire?.client?.tel || "",
      email: affaire?.client?.email || "",
    },
    charges: contact?.charges || [],
    decharges: contact?.decharges || [],
    date_dem: contact?.date || "", heure_dem: contact?.heure || "",
    remarques: contact?.notes || "",
    volume_m3: volumeTotal(inventaire),
    a_demonter: articlesADemonter(inventaire),
    formule: faits.formule || "tarifaire",
    nb_demenageurs: faits.nbDemenageurs || null,
    heures: faits.heures || null,
    elevateur: !!faits.elevateur,
    htva_centimes: htva,
    tva_centimes: tvac - htva,
    tvac_centimes: tvac,
  };
}

// ── Flotte (véhicules) ────────────────────────────────────────────────────────

const CAMIONS_DEMO = [
  { id: "v1", nom: "Iveco 1", type: "fourgon", volume_m3: 20, immatriculation: "1-ABC-123",
    ct_echeance: "2026-11-15", assurance_echeance: "2026-09-30", assurance_scannee: true,
    etat_mecanique: "ok", meca_note: "", meca_constat_le: null },
  { id: "v2", nom: "Renault Master", type: "hayon", volume_m3: 12, immatriculation: "1-XYZ-789",
    ct_echeance: "2026-07-28", assurance_echeance: "2027-01-15", assurance_scannee: false,
    etat_mecanique: "surveiller", meca_note: "Bruit embrayage", meca_constat_le: "2026-07-01" },
];

/** Liste les véhicules de l'organisation. */
export async function listerVehicules() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("vehicules").select("*").order("nom");
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  if (!d.vehicules) { d.vehicules = CAMIONS_DEMO; ecrireDemo(d); }
  return d.vehicules;
}

/** Crée ou met à jour un véhicule (id absent = création). */
export async function sauverVehicule(v) {
  if (modeDonnees() === "reel") {
    if (v.id) {
      const { id, ...champs } = v;
      const { error } = await supabase.from("vehicules").update(champs).eq("id", id);
      if (error) throw error;
      return id;
    }
    const { data, error } = await supabase.from("vehicules").insert(v).select("id").single();
    if (error) throw error;
    return data.id;
  }
  const d = lireDemo();
  d.vehicules = d.vehicules || [];
  if (v.id) {
    d.vehicules = d.vehicules.map((x) => x.id === v.id ? { ...x, ...v } : x);
  } else {
    v.id = idDemo();
    d.vehicules.push(v);
  }
  ecrireDemo(d);
  return v.id;
}

/** Supprime un véhicule. */
export async function supprimerVehicule(id) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("vehicules").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.vehicules = (d.vehicules || []).filter((x) => x.id !== id);
  ecrireDemo(d);
}

/** Camions pressentis d'une affaire (identifiants). */
export async function obtenirCamionsAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("camions").eq("id", affaireId).single();
    if (error) throw error;
    return data?.camions || [];
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return (a && a.camions) || [];
}

/** Sauve la sélection de camions d'une affaire. */
export async function sauverCamionsAffaire(affaireId, ids) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("affaires")
      .update({ camions: ids }).eq("id", affaireId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.camions = ids; ecrireDemo(d); }
}

/** Retrouve la facture d'une affaire (retour depuis le dossier), ou null. */
export async function obtenirFacturePourAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("factures")
      .select("*, facture_lignes(*), paiements(*)")
      .eq("affaire_id", affaireId).eq("emise", true)
      .order("date_emission", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  return (d.factures || []).find((f) => f.affaire_id === affaireId) || null;
}

/**
 * Compose le brief d'équipe d'une mission : rassemble contact, relevé, camions
 * et identité de l'organisation, puis délègue le formatage au domaine
 * (briefMission) — une seule implémentation du format, testée.
 */
export async function composerBrief(affaireId, { date, heure, equipeNoms = [] }) {
  const [contact, inventaire, camionIds, flotte, org] = await Promise.all([
    obtenirContact(affaireId).catch(() => null),
    obtenirReleve(affaireId).catch(() => []),
    obtenirCamionsAffaire(affaireId).catch(() => []),
    listerVehicules().catch(() => []),
    obtenirOrganisation().catch(() => ({})),
  ]);
  const camions = flotte.filter((v) => camionIds.includes(v.id));
  return briefMission({
    date: date || contact?.date, heure: heure || contact?.heure,
    camions,
    equipe: equipeNoms.map((nom, i) => ({ nom, chef: i === 0 })),
    charges: contact?.charges || [], decharges: contact?.decharges || [],
    inventaire, remarques: contact?.notes || "",
    iban: org.iban,
    signature: org.tel ? `Raphaël — ${org.tel}` : undefined,
  });
}

// ── Congés & métier (RH minimal — alignement page 10) ────────────────────────

const CONGES_DEMO = [
  { id: "cg1", utilisateur_id: "t2", debut: "2026-07-14", fin: "2026-07-18",
    etat: "approuve", motif: "Vacances" },
];

/** Congés APPROUVÉS de l'organisation (ceux qui comptent pour les conflits). */
export async function listerConges() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("conges")
      .select("id, utilisateur_id, debut, fin, etat, motif")
      .eq("etat", "approuve").order("debut");
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  if (!d.conges) { d.conges = CONGES_DEMO; ecrireDemo(d); }
  return d.conges.filter((c) => c.etat === "approuve");
}

/**
 * Saisie directe d'un congé par la direction : créé directement APPROUVÉ
 * (le workflow demande→approbation du Module 8 reste disponible pour les
 * demandes venant du terrain — deux portes, une seule table).
 */
export async function ajouterConge({ utilisateurId, debut, fin, motif }) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("conges").insert({
      utilisateur_id: utilisateurId, debut, fin, motif: motif || null, etat: "approuve",
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.conges = d.conges || [];
  d.conges.push({ id: idDemo(), utilisateur_id: utilisateurId, debut, fin,
                  etat: "approuve", motif: motif || null });
  ecrireDemo(d);
}

/** Supprime un congé (saisi par erreur). */
export async function supprimerConge(id) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("conges").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.conges = (d.conges || []).filter((c) => c.id !== id);
  ecrireDemo(d);
}

/** Définit le métier terrain d'un membre (commande gardée en réel). */
export async function definirMetier(utilisateurId, metier) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_definir_metier", {
      p_utilisateur: utilisateurId, p_metier: metier,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.metiers = d.metiers || {};
  d.metiers[utilisateurId] = metier;
  ecrireDemo(d);
}
