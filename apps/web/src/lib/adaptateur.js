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
      .is("archive_le", null)
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
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase
      .from("affaires")
      .select("id, etat, formule, created_at, date_souhaitee, heure_souhaitee, clients(id, nom, tel, email), scenarios(retenu, entrees, resultats)")
      .eq("id", id).single();
    if (error) throw error;
    // On relit le scénario retenu pour restituer les faits ET les coûts saisis :
    // sans ça, rouvrir le devis repart de zéro (bug de persistance).
    const retenu = (data.scenarios || []).find((sc) => sc.retenu) || (data.scenarios || [])[0];
    const entrees = retenu?.entrees || null;
    const r = retenu?.resultats || {};
    const { couts, ...faits } = entrees || {};
    return {
      id: data.id, etat: data.etat, formule: data.formule, creeLe: data.created_at,
      date_souhaitee: data.date_souhaitee || null,
      client: data.clients,
      tvac_centimes: r.tvac_centimes ?? null,
      marge_pct: r.marge_pct ?? null,
      faits: entrees ? faits : null,
      couts: couts || null,
    };
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === id);
  if (!a) return null;
  return { ...a, client: d.clients.find((c) => c.id === a.clientId) };
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
    // Upsert du scénario retenu : on met à jour l'existant s'il y en a un,
    // sinon on en crée un seul. Un INSERT systématique créait des scénarios
    // 'retenu' en double, et la lecture en prenait un au hasard.
    const { data: existant, error: eSel } = await supabase.from("scenarios")
      .select("id").eq("affaire_id", affaireId).eq("retenu", true).maybeSingle();
    if (eSel) throw eSel;

    const charge = {
      affaire_id: affaireId, nom: "Scénario retenu", retenu: true,
      entrees: { ...faits, couts }, resultats: resultat,
    };
    if (existant) {
      const { error } = await supabase.from("scenarios").update(charge).eq("id", existant.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("scenarios").insert(charge);
      if (error) throw error;
    }
    // La formule choisie au devis pilote le type d'offre : on la reflète sur l'affaire.
    await supabase.from("affaires").update({ formule: faits.formule }).eq("id", affaireId);
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
    .select("id, nom, email, actif, utilisateur_roles(roles(cle, libelle))")
    .eq("actif", true);
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

  // Envoi de l'email d'invitation via l'Edge Function (si déployée). En cas
  // d'échec (fonction absente, clé manquante), l'invitation existe déjà en
  // base : on renvoie le lien pour un envoi manuel. L'invité se connecte avec
  // son compte Google pour réclamer l'invitation.
  const lien = window.location.origin;
  let envoye = false;
  try {
    const { error: e3 } = await supabase.functions.invoke("inviter-membre", {
      body: { email, nom, lien, organisation: "Déménagements Roovers" },
    });
    envoye = !e3;
  } catch { envoye = false; }

  return { id, envoye, lien };
}

// ── Offre & Signature (résout C-02, C-26) ─────────────────────────────────────

/**
 * Prépare et fige une instance d'offre (résout C-02). En mode réel : appelle
 * cmd_instancier_offre (C.B.D. obligatoire, non désactivable, S6). En mode
 * démo : utilise le domaine PUR (figerInstance/resoudreCbd) directement — la
 * même garantie d'immuabilité, sans base.
 */

/**
 * Avance l'état d'une affaire pas à pas jusqu'à la cible (au plus 'envoye').
 * Idempotent : si l'affaire est déjà au-delà, ne fait rien. Chaque pas passe
 * par cmd_transition_affaire (machine à états + gardes respectées).
 */
async function avancerJusqua(affaireId, cible) {
  const ORDRE = ["brouillon", "devis", "envoye"];
  const { data, error } = await supabase.from("affaires")
    .select("etat").eq("id", affaireId).single();
  if (error) throw error;
  let etat = data.etat;
  // Déjà au niveau ou au-delà (confirme, planifie…) : rien à faire.
  if (!ORDRE.includes(etat)) return;
  while (ORDRE.indexOf(etat) < ORDRE.indexOf(cible)) {
    const suivant = ORDRE[ORDRE.indexOf(etat) + 1];
    const { error: e } = await supabase.rpc("cmd_transition_affaire", {
      p_affaire: affaireId, p_cible: suivant,
      p_contexte: suivant === "devis" ? { aMontant: true } : {},
    });
    if (e) throw e;
    etat = suivant;
  }
}

