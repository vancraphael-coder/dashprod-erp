// =============================================================================
// Client Supabase — point d'accès unique aux données (Réf. 3 · T1, T3).
// Lit les clés d'environnement (jamais en dur). En l'absence de configuration,
// expose `configPresente = false` pour que l'interface affiche un état clair
// plutôt que de planter — le déploiement Vercel reste vert même sans base.
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import { configPresente as calcConfigPresente, interpreterEtatConnexion } from "@domaine/commun/config.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const demoMode = String(import.meta.env.VITE_DEMO_MODE || "").toLowerCase();

/** Vrai si les deux variables d'environnement sont fournies. */
export const configPresente = calcConfigPresente(url, anon);
/** Vrai si le mode démo est explicitement activé par variable d'environnement. */
export const demoExplicite = ["1", "true", "yes", "on"].includes(demoMode);

/**
 * Client Supabase, ou null si non configuré. On ne crée le client qu'avec des
 * clés valides : appeler createClient avec undefined lève à l'exécution, ce qui
 * casserait tout l'écran (leçon du bug d'écran blanc des prototypes précédents).
 */
export const supabase = configPresente ? createClient(url, anon) : null;

/**
 * Récupère la session courante, ou null. Ne jette jamais : renvoie null si non
 * configuré ou non connecté.
 */
export async function sessionCourante() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

/**
 * Test de vie de la base : tente de lire l'organisation du contexte courant.
 * Retour typé pour un affichage clair de l'état de branchement.
 * @returns {Promise<{ok: boolean, message: string, organisation?: object}>}
 */
export async function testerConnexion() {
  if (!configPresente) {
    return interpreterEtatConnexion({ configuree: false });
  }
  try {
    // La RLS ne renvoie que l'organisation du jeton (T3) : hors session, 0 ligne.
    const { data, error } = await supabase.from("organisations").select("id, nom").limit(1);
    if (error) return interpreterEtatConnexion({ configuree: true, erreur: error.message });
    const etat = interpreterEtatConnexion({ configuree: true, lignes: data?.length ?? 0 });
    return data && data.length > 0 ? { ...etat, organisation: data[0] } : etat;
  } catch (e) {
    return { ok: false, message: `Base injoignable : ${e.message}` };
  }
}

/**
 * Lance la connexion Google (T3 : email/mdp OU Google, jamais de choix de rôle).
 * Redirige vers Google puis revient sur l'URL courante ; supabase-js relève la
 * session automatiquement à l'atterrissage.
 */
export async function connecterAvecGoogle() {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function deconnecter() {
  if (supabase) await supabase.auth.signOut();
}
