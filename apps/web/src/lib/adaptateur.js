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
import { CGV_VERSION_COURANTE, cgv , validiteJours } from "@domaine/documents/cgv.js";
import { rubriquesOffre } from "@domaine/releve/rubriques-offre.js";
import { briefMission } from "@domaine/communication/brief.js";

const CLE = "dashprod-demo-v1";
const CLE_DEMO_FORCEE = "dashprod-demo-forcee";

import { tauxTva } from "@domaine/organisation/identite.js";
import { natureValide } from "@domaine/commercial/natures.js";
import { affectationDepuisEquipes, missionsImpactees }
  from "@domaine/planning/equipes.js";

/** Force la session en mode démo (découverte via compte Google, quota vérifié). */
export function activerDemoForcee() {
  try { sessionStorage.setItem(CLE_DEMO_FORCEE, "1"); } catch { /* privé */ }
}
export function demoForceeActive() {
  try { return sessionStorage.getItem(CLE_DEMO_FORCEE) === "1"; } catch { return false; }
}
export function quitterDemoForcee() {
  try { sessionStorage.removeItem(CLE_DEMO_FORCEE); localStorage.removeItem(CLE); } catch { /* privé */ }
}

/** Mode courant des données. */
export function modeDonnees() {
  // Démo forcée : découverte sur données fictives même si la base est configurée.
  if (demoForceeActive()) return "demo";
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

/**
 * Le carnet : les clients avec leurs coordonnées ET leurs missions rangées
 * par groupe. Bâti sur `clients` — pas de table parallèle, donc pas de
 * seconde fiche à tenir à jour.
 */
export async function carnet(recherche) {
  const { data, error } = await supabase.rpc("cmd_carnet",
    { p_recherche: recherche || null });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Épingler un contact récurrent : il remonte en tête du carnet. */
export async function epinglerContact(id, epingle) {
  const { data, error } = await supabase.rpc("cmd_client_epingler",
    { p_id: id, p_epingle: !!epingle });
  if (error) throw new Error(error.message);
  return data;
}

/** Liste les affaires avec leur client (pour la liste des dossiers). */
export async function listerAffaires() {
  // Résumé des suites administratives (solde dû, litiges) pour les dossiers
  // effectués : ce qui décide de l'ordre dans le groupe « À clôturer ».
  let suites = {};
  if (modeDonnees() === "reel") {
    try {
      const { data } = await supabase.rpc("cmd_suites_administratives");
      suites = data || {};
    } catch { suites = {}; }
  }
  const enrichir = (a) => {
    const s = suites[a.id];
    return s ? { ...a, solde_centimes: s.solde_centimes,
                 litiges_ouverts: s.litiges_ouverts, a_facture: s.facture,
                 missions_terrain_en_attente: s.missions_terrain_en_attente } : a;
  };
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
      return enrichir({
        id: a.id, etat: a.etat, formule: a.formule, creeLe: a.created_at,
        date_souhaitee: a.date_souhaitee || null,
        client: a.clients,
        tvac_centimes: r.tvac_centimes ?? null,
        marge_pct: r.marge_pct ?? null,
        faits: null, couts: null,
      });
    }));
  }
  const d = lireDemo();
  return trier(d.affaires
    .map((a) => enrichir({
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
      .select("id, etat, formule, nature, centre_id, affectations, created_at, date_souhaitee, heure_souhaitee, emballage, clients(id, nom, tel, email), scenarios(retenu, entrees, resultats)")
      .eq("id", id).single();
    if (error) throw error;
    // On relit le scénario retenu pour restituer les faits ET les coûts saisis :
    // sans ça, rouvrir le devis repart de zéro (bug de persistance).
    const retenu = (data.scenarios || []).find((sc) => sc.retenu) || (data.scenarios || [])[0];
    const entrees = retenu?.entrees || null;
    const r = retenu?.resultats || {};
    const { couts, ...faits } = entrees || {};
    return {
      id: data.id, etat: data.etat, formule: data.formule,
      // La nature pilote le parcours : sans elle, un lift s'ouvrirait sur les
      // écrans d'un déménagement. Repli explicite pour les lignes d'avant 0117.
      nature: data.nature || "demenagement",
      centreId: data.centre_id || null,
      affectations: data.affectations || {},
      creeLe: data.created_at,
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
  // Même repli qu'en mode réel : les affaires de démonstration créées avant
  // l'introduction de la nature n'en portent pas, et un `undefined` ferait
  // diverger le parcours entre démo et réel.
  return { ...a, nature: a.nature || "demenagement",
           client: d.clients.find((c) => c.id === a.clientId) };
}

/**
 * La saisie propre aux natures sans relevé (sous-traitance, lift) : hommes,
 * heures, camions, km. Rangée dans `scenarios.entrees.mission` plutôt que dans
 * de nouvelles colonnes — c'est déjà là que vivent les faits du chiffrage, et
 * une colonne par nature multiplierait les champs vides sur les autres.
 *
 * On relit-modifie-réécrit `entrees` : un remplacement direct effacerait les
 * faits et les coûts déjà saisis.
 */
export async function sauverMission(affaireId, mission) {
  if (modeDonnees() === "reel") {
    const { data: sc, error: eSel } = await supabase.from("scenarios")
      .select("id, entrees").eq("affaire_id", affaireId).eq("retenu", true)
      .maybeSingle();
    if (eSel) throw eSel;

    const entrees = { ...(sc?.entrees || {}), mission: mission || {} };
    if (sc?.id) {
      const { error } = await supabase.from("scenarios")
        .update({ entrees }).eq("id", sc.id);
      if (error) throw error;
    } else {
      // `resultats` est NOT NULL sans valeur par défaut. L'omettre faisait
      // échouer TOUT enregistrement de dossier d'une nature sans relevé,
      // avec un message Postgres incompréhensible pour l'utilisateur.
      // Un objet vide est honnête ici : la mission est saisie, elle n'est pas
      // encore chiffrée — c'est le devis qui remplira ce champ.
      const { error } = await supabase.from("scenarios")
        .insert({ affaire_id: affaireId, nom: "Scénario retenu",
                  retenu: true, entrees, resultats: {} });
      if (error) throw error;
    }
    return;
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  if (a) { a.mission = mission || {}; ecrireDemo(d); }
}

/**
 * Crée une affaire (et son client si nouveau). En mode réel, passe par les
 * tables clients/affaires (les commandes gardées prennent le relais au
 * branchement) ; en démo, écrit le magasin local.
 * @returns {Promise<string>} id de l'affaire créée
 */
export async function creerAffaire({ clientId, clientNom, tel, email, nature }) {
  // La nature est validée par le DOMAINE, pas ici : une chaîne libre venue
  // d'un appelant distrait tomberait sinon dans l'enum et ferait échouer
  // l'insert avec un message Postgres illisible.
  const n = natureValide(nature) ? nature : "demenagement";
  if (modeDonnees() === "reel") {
    let cid = clientId;
    if (!cid) {
      const { data, error } = await supabase.from("clients")
        .insert({ nom: clientNom, tel, email }).select("id").single();
      if (error) throw error;
      cid = data.id;
    }
    const { data: aff, error: e2 } = await supabase.from("affaires")
      .insert({ client_id: cid, etat: "brouillon", nature: n })
      .select("id").single();
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
    id: aid, clientId: cid, etat: "devis", formule: "tarifaire", nature: n,
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
    .select("id, nom, email, actif, permis_detenus, code95_echeance, utilisateur_roles(roles(cle, libelle))")
    .eq("actif", true);
  if (error) throw error;
  return (data || []).map((u) => ({
    id: u.id, nom: u.nom, email: u.email, actif: u.actif,
    permis_detenus: u.permis_detenus || [], code95_echeance: u.code95_echeance || null,
    roles: (u.utilisateur_roles || []).map((r) => r.roles?.cle).filter(Boolean),
  }));
}

/** Bureau : enregistre les permis détenus et l'échéance code 95 d'un membre. */
/** Bureau : enregistre les permis détenus et l'échéance code 95 d'un membre. */
export async function definirPermis(utilisateurId, permis, code95) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_definir_permis", {
      p_utilisateur: utilisateurId, p_permis: permis || [],
      p_code95: code95 || null,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.permis = d.permis || {};
  d.permis[utilisateurId] = { permis: permis || [], code95: code95 || null };
  ecrireDemo(d);
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
    const org = await obtenirOrganisation();
    const { error: e3 } = await supabase.functions.invoke("inviter-membre", {
      body: { email, nom, lien, organisation: org?.nom },
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
      .select("id, contenu, empreinte_sha256, statut, envoye_le, genere_le, "
            + "signatures(signataire_nom, image_trait, horodatage, canal)")
      .eq("affaire_id", affaireId)
      .order("genere_le", { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    // Une instance SIGNÉE prime toujours sur une instance plus récente : la
    // signature est la preuve, elle ne doit jamais être masquée par un
    // document régénéré depuis. (0066 empêche désormais cette régénération,
    // mais d'anciens dossiers peuvent porter les deux.)
    const data0 = data.find((x) => x.statut === "signee") || data[0];
    const sig = (data0.signatures && data0.signatures[0]) || null;
    return {
      ...data0,
      signature: sig ? { nom: sig.signataire_nom, image: sig.image_trait,
                         date: sig.horodatage, canal: sig.canal } : null,
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
      // Trois motifs de disparition du planning, et il faut les TROIS :
      //   1. dossier archivé        (affaires.archive_le)
      //   2. mission annulée        (missions.etat = 'annulee')
      //   3. dossier désisté        (affaires.etat = 'annule')
      // Un désistement laisse archive_le à NULL : filtrer sur le seul
      // archivage laissait des missions futures déjà annulées au planning.
      // Le "!inner" est indispensable — sans lui PostgREST fait une jointure
      // externe, garde la ligne et vide l'objet imbriqué : le fantôme reste.
      .select("id, date, heure, heure_depart_prevue, heure_arrivee_prevue, type, etat, affaire_id, partagee_le, affaires!inner(archive_le, etat, clients(nom)), mission_affectations(utilisateur_id), mission_vehicules(vehicule_id)")
      .is("affaires.archive_le", null)
      .neq("etat", "annulee")
      .neq("affaires.etat", "annule")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data || []).map((m) => ({
      id: m.id, date: m.date, heure: m.heure, type: m.type, etat: m.etat,
      heure_depart_prevue: m.heure_depart_prevue,
      heure_arrivee_prevue: m.heure_arrivee_prevue,
      // Le bureau voit TOUT, partagé ou non : il prépare puis publie.
      partagee: !!m.partagee_le,
      affaire_id: m.affaire_id,
      client: m.affaires?.clients?.nom,
      affectations: (m.mission_affectations || []).map((a) => ({ utilisateur_id: a.utilisateur_id })),
      camions: (m.mission_vehicules || []).map((v) => v.vehicule_id),
    }));
  }
  const d = lireDemo();
  const exclues = new Set((d.affaires || [])
    .filter((a) => a.archive_le || a.etat === "annule").map((a) => a.id));
  return (d.missions || [])
    .filter((m) => m.etat !== "annulee" && !exclues.has(m.affaire_id))
    .map((m) => ({ ...m, camions: m.camions || [] }));
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
    // Recompose la prestation HTVA depuis le TVAC connu. Le taux vient de
    // l'organisation : une entreprise en TVA 6 % ne doit pas voir sa base
    // imposable calculée à 21 %.
    const pct = tauxTva(await obtenirOrganisation().catch(() => ({})));
    const htva = a.tvac_centimes
      ? Math.round(a.tvac_centimes / (1 + pct / 100)) : 0;
    lignes.push({ type: "prestation", categorie_operation: "vente_services",
                  libelle: `Déménagement — ${a.client?.nom || ""}`.trim(),
                  montant_htva_centimes: htva });
  }

  // LES FOURNITURES NE SONT PAS SUR CETTE FACTURE.
  //
  // Elles étaient poussées ici en lignes propres. C'était déjà mieux que de les
  // noyer dans un total « Déménagement » opaque, mais ce n'était pas juste pour
  // autant : vendre un carton n'est PAS prester une manutention. Ce sont deux
  // opérations distinctes, et une facture de prestation n'est pas le document
  // d'une vente de biens.
  //
  // Décision de Raphaël, redite : les fournitures ne s'ajoutent ni au devis ni
  // à la facture. Elles font l'objet d'une VENTE SÉPARÉE, avec son propre
  // document.
  //
  // Ce qui a été RETIRÉ ici et ce qui reste à construire est écrit dans
  // `docs/maitre/25-PARAMETRES-ROADMAP.md` (chantier V — vente de fournitures).
  // Trois points y attendent une décision, et aucun ne se devine :
  //   · quelle séquence légale numérote ce document (contrainte C-03 : la
  //     numérotation est continue et sans trou — deux flux dans une seule
  //     séquence, ou deux séquences distinctes, n'est PAS une question de
  //     confort) ;
  //   · quel PRIX CLIENT s'applique — aujourd'hui `valoriserEmballage` rend le
  //     COÛT (`cout_centimes` du catalogue). Facturer au coût était le second
  //     défaut, invisible derrière le premier ;
  //   · quel taux de TVA pour une vente de biens intérieure.
  //
  // On ne laisse PAS de ligne à zéro ni de mention de remplacement : une
  // facture qui annonce une fourniture sans la facturer est pire qu'une facture
  // qui n'en parle pas. Le matériel d'emballage reste visible dans l'écran
  // Matériel du dossier, qui est son inventaire — rien n'est perdu.

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

// Identité NEUTRE. Aucune donnée d'une entreprise réelle ne doit figurer ici :
// ce bloc sert de repli en mode démo et finirait sinon sur les documents d'un
// autre tenant (AUDIT_REAL.md §5).
const ORG_DEMO = {
  nom: "Entreprise de démonstration", bce: "BE 0000.000.000", tva: "BE0000000000",
  adresse: "Rue de la Démonstration 1", cp: "1000", ville: "Bruxelles",
  tel: "00 000 00 00", email: "demo@exemple.be",
  iban: "BE00 0000 0000 0000",
};

/** Paramètres de l'organisation courante (identité imprimée sur les documents). */
export async function obtenirOrganisation() {
  if (modeDonnees() === "reel") {
    // .single() : la RLS ne doit renvoyer QUE l'organisation du jeton. Si elle
    // en renvoie 0 ou plusieurs, c'est une anomalie de sécurité — on veut une
    // erreur franche, pas un repli silencieux sur une identité arbitraire.
    const { data, error } = await supabase.from("organisations")
      .select("id, nom, nom_commercial, forme_juridique, tva, bce, adresse, cp, "
              + "ville, pays, tel, email, site_web, iban, devise_defaut, "
              + "plan, periodicite, essai_fin, "
              + "parametres_facturation").single();
    if (error) throw new Error(
      "Organisation introuvable pour cette session. Contactez votre administrateur.");
    return data;
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
  const [affaire, contact, inventaire, org, textes, cli] = await Promise.all([
    obtenirAffaire(affaireId), obtenirContact(affaireId),
    obtenirReleve(affaireId), obtenirOrganisation(),
    obtenirTextes().catch(() => ({})),
    // La civilité vit sur le client : on la charge ici pour qu'elle atteigne
    // le document. Sans dossier client, on continue sans — jamais d'échec du
    // document pour un détail de forme.
    obtenirClientFacturation(affaireId).catch(() => ({})),
  ]);
  const faits = affaire?.faits || {};
  const tvac = affaire?.tvac_centimes || 0;
  // Le taux vient de l'organisation, jamais d'un 1.21 en dur : sinon l'offre
  // afficherait « TVA 6 % » tout en calculant à 21 %. Le libellé et le montant
  // doivent sortir de la MÊME source.
  const pct = tauxTva(org);
  const htva = Math.round(tvac / (1 + pct / 100));
  return {
    version: 1,
    emis_le: new Date().toISOString(),
    cgv_version: CGV_VERSION_COURANTE,
    // Les articles sont FIGÉS dans le document au moment de sa composition.
    // Le contrat ne relit jamais les conditions en vigueur : il imprime celles
    // qu'il portait quand il a été établi. C'est ce qui rend une signature
    // opposable — et c'est pour ça que le réglage doit passer par ici.
    cgv_articles: cgv(CGV_VERSION_COURANTE, (textes || {}).cgv),
    organisation: org,
    client: {
      nom: affaire?.client?.nom || "", tel: affaire?.client?.tel || "",
      email: affaire?.client?.email || "",
    },
    charges: contact?.charges || [],
    decharges: contact?.decharges || [],
    date_dem: contact?.date || "", heure_dem: contact?.heure || "",
    remarques: contact?.notes || "",
    // Les rubriques PROPRES à la nature (pour un déménagement : volume, à
    // démonter, à remonter, remarques). L'AIGUILLAGE choisit selon la nature —
    // le composeur ne connaît aucun module de métier (dérogation levée).
    ...rubriquesOffre(affaire?.nature || "demenagement", { inventaire }),
    // Validité FIGÉE ici : le document garde ce qu'il annonçait le jour du gel.
    validite_jours: validiteJours(textes),
    // La civilité voyage jusqu'au document : « M. et Mme Dupont » sur une
    // offre que le couple va lire et signer.
    client_civilite: cli?.civilite || null,
    // La NATURE voyage jusqu'au document : c'est elle qui décide de ce que le
    // récapitulatif annonce. Sans elle, une offre de lift reprendrait « volume,
    // déménageurs, relevé » — des rubriques qui n'ont pas de sens et que le
    // client lirait comme une erreur.
    nature: affaire?.nature || "demenagement",
    mission: faits.mission || null,
    formule: faits.formule || "tarifaire",
    reduction: faits.remisePct
      ? { pct: faits.remisePct, motif: faits.remiseMotif || "promo" }
      : null,
    nb_demenageurs: faits.nbDemenageurs || null,
    heures: faits.heures || null,
    elevateur: !!faits.elevateur,
    // Suppléments retenus au devis : listés sur l'offre pour la transparence.
    supplements: (faits.supplements || []).map((s) => ({
      libelle: s.libelle, quantite: s.quantite,
      unite: s.unite, total_centimes: s.total_centimes,
    })),
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
// ── Fermetures de l'entreprise (congé annuel collectif, ponts) ─────────────
export async function listerFermetures() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("fermetures_entreprise")
      .select("id, debut, fin, motif").order("debut");
    if (error) throw error;
    return data || [];
  }
  return lireDemo().fermetures || [];
}

export async function ajouterFermeture({ debut, fin, motif }) {
  if (modeDonnees() === "reel") {
    const { data: org } = await supabase.from("organisations").select("id").single();
    const { data, error } = await supabase.from("fermetures_entreprise")
      .insert({ org_id: org?.id, debut, fin, motif: motif || null })
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Ajout refusé : capacité « gérer les référentiels » requise.");
    }
    return;
  }
  const d = lireDemo();
  d.fermetures = [...(d.fermetures || []),
    { id: idDemo(), debut, fin, motif: motif || null }];
  ecrireDemo(d);
}

export async function supprimerFermeture(id) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.from("fermetures_entreprise").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  d.fermetures = (d.fermetures || []).filter((f) => f.id !== id);
  ecrireDemo(d);
}

/**
 * Les congés, par état. Défaut : les APPROUVÉS seuls — c'est ce dont le
 * planning a besoin. Passer ["demande"] donne la corbeille du bureau.
 *
 * Passe par `cmd_conges` et non plus par un select direct : depuis 0121, la
 * table n'a plus de politique d'écriture et sa lecture est bornée au
 * périmètre de chacun.
 */
/**
 * NOTES D'ATELIER — la balise 'i'. Dépose une note depuis une page, acheminée
 * vers le dossier interne. La provenance est la PAGE, rien d'autre. En mode
 * démo, on garde en local pour que l'aperçu fonctionne sans base.
 */
export async function noterAtelier(page, onglet, texte) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_noter_atelier", {
      p_page: page || "inconnue", p_onglet: onglet || "remarque",
      p_texte: texte,
    });
    if (error) throw new Error(error.message);
    return data;
  }
  const d = lireDemo();
  d.notesAtelier = d.notesAtelier || [];
  d.notesAtelier.unshift({
    id: "loc-" + Date.now(), page: page || "inconnue",
    onglet: onglet || "remarque", texte: texte.trim(),
    cree_le: new Date().toISOString(),
  });
  ecrireDemo(d);
  return d.notesAtelier[0].id;
}

/** Relit les notes d'une page (onglet Historique du panneau). */
export async function notesPage(page) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_notes_page", { p_page: page });
    if (error) throw new Error(error.message);
    return data || [];
  }
  const d = lireDemo();
  return (d.notesAtelier || []).filter((n) => n.page === page);
}

export async function listerConges(etats = ["approuve"]) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_conges", { p_etats: etats });
    if (error) throw new Error(error.message);
    return data || [];
  }
  const d = lireDemo();
  if (!d.conges) { d.conges = CONGES_DEMO; ecrireDemo(d); }
  return d.conges.filter((c) => etats.includes(c.etat));
}