export async function envoyerOffre(affaireId, { type, contenu }) {
  if (modeDonnees() === "reel") {
    const empreinteLocale = empreinte(contenu);
    const { data: id, error } = await supabase.rpc("cmd_instancier_offre", {
      p_affaire: affaireId, p_type: type, p_contenu: contenu, p_empreinte: empreinteLocale,
    });
    if (error) throw error;
    const { error: e2 } = await supabase.rpc("cmd_geler_instance", { p_instance: id });
    if (e2) throw e2;
    // L'envoi fait AVANCER l'affaire jusqu'à 'envoye' — c'était le maillon
    // manquant : sans lui, l'affaire restait en 'devis' et la confirmation
    // (envoye→confirme) était refusée par la machine à états → aucune mission,
    // planning vide. On avance pas à pas selon l'état courant.
    await avancerJusqua(affaireId, "envoye");
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
  const aEnv = d.affaires.find((x) => x.id === affaireId);
  if (aEnv && ["brouillon", "devis"].includes(aEnv.etat)) aEnv.etat = "envoye";
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
    // La signature déverrouille la garde : l'affaire avance jusqu'à 'confirme'
    // (en passant par 'envoye' si l'offre a été signée sur place sans envoi).
    await avancerJusqua(affaireId, "envoye");
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
export async function listerMembresSimples(inclureArchives = false) {
  if (modeDonnees() === "reel") {
    let req = supabase.from("utilisateurs").select("id, nom, metier, actif");
    if (!inclureArchives) req = req.eq("actif", true);
    const { data, error } = await req;
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  const archives = d.membresArchives || [];
  return MEMBRES_DEMO
    .filter((m) => inclureArchives || !archives.includes(m.id))
    .map((m) => ({ ...m, actif: !archives.includes(m.id),
                   metier: (d.metiers || {})[m.id] || m.metier }));
}

/** Membres archivés uniquement (page Archivage + récupération de compte). */
export async function listerMembresArchives() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("utilisateurs")
      .select("id, nom, email, metier").eq("actif", false);
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  const archives = d.membresArchives || [];
  return MEMBRES_DEMO.filter((m) => archives.includes(m.id));
}

/** Réactive un membre archivé (capacité gerer_referentiels en réel). */
export async function desarchiverMembre(utilisateurId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_desarchiver_utilisateur", {
      p_utilisateur: utilisateurId,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.membresArchives = (d.membresArchives || []).filter((x) => x !== utilisateurId);
  ecrireDemo(d);
}

/** Liste les missions (avec affectations) — planning bureau. */
export async function listerMissions() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("missions")
      .select("id, date, heure, type, etat, affaire_id, affaires(clients(nom)), mission_affectations(utilisateur_id), mission_vehicules(vehicule_id)")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data || []).map((m) => ({
      id: m.id, date: m.date, heure: m.heure, type: m.type, etat: m.etat,
      client: m.affaires?.clients?.nom,
      affectations: (m.mission_affectations || []).map((a) => ({ utilisateur_id: a.utilisateur_id })),
      camions: (m.mission_vehicules || []).map((v) => v.vehicule_id),
    }));
  }
  const d = lireDemo();
  return (d.missions || []).map((m) => ({ ...m, camions: m.camions || [] }));
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
    // Bascule : si le membre est déjà affecté à cette mission, on le retire ;
    // sinon on l'affecte. Deux commandes gardées (gerer_planning).
    const { data: existe, error: eSel } = await supabase.from("mission_affectations")
      .select("utilisateur_id").eq("mission_id", missionId)
      .eq("utilisateur_id", utilisateurId).maybeSingle();
    if (eSel) throw eSel;
    if (existe) {
      const { error } = await supabase.rpc("cmd_desaffecter_membre", {
        p_mission: missionId, p_utilisateur: utilisateurId,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc("cmd_affecter_membre", {
        p_mission: missionId, p_utilisateur: utilisateurId, p_role: roleMission || "demenageur",
      });
      if (error) throw error;
    }
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
      .select("date_souhaitee, heure_souhaitee, notes_commerciales, date_emballage, heure_emballage, trajet_km, trajet_duree, trajet_prix_km, date_visite, heure_visite")
      .eq("id", affaireId).single();
    if (error) throw error;
    const { data: adr, error: e2 } = await supabase.from("affaire_adresses")
      .select("*").eq("affaire_id", affaireId).order("ordre");
    if (e2) throw e2;
    const map = (sens) => (adr || []).filter((x) => x.sens === sens).map((x) => ({
      id: x.id, adresse: x.adresse || "", type: x.type_lieu || "maison",
      codePostal: x.code_postal || "", ville: x.ville || "",
      etage: x.etage || "", ascenseur: !!x.ascenseur, monteMeubles: !!x.monte_meubles,
      escalier: !!x.escalier,
    }));
    return {
      charges: map("chargement"), decharges: map("dechargement"),
      date: a?.date_souhaitee || "", heure: (a?.heure_souhaitee || "08:00").slice(0, 5),
      dateEmballage: a?.date_emballage || "", heureEmballage: (a?.heure_emballage || "").slice(0, 5),
      dateVisite: a?.date_visite || "", heureVisite: (a?.heure_visite || "").slice(0, 5),
      trajetKm: a?.trajet_km ?? "", trajetDuree: a?.trajet_duree || "",
      trajetPrixKm: a?.trajet_prix_km ?? "",
      notes: a?.notes_commerciales || "",
    };
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return (a && a.contact) || { charges: [], decharges: [], date: "", heure: "08:00", dateEmballage: "", heureEmballage: "", dateVisite: "", heureVisite: "", trajetKm: "", trajetDuree: "", trajetPrixKm: "", notes: "" };
}

/**
 * Sauve le volet Contact : remplace les adresses de l'affaire (stratégie
 * simple delete+insert — volumes minuscules), met à jour date/heure/notes.
 */
export async function sauverContact(affaireId, { charges, decharges, date, heure, notes, dateEmballage, heureEmballage, dateVisite, heureVisite, trajetKm, trajetDuree, trajetPrixKm }) {
  if (modeDonnees() === "reel") {
    const nombre = (v) => (v === "" || v == null ? null : Number(v));
    const { error } = await supabase.from("affaires").update({
      date_souhaitee: date || null, heure_souhaitee: heure || null,
      notes_commerciales: notes || null,
      date_emballage: dateEmballage || null, heure_emballage: heureEmballage || null,
      date_visite: dateVisite || null, heure_visite: heureVisite || null,
      trajet_km: nombre(trajetKm), trajet_duree: trajetDuree || null,
      trajet_prix_km: nombre(trajetPrixKm),
    }).eq("id", affaireId);
    if (error) throw error;
    const { error: eDel } = await supabase.from("affaire_adresses")
      .delete().eq("affaire_id", affaireId);
    if (eDel) throw eDel;
    const lignes = [];
    (charges || []).forEach((c, i) => lignes.push({
      affaire_id: affaireId, sens: "chargement", ordre: i + 1, adresse: c.adresse,
      code_postal: c.codePostal || null, ville: c.ville || null,
      type_lieu: c.type, etage: c.etage, ascenseur: c.ascenseur, monte_meubles: c.monteMeubles,
      escalier: !!c.escalier,
    }));
    (decharges || []).forEach((c, i) => lignes.push({
      affaire_id: affaireId, sens: "dechargement", ordre: i + 1, adresse: c.adresse,
      code_postal: c.codePostal || null, ville: c.ville || null,
      type_lieu: c.type, etage: c.etage, ascenseur: c.ascenseur, monte_meubles: c.monteMeubles,
      escalier: !!c.escalier,
    }));
    if (lignes.length) {
      const { error: eIns } = await supabase.from("affaire_adresses").insert(lignes);
      if (eIns) throw eIns;
    }
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.contact = { charges, decharges, date, heure, notes, dateEmballage, heureEmballage, trajetKm, trajetDuree, trajetPrixKm }; ecrireDemo(d); }
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
    reduction: faits.remisePct
      ? { pct: faits.remisePct, motif: faits.remiseMotif || "promo" }
      : null,
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
    const { data, error } = await supabase.from("vehicules").select("*")
      .is("archive_le", null).order("nom");
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

// ── Matériel d'emballage (E/U/R) ──────────────────────────────────────────────

/** Matériel d'emballage d'un dossier. */
export async function obtenirEmballage(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("emballage").eq("id", affaireId).single();
    if (error) throw error;
    return data?.emballage || {};
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return (a && a.emballage) || {};
}

/** Sauve le matériel d'emballage d'un dossier. */
export async function sauverEmballage(affaireId, emballage) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("affaires")
      .update({ emballage }).eq("id", affaireId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.emballage = emballage; ecrireDemo(d); }
}

// ── Données de facturation du client (société, TVA, adresse) ──────────────────
// La table clients porte déjà ces colonnes (0005) ; il ne manquait que l'accès.

/** Données de facturation du client d'une affaire. */
export async function obtenirClientFacturation(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("clients(id, nom, tel, email, societe, tva_num, fact_lignes, fact_cp, fact_ville, fact_pays)")
      .eq("id", affaireId).single();
    if (error) throw error;
    return data?.clients || {};
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return d.clients.find((c) => c.id === a?.clientId) || {};
}

/** Met à jour les données de facturation du client (édition depuis le dossier). */
export async function sauverClientFacturation(affaireId, champs) {
  const permis = ["societe", "tva_num", "fact_lignes", "fact_cp", "fact_ville", "fact_pays"];
  const propre = {};
  for (const k of permis) if (champs[k] !== undefined) propre[k] = champs[k] || null;

  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("client_id").eq("id", affaireId).single();
    if (error) throw error;
    const { error: e2 } = await supabase.from("clients")
      .update(propre).eq("id", data.client_id);
    if (e2) throw e2;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  const c = d.clients.find((x) => x.id === a?.clientId);
  if (c) { Object.assign(c, propre); ecrireDemo(d); }
}

// ── Identité client (nom/tel/email) éditable depuis le dossier ────────────────

/** Identité de base du client d'une affaire. */
export async function obtenirClientIdentite(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("clients(id, nom, tel, email)").eq("id", affaireId).single();
    if (error) throw error;
    return data?.clients || {};
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return d.clients.find((c) => c.id === a?.clientId) || {};
}

/** Met à jour le nom / téléphone / email du client depuis le dossier. */
export async function sauverClientIdentite(affaireId, { nom, tel, email }) {
  const propre = {};
  if (nom !== undefined) propre.nom = nom || "Sans nom";
  if (tel !== undefined) propre.tel = tel || null;
  if (email !== undefined) propre.email = email || null;

  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("client_id").eq("id", affaireId).single();
    if (error) throw error;
    const { error: e2 } = await supabase.from("clients").update(propre).eq("id", data.client_id);
    if (e2) throw e2;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  const c = d.clients.find((x) => x.id === a?.clientId);
  if (c) { Object.assign(c, propre); ecrireDemo(d); }
}

/**
 * Création rapide d'un dossier vide (client « Nouveau client » à renommer
 * dans la fiche). Le « + » ne passe plus par un écran intermédiaire.
 */
export async function creerDossierVide() {
  return creerAffaire({ clientNom: "Nouveau client" });
}

// ── Équipe pressentie du dossier (symétrique aux camions) ─────────────────────

/** Membres pressentis d'une affaire (identifiants). */
export async function obtenirEquipeAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("equipe").eq("id", affaireId).single();
    if (error) throw error;
    return data?.equipe || [];
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return (a && a.equipe) || [];
}

