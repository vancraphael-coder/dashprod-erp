// =============================================================================
// Écran de connexion — email + mot de passe uniquement (Réf. 3 · T3).
// L'utilisateur ne choisit jamais son rôle : il est résolu serveur après auth.
// =============================================================================

import React, { useState } from "react";
import { supabase, configPresente } from "../lib/supabase.js";

export default function Connexion({ onConnecte }) {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function seConnecter() {
    setErreur(null);
    if (!configPresente) {
      setErreur("La base n'est pas encore configurée.");
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
    setEnCours(false);
    if (error) setErreur(error.message);
    else onConnecte?.();
  }

  return (
    <div style={S.wrap}>
      <div style={S.carte}>
        <div style={S.logo}>Dashprod</div>
        <div style={S.sous}>Connexion</div>

        <label style={S.label}>Email</label>
        <input
          style={S.input} type="email" value={email} autoComplete="username"
          onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.be"
        />

        <label style={S.label}>Mot de passe</label>
        <input
          style={S.input} type="password" value={mdp} autoComplete="current-password"
          onChange={(e) => setMdp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && seConnecter()} placeholder="••••••••"
        />

        {erreur && <div style={S.erreur}>{erreur}</div>}

        <button style={S.bouton} onClick={seConnecter} disabled={enCours}>
          {enCours ? "Connexion…" : "Se connecter"}
        </button>

        <div style={S.note}>
          Votre rôle et vos accès sont déterminés automatiquement après la connexion.
        </div>
      </div>
    </div>
  );
}

const BLEU = "#2563EB", ENCRE = "#0F172A", BORD = "#DCE4F0", MUET = "#64748B";
const S = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center",
          background: "#F1F5FB", fontFamily: "system-ui, sans-serif", padding: 16 },
  carte: { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 16,
           padding: "28px 24px", boxShadow: "0 8px 30px rgba(15,23,42,.08)" },
  logo: { fontSize: 22, fontWeight: 800, color: ENCRE },
  sous: { fontSize: 13, color: MUET, marginTop: 2, marginBottom: 20 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: ENCRE,
           marginTop: 14, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px",
           border: `1.5px solid ${BORD}`, borderRadius: 10, fontSize: 14 },
  bouton: { width: "100%", marginTop: 20, padding: "12px", border: "none",
            borderRadius: 11, background: BLEU, color: "#fff", fontSize: 14,
            fontWeight: 600, cursor: "pointer" },
  erreur: { marginTop: 14, padding: "9px 12px", background: "#FEF2F2",
            border: "1px solid #FECACA", borderRadius: 9, color: "#991B1B", fontSize: 12.5 },
  note: { marginTop: 16, fontSize: 11.5, color: MUET, lineHeight: 1.5, textAlign: "center" },
};