/**
 * Une DEMANDE de congé, posée par le membre pour lui-même. Le bureau
 * tranchera. Si `utilisateurId` désigne quelqu'un d'autre, la base traite
 * l'acte comme une saisie directe de la direction et approuve d'emblée —
 * c'est elle qui vérifie la capacité, pas cette fonction.
 */
export async function demanderConge({ debut, fin, motif, utilisateurId } = {}) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_conge_demander", {
      p_debut: debut, p_fin: fin, p_motif: motif || null,
      p_utilisateur: utilisateurId || null });
    if (error) throw new Error(error.message);
    return data;
  }
  const d = lireDemo();
  d.conges = d.conges || [];
  const etat = utilisateurId ? "approuve" : "demande";
  d.conges.push({ id: idDemo(), utilisateur_id: utilisateurId || "moi",
                  debut, fin, etat, motif: motif || null });
  ecrireDemo(d);
  return { ok: true, etat };
}

/** Approuver ou refuser. La base refuse qu'on décide de son propre congé. */
export async function deciderConge(id, approuver, motif) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_conge_decider", {
      p_id: id, p_approuver: !!approuver, p_motif: motif || null });
    if (error) throw new Error(error.message);
    return data;
  }
  const d = lireDemo();
  const c = (d.conges || []).find((x) => x.id === id);
  if (c) { c.etat = approuver ? "approuve" : "refuse"; c.motif_decision = motif || null; }
  ecrireDemo(d);
  return { ok: true };
}

/** Retirer sa demande (demandeur) ou annuler un congé accordé (bureau). */
export async function annulerConge(id) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_conge_annuler", { p_id: id });
    if (error) throw new Error(error.message);
    return data;
  }
  const d = lireDemo();
  const c = (d.conges || []).find((x) => x.id === id);
  if (c) c.etat = "annule";
  ecrireDemo(d);
  return { ok: true };
}

/**
 * Saisie directe d'un congé par la direction : créé directement APPROUVÉ
 * (le workflow demande→approbation du Module 8 reste disponible pour les
 * demandes venant du terrain — deux portes, une seule table).
 */
export async function ajouterConge({ utilisateurId, debut, fin, motif }) {
  if (modeDonnees() === "reel") {
    // L'écriture directe est fermée depuis 0121 : on passe par la commande,
    // qui approuve d'emblée quand le bureau pose un congé pour autrui.
    await demanderConge({ debut, fin, motif, utilisateurId });
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
    // On n'EFFACE plus : un congé annulé garde sa trace (qui, quand, pourquoi).
    // Le DELETE direct est de toute façon refusé depuis 0121.
    await annulerConge(id);
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
    const { error } = await supabase.rpc("cmd_emballage_definir",
      { p_affaire: affaireId, p_emballage: emballage });
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
      .select("clients(id, nom, tel, email, civilite, societe, tva_num, fact_lignes, fact_cp, fact_ville, fact_pays)")
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
  // `civilite` fait partie de l'identité du client, pas de son adresse — mais
  // elle s'édite au même endroit, avec les mêmes droits.
  const permis = ["civilite", "societe", "tva_num", "fact_lignes", "fact_cp",
                  "fact_ville", "fact_pays"];
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
      .select("clients(id, civilite, nom, tel, email)").eq("id", affaireId).single();
    if (error) throw error;
    return data?.clients || {};
  }
  const d = lireDemo();
  const a = d.affaires.find((x) => x.id === affaireId);
  return d.clients.find((c) => c.id === a?.clientId) || {};
}

/** Met à jour la civilité / le nom / téléphone / email du client depuis le dossier. */
export async function sauverClientIdentite(affaireId, { civilite, nom, tel, email }) {
  const propre = {};
  if (civilite !== undefined) propre.civilite = civilite || null;
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
/**
 * Un dossier vide. `clientId` permet de partir d'un contact EXISTANT au lieu
 * de créer « Nouveau client » : c'est tout l'intérêt du carnet pour un client
 * récurrent, et ça évite un doublon de fiche à chaque commande.
 */
export async function creerDossierVide(nature = "demenagement", clientId = null) {
  return clientId
    ? creerAffaire({ clientId, nature })
    : creerAffaire({ clientNom: "Nouveau client", nature });
}

// ── Équipe pressentie du dossier (symétrique aux camions) ─────────────────────

/**
 * L'affectation PRÉVUE par date, rangée sur l'affaire. Elle existe dès la
 * saisie d'une date — avant toute confirmation, donc avant qu'une mission
 * existe en base. C'est au moment où l'on pose une date qu'on pense à qui la
 * fera : l'écran doit le permettre là.
 */
export async function sauverAffectationsPrevues(affaireId, affectations) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_affaire_affectations_definir",
    { p_affaire: affaireId, p_affectations: affectations || {} });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Les missions d'une affaire avec leur affectation propre. C'est la mission
 * qui fait foi depuis 0131 — `affaires.equipe` reste l'équipe PRESSENTIE,
 * utile au chiffrage, mais ne commande plus le planning.
 */