/** Sauve l'équipe pressentie d'une affaire. */
export async function sauverEquipeAffaire(affaireId, ids) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("affaires").update({ equipe: ids }).eq("id", affaireId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.equipe = ids; ecrireDemo(d); }
}

// =============================================================================
// APP TERRAIN — missions du membre, chrono, signalement, création rapide.
// Le cloisonnement est RÉEL (RLS + capacités) : un membre terrain ne voit que
// ses chantiers, sans prix ni coûts. Le domaine (missionsDuMembre, chrono) et
// les commandes SQL (cmd_chrono_*, cmd_signaler_*) préexistent.
// =============================================================================

/**
 * Missions affectées au membre courant, enrichies pour le terrain :
 * adresses, coéquipiers, camions, articles à démonter, sessions de chrono.
 * JAMAIS de prix ni de coûts.
 */
export async function mesMissionsTerrain(utilisateurId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("missions")
      .select(`id, date, heure, type, etat, affaire_id,
               affaires(clients(nom), notes_commerciales),
               mission_affectations(utilisateur_id, utilisateurs(nom)),
               mission_vehicules(vehicules(nom)),
               chrono_sessions(debut, fin, type)`)
      .order("date", { ascending: true });
    if (error) throw error;
    // Filtre : uniquement mes missions (la RLS laisse voir celles du tenant).
    const miennes = (data || []).filter((m) =>
      (m.mission_affectations || []).some((a) => a.utilisateur_id === utilisateurId));
    // Adresses + relevé (démontage) en parallèle par affaire.
    const enrichies = await Promise.all(miennes.map(async (m) => {
      const contact = await obtenirContact(m.affaire_id).catch(() => null);
      const inventaire = await obtenirReleve(m.affaire_id).catch(() => []);
      return {
        id: m.id, date: m.date, heure: m.heure, type: m.type, etat: m.etat,
        affaire_id: m.affaire_id,
        client: m.affaires?.clients?.nom,
        remarques: m.affaires?.notes_commerciales || "",
        equipe: (m.mission_affectations || []).map((a) => a.utilisateurs?.nom).filter(Boolean),
        camions: (m.mission_vehicules || []).map((v) => v.vehicules?.nom).filter(Boolean),
        charges: contact?.charges || [], decharges: contact?.decharges || [],
        aDemonter: (inventaire || []).filter((it) => it.demont)
          .map((it) => ({ nom: it.nom, quantite: it.quantite || 1 })),
        sessions: (m.chrono_sessions || []).map((s) => ({ debut: s.debut, fin: s.fin, type: s.type })),
      };
    }));
    return enrichies;
  }
  // Démo : dérive des missions locales, enrichit depuis le contact stocké.
  const d = lireDemo();
  const noms = Object.fromEntries((MEMBRES_DEMO).map((m) => [m.id, m.nom]));
  return (d.missions || [])
    .filter((m) => (m.affectations || []).some((a) => a.utilisateur_id === utilisateurId))
    .map((m) => {
      const a = d.affaires.find((x) => x.id === m.affaire_id);
      const contact = a?.contact || {};
      const inv = (d.releves && d.releves[m.affaire_id]) || [];
      return {
        id: m.id, date: m.date, heure: m.heure, type: m.type, etat: m.etat,
        affaire_id: m.affaire_id,
        client: m.client || d.clients.find((c) => c.id === a?.clientId)?.nom,
        remarques: contact.notes || "",
        equipe: (m.affectations || []).map((x) => noms[x.utilisateur_id]).filter(Boolean),
        camions: (m.camions || []).map((cid) => (d.vehicules || []).find((v) => v.id === cid)?.nom).filter(Boolean),
        charges: contact.charges || [], decharges: contact.decharges || [],
        aDemonter: inv.filter((it) => it.demont).map((it) => ({ nom: it.nom, quantite: it.quantite || 1 })),
        sessions: m.sessions || [],
      };
    });
}

