// =============================================================================
// Porte B — Connexion (email + mot de passe, ou Google).
// L'utilisateur ne choisit jamais son rôle : il est résolu serveur après auth
// (organisation → app déménageur ; e-mail client → espace client).
// Habillée aux couleurs de la vitrine ; la logique n'a pas bougé.
// =============================================================================

import React, { useState } from "react";
import { supabase, configPresente, connecterAvecGoogle } from "../lib/supabase.js";
import { V, NavPublique, PiedPublic, BoutonGoogle, Etiquette }
  from "./vitrine/theme-vitrine.jsx";

export default function Connexion({ onConnecte, aller }) {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function seConnecter() {
    setErreur(null);
    if (!configPresente) { setErreur("La base n'est pas encore configurée."); return; }
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
    setEnCours(false);
    if (error) setErreur(error.message);
    else onConnecte?.();
  }

  async function avecGoogle() {
    setErreur(null);
    try { await connecterAvecGoogle(); }
    catch (e) { setErreur(e.message); }
  }

  const champ = {
    width: "100%", boxSizing: "border-box", padding: "12px 14px",
    border: `1.5px solid ${V.bord}`, borderRadius: 11, fontSize: 15,
    background: "#fff",
  };
  const label = { display: "block", fontSize: 12.5, fontWeight: 700,
                  color: V.encre, margin: "14px 0 6px" };

  return (
    <div className="vitrine" style={{ minHeight: "100vh", display: "flex",
      flexDirection: "column", background: V.ivoire, color: V.encre }}>
      {aller && <NavPublique page="connexion" aller={aller} />}

      <main style={{ flex: 1, display: "grid", placeItems: "center",
                     padding: "clamp(30px, 6vw, 60px) 20px" }}>
        <div className="v-lever" style={{ width: "min(400px, 100%)" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <Etiquette numero="PORTE B" libelle="votre compte" />
          </div>
          <div className="v-carte" style={{ padding: "28px 26px" }}>
            <h1 className="v-display" style={{ fontSize: 26, margin: 0 }}>
              Reprenez la route.
            </h1>
            <p style={{ fontSize: 13, color: V.muet, margin: "6px 0 20px" }}>
              Vos dossiers, votre planning, vos factures vous attendent.
            </p>

            <BoutonGoogle onClick={avecGoogle} />

            <div style={{ display: "flex", alignItems: "center", gap: 10,
                          margin: "16px 0", fontSize: 11.5, color: V.brume }}>
              <span style={{ flex: 1, height: 1, background: V.bord }} />
              ou
              <span style={{ flex: 1, height: 1, background: V.bord }} />
            </div>

            <label style={label}>Email</label>
            <input style={champ} type="email" value={email} autoComplete="username"
                   onChange={(e) => setEmail(e.target.value)}
                   placeholder="vous@exemple.be" />

            <label style={label}>Mot de passe</label>
            <input style={champ} type="password" value={mdp}
                   autoComplete="current-password"
                   onChange={(e) => setMdp(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && seConnecter()}
                   placeholder="••••••••" />

            {erreur && (
              <div style={{ marginTop: 14, padding: "10px 12px",
                            background: "#FEF2F2", border: "1px solid #FECACA",
                            borderRadius: 10, color: "#991B1B", fontSize: 12.5 }}>
                {erreur}
              </div>
            )}

            <button className="v-btn v-btn-plein"
                    style={{ width: "100%", marginTop: 18 }}
                    onClick={seConnecter} disabled={enCours}>
              {enCours ? "Connexion…" : "Se connecter"}
            </button>

            <div style={{ marginTop: 16, fontSize: 12, color: V.muet,
                          lineHeight: 1.55, textAlign: "center" }}>
              Votre rôle est déterminé automatiquement après la connexion.
            </div>
          </div>

          {aller && (
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13,
                          color: V.muet }}>
              Nouvelle entreprise ?{" "}
              <button onClick={() => aller("societe")}
                      style={{ background: "none", border: "none", padding: 0,
                               color: V.route, fontWeight: 700, cursor: "pointer",
                               fontSize: 13 }}>
                Créez votre société
              </button>
              {" "}· Vous déménagez ?{" "}
              <button onClick={() => aller("client")}
                      style={{ background: "none", border: "none", padding: 0,
                               color: V.route, fontWeight: 700, cursor: "pointer",
                               fontSize: 13 }}>
                Par ici
              </button>
            </div>
          )}
        </div>
      </main>

      {aller && <PiedPublic aller={aller} />}
    </div>
  );
}