export async function missionsAffaire(affaireId) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.rpc("cmd_missions_affaire",
    { p_affaire: affaireId });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Pose l'affectation complète d'une mission. On REMPLACE : l'écran envoie
 * l'état voulu, un différentiel finirait par diverger de la base au premier
 * aller-retour manqué.
 */
export async function affecterMission(missionId, membres, vehicules) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_mission_affecter", {
    p_mission: missionId,
    p_membres: membres || [], p_vehicules: vehicules || [] });
  if (error) throw new Error(error.message);
  return data;
}

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
/**
 * Publie (ou retire) une mission au terrain.
 *
 * Séparer l'affectation du partage permet au bureau de construire un planning
 * complet — équipes, camions, horaires — sans que les déménageurs voient un
 * chantier qui bouge encore. Le partage est le geste qui engage.
 */
export async function partagerMission(missionId, partagee = true) {
  if (modeDonnees() === "reel") {
    const { data: moi } = await supabase.rpc("mon_profil");
    const { data, error } = await supabase.from("missions")
      .update({
        partagee_le: partagee ? new Date().toISOString() : null,
        partagee_par: partagee ? (moi?.utilisateur_id ?? null) : null,
      })
      .eq("id", missionId).select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Partage refusé : droits insuffisants sur cette mission.");
    }
    return;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) { m.partagee_le = partagee ? new Date().toISOString() : null; ecrireDemo(d); }
}

export async function mesMissionsTerrain(utilisateurId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("missions")
      .select(`id, date, heure, type, etat, affaire_id,
               heure_depart_prevue, heure_arrivee_prevue,
               affaires!inner(archive_le, etat, clients(nom), notes_commerciales),
               mission_affectations(utilisateur_id, utilisateurs(nom)),
               mission_vehicules(vehicules(nom)),
               chrono_sessions(id, debut, fin, type)`)
      // MÊME RÈGLE QUE LE PLANNING BUREAU. La vue terrain a son propre chemin
      // de données : sans ça le bureau annule et le terrain se déplace quand même.
      .is("affaires.archive_le", null)
      .neq("etat", "annulee")
      .neq("affaires.etat", "annule")
      // ET EN PLUS : le terrain ne voit QUE ce que le bureau a partagé.
      // Être affecté ne suffit pas — le bureau doit publier la mission.
      .not("partagee_le", "is", null)
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
        heure_depart_prevue: m.heure_depart_prevue,
        heure_arrivee_prevue: m.heure_arrivee_prevue,
        sessions: (m.chrono_sessions || []).map((s) => ({ id: s.id, debut: s.debut, fin: s.fin, type: s.type })),
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

/** Pose les trois heures prévues d'une mission (départ / heure / arrivée). */
export async function definirHorairesMission(missionId, { depart, heure, arrivee } = {}) {
  const { data, error } = await supabase.rpc("cmd_horaires_mission", {
    p_mission: missionId,
    p_depart: depart || null,
    p_heure: heure || null,
    p_arrivee: arrivee || null,
  });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.message);
  return data;
}

/**
 * Ma paie — le déménageur lit SES heures et SON brut, jamais ceux des autres.
 * Aucun paramètre d'identité : la base répond sur l'appelant authentifié.
 */
export async function maPaie(periode) {
  const { data, error } = await supabase.rpc("cmd_ma_paie", { p_periode: periode || null });
  if (error) throw new Error(error.message);
  return data;
}

// ── Pointage déclaré : départ / arrivée, et pauses ────────────────────────
// Le terrain DÉCLARE ses heures, il ne les fait pas mesurer. Ces trois appels
// remplacent le chronomètre ; le stockage (chrono_sessions) reste le même, la
// paie continue donc de lire les mêmes données.

/** Pose ou corrige le départ et/ou l'arrivée. Dates ISO ou null. */
export async function pointageDefinir(missionId, { depart, arrivee } = {}) {
  const { data, error } = await supabase.rpc("cmd_pointage_definir", {
    p_mission: missionId,
    p_depart: depart ? new Date(depart).toISOString() : null,
    p_arrivee: arrivee ? new Date(arrivee).toISOString() : null,
  });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.message || "Pointage refusé.");
  return data;
}

/** Ajoute une pause déclarée (début et fin fournis). */
export async function pauseAjouter(missionId, debut, fin) {
  const { data, error } = await supabase.rpc("cmd_pause_ajouter", {
    p_mission: missionId,
    p_debut: new Date(debut).toISOString(),
    p_fin: new Date(fin).toISOString(),
  });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.message || "Pause refusée.");
  return data;
}

/** Retire une pause saisie par erreur. */
export async function pauseRetirer(sessionId) {
  const { error } = await supabase.rpc("cmd_pause_retirer", { p_session: sessionId });
  if (error) throw new Error(error.message);
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
// =============================================================================
// PAIE — réglages par membre et décompte de période.
// Le brut vient des heures réellement pointées. Le net n'est calculé que si le
// précompte est renseigné : voir packages/domaine/src/rh/paie.js.
// =============================================================================

/** Réglages de paie de tous les membres (taux, statut, précompte). */
export async function obtenirReglagesPaie() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("donnees_paie")
      .select("utilisateur_id, taux_horaire, type_contrat, statut, precompte_pct, "
              + "majoration_sup, onss_patronale_pct, anciennete_mois, secteur_cle");
    if (error) throw error;
    const par = {};
    for (const r of data || []) par[r.utilisateur_id] = r;
    return par;
  }
  return lireDemo().reglagesPaie || {};
}

/** Enregistre les réglages de paie d'UN membre. */
export async function sauverReglagePaie(utilisateurId, reglage) {
  if (modeDonnees() === "reel") {
    const { data: org } = await supabase.from("organisations").select("id").single();
    const { data, error } = await supabase.from("donnees_paie")
      .upsert({
        utilisateur_id: utilisateurId,
        org_id: org?.id,
        taux_horaire: reglage.taux_horaire ?? null,
        statut: reglage.statut ?? null,
        precompte_pct: reglage.precompte_pct ?? null,
        majoration_sup: reglage.majoration_sup ?? null,
        type_contrat: reglage.type_contrat ?? null,
        onss_patronale_pct: reglage.onss_patronale_pct ?? null,
        anciennete_mois: reglage.anciennete_mois ?? null,
      }, { onConflict: "utilisateur_id" })
      .select("utilisateur_id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Enregistrement refusé : capacité « voir la paie » requise.");
    }
    return;
  }
  const d = lireDemo();
  d.reglagesPaie = { ...(d.reglagesPaie || {}), [utilisateurId]: reglage };
  ecrireDemo(d);
}

/**
 * Heures pointées par membre sur une période, depuis le chrono.
 * Source unique : les sessions réellement enregistrées sur le terrain.
 */
export async function heuresParMembre(debut, fin) {
  if (modeDonnees() !== "reel") return lireDemo().heuresPaie || {};
  const { data, error } = await supabase.from("missions")
    .select("id, date, mission_affectations(utilisateur_id), chrono_sessions(debut, fin, type)")
    .gte("date", debut).lte("date", fin);
  if (error) throw error;

  const par = {};
  for (const m of data || []) {
    // Durée effective de la mission : les pauses ne sont pas payées.
    let secondes = 0;
    for (const s of m.chrono_sessions || []) {
      if (s.type === "pause" || !s.debut || !s.fin) continue;
      secondes += Math.max(0, (new Date(s.fin) - new Date(s.debut)) / 1000);
    }
    if (secondes <= 0) continue;
    // Le temps de chantier est partagé par l'équipe présente : chacun a
    // presté la durée de la mission, pas une fraction de celle-ci.
    for (const a of m.mission_affectations || []) {
      par[a.utilisateur_id] = (par[a.utilisateur_id] || 0) + secondes / 3600;
    }
  }
  return par;
}

/** Décompte figé d'une période close (null si la période est ouverte). */
export async function obtenirPeriodePaie(periode) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.from("paie_periodes")
    .select("periode, cloturee_le, decompte").eq("periode", periode).maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Fige le décompte d'une période : elle ne bougera plus si un taux change. */
export async function cloturerPeriodePaie(periode, decompte) {
  const { data: org } = await supabase.from("organisations").select("id").single();
  const { data, error } = await supabase.from("paie_periodes")
    .upsert({ org_id: org?.id, periode, decompte,
              cloturee_le: new Date().toISOString() }, { onConflict: "org_id,periode" })
    .select("periode");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Clôture refusée : capacité « voir la paie » requise.");
  }
}

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
  // Plus de taux_defaut : le taux de chaque membre vit dans donnees_paie,
  // avec ses charges. Un repli global masquerait un taux manquant.
  couts: { carburant_km: 0.35 },
};

/** Paramètres de prix de l'organisation (barème client + coûts internes). */
export async function obtenirParametresPrix() {
  if (modeDonnees() === "reel") {
    // .single() : la RLS ne doit renvoyer QUE l'organisation du jeton.
    // Aucun repli sur les prix de démonstration en mode réel — facturer au
    // mauvais barème coûte plus cher qu'une erreur affichée.
    const { data, error } = await supabase.from("organisations")
      .select("parametres_prix").single();
    if (error) throw new Error("Organisation introuvable pour cette session. Contactez votre administrateur.");
    return data?.parametres_prix || {};
  }
  const d = lireDemo();
  return d.parametresPrix || PARAMS_PRIX_DEMO;
}

/** Enregistre les paramètres de prix (capacité gerer_referentiels en réel). */
export async function sauverParametresPrix(params) {
  if (modeDonnees() === "reel") {
    await majOrganisation({ parametres_prix: params });
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
    // Le terrain INDIQUE : terminee_terrain. Le bureau confirmera.
    m.etat = "terminee_terrain";
    ecrireDemo(d);
  }
}

// =============================================================================
// RÉCONCILIATION TERRAIN → BUREAU (0088)
// Le chef indique (terminerChantier → terminee_terrain), le bureau tranche.
// =============================================================================

/** Le bureau confirme un chantier terminé sur le terrain → mission effectuée. */
export async function confirmerMission(missionId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_confirmer_mission", { p_mission: missionId });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    m.etat = "effectuee";
    const a = (d.affaires || []).find((x) => x.id === m.affaire_id);
    const toutes = (d.missions || []).filter((x) => x.affaire_id === m.affaire_id)
      .every((x) => !["planifiee", "en_cours", "terminee_terrain"].includes(x.etat));
    if (a && toutes) a.etat = "effectue";
    ecrireDemo(d);
    return { dossier_effectue: Boolean(a && toutes) };
  }
  return null;
}

/** Le bureau renvoie le chantier au terrain : ce n'est pas fini. */
export async function renvoyerChantier(missionId, motif) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_renvoyer_chantier",
      { p_mission: missionId, p_motif: motif || null });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) { m.etat = "en_cours"; ecrireDemo(d); }
  return { statut: "RENVOYE_TERRAIN" };
}

/**
 * Prérequis pour passer un dossier « en cours » à « effectué » — validés et
 * manquants, pour éclairer le bouton du bureau.
 */
export async function prerequisEffectue(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_prerequis_effectue", { p_affaire: affaireId });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  const miss = (d.missions || []).filter((m) => m.affaire_id === affaireId && m.etat !== "annulee");
  const sansHeure = miss.filter((m) => !(m.sessions || [])
    .some((s) => (s.type || "travail") === "travail" && s.debut && s.fin)).length;
  const points = [
    { cle: "missions", libelle: "Au moins un chantier planifié",
      statut: miss.length > 0 ? "ok" : "manquant" },
    { cle: "heures", libelle: "Chaque chantier a ses heures (départ et arrivée)",
      statut: miss.length > 0 && sansHeure === 0 ? "ok" : "manquant" },
  ];
  const manquants = points.filter((p) => p.statut === "manquant").length;
  return { affaire: affaireId, etat: a?.etat, points, manquants,
           deja_effectue: ["effectue", "clos"].includes(a?.etat),
           peut_effectuer: manquants === 0 && a?.etat === "en_cours" };
}