/** Démarre le chrono d'une mission. */
export async function chronoDemarrer(missionId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_chrono_demarrer", { p_mission: missionId });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    m.sessions = m.sessions || [];
    if (!m.sessions.some((s) => !s.fin)) m.sessions.push({ debut: new Date().toISOString() });
    ecrireDemo(d);
  }
}

/** Arrête le chrono (ferme la session ouverte). */
export async function chronoArreter(missionId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_chrono_arreter", { p_mission: missionId });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    const ouverte = (m.sessions || []).find((s) => !s.fin && s.type !== "pause");
    if (ouverte) ouverte.fin = new Date().toISOString();
    ecrireDemo(d);
  }
}

/** Bascule une pause d'équipe (informatif — le compteur principal continue). */
export async function chronoPause(missionId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_chrono_pause", { p_mission: missionId });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    m.sessions = m.sessions || [];
    const pauseOuverte = m.sessions.find((s) => s.type === "pause" && !s.fin);
    if (pauseOuverte) pauseOuverte.fin = new Date().toISOString();
    else m.sessions.push({ debut: new Date().toISOString(), type: "pause" });
    ecrireDemo(d);
  }
}

/** Signale un souci matériel/véhicule (capacité signaler_materiel). */
export async function signalerSouci({ vehiculeId, etat, note }) {
  if (modeDonnees() === "reel") {
    // 1) HISTORIQUE : chaque signalement est archivé automatiquement — détail,
    //    par qui (profil courant), jour et heure — jamais écrasé.
    let acteur = null;
    try { const p = await monProfil(); acteur = p?.utilisateur_id || null; } catch {}
    const { error: eH } = await supabase.from("vehicule_signalements")
      .insert({ vehicule_id: vehiculeId, utilisateur_id: acteur, etat, note: note || null });
    if (eH) throw eH;
    // 2) ÉTAT COURANT du véhicule (ce que le bureau voit d'un coup d'œil).
    const extra = etat !== "ok" ? { meca_constat_le: new Date().toISOString().slice(0, 10) } : {};
    const { error } = await supabase.from("vehicules")
      .update({ etat_mecanique: etat, meca_note: note || null, ...extra })
      .eq("id", vehiculeId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const v = (d.vehicules || []).find((x) => x.id === vehiculeId);
  if (v) {
    v.etat_mecanique = etat; v.meca_note = note || "";
    if (etat !== "ok") v.meca_constat_le = new Date().toISOString().slice(0, 10);
    d.signalements = d.signalements || [];
    d.signalements.push({ id: idDemo(), vehicule_id: vehiculeId,
      utilisateur_nom: "Vous", etat, note: note || "", cree_le: new Date().toISOString() });
    ecrireDemo(d);
  }
}

/**
 * Création rapide d'un dossier depuis le terrain : le bureau complétera le
 * prix et confirmera. L'affaire naît en 'brouillon' (machine à états), tracée
 * au créateur, auto-affectée à lui. Le bureau la voit « à valider ».
 */
export async function creerDossierTerrain({ clientNom, tel, chargement, dechargement, date, notes }) {
  if (modeDonnees() === "reel") {
    const { data: cli, error: e1 } = await supabase.from("clients")
      .insert({ nom: clientNom || "Client terrain", tel: tel || null }).select("id").single();
    if (e1) throw e1;
    const { data: aff, error: e2 } = await supabase.from("affaires")
      .insert({ client_id: cli.id, etat: "brouillon",
                date_souhaitee: date || null, notes_commerciales: notes || null })
      .select("id").single();
    if (e2) throw e2;
    // Adresses minimales.
    const lignes = [];
    if (chargement) lignes.push({ affaire_id: aff.id, sens: "chargement", ordre: 1, adresse: chargement });
    if (dechargement) lignes.push({ affaire_id: aff.id, sens: "dechargement", ordre: 1, adresse: dechargement });
    if (lignes.length) await supabase.from("affaire_adresses").insert(lignes);
    return aff.id;
  }
  const d = lireDemo();
  const cid = idDemo();
  d.clients.push({ id: cid, nom: clientNom || "Client terrain", tel: tel || "" });
  const aid = idDemo();
  d.affaires.push({
    id: aid, clientId: cid, etat: "brouillon", formule: "tarifaire",
    creeLe: new Date().toISOString().slice(0, 10),
    faits: null, couts: null, tvac_centimes: null, marge_pct: null,
    contact: {
      charges: chargement ? [{ id: "a1", adresse: chargement }] : [],
      decharges: dechargement ? [{ id: "a2", adresse: dechargement }] : [],
      date: date || "", heure: "08:00", notes: notes || "",
    },
  });
  ecrireDemo(d);
  return aid;
}

/** Valide un dossier terrain : brouillon → devis (capacité valider_intake).
 *  La garde de transition exige un relevé ou un montant : on passe le contexte. */
export async function validerDossierTerrain(affaireId) {
  if (modeDonnees() === "reel") {
    // La garde brouillon→devis demande aReleve OU aMontant. Un dossier terrain
    // a au moins une prise de contact ; on signale qu'un relevé est amorçable.
    const { error } = await supabase.rpc("cmd_transition_affaire", {
      p_affaire: affaireId, p_cible: "devis",
      p_contexte: { aReleve: true },
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.etat = "devis"; ecrireDemo(d); }
}

// ── Taux horaires des membres (pour le coût MO automatique) ───────────────────
// Protégés par voir_paie en réel. En démo, taux fictifs par membre.

const TAUX_DEMO = { t1: 38, t2: 32, t3: 30, t4: 30 }; // chef plus cher

/** Taux horaire (€/h) par membre. Nécessite voir_paie en réel. */
export async function tauxMembres() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("donnees_paie")
      .select("utilisateur_id, taux_horaire");
    if (error) throw error; // si pas voir_paie, la RLS renvoie 0 ligne (pas d'erreur)
    const t = {};
    (data || []).forEach((r) => { t[r.utilisateur_id] = Number(r.taux_horaire) || 0; });
    return t;
  }
  return { ...TAUX_DEMO };
}

// ── Paramètres de prix (barème client + coûts) — page Configuration ───────────

const PARAMS_PRIX_DEMO = {
  bareme_horaire: { 2: 85, 3: 130, 4: 170, 5: 215, 6: 255 },
  tarifs: { elevateur: 150, km_facture: 1, emballage_horaire: 75,
            emballage_km: 0.75, heure_sup_forfait: 42.5, assurance_htva: 50 },
  couts: { carburant_km: 0.35, taux_defaut: 32 },
};

/** Paramètres de prix de l'organisation (barème client + coûts internes). */
export async function obtenirParametresPrix() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("organisations")
      .select("parametres_prix").limit(1).maybeSingle();
    if (error) throw error;
    return data?.parametres_prix || PARAMS_PRIX_DEMO;
  }
  const d = lireDemo();
  return d.parametresPrix || PARAMS_PRIX_DEMO;
}

