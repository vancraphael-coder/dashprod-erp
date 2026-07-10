// =============================================================================
// Adaptateur de données — deux modes (Réf. 3 · T0 : adaptateur au bord).
// Mode « réel » : Supabase branché et session ouverte → la base, via les
// commandes gardées. Mode « démo » : base absente → magasin local (localStorage)
// avec données de démonstration, pour voir et manipuler les écrans sans
// attendre le branchement. Les écrans consomment CET adaptateur, jamais
// Supabase directement : au branchement, rien ne change côté écrans.
// =============================================================================

import { supabase, configPresente } from "./supabase.js";

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
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase
      .from("affaires")
      .select("id, etat, formule, created_at, clients(id, nom, tel)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Montants : lus depuis le scénario retenu à l'intégration (vérifié au branchement).
    return (data || []).map((a) => ({
      id: a.id, etat: a.etat, formule: a.formule, creeLe: a.created_at,
      client: a.clients, tvac_centimes: null, marge_pct: null, faits: null, couts: null,
    }));
  }
  const d = lireDemo();
  return d.affaires
    .map((a) => ({ ...a, client: d.clients.find((c) => c.id === a.clientId) }))
    .sort((x, y) => (y.creeLe || "").localeCompare(x.creeLe || ""));
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