/**
 * Les heures de chaque mission d'un dossier, avec leur état de validation —
 * pour le cadran du Calcul définitif.
 */
export async function heuresAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_heures_affaire", { p_affaire: affaireId });
    if (error) throw error;
    return data || [];
  }
  const d = lireDemo();
  return (d.missions || []).filter((m) => m.affaire_id === affaireId && m.etat !== "annulee")
    .map((m) => {
      const t = (m.sessions || []).find((s) => (s.type || "travail") === "travail") || {};
      return { mission_id: m.id, type: m.type, date: m.date, etat: m.etat,
               depart: t.debut || null, arrivee: t.fin || null,
               validees: Boolean(m.heures_validees_le), validees_le: m.heures_validees_le || null };
    });
}

/** Le bureau valide (et corrige au besoin) les heures réelles d'une mission. */
export async function validerHeures(missionId, { depart, arrivee } = {}) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_valider_heures", {
      p_mission: missionId,
      p_depart: depart ? new Date(depart).toISOString() : null,
      p_arrivee: arrivee ? new Date(arrivee).toISOString() : null });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const m = (d.missions || []).find((x) => x.id === missionId);
  if (m) {
    const t = (m.sessions || []).find((s) => (s.type || "travail") === "travail");
    if (t) {
      if (depart) t.debut = new Date(depart).toISOString();
      if (arrivee) t.fin = new Date(arrivee).toISOString();
    }
    m.heures_validees_le = new Date().toISOString();
    ecrireDemo(d);
  }
  return { validees: true };
}

/** Le bureau marque le dossier effectué (en cours → effectué). */
export async function marquerEffectue(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_marquer_effectue", { p_affaire: affaireId });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) {
    (d.missions || []).filter((m) => m.affaire_id === affaireId)
      .forEach((m) => { if (["terminee_terrain", "planifiee", "en_cours"].includes(m.etat)) m.etat = "effectuee"; });
    a.etat = "effectue";
    ecrireDemo(d);
  }
  return { statut: "EFFECTUE" };
}

/** État de réconciliation d'un dossier (missions en attente / confirmées). */
export async function reconciliationAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_reconciliation_affaire",
      { p_affaire: affaireId });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const miss = (d.missions || []).filter((x) => x.affaire_id === affaireId && x.etat !== "annulee");
  return {
    en_attente_bureau: miss.filter((x) => x.etat === "terminee_terrain").length,
    confirmees: miss.filter((x) => x.etat === "effectuee").length,
    encore_ouvertes: miss.filter((x) => ["planifiee", "en_cours"].includes(x.etat)).length,
    missions: miss.map((x) => ({ id: x.id, type: x.type, date: x.date, etat: x.etat })),
  };
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
/**
 * Annule une annulation : le dossier repart de 'confirme' et ses missions
 * redeviennent planifiées — mais NON PARTAGÉES, pour que le bureau revalide
 * avant que le terrain se remobilise.
 */
// =============================================================================
// INSCRIPTION AUTONOME — un déménageur crée SA société.
//
// Pas de privilège d'éditeur, pas d'administration de la plateforme depuis
// l'application cliente. Le garde-fou est en base : cmd_creer_ma_societe()
// refuse si le compte appartient déjà à une organisation.
// =============================================================================

// =============================================================================
// ESPACE CLIENT (OAuth) — le client se connecte avec Google, comme le
// déménageur. Ce qui le distingue : son e-mail figure sur un dossier client.
// Aucune de ces fonctions ne prend de paramètre de périmètre — la base filtre
// sur l'e-mail authentifié, non falsifiable côté client.
// =============================================================================

async function rpcClient(nom) {
  const { data, error } = await supabase.rpc(nom);
  if (error) throw new Error(error.message || "Accès refusé.");
  return data;
}

/** Suis-je un client ? Sert à router : client vs déménageur vs prospect. */
export const clientMoi        = () => rpcClient("cmd_client_moi");
export const clientDossiers   = () => rpcClient("cmd_client_dossiers");
export const clientProfil     = () => rpcClient("cmd_client_profil");
export const clientInventaire = () => rpcClient("cmd_client_inventaire");
export const clientOffres     = () => rpcClient("cmd_client_offres");

/** Le client écrit son identité (civilité, nom, prénom, téléphone). */
export async function definirProfilClient({ civilite, nom, prenom, tel }) {
  const { data, error } = await supabase.rpc("cmd_client_profil_definir",
    { p_civilite: civilite || null, p_nom: nom, p_prenom: prenom, p_tel: tel || null });
  if (error) throw new Error(error.message);
  return data;
}

/** Le client renseigne son adresse de visite (le chargement) sur un dossier. */
export async function definirAdresseVisite(affaireId, adr) {
  const { data, error } = await supabase.rpc("cmd_client_adresse_visite", {
    p_affaire: affaireId, p_adresse: adr.adresse, p_code_postal: adr.code_postal || null,
    p_ville: adr.ville || null, p_etage: adr.etage || null });
  if (error) throw new Error(error.message);
  return data;
}
export const clientFactures   = () => rpcClient("cmd_client_factures");

// =============================================================================
// MAILPROD — messagerie probante client ↔ bureau, attachée à un dossier.
// Registre immuable et chaîné (0095) : chaque message est horodaté serveur,
// attribué, et inaltérable. Utilisable comme trace en cas de litige.
// =============================================================================

/** Lit le fil d'un dossier (bureau ou client selon la session) et marque lu. */
export async function messagesFil(affaireId) {
  const { data, error } = await supabase.rpc("cmd_messages_fil", { p_affaire: affaireId });
  if (error) throw new Error(error.message || "Accès refusé.");
  return data;
}

/** Le bureau écrit au client (avec pièces jointes éventuelles). */
export async function messageBureau(affaireId, corps, pieces = []) {
  const { data, error } = await supabase.rpc("cmd_message_bureau",
    { p_affaire: affaireId, p_corps: corps, p_pieces: pieces });
  if (error) throw new Error(error.message);
  return data;
}

/** Le client répond depuis son espace (avec pièces jointes éventuelles). */
export async function messageClient(affaireId, corps, pieces = []) {
  const { data, error } = await supabase.rpc("cmd_message_client",
    { p_affaire: affaireId, p_corps: corps, p_pieces: pieces });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Téléverse une pièce jointe de message et renvoie ses métadonnées + empreinte.
 * L'empreinte SHA-256 est calculée sur le contenu : elle entre dans le hash du
 * message (registre probant) et permet de vérifier que le fichier n'a pas bougé.
 * Formats acceptés : images et PDF, ≤ 10 Mo.
 */
export async function televerserPieceMessage(affaireId, file) {
  const OK = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!OK.includes(file.type)) throw new Error("Format non accepté (images ou PDF).");
  if (file.size > 10 * 1024 * 1024) throw new Error("Fichier trop lourd (10 Mo max).");

  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const empreinte = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  const nomSain = file.name.replace(/[^\w.\-]/g, "_").slice(-80);
  const chemin = `messages/${affaireId}/${empreinte.slice(0, 16)}_${nomSain}`;

  const { error } = await supabase.storage.from("documents")
    .upload(chemin, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);

  return { chemin, nom: file.name, type: file.type, taille: file.size, empreinte };
}