/** Enregistre les paramètres de prix (capacité gerer_referentiels en réel). */
export async function sauverParametresPrix(params) {
  if (modeDonnees() === "reel") {
    const { data: org, error: e1 } = await supabase.from("organisations")
      .select("id").limit(1).maybeSingle();
    if (e1) throw e1;
    const { error } = await supabase.from("organisations")
      .update({ parametres_prix: params }).eq("id", org.id);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.parametresPrix = params;
  ecrireDemo(d);
}

// ── Équipement RH (vêtements / outils) ────────────────────────────────────────
// Table equipements_rh (0011) : catégorie, article, état, à remplacer.
// Le bureau voit tout ; le membre modifie l'état de son propre équipement (0030).

const EQUIP_DEMO = {
  t1: [
    { id: "e1", categorie: "vetement", article: "Veste", etat: "bon", a_remplacer: false },
    { id: "e2", categorie: "outil", article: "Diable", etat: "use", a_remplacer: true },
  ],
};

/** Équipement d'un membre. */
export async function listerEquipement(utilisateurId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("equipements_rh")
      .select("id, categorie, article, etat, a_remplacer")
      .eq("utilisateur_id", utilisateurId).order("categorie");
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  return (d.equipements && d.equipements[utilisateurId]) || EQUIP_DEMO[utilisateurId] || [];
}

/** Ajoute un article d'équipement à un membre (bureau). */
export async function ajouterEquipement(utilisateurId, { categorie, article }) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("equipements_rh")
      .insert({ utilisateur_id: utilisateurId, categorie, article, etat: "bon" });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.equipements = d.equipements || {};
  d.equipements[utilisateurId] = [...(d.equipements[utilisateurId] || EQUIP_DEMO[utilisateurId] || []),
    { id: idDemo(), categorie, article, etat: "bon", a_remplacer: false }];
  ecrireDemo(d);
}

/** Change l'état d'un article (membre pour le sien, ou bureau). */
export async function changerEtatEquipement(equipementId, etat, utilisateurId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("equipements_rh")
      .update({ etat, a_remplacer: etat === "a_remplacer" }).eq("id", equipementId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const liste = d.equipements?.[utilisateurId] || EQUIP_DEMO[utilisateurId] || [];
  const art = liste.find((x) => x.id === equipementId);
  if (art) { art.etat = etat; art.a_remplacer = etat === "a_remplacer";
    d.equipements = d.equipements || {}; d.equipements[utilisateurId] = liste; ecrireDemo(d); }
}

// ── Heures travaillées (agrégat chrono, par membre et global) ─────────────────

/** Missions avec sessions + affectations, pour agréger les heures. */
export async function missionsAvecChrono() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("missions")
      .select("id, date, chrono_sessions(debut, fin, type), mission_affectations(utilisateur_id)");
    if (error) throw error;
    return (data || []).map((m) => ({
      id: m.id, date: m.date,
      sessions: (m.chrono_sessions || []).map((s) => ({ debut: s.debut, fin: s.fin, type: s.type })),
      affectations: (m.mission_affectations || []).map((a) => ({ utilisateur_id: a.utilisateur_id })),
    }));
  }
  const d = lireDemo();
  return (d.missions || []).map((m) => ({
    id: m.id, date: m.date, sessions: m.sessions || [], affectations: m.affectations || [],
  }));
}

/**
 * Confirme une affaire dont l'offre est signée (rattrapage bureau) : avance
 * l'état jusqu'à 'envoye' puis passe 'confirme' — le trigger crée la mission
 * et y reporte camions + équipe pressentis. Utile pour les affaires signées
 * avant le correctif de chaîne (restées en devis/envoye).
 */
export async function confirmerAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    await avancerJusqua(affaireId, "envoye");
    const { error } = await supabase.rpc("cmd_transition_affaire", {
      p_affaire: affaireId, p_cible: "confirme", p_contexte: { instanceSignee: true },
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.etat = "confirme"; ecrireDemo(d); }
}


// ── Archivage (dossiers, camions, membres) ────────────────────────────────────
// Archiver n'est pas supprimer : la donnée reste, elle sort des listes actives.