/** URL signée (temporaire) pour lire une pièce jointe. */
export async function urlPieceMessage(chemin) {
  const { data, error } = await supabase.storage.from("documents")
    .createSignedUrl(chemin, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Vérifie l'intégrité de la chaîne (bureau) — preuve d'inaltérabilité. */
export async function messagesVerifier(affaireId) {
  const { data, error } = await supabase.rpc("cmd_messages_verifier", { p_affaire: affaireId });
  if (error) throw new Error(error.message);
  return data;
}

/** Boîte de réception : toutes les conversations du bureau, regroupées par dossier. */
export async function conversations() {
  const { data, error } = await supabase.rpc("cmd_conversations");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Le client dépose une note (1–5) + un avis rapide sur son dossier. */
export async function deposerAvis(affaireId, note, commentaire) {
  const { data, error } = await supabase.rpc("cmd_avis_deposer",
    { p_affaire: affaireId, p_note: note, p_commentaire: commentaire || null });
  if (error) throw new Error(error.message);
  return data;
}

/** Avis publics d'une organisation (moyenne + derniers), pour la landing. */
export async function avisPublics(orgId) {
  const { data, error } = await supabase.rpc("cmd_avis_publics", { p_org: orgId });
  if (error) throw new Error(error.message);
  return data;
}

/** Avis par organisation du réseau (moyenne + verbatims) — vitrine publique. */
export async function avisReseau() {
  const { data, error } = await supabase.rpc("cmd_avis_reseau");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Avis des entreprises SUR Dashprod — vitrine publique. */
export async function avisProduitPublics() {
  const { data, error } = await supabase.rpc("cmd_avis_produit_publics");
  if (error) throw new Error(error.message);
  return data;
}

/** L'avis de mon organisation sur Dashprod (bureau). */
export async function avisProduitMien() {
  const { data, error } = await supabase.rpc("cmd_avis_produit_mien");
  if (error) throw new Error(error.message);
  return data;
}

/** Déposer / mettre à jour l'avis de mon organisation sur Dashprod. */
export async function definirAvisProduit({ note, commentaire, auteur, publiable }) {
  const { data, error } = await supabase.rpc("cmd_avis_produit_definir", {
    p_note: note, p_commentaire: commentaire || null,
    p_auteur: auteur || null, p_publiable: publiable !== false });
  if (error) throw new Error(error.message);
  return data;
}

// ── Inventaire des caisses (privé au client) ─────────────────────────────────
// Le client remplit le contenu de ses caisses (intime) ; le bureau ne voit que
// le plan de pose : numéro → pièce → adresse, jamais le contenu.

/** Le client lit SES caisses (contenu compris). */
export async function caissesClient(affaireId) {
  const { data, error } = await supabase.rpc("cmd_caisses_client", { p_affaire: affaireId });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Le client enregistre/mets à jour une caisse. */
export async function definirCaisse(affaireId, caisse) {
  const { data, error } = await supabase.rpc("cmd_caisse_definir", {
    p_affaire: affaireId, p_numero: caisse.numero, p_piece: caisse.piece_dest || null,
    p_adresse: caisse.adresse_id || null, p_contenu: caisse.contenu || null,
    p_fragile: Boolean(caisse.fragile) });
  if (error) throw new Error(error.message);
  return data;
}

/** Le client supprime une caisse. */
export async function supprimerCaisse(affaireId, numero) {
  const { error } = await supabase.rpc("cmd_caisse_supprimer",
    { p_affaire: affaireId, p_numero: numero });
  if (error) throw new Error(error.message);
}

/** Le bureau lit le PLAN DE POSE : numéro → pièce → adresse (sans contenu). */
export async function caissesPlan(affaireId) {
  const { data, error } = await supabase.rpc("cmd_caisses_plan", { p_affaire: affaireId });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Annuaire public : aucun compte requis, seules les entreprises opt-in sortent. */
export async function reseauDemenageurs() {
  const { data, error } = await supabase.rpc("cmd_reseau_demenageurs");
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Demandes du réseau (marketplace type « 365 ») ────────────────────────────

/** Dépôt PUBLIC d'une demande de déménagement (sans compte). */
export async function deposerDemandeReseau(demande) {
  const { data, error } = await supabase.rpc("cmd_demande_reseau_deposer", { p: demande });
  if (error) throw new Error(error.message);
  return data;
}

/** Les demandes visibles pour un déménageur du réseau (ouvertes + les siennes). */
export async function demandesReseau() {
  const { data, error } = await supabase.rpc("cmd_demandes_reseau");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Un déménageur prend une demande en charge. */
export async function prendreDemandeReseau(id) {
  const { data, error } = await supabase.rpc("cmd_demande_reseau_prendre", { p_id: id });
  if (error) throw new Error(error.message);
  return data;
}

// ── Signature d'offre par code (le lien envoyé au client) ──────────────────
export async function offreApercu(code) {
  const { data, error } = await supabase.rpc("cmd_offre_apercu", { p_code: code });
  if (error) throw new Error(error.message);
  return data;
}
export async function offreSigner(code, { nom, mention, empreinte } = {}) {
  const { data, error } = await supabase.rpc("cmd_offre_signer", {
    p_code: code, p_nom: nom || null,
    p_mention: mention || null, p_empreinte: empreinte || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Crée un lien de signature pour un dossier (côté déménageur). */
export async function creerLienSignature(affaireId, code, jours = 30) {
  const { data, error } = await supabase.rpc("cmd_creer_lien_signature", {
    p_affaire: affaireId, p_code: code, p_jours: jours,
  });
  if (error) throw error;
  return data;
}

/**
 * Lit l'accès signature ACTIF d'un dossier — pour retrouver le minuteur et
 * l'échéance au rechargement de l'onglet mail. Le code complet n'est jamais
 * relisible (haché) ; seuls l'indice (4 derniers) et l'échéance survivent.
 */
export async function accesActif(affaireId) {
  if (modeDonnees() !== "reel") {
    const d = lireDemo();
    const a = (d.acces || {})[affaireId];
    if (!a) return { actif: false };
    const expire = new Date(a.expire_le);
    return { actif: expire > new Date() && !a.revoque && !a.signe,
             indice: a.indice, expire_le: a.expire_le, cree_le: a.cree_le,
             signe: Boolean(a.signe), revoque: Boolean(a.revoque),
             expire: expire <= new Date() };
  }
  const { data, error } = await supabase.rpc("cmd_acces_actif", { p_affaire: affaireId });
  if (error) throw error;
  return data;
}

/**
 * Journal MANUEL des mails envoyés d'un dossier. Le bureau marque « envoyé »
 * quand il a effectivement expédié un mail (Dashprod n'envoie rien lui-même).
 * Stocké dans affaires.mails_envoyes (jsonb) — trace simple, pas de preuve.
 */
export async function journalMails(affaireId) {
  if (modeDonnees() !== "reel") {
    const d = lireDemo();
    return ((d.affaires.find((x) => x.id === affaireId) || {}).mails_envoyes) || [];
  }
  const { data, error } = await supabase.from("affaires")
    .select("mails_envoyes").eq("id", affaireId).maybeSingle();
  if (error) throw error;
  return data?.mails_envoyes || [];
}

/** Ajoute une entrée au journal des mails envoyés (fonction manuelle). */
export async function marquerMailEnvoye(affaireId, { modele, objet }) {
  const entree = { modele: modele || "offre", objet: objet || "",
                   le: new Date().toISOString() };
  if (modeDonnees() !== "reel") {
    const d = lireDemo();
    const a = d.affaires.find((x) => x.id === affaireId);
    if (a) { a.mails_envoyes = [...(a.mails_envoyes || []), entree]; ecrireDemo(d); }
    return entree;
  }
  const { data, error } = await supabase.rpc("cmd_journaliser_mail",
    { p_affaire: affaireId, p_modele: entree.modele, p_objet: entree.objet });
  if (error) throw error;
  return data;
}

// =============================================================================
// ── RGPD : aperçu de rétention et purge des données expirées ───────────────
export async function apercuRetention() {
  const { data, error } = await supabase.rpc("cmd_apercu_retention");
  if (error) throw new Error(error.message);
  return data;
}

/** p_dry_run=true par défaut : ne supprime rien, montre ce qui serait purgé. */
export async function purgerDonneesExpirees(dryRun = true) {
  const { data, error } = await supabase.rpc("cmd_purger_donnees_expirees",
    { p_dry_run: dryRun });
  if (error) throw new Error(error.message);
  return data;
}

// =============================================================================
// FACTURATION ÉLECTRONIQUE — Peppol via point d'accès Digiteal.
//
// Assemble une facture CANONIQUE depuis la facture réelle + l'organisation + le
// client, la valide, et la transmet via l'adaptateur Digiteal. Sans clé
// configurée, l'adaptateur s'arrête à PRETE et le dit — aucun statut inventé.
// =============================================================================

import { facture as factureCanonique, ligne as ligneCanonique }
  from "@domaine/facturation/modele.js";
import { clientDigiteal, identifiantsBelges }
  from "@domaine/facturation/digiteal.js";
import { tauxUsuelPourNature, categoriePourNature }
  from "@domaine/facturation/operations.js";

/**
 * Construit la facture canonique d'une facture en base.
 * Le vendeur vient de l'organisation, l'acheteur des données de facturation du
 * client. Peppol exige des identifiants et adresses complets des deux côtés.
 */
async function factureCanoniqueDepuisBase(factureId, affaireId) {
  const [f, org, cli, affaire] = await Promise.all([
    obtenirFacture(factureId),
    obtenirOrganisation(),
    obtenirClientFacturation(affaireId),
    // La NATURE du dossier porte la catégorie d'opération, donc le taux usuel.
    obtenirAffaire(affaireId).catch(() => null),
  ]);
  if (!f) throw new Error("Facture introuvable.");

  const pf = org.parametres_facturation || {};
  const idsVendeur = identifiantsBelges({ bce: org.bce, tva: org.tva });
  const idsClient = identifiantsBelges({ tva: cli.tva_num });

  const lignes = (f.facture_lignes || []).map((l) => ligneCanonique({
    libelle: l.libelle,
    quantite: l.quantite ?? 1,
    unite: l.unite || "pièce",
    prix_unitaire_centimes: l.prix_unitaire_centimes ?? l.montant_htva_centimes,
    tva_pct: l.tva_pct,
  }));

  return factureCanonique({
    numero: f.numero,
    date_emission: f.date_emission,
    echeance: f.echeance,
    devise: f.devise || org.devise_defaut || "EUR",
    // Le taux vient des paramètres de facturation de l'organisation. PAS de
    // repli sur 21 % : une facture Peppol a valeur légale, un taux inventé est
    // une déclaration fiscale inexacte. Non renseigné → la génération échoue
    // avec un motif, et rien n'est transmis.
    // LE TAUX EST PRÉ-DÉFINI PAR DASHPROD, pas demandé au client.
    // Un déménageur n'est pas fiscaliste : la NATURE du dossier détermine la
    // catégorie d'opération, qui porte son taux usuel. L'ordre de priorité :
    //   1. le taux configuré par l'organisation (elle a tranché) ;
    //   2. le taux usuel de la catégorie déduite de la nature ;
    //   3. rien — et `qualifierTva` refuse, avec son motif.
    // Ce n'est pas le défaut implicite du lot 23 : ce taux-là est DÉRIVÉ d'une
    // catégorie déclarée et lisible à l'écran, pas tombé de nulle part.
    tva_pct_defaut: pf.tva_pct ?? tauxUsuelPourNature(affaire?.nature) ?? null,
    communication: f.communication,
    // Peppol EXIGE une référence acheteur (PEPPOL-EN16931-R003, fatal). On
    // prend celle saisie sur la facture ; à défaut la référence du dossier,
    // que le client connaît et qui lui sert à rapprocher. Si les deux
    // manquent, la génération échoue avec un motif — on n'invente pas.
    reference_acheteur: f.reference_acheteur || f.reference_dossier || null,
    prestation_debut: f.prestation_debut || null,
    prestation_fin: f.prestation_fin || null,
    type: f.type === "avoir" ? "avoir" : "facture",
    facture_corrigee: f.facture_corrigee || null,
    vendeur: {
      nom: org.nom_commercial || org.nom, tva: org.tva,
      peppol_id: pf.peppol_id || idsVendeur[0] || null,   // source unique : parametres_facturation
      rue: org.adresse, cp: org.cp, ville: org.ville, pays: org.pays || "BE",
      iban: org.iban,
    },
    acheteur: {
      nom: cli.societe || cli.nom, tva: cli.tva_num,
      peppol_id: idsClient[0] || null,
      rue: cli.fact_lignes, cp: cli.fact_cp, ville: cli.fact_ville,
      pays: cli.fact_pays || "BE",
    },
    lignes,
  });
}

/** Client Digiteal configuré depuis les paramètres de l'organisation. */
async function clientPeppol() {
  const org = await obtenirOrganisation();
  const pf = org.parametres_facturation || {};
  return clientDigiteal({
    identifiant: pf.digiteal_id || null,
    secret: pf.digiteal_secret || null,
    environnement: pf.digiteal_env || "test",
  });
}

/** Le destinataire d'une facture est-il joignable sur Peppol ? */
export async function peppolJoignable(factureId, affaireId) {
  const fc = await factureCanoniqueDepuisBase(factureId, affaireId);
  if (!fc.acheteur.peppol_id) {
    return { ok: true, joignable: false,
      message: "Le client n'a pas d'identifiant Peppol (numéro de TVA requis)." };
  }
  const c = await clientPeppol();
  return c.estJoignable(fc.acheteur.peppol_id);
}

/**
 * Transmet une facture par Peppol et journalise la transmission.
 * Enregistre l'état réel renvoyé (PRETE si non configuré, SOUMISE si envoyé),
 * jamais un statut fabriqué.
 */
export async function peppolTransmettre(factureId, affaireId) {
  const fc = await factureCanoniqueDepuisBase(factureId, affaireId);
  const c = await clientPeppol();
  const r = await c.transmettre(fc);

  if (modeDonnees() === "reel") {
    const { data: org } = await supabase.from("organisations").select("id").single();
    // On journalise la tentative, quel que soit son sort.
    await supabase.from("transmissions").upsert({
      org_id: org?.id, facture_id: factureId, canal: "PEPPOL",
      etat: r.etat || "ECHEC",
      reference_ext: r.reference_ext || null,
      erreur: r.ok ? null : (r.message || null),
      cle_idempotence: r.cle_idempotence || null,
      charge_utile: r.charge_utile || null,
    }, { onConflict: "facture_id,canal,cle_idempotence" }).select("id");
  }
  return r;
}

/** Journal des transmissions d'une facture. */
export async function listerTransmissions(factureId) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.from("transmissions")
    .select("id, canal, etat, reference_ext, erreur, cree_le, updated_at")
    .eq("facture_id", factureId).order("cree_le", { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * État de facturation d'un dossier — DÉRIVÉ des factures et paiements.
 * Ne jamais le déduire de `affaires.etat` : depuis 0064 les deux cycles sont
 * séparés, et c'est cette fonction qui fait foi pour l'argent.
 */
export async function etatFacturation(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("etat_facturation",
      { p_affaire: affaireId });
    if (error) throw new Error(error.message);
    return data;
  }
  const d = lireDemo();
  const fs = (d.factures || []).filter((f) => f.affaire_id === affaireId && f.emise);
  const du = fs.reduce((t, f) => t + (f.type === "avoir" ? -f.tvac_centimes : f.tvac_centimes), 0);
  const paye = fs.reduce((t, f) => t
    + (f.paiements || []).reduce((s, p) => s + (p.montant_centimes || 0), 0), 0);
  const etat = fs.length === 0 ? "non_facture"
    : paye <= 0 ? "facture" : paye < du ? "partiellement_paye" : "paye";
  return { etat, factures: fs.length, du_centimes: du, paye_centimes: paye,
           solde_centimes: du - paye };
}

// ── Autorisations d'un membre ─────────────────────────────────────────────
// On distingue ce qui vient du RÔLE de ce qui a été accordé personnellement :
// seul le second se retire depuis la fiche, le premier demande de changer le
// rôle du membre.

export async function capacitesMembre(membreId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_capacites_membre",
      { p_membre: membreId });
    if (error) throw new Error(error.message);
    return {
      roles: data?.roles || [],
      capacitesDesRoles: data?.capacites_des_roles || [],
      capacitesIndividuelles: data?.capacites_individuelles || [],
    };
  }
  const d = lireDemo();
  const m = (d.membres || []).find((x) => x.id === membreId) || {};
  return {
    roles: m.roles || [],
    capacitesDesRoles: m.capacitesDesRoles || [],
    capacitesIndividuelles: m.capacitesIndividuelles || [],
  };
}

/** Accorde (true) ou retire (false) une capacité individuelle. */
export async function definirCapacite(membreId, capacite, accorder) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_definir_capacite", {
      p_membre: membreId, p_capacite: capacite, p_accorder: !!accorder,
    });
    if (error) throw new Error(error.message);
    return data;
  }
  const d = lireDemo();
  const m = (d.membres || []).find((x) => x.id === membreId);
  if (m) {
    const set = new Set(m.capacitesIndividuelles || []);
    accorder ? set.add(capacite) : set.delete(capacite);
    m.capacitesIndividuelles = [...set];
    ecrireDemo(d);
  }
  return { ok: true };
}

// ── COMPTABILITÉ : factures canoniques d'une période ──────────────────────
// Le moteur d'export (CSV, journal PCMN, FEC) consomme des factures
// CANONIQUES, pas les lignes brutes de la base. C'est cette conversion qui
// manquait pour rendre le moteur atteignable — il était construit et testé,
// mais aucun écran ne pouvait l'appeler.

/**
 * Les factures ÉMISES d'une période, au format canonique.
 * Seules les factures émises comptent : un brouillon n'a pas de numéro légal
 * et n'a rien à faire dans un journal comptable.
 */
export async function facturesCanoniquesPeriode({ debut, fin }) {
  if (modeDonnees() !== "reel") {
    const d = lireDemo();
    return (d.factures || [])
      .filter((f) => f.emise && f.date_emission >= debut && f.date_emission <= fin)
      .map((f) => factureCanonique({
        numero: f.numero, date_emission: f.date_emission, type: f.type || "facture",
        acheteur: { nom: f.client || "Client" },
        vendeur: { nom: "Démo" },
        lignes: (f.lignes || []).map((l) => ligneCanonique({
          libelle: l.libelle, quantite: 1,
          prix_unitaire_centimes: l.montant_htva_centimes, tva_pct: 21,
        })),
      }));
  }

  const { data, error } = await supabase.from("factures")
    .select("id, affaire_id, numero, type, date_emission, echeance, communication, "
          + "devise, facture_lignes(libelle, quantite, unite, prix_unitaire_centimes, "
          + "montant_htva_centimes, tva_pct), affaires(client_id, nature)")
    .eq("emise", true)
    .gte("date_emission", debut)
    .lte("date_emission", fin)
    .order("date_emission");
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const org = await obtenirOrganisation();
  const pf = org.parametres_facturation || {};

  // Un seul appel pour tous les clients concernés, plutôt qu'un par facture.
  const idsClients = [...new Set(data.map((f) => f.affaires?.client_id).filter(Boolean))];
  let clients = [];
  if (idsClients.length > 0) {
    const { data: cs } = await supabase.from("clients")
      .select("id, nom, societe, tva_num, fact_lignes, fact_cp, fact_ville, fact_pays")
      .in("id", idsClients);
    clients = cs || [];
  }
  const parId = new Map(clients.map((c) => [c.id, c]));

  return data.map((f) => {
    const c = parId.get(f.affaires?.client_id) || {};
    return factureCanonique({
      numero: f.numero,
      date_emission: f.date_emission,
      echeance: f.echeance,
      devise: f.devise || org.devise_defaut || "EUR",
      // Le taux vient des paramètres de facturation de l'organisation. PAS de
    // repli sur 21 % : une facture Peppol a valeur légale, un taux inventé est
    // une déclaration fiscale inexacte. Non renseigné → la génération échoue
    // avec un motif, et rien n'est transmis.
    // LE TAUX EST PRÉ-DÉFINI PAR DASHPROD, pas demandé au client.
    // Un déménageur n'est pas fiscaliste : la NATURE du dossier détermine la
    // catégorie d'opération, qui porte son taux usuel. L'ordre de priorité :
    //   1. le taux configuré par l'organisation (elle a tranché) ;
    //   2. le taux usuel de la catégorie déduite de la nature ;
    //   3. rien — et `qualifierTva` refuse, avec son motif.
    // Ce n'est pas le défaut implicite du lot 23 : ce taux-là est DÉRIVÉ d'une
    // catégorie déclarée et lisible à l'écran, pas tombé de nulle part.
    tva_pct_defaut: pf.tva_pct ?? tauxUsuelPourNature(f.affaires?.nature) ?? null,
      communication: f.communication,
      type: f.type === "avoir" ? "avoir" : "facture",
      vendeur: { nom: org.nom_commercial || org.nom, tva: org.tva,
                 rue: org.adresse, cp: org.cp, ville: org.ville,
                 pays: org.pays || "BE", iban: org.iban },
      acheteur: { nom: c.societe || c.nom, tva: c.tva_num,
                  rue: c.fact_lignes, cp: c.fact_cp, ville: c.fact_ville,
                  pays: c.fact_pays || "BE" },
      lignes: (f.facture_lignes || []).map((l) => ligneCanonique({
        libelle: l.libelle,
        quantite: l.quantite ?? 1,
        unite: l.unite || "pièce",
        prix_unitaire_centimes: l.prix_unitaire_centimes ?? l.montant_htva_centimes,
        tva_pct: l.tva_pct,
      })),
    });
  });
}

// ── Journal d'enregistrements ─────────────────────────────────────────────
// Tous les mouvements de l'entreprise, en insertion seule. Rien ne s'y
// réécrit : une décision se remplace par une nouvelle qui cite l'ancienne.

export async function lireJournal({ depuis, jusqua, affaireId,
                                    acteur, limite } = {}) {
  // On filtre par DOSSIER, pas par type d'entité : une mission, un document ou
  // une facture appartiennent au dossier même s'ils ne portent pas son id.
  // Filtrer sur le type ratait la moitié de l'histoire.
  const { data, error } = await supabase.rpc("cmd_journal", {
    p_depuis: depuis || null,
    p_jusqua: jusqua || null,
    p_affaire: affaireId || null,
    p_acteur: acteur || null,
    p_limite: limite || 200,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Consigne une décision — ce qu'aucune donnée ne révèle. */
export async function noterDecision(texte, { entiteType, entiteId, remplace } = {}) {
  const { data, error } = await supabase.rpc("cmd_noter_decision", {
    p_texte: texte,
    p_entite_type: entiteType || null,
    p_entite_id: entiteId || null,
    p_remplace: remplace || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ── Rapport de chantier et boucle d'écart (EX-10) ─────────────────────────
// Le terrain CONSTATE, le bureau TRANCHE. Aucun montant ne circule depuis le
// terrain : le prix se calcule au bureau, avec le barème.

export async function lireRapport({ missionId, affaireId } = {}) {
  const { data, error } = await supabase.rpc("cmd_rapport", {
    p_mission: missionId || null, p_affaire: affaireId || null,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Le chef d'équipe rédige le déroulé du chantier. */
export async function ecrireDeroule(missionId, deroule) {
  const { data, error } = await supabase.rpc("cmd_rapport_deroule", {
    p_mission: missionId, p_deroule: deroule || "",
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Le terrain déclare un écart : estimation de temps/volume, jamais un prix. */
export async function declarerConstat(missionId, { nature, description,
                                                   minutes, volume } = {}) {
  const { data, error } = await supabase.rpc("cmd_constat_declarer", {
    p_mission: missionId, p_nature: nature, p_description: description,
    p_minutes: Math.round(Number(minutes) || 0),
    p_volume: Number(volume) || 0,
  });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.message);
  return data;
}

/** Le bureau tranche : valide / refuse / ajuste. */
export async function trancherConstat(constatId, decision, motif) {
  const { data, error } = await supabase.rpc("cmd_constat_trancher", {
    p_constat: constatId, p_decision: decision, p_motif: motif || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Certificat de signature — la preuve opposable, telle qu'enregistrée.
 * N'invente ni ne recalcule rien : un certificat qui recalculerait quoi que ce
 * soit ne prouverait rien.
 */
export async function certificatSignature(affaireId) {
  const { data, error } = await supabase.rpc("cmd_certificat_signature",
    { p_affaire: affaireId });
  if (error) throw new Error(error.message);
  return data;
}

// ── Abonnement : offre, périodicité, transition ───────────────────────────
// Principe qui gouverne la descente d'offre : on n'efface JAMAIS de données.
// Ce qui dépasse la nouvelle limite est archivé, donc réactivable — c'est ce
// qui permet de remonter sans avoir rien perdu.

export async function exigencesOffre(cible) {
  const { data, error } = await supabase.rpc("cmd_exigences_offre", { p_cible: cible });
  if (error) throw new Error(error.message);
  return data;
}

/** `conserver` : identifiants des membres qui gardent leur accès. */
export async function changerOffre(cible, { periodicite, conserver } = {}) {
  const { data, error } = await supabase.rpc("cmd_changer_offre", {
    p_cible: cible,
    p_periodicite: periodicite || null,
    p_conserver: conserver && conserver.length ? conserver : null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function reactiverMembre(membreId) {
  const { data, error } = await supabase.rpc("cmd_reactiver_membre",
    { p_membre: membreId });
  if (error) throw new Error(error.message);
  return data;
}

export async function creerMaSociete(champs) {
  const { data, error } = await supabase.rpc("cmd_creer_ma_societe", {
    p_nom: champs.nom,
    p_bce: champs.bce || null,
    p_tva: champs.tva || null,
    p_tel: champs.tel || null,
    p_email: champs.email || null,
    p_nom_admin: champs.nomAdmin || null,
    p_code: champs.code || null,
  });
  if (error) throw error;
  return data;
}

export async function reprendreAffaire(affaireId, motif) {
  if (modeDonnees() === "reel") {
    const { error } = await supabase.rpc("cmd_reprendre_affaire", {
      p_affaire: affaireId, p_motif: motif || null,
    });
    if (error) throw error;
    return;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) { a.etat = "confirme"; a.archive_le = null; ecrireDemo(d); }
}

/** Retire définitivement un article de l'inventaire d'un membre. */
export async function supprimerEquipement(equipementId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("equipements_rh")
      .delete().eq("id", equipementId).select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Suppression refusée : droits insuffisants.");
    }
    return;
  }
  const d = lireDemo();
  d.equipements = (d.equipements || []).filter((e) => e.id !== equipementId);
  ecrireDemo(d);
}

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

/**
 * Contexte de la main-d'œuvre d'un dossier : ce qui décide qu'une ligne reste,
 * disparaît, ou passe en orange. Trois faits, lus en base, jamais devinés.
 *  — le dossier est-il clôturé ;
 *  — une mission est-elle terminée ;
 *  — qui a réellement été affecté (donc a travaillé).
 */
export async function contexteMainOeuvre(affaireId) {
  if (modeDonnees() === "reel") {
    const { data: aff } = await supabase.from("affaires")
      .select("etat").eq("id", affaireId).maybeSingle();
    const { data: missions } = await supabase.from("missions")
      .select("id, etat, mission_affectations(utilisateur_id)")
      .eq("affaire_id", affaireId);
    const liste = missions || [];
    return {
      dossierClos: aff?.etat === "clos",
      missionTerminee: liste.some((m) => m.etat === "effectuee"),
      ontTravaille: [...new Set(liste.flatMap(
        (m) => (m.mission_affectations || []).map((a) => a.utilisateur_id)))],
    };
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  const miss = (d.missions || []).filter((m) => m.affaire_id === affaireId);
  return {
    dossierClos: a?.etat === "clos",
    missionTerminee: miss.some((m) => m.etat === "effectuee"),
    ontTravaille: a?.equipe || [],
  };
}

// =============================================================================
// CLÔTURE DU DOSSIER (0080) — dernière étape du cycle.
//
// `cloreAffaire` existait ici depuis des mois, appelée par personne, et
// appuyait directement sur `cmd_transition_affaire` sans vérifier quoi que ce
// soit. Elle est remplacée par un circuit en trois temps : on demande d'abord
// ce qui manque, on clôture ensuite, et la base fige un bilan qui ne se
// recalculera plus. Rouvrir reste possible — jamais en silence.
// =============================================================================

/** Ce qui manque avant de pouvoir clôturer. Ne modifie rien. */
export async function exigencesCloture(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_exigences_cloture",
      { p_affaire: affaireId });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  const etat = a?.etat || "brouillon";
  const points = [
    { cle: "etat", libelle: "Le chantier est terminé", bloquant: true,
      statut: etat === "effectue" || etat === "clos" ? "ok" : "manquant" },
  ];
  const bloquants = points.filter((p) => p.bloquant && p.statut === "manquant").length;
  return { affaire: affaireId, etat, points, bloquants,
           peut_cloturer: bloquants === 0 && etat === "effectue",
           peut_cloturer_avec_motif: etat === "effectue" };
}

/**
 * Clôture. Sans motif, la base refuse dès qu'un point bloquant subsiste ; avec
 * motif, elle accepte et inscrit la dérogation dans le bilan et le journal.
 */
export async function cloturerDossier(affaireId, motif = null) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_cloturer_dossier",
      { p_affaire: affaireId, p_motif: motif });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) { a.etat = "clos"; a.cloture_le = new Date().toISOString(); ecrireDemo(d); }
  return { statut: "CLOTURE", bilan: null };
}

/** Réouverture : le motif est obligatoire, côté base comme ici. */
export async function rouvrirDossier(affaireId, motif) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_rouvrir_dossier",
      { p_affaire: affaireId, p_motif: motif });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const a = (d.affaires || []).find((x) => x.id === affaireId);
  if (a) { a.etat = "effectue"; a.cloture_le = null; ecrireDemo(d); }
  return { statut: "ROUVERT" };
}

// =============================================================================
// APPARTENANCE (0081) — une personne, plusieurs sociétés, jamais deux à la fois.
//
// Le jeton ne porte une société que lorsqu'elle est certaine : une seule
// appartenance, ou un choix explicite. Après un choix, il FAUT rafraîchir la
// session — sinon l'ancien jeton continue de désigner l'ancienne société, et
// c'est lui qui commande le RLS.
// =============================================================================

export async function mesSocietes() {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.rpc("cmd_mes_societes");
  if (error) throw error;
  return data || [];
}

export async function choisirSociete(orgId) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_choisir_societe", { p_org: orgId });
  if (error) throw error;
  // Le choix ne vaut rien tant que le jeton ne le porte pas.
  await supabase.auth.refreshSession();
  return data;
}

/**
 * Le membre devient client de sa propre société — avec une adresse PERSONNELLE,
 * distincte de son accès entreprise. Les deux espaces n'ont aucun identifiant
 * en commun : c'est la condition pour qu'ils ne se contaminent jamais (0082).
 */
export async function membreDevenirClient(membreId, emailPersonnel) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_membre_devenir_client",
    { p_membre: membreId, p_email_client: emailPersonnel });
  if (error) throw error;
  return data;
}

/**
 * Retrait d'un membre. L'accès s'arrête ; la paie, les heures et l'historique
 * restent — sinon la comptabilité d'un exercice clos deviendrait fausse le jour
 * d'un départ.
 */
export async function retirerMembre(membreId, motif = null) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_retirer_membre",
    { p_membre: membreId, p_motif: motif });
  if (error) throw error;
  return data;
}

/** Contrôle de cloisonnement, à relancer après toute migration. */
export async function auditCloison() {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_audit_cloison");
  if (error) throw error;
  return data;
}

// =============================================================================
// LITIGES (0086) — impayé, dégât/assurance, contestation. Un circuit chacun.
// Tant qu'un litige est ouvert, la clôture est bloquée (sauf dérogation).
// =============================================================================

export async function litigesAffaire(affaireId) {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.rpc("cmd_litiges_affaire", { p_affaire: affaireId });
    if (error) throw error;
    return data;
  }
  const d = lireDemo();
  const liste = (d.litiges || []).filter((l) => l.affaire_id === affaireId);
  return { ouverts: liste.filter((l) => l.statut === "ouvert").length,
           enjeu_ouvert_centimes: 0, liste };
}

export async function ouvrirLitige(affaireId, { type, titre, montantCentimes, description, reference }) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_ouvrir_litige", {
    p_affaire: affaireId, p_type: type, p_titre: titre || null,
    p_montant_centimes: montantCentimes ?? null,
    p_description: description || null, p_reference: reference || null });
  if (error) throw error;
  return data;
}

/**
 * Les litiges portant sur un CONTRAT de stockage. Un dégât survenu au
 * cinquième mois d'entreposage ne concerne aucune affaire — il concerne le
 * contrat. Voir la contrainte `litiges_porte_sur_une_chose` (0115).
 */
export async function litigesContrat(contratId) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.rpc("cmd_litiges_contrat",
    { p_contrat: contratId });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function ouvrirLitigeContrat(contratId, titre, type = "degat", extra = {}) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_ouvrir_litige_contrat", {
    p_contrat: contratId, p_type: type, p_titre: titre || null,
    p_montant_centimes: extra.montantCentimes ?? null,
    p_description: extra.description || null,
    p_reference: extra.reference || null });
  if (error) throw new Error(error.message);
  return data;
}

export async function avancerLitige(litigeId, etape, note) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_avancer_litige",
    { p_litige: litigeId, p_etape: etape, p_note: note || null });
  if (error) throw error;
  return data;
}

export async function resoudreLitige(litigeId, issue, resolution) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.rpc("cmd_resoudre_litige",
    { p_litige: litigeId, p_issue: issue, p_resolution: resolution || null });
  if (error) throw error;
  return data;
}

/**
 * Le scénario retenu d'un dossier : le « prévu » du calcul définitif.
 * Lu séparément parce que l'écran Devis recompose le scénario en direct, mais le
 * calcul définitif veut le montant ARRÊTÉ, celui qui a été retenu et facturé.
 */
export async function scenarioRetenu(affaireId) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.from("scenarios")
    .select("resultats").eq("affaire_id", affaireId).eq("retenu", true).maybeSingle();
  if (error) throw error;
  return data?.resultats || null;
}