export async function archiverAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("affaires")
      .update({ archive_le: new Date().toISOString() }).eq("id", affaireId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) {
    a.archive_le = new Date().toISOString();
    d.affaires = d.affaires.filter((x) => x.id !== affaireId);
    d.affairesArchivees = d.affairesArchivees || []; d.affairesArchivees.push(a);
    ecrireDemo(d);
  }
}

export async function archiverVehicule(vehiculeId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("vehicules")
      .update({ archive_le: new Date().toISOString() }).eq("id", vehiculeId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const v = (d.vehicules || []).find((x) => x.id === vehiculeId);
  if (v) { v.archive_le = new Date().toISOString(); ecrireDemo(d); }
}

/** Camions archivés (page Archivage + récupération). */
export async function listerVehiculesArchives() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("vehicules").select("*")
      .not("archive_le", "is", null).order("nom");
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  return (d.vehicules || []).filter((x) => x.archive_le);
}

/** Restaure un camion archivé. */
export async function desarchiverVehicule(vehiculeId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("vehicules")
      .update({ archive_le: null }).eq("id", vehiculeId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const v = (d.vehicules || []).find((x) => x.id === vehiculeId);
  if (v) { delete v.archive_le; ecrireDemo(d); }
}

export async function archiverMembre(utilisateurId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_archiver_utilisateur", {
      p_utilisateur: utilisateurId,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.membresArchives = d.membresArchives || [];
  d.membresArchives.push(utilisateurId);
  ecrireDemo(d);
}

/** Affaires archivées (page Archivage + récupération). */
export async function listerAffairesArchives() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("affaires")
      .select("id, etat, date_souhaitee, clients(nom)")
      .not("archive_le", "is", null).order("archive_le", { ascending: false });
    if (error) throw error;
    return (data || []).map((a) => ({
      id: a.id, etat: a.etat, date: a.date_souhaitee, client: a.clients?.nom || "—",
    }));
  }
  const d = lireDemo();
  return (d.affairesArchivees || []);
}

/** Restaure une affaire archivée. */
export async function desarchiverAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("affaires")
      .update({ archive_le: null }).eq("id", affaireId);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = (d.affairesArchivees || []).find((x) => x.id === affaireId);
  if (a) {
    d.affairesArchivees = d.affairesArchivees.filter((x) => x.id !== affaireId);
    d.affaires = d.affaires || []; d.affaires.push(a);
    ecrireDemo(d);
  }
}

/** Historique des signalements d'un véhicule (détail, par qui, quand). */
export async function listerSignalements(vehiculeId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("vehicule_signalements")
      .select("id, etat, note, cree_le, utilisateurs(nom)")
      .eq("vehicule_id", vehiculeId).order("cree_le", { ascending: false }).limit(20);
    if (error) throw error;
    return (data || []).map((x) => ({
      id: x.id, etat: x.etat, note: x.note || "", cree_le: x.cree_le,
      par: x.utilisateurs?.nom || "—",
    }));
  }
  const d = lireDemo();
  return (d.signalements || []).filter((x) => x.vehicule_id === vehiculeId)
    .map((x) => ({ ...x, par: x.utilisateur_nom }))
    .sort((a, b) => b.cree_le.localeCompare(a.cree_le));
}

// ── Camions d'une mission (planning) ─────────────────────────────────────────

/** Ajoute/retire un camion d'une mission. */
export async function basculerVehiculeMission(missionId, vehiculeId) {
  if (modeDonnees() === "reel") {
    const { data: existant, error: e1 } = await supabase.from("mission_vehicules")
      .select("vehicule_id").eq("mission_id", missionId).eq("vehicule_id", vehiculeId)
      .maybeSingle();
    if (e1) throw e1;
    if (existant) {
      const { error } = await supabase.from("mission_vehicules")
        .delete().eq("mission_id", missionId).eq("vehicule_id", vehiculeId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("mission_vehicules")
        .insert({ mission_id: missionId, vehicule_id: vehiculeId });
      if (error) throw error;
    }
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    m.camions = m.camions || [];
    m.camions = m.camions.includes(vehiculeId)
      ? m.camions.filter((x) => x !== vehiculeId) : [...m.camions, vehiculeId];
    ecrireDemo(d);
  }
}


/**
 * Termine le chantier : ferme toutes les sessions (travail + pauses), passe la
 * mission en « effectuée », et l'affaire bascule automatiquement en
 * « effectué » quand toutes ses missions sont finies (côté serveur).
 */
export async function terminerChantier(missionId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_terminer_chantier", { p_mission: missionId });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    (m.sessions || []).forEach((s) => { if (!s.fin) s.fin = new Date().toISOString(); });
    m.etat = "effectuee";
    const a = (d.affaires || []).find((x) => x.id === m.affaire_id);
    const toutesFinies = (d.missions || [])
      .filter((x) => x.affaire_id === m.affaire_id)
      .every((x) => !["planifiee", "en_cours"].includes(x.etat));
    if (a && toutesFinies) a.etat = "effectue";
    ecrireDemo(d);
  }
}

// ── Capacités individuelles (droits par membre, ex. création de devis) ────────
// Les trois clés du « devis complet » : saisir, chiffrer, voir les prix.
export const CAPACITES_DEVIS_COMPLET = ["valider_intake", "creer_affaire", "voir_prix"];

/** Capacités individuelles d'un membre (hors rôle). */
export async function listerCapacitesMembre(utilisateurId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("utilisateur_capacites")
      .select("capacite_cle").eq("utilisateur_id", utilisateurId);
    if (error) throw error;
    return (data || []).map((x) => x.capacite_cle);
  }
  const d = lireDemo();
  return (d.capacitesExtra && d.capacitesExtra[utilisateurId]) || [];
}

/** Accorde ou retire le droit « création de devis complet » à un membre. */
export async function definirCreationComplete(utilisateurId, actif) {
  if (modeDonnees() === "reel") {
    if (actif) {
      const lignes = CAPACITES_DEVIS_COMPLET.map((c) => ({
        utilisateur_id: utilisateurId, capacite_cle: c,
      }));
      const { error } = await supabase.from("utilisateur_capacites")
        .upsert(lignes, { onConflict: "utilisateur_id,capacite_cle" });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("utilisateur_capacites")
        .delete().eq("utilisateur_id", utilisateurId)
        .in("capacite_cle", CAPACITES_DEVIS_COMPLET);
      if (error) throw error;
    }
    return;
  }
  const d = lireDemo();
  d.capacitesExtra = d.capacitesExtra || {};
  d.capacitesExtra[utilisateurId] = actif ? [...CAPACITES_DEVIS_COMPLET] : [];
  ecrireDemo(d);
}

// =============================================================================
// DÉSISTEMENT CLIENT — annulation et report.
// Les commandes SQL gardent la machine à états et annulent les missions
// ouvertes (trigger). Reporter AVEC une date replanifie tout de suite ;
// reporter SANS date laisse le dossier « reporté », en attente du client.
// =============================================================================

/** Annulation définitive (désistement). Motif tracé dans le journal. */
export async function annulerAffaire(affaireId, motif) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_annuler_affaire", {
      p_affaire: affaireId, p_motif: motif || null,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) {
    a.etat = "annule"; a.motif_annulation = motif || "";
    (d.missions || []).filter((m) => m.affaire_id === affaireId)
      .forEach((m) => { if (["planifiee", "en_cours"].includes(m.etat)) m.etat = "annulee"; });
    ecrireDemo(d);
  }
}

/** Report. `nouvelleDate` (AAAA-MM-JJ) facultative : si fournie, replanifie. */
export async function reporterAffaire(affaireId, nouvelleDate, motif) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_reporter_affaire", {
      p_affaire: affaireId, p_nouvelle_date: nouvelleDate || null, p_motif: motif || null,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) {
    a.etat = nouvelleDate ? "planifie" : "reporte";
    if (nouvelleDate) a.date_souhaitee = nouvelleDate;
    (d.missions || []).filter((m) => m.affaire_id === affaireId).forEach((m) => {
      if (nouvelleDate) { m.etat = "planifiee"; m.date = nouvelleDate; }
      else if (["planifiee", "en_cours"].includes(m.etat)) m.etat = "annulee";
    });
    ecrireDemo(d);
  }
}

/** Clôture du dossier (payé → clos). Dernière étape du cycle. */
export async function cloreAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_transition_affaire", {
      p_affaire: affaireId, p_cible: "clos", p_contexte: {},
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) { a.etat = "clos"; ecrireDemo(d); }
}

// =============================================================================
// TEXTES DU BUREAU — modèles de l'email d'offre (Compte → Textes).
// Stockés dans organisations.parametres_textes (jsonb). Le domaine applique
// ses valeurs par défaut pour toute clé absente : un réglage partiel suffit.
// =============================================================================

export async function obtenirTextes() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("organisations")
      .select("parametres_textes").limit(1).single();
    if (error) throw error;
    return data?.parametres_textes || {};
  }
  const d = lireDemo();
  return d.textes || {};
}

export async function sauverTextes(textes) {
  if (modeDonnees() === "reel") {
    const { data, error: e1 } = await supabase.from("organisations")
      .select("id").limit(1).single();
    if (e1) throw e1;
    const { error } = await supabase.from("organisations")
      .update({ parametres_textes: textes }).eq("id", data.id);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.textes = textes; ecrireDemo(d);
}

// =============================================================================
// DOCUMENTS — conditions générales C.B.D. jointes aux offres.
// Bucket Storage « documents », lecture publique (document contractuel diffusé),
// écriture réservée au bureau (capacité gerer_referentiels).
// =============================================================================

export const FICHIER_CBD = "conditions-cbd.pdf";

/** URL publique du PDF des conditions C.B.D., ou null s'il n'est pas déposé. */
export async function urlConditionsCbd() {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.storage.from("documents")
    .list("", { search: FICHIER_CBD });
  if (error || !(data || []).some((f) => f.name === FICHIER_CBD)) return null;
  return supabase.storage.from("documents").getPublicUrl(FICHIER_CBD).data.publicUrl;
}

/** Dépose (ou remplace) le PDF des conditions C.B.D. */
export async function televerserConditionsCbd(fichier) {
  if (modeDonnees() !== "reel") throw new Error("Dépôt indisponible en démo");
  const { error } = await supabase.storage.from("documents")
    .upload(FICHIER_CBD, fichier, { upsert: true, contentType: "application/pdf" });
  if (error) throw error;
}