// =============================================================================
// TEXTES DU BUREAU — modèles de l'email d'offre (Compte → Textes).
// Stockés dans organisations.parametres_textes (jsonb). Le domaine applique
// ses valeurs par défaut pour toute clé absente : un réglage partiel suffit.
// =============================================================================

/**
 * Applique un UPDATE sur l'organisation courante et VÉRIFIE qu'il a écrit.
 *
 * PostgREST ne renvoie aucune erreur quand un UPDATE est filtré par la RLS et
 * touche 0 ligne. C'est ce qui a fait croire pendant des jours que les réglages
 * s'enregistraient : l'écran affichait « ✓ Enregistré » et la base n'avait rien
 * reçu. On demande donc les lignes en retour et on lève si c'est vide.
 * (Cause racine corrigée en base par la migration 0043.)
 */
async function majOrganisation(maj) {
  const { data: org, error: e1 } = await supabase.from("organisations")
    .select("id").single();
  if (e1) throw new Error("Organisation introuvable pour cette session.");
  const { data, error } = await supabase.from("organisations")
    .update(maj).eq("id", org.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "Enregistrement refusé : vous n'avez pas le droit de modifier les "
      + "paramètres de l'entreprise (capacité « gérer les référentiels »).");
  }
  return data[0].id;
}

/**
 * Écrit l'identité de l'entreprise — la fonction qui manquait. Sans elle,
 * aucun tenant ne pouvait renseigner son nom, sa TVA ou son IBAN.
 * Écriture partielle sûre : seuls les champs fournis sont transmis.
 */
const CHAMPS_ORG_MODIFIABLES = [
  "nom", "nom_commercial", "forme_juridique", "bce", "tva",
  "adresse", "cp", "ville", "pays", "tel", "email", "site_web", "iban",
  "devise_defaut", "parametres_facturation",
];

export async function sauverOrganisation(champs) {
  const maj = {};
  for (const c of CHAMPS_ORG_MODIFIABLES) {
    if (champs && Object.prototype.hasOwnProperty.call(champs, c)) maj[c] = champs[c];
  }
  if (Object.keys(maj).length === 0) return;
  if (modeDonnees() === "reel") { await majOrganisation(maj); return; }
  const d = lireDemo();
  d.organisation = { ...(d.organisation || {}), ...maj };
  ecrireDemo(d);
}

/** Catalogues réglables : pièces du relevé, fournitures, matériel de terrain. */
export async function obtenirCatalogues() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("organisations")
      .select("parametres_catalogues").single();
    if (error) throw new Error("Organisation introuvable pour cette session.");
    return data?.parametres_catalogues || {};
  }
  return lireDemo().catalogues || {};
}

export async function sauverCatalogues(catalogues) {
  if (modeDonnees() === "reel") {
    await majOrganisation({ parametres_catalogues: catalogues });
    return;
  }
  const d = lireDemo(); d.catalogues = catalogues; ecrireDemo(d);
}

export async function obtenirTextes() {
  if (modeDonnees() === "reel") {
    const { data, error } = await supabase.from("organisations")
      .select("parametres_textes").single();
    if (error) throw error;
    return data?.parametres_textes || {};
  }
  const d = lireDemo();
  return d.textes || {};
}

export async function sauverTextes(textes) {
  if (modeDonnees() === "reel") {
    await majOrganisation({ parametres_textes: textes });
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

/**
 * Chemin cloisonné par organisation : org/{org_id}/cgv/{fichier}.
 * Le premier segment porte l'isolation, les policies Storage comparent
 * (storage.foldername(name))[2] à jwt_org().
 */
async function cheminCbd() {
  const org = await obtenirOrganisation();
  if (!org?.id) throw new Error("Organisation inconnue : dépôt impossible.");
  return `org/${org.id}/cgv/${FICHIER_CBD}`;
}

/**
 * URL SIGNÉE et temporaire du PDF des conditions C.B.D., ou null.
 * Le bucket est privé : getPublicUrl produirait une URL permanente et
 * non révocable sur un document contractuel (DATA_SECURITY.md §3).
 */
export async function urlConditionsCbd() {
  if (modeDonnees() !== "reel") return null;
  try {
    const chemin = await cheminCbd();
    const { data, error } = await supabase.storage.from("documents")
      .createSignedUrl(chemin, 300);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch { return null; }
}

/** Dépose (ou remplace) le PDF des conditions C.B.D. de l'organisation. */
export async function televerserConditionsCbd(fichier) {
  if (modeDonnees() !== "reel") throw new Error("Dépôt indisponible en démo");
  const chemin = await cheminCbd();
  const { error } = await supabase.storage.from("documents")
    .upload(chemin, fichier, { upsert: true, contentType: "application/pdf" });
  if (error) throw error;
}

// =============================================================================
// DÉMO plafonnée par compte Google (2 essais). Le décompte est serveur ; la
// démo elle-même tourne sur le magasin local (aucune donnée d'entreprise).
// =============================================================================

/** Combien d'essais de démo restent à ce compte Google. */
export async function demoEtat() {
  const { data, error } = await supabase.rpc("cmd_demo_etat");
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Démarre un essai de démo : vérifie et décompte côté serveur, puis bascule la
 * session en mode démo local. Renvoie l'autorisation. Si refusé, ne bascule pas.
 */
export async function demoDemarrer() {
  const { data, error } = await supabase.rpc("cmd_demo_essai");
  if (error) throw new Error(error.message);
  if (data?.autorise) activerDemoForcee();
  return data;
}

// =============================================================================
// CENTRES LOGISTIQUES et STOCKAGE (offre Pro)
// =============================================================================

/**
 * Ce à quoi j'ai droit : le plan, les modules ouverts, et mon cadrage
 * (maison mère ou centre). C'est la base autorise l'accès, pas l'écran —
 * ceci sert seulement à ne pas montrer une porte fermée.
 */
export async function monAcces() {
  const { data, error } = await supabase.rpc("cmd_mon_acces");
  if (error) throw new Error(error.message);
  return data;
}

/** Les centres de l'entreprise (un responsable ne voit que le sien). */
export async function depots(inclureArchives = false) {
  const { data, error } = await supabase.rpc("cmd_centres",
    { p_inclure_archives: !!inclureArchives });
  if (error) throw new Error(error.message);
  return data || [];
}

/** La répartition membres / véhicules par centre (maison mère). */
export async function repartitionCentres() {
  const { data, error } = await supabase.rpc("cmd_centres_repartition");
  if (error) throw new Error(error.message);
  return data;
}

/** Affecter un membre à un centre, et le nommer responsable (maison mère). */
export async function affecterMembreCentre(membreId, centreId, responsable) {
  const { data, error } = await supabase.rpc("cmd_centre_affecter_membre", {
    p_membre: membreId, p_centre: centreId || null,
    p_responsable: Boolean(responsable) });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Transfère PLUSIEURS membres vers un centre (ou la maison mère si `centreId`
 * est null). Décision de Raphaël : on transfère par lots, pas un par un.
 *
 * Chaque affectation passe par la commande unitaire déjà éprouvée
 * (`cmd_centre_affecter_membre`). On les enchaîne et on renvoie le compte de
 * ce qui a réellement bougé. Une erreur sur un membre n'annule pas les autres :
 * mieux vaut neuf transferts sur dix, signalés, qu'un tout-ou-rien qui laisse
 * l'utilisateur sans savoir où il en est.
 *
 * @param {string[]} membreIds
 * @param {string|null} centreId  null = maison mère
 * @returns {{ transferes: number, echecs: {id:string, motif:string}[] }}
 */
export async function transfererMembres(membreIds, centreId) {
  let transferes = 0;
  const echecs = [];
  for (const id of membreIds || []) {
    try {
      await affecterMembreCentre(id, centreId || null, false);
      transferes += 1;
    } catch (e) {
      echecs.push({ id, motif: e.message });
    }
  }
  return { transferes, echecs };
}

/** Affecter un véhicule ou un dossier à un centre (maison mère). */
export async function affecterAuCentre(quoi, id, centreId) {
  const { data, error } = await supabase.rpc("cmd_centre_affecter", {
    p_quoi: quoi, p_id: id, p_centre: centreId || null });
  if (error) throw new Error(error.message);
  return data;
}

/** Le compte rendu hebdomadaire, un centre ou tous. */
export async function rapportHebdo(centreId, semaine) {
  const { data, error } = await supabase.rpc("cmd_rapport_hebdo", {
    p_centre: centreId || null, p_semaine: semaine || null });
  if (error) throw new Error(error.message);
  return data;
}

/** Créer ou modifier un centre (direction). */
export async function definirDepot(d) {
  const { data, error } = await supabase.rpc("cmd_centre_definir", {
    p_id: d.id || null, p_nom: d.nom, p_adresse: d.adresse || null,
    p_code_postal: d.code_postal || null, p_ville: d.ville || null,
    p_tel: d.tel || null, p_actif: d.actif !== false });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Les échéances d'un contrat, période par période, avec ce qui a déjà été
 * facturé. Aucune facture n'est générée automatiquement : facturer sans
 * regard humain un contrat résilié la veille fâche un client pour rien.
 */
export async function echeancesStockage(jusqua, contratId) {
  const { data, error } = await supabase.rpc("cmd_stock_echeances", {
    p_jusqua: jusqua || null, p_contrat: contratId || null });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Marque une période comme facturée. Idempotent : deux clics ne font qu'un. */
export async function marquerEcheance(contratId, periode, montantCentimes, factureId) {
  const { data, error } = await supabase.rpc("cmd_stock_echeance_marquer", {
    p_contrat: contratId, p_periode: periode,
    p_montant: montantCentimes, p_facture: factureId || null });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Les axes x/y/z tels que l'organisation les a définis (libellés, format,
 * bornes réelles du dépôt). Repli sur allée / rangée / étage si rien n'a été
 * déclaré — le repli vit côté base ET côté domaine, sans divergence possible.
 */
export async function axesStockage() {
  const { data, error } = await supabase.rpc("cmd_axes_stockage");
  if (error) throw new Error(error.message);
  return data || null;
}

export async function definirAxesStockage(a) {
  const { data, error } = await supabase.rpc("cmd_axes_stockage_definir", { p: a });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Les réglages tarifaires propres à un centre (couronnes lift notamment).
 * Un centre sans grille suit celle de la maison mère : c'est le domaine qui
 * gère ce repli, pas cette fonction.
 */
export async function definirTarifsCentre(id, tarifs) {
  const { data, error } = await supabase.rpc("cmd_centre_tarifs_definir",
    { p_id: id, p_tarifs: tarifs || {} });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Archive un centre, ou le réactive. La base refuse d'archiver un centre qui
 * porte encore des membres, des véhicules, des dossiers ouverts ou des
 * contrats de stockage : le message d'erreur dit quoi déplacer d'abord.
 */
export async function archiverDepot(id, archiver = true) {
  const { data, error } = await supabase.rpc("cmd_centre_archiver",
    { p_id: id, p_archiver: !!archiver });
  if (error) throw new Error(error.message);
  return data;
}

/** Rattacher un membre, un véhicule ou un dossier à un centre. */
export async function rattacherAuDepot(quoi, id, depotId) {
  const { data, error } = await supabase.rpc("cmd_depot_rattacher", {
    p_quoi: quoi, p_id: id, p_depot: depotId || null });
  if (error) throw new Error(error.message);
  return data;
}

/** Les zones de stockage d'un centre. */
export async function stockZones(depotId) {
  const { data, error } = await supabase.rpc("cmd_stock_zones", { p_depot: depotId || null });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Les boxes d'un centre, avec leur occupation. */
export async function stockBoxes(depotId) {
  const { data, error } = await supabase.rpc("cmd_stock_boxes", { p_depot: depotId || null });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function definirZone(z) {
  const { data, error } = await supabase.rpc("cmd_stock_zone_definir", { p: z });
  if (error) throw new Error(error.message);
  return data;
}

export async function definirBox(b) {
  const { data, error } = await supabase.rpc("cmd_stock_box_definir", { p: b });
  if (error) throw new Error(error.message);
  return data;
}

export async function supprimerStock(quoi, id) {
  const { data, error } = await supabase.rpc("cmd_stock_supprimer",
    { p_quoi: quoi, p_id: id });
  if (error) throw new Error(error.message);
  return data;
}

/** Les contrats de stockage (zones négociées ou boxes au barème). */
export async function stockContrats(depotId) {
  const { data, error } = await supabase.rpc("cmd_stock_contrats", { p_depot: depotId || null });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function definirContratStockage(c) {
  const { data, error } = await supabase.rpc("cmd_stock_contrat_definir", { p: c });
  if (error) throw new Error(error.message);
  return data;
}

/* ── Ressources de l'export comptable ─────────────────────────────────────
 * Réversibilité : le client doit pouvoir emporter TOUTES ses données. Chaque
 * lecture est indépendante — si l'une échoue, l'export reste partiellement
 * possible plutôt que bloqué en entier.
 */

/** Factures fournisseur d'une période (toutes, l'export filtrera). */
export async function achatsPeriode({ debut, fin } = {}) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.from("factures_fournisseur")
    .select("numero, type, date_emission, fournisseur_nom, fournisseur_tva, "
          + "htva_centimes, tva_centimes, tvac_centimes, du_centimes, etat")
    .gte("date_emission", debut).lte("date_emission", fin)
    .order("date_emission");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Encaissements d'une période, avec le numéro de la facture concernée. */
export async function paiementsPeriode({ debut, fin } = {}) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.from("paiements")
    .select("date_paiement, montant_centimes, moyen, note, factures(numero)")
    .gte("date_paiement", debut).lte("date_paiement", fin)
    .order("date_paiement");
  if (error) throw new Error(error.message);
  return (data || []).map((p) => ({ ...p, facture_numero: p.factures?.numero || "" }));
}

/** Clients et fournisseurs, pour les comptes auxiliaires du cabinet. */
export async function listerTiers() {
  if (modeDonnees() !== "reel") return [];
  const [cli, four] = await Promise.all([
    supabase.from("clients").select("nom, tva_num, ville, cp, pays"),
    supabase.from("factures_fournisseur")
      .select("fournisseur_nom, fournisseur_tva, fournisseur_peppol, fournisseur_pays"),
  ]);
  const tiers = (cli.data || []).map((c) => ({
    type: "client", nom: c.nom, tva: c.tva_num,
    cp: c.cp, ville: c.ville, pays: c.pays || "BE",
  }));
  // Un fournisseur peut apparaître sur plusieurs factures : on dédoublonne par
  // TVA, sinon le cabinet crée dix fois le même compte auxiliaire.
  const vus = new Set();
  for (const f of four.data || []) {
    const cle = (f.fournisseur_tva || f.fournisseur_nom || "").toUpperCase();
    if (!cle || vus.has(cle)) continue;
    vus.add(cle);
    tiers.push({ type: "fournisseur", nom: f.fournisseur_nom,
      tva: f.fournisseur_tva, peppol_id: f.fournisseur_peppol,
      pays: f.fournisseur_pays || "BE" });
  }
  return tiers;
}

/* ── Équipes de journée, modèles et notes rapides (0142) ──────────────────
 * Les RÈGLES vivent dans `planning/equipes.js` (pur, éprouvé). Ici, on ne fait
 * que lire et écrire : l'adaptateur ne rejuge jamais ce que le domaine a
 * tranché, sinon les deux finissent par diverger.
 */

/** Les équipes d'une journée, avec leurs membres et missions. */
export async function equipesDuJour(jour) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.from("equipes_jour")
    .select("id, jour, nom, equipe_membres(utilisateur_id), "
          + "equipe_missions(mission_id), equipe_vehicules(vehicule_id)")
    .eq("jour", jour).order("cree_le");
  if (error) throw new Error(error.message);
  return (data || []).map((e) => ({
    id: e.id, jour: e.jour, nom: e.nom,
    membres: (e.equipe_membres || []).map((m) => m.utilisateur_id),
    missions: (e.equipe_missions || []).map((m) => m.mission_id),
    // 0144 : une équipe part avec quelque chose. Sans ce champ, deux équipes
    // du même jour pouvaient se voir attribuer le même camion sans que rien
    // ne le dise.
    vehicules: (e.equipe_vehicules || []).map((v) => v.vehicule_id),
  }));
}

/**
 * Enregistre une équipe. On REMPLACE membres et missions plutôt que de faire un
 * différentiel : l'écran envoie l'état voulu, et un différentiel finirait par
 * diverger de la base au premier aller-retour manqué (même raison qu'au lot 10).
 */
export async function sauverEquipeJour({
  id, jour, nom, membres = [], missions = [], vehicules = [],
}) {
  if (modeDonnees() !== "reel") return null;
  // Les missions que cette équipe visait AVANT ce changement : nécessaires pour
  // recalculer les missions qu'elle quitte, pas seulement celles qu'elle prend.
  let missionsAvant = [];
  if (id) {
    const { data } = await supabase.from("equipe_missions")
      .select("mission_id").eq("equipe_id", id);
    missionsAvant = (data || []).map((r) => r.mission_id);
  }
  let equipeId = id;
  if (!equipeId) {
    const { data, error } = await supabase.from("equipes_jour")
      .insert({ jour, nom: nom || null }).select("id").single();
    if (error) throw new Error(error.message);
    equipeId = data.id;
  } else {
    const { error } = await supabase.from("equipes_jour")
      .update({ nom: nom || null }).eq("id", equipeId);
    if (error) throw new Error(error.message);
    await supabase.from("equipe_membres").delete().eq("equipe_id", equipeId);
    await supabase.from("equipe_missions").delete().eq("equipe_id", equipeId);
    await supabase.from("equipe_vehicules").delete().eq("equipe_id", equipeId);
  }
  if (membres.length) {
    const { error } = await supabase.from("equipe_membres")
      .insert(membres.map((u) => ({ equipe_id: equipeId, utilisateur_id: u })));
    if (error) throw new Error(error.message);
  }
  if (missions.length) {
    const { error } = await supabase.from("equipe_missions")
      .insert(missions.map((m) => ({ equipe_id: equipeId, mission_id: m })));
    if (error) throw new Error(error.message);
  }
  if (vehicules.length) {
    const { error } = await supabase.from("equipe_vehicules")
      .insert(vehicules.map((v) => ({ equipe_id: equipeId, vehicule_id: v })));
    if (error) throw new Error(error.message);
  }

  // LES RESSOURCES DE L'ÉQUIPE SONT RÉSERVÉES POUR SES MISSIONS.
  //
  // Décision de Raphaël : donner un camion à une équipe, c'est le mettre sur
  // les chantiers de cette équipe. On propage donc membres et véhicules vers
  // l'affectation de chaque mission concernée — sans quoi le camion resterait
  // « sur l'équipe » mais absent de la mission, et le planning l'ignorerait.
  //
  // On recalcule les missions que l'équipe vient de QUITTER autant que celles
  // qu'elle vise : sinon un camion retiré d'une équipe resterait collé à
  // l'ancienne mission. Et l'affectation résultante est l'UNION de toutes les
  // équipes du jour visant la mission (`affectationDepuisEquipes`), jamais un
  // écrasement — deux équipes sur un même gros chantier ne s'effacent pas.
  await propagerEquipesVersMissions(jour, missionsAvant, missions);

  return equipeId;
}

/**
 * Réécrit l'affectation des missions touchées par un changement d'équipe, à
 * partir de l'UNION des équipes du jour. Tolérante aux erreurs par mission :
 * une mission déjà facturée peut refuser l'affectation (RLS), et cela ne doit
 * pas faire échouer l'enregistrement de l'équipe elle-même.
 */
async function propagerEquipesVersMissions(jour, missionsAvant, missionsApres) {
  const aRecalculer = missionsImpactees(
    { missions: missionsAvant || [] }, { missions: missionsApres || [] });
  if (aRecalculer.length === 0) return;
  const equipes = await equipesDuJour(jour).catch(() => []);
  for (const mid of aRecalculer) {
    const { membres, vehicules } = affectationDepuisEquipes(mid, equipes);
    // cmd_mission_affecter REMPLACE l'affectation de la mission par l'union
    // calculée : c'est voulu, l'union EST l'état complet voulu pour cette
    // mission au vu de toutes ses équipes.
    try {
      await supabase.rpc("cmd_mission_affecter", {
        p_mission: mid, p_membres: membres, p_vehicules: vehicules });
    } catch { /* mission close ou hors droits : on n'échoue pas pour autant */ }
  }
}

export async function supprimerEquipeJour(id) {
  if (modeDonnees() !== "reel") return;
  const { error } = await supabase.from("equipes_jour").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Les modèles d'équipe — des groupes de personnes, sans date ni mission. */
export async function listerModelesEquipe() {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.from("modeles_equipe")
    .select("id, nom, membres").order("nom");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function enregistrerModeleEquipe({ nom, membres }) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.from("modeles_equipe")
    .upsert({ nom, membres }, { onConflict: "org_id,nom" }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Notes rapides d'une journée. */
export async function notesDuJour(jour) {
  if (modeDonnees() !== "reel") return [];
  const { data, error } = await supabase.from("notes_planning")
    .select("id, texte, cree_le").eq("jour", jour).order("cree_le", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function ajouterNoteJour(jour, texte) {
  if (modeDonnees() !== "reel") return null;
  const { data, error } = await supabase.from("notes_planning")
    .insert({ jour, texte: String(texte || "").trim() }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function supprimerNoteJour(id) {
  if (modeDonnees() !== "reel") return;
  const { error } = await supabase.from("notes_planning").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
