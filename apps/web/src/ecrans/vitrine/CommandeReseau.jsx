// =============================================================================
// COMMANDE DE DÉMÉNAGEMENT sur le réseau — le formulaire public de la landing.
//
// Un particulier décrit son déménagement en quelques champs, sans créer de
// compte. La demande part à tout le réseau de déménageurs inscrits ; ils la
// voient de leur côté et la prennent en charge. Après l'envoi, on propose
// fortement (sans l'imposer) de créer un compte pour suivre les réponses.
// =============================================================================

import React, { useState } from "react";
import { V, MONO } from "./theme-vitrine.jsx";
import { deposerDemandeReseau } from "../../lib/adaptateur.js";

const VOLUMES = ["Studio", "1 chambre", "2 chambres", "3 chambres", "Maison", "Bureau / local"];

export default function CommandeReseau({ aller }) {
  const [f, setF] = useState({
    civilite: "", nom: "", prenom: "", email: "", tel: "",
    depart_ville: "", depart_cp: "", arrivee_ville: "", arrivee_cp: "",
    date_souhaitee: "", volume_estime: "", description: "",
  });
  const [envoye, setEnvoye] = useState(false);
  const [err, setErr] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function envoyer() {
    setErr(null);
    if (!f.nom.trim() || !f.email.trim()) { setErr("Votre nom et votre e-mail sont nécessaires."); return; }
    setEnvoi(true);
    try { await deposerDemandeReseau(f); setEnvoye(true); }
    catch (e) { setErr(e.message); }
    finally { setEnvoi(false); }
  }

  if (envoye) {
    return (
      <div style={carte}>
        <div style={{ fontSize: 40, textAlign: "center" }}>📦</div>
        <h3 className="v-display" style={{ textAlign: "center", fontSize: 24, margin: "8px 0" }}>
          Votre demande est partie sur le réseau.
        </h3>
        <p style={{ textAlign: "center", color: V.muet, fontSize: 14, lineHeight: 1.6 }}>
          Les déménageurs inscrits vont la découvrir et vous recontacter. Créez un
          compte pour suivre leurs réponses au même endroit — c'est vivement
          conseillé, mais pas obligatoire.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center",
                      marginTop: 18, flexWrap: "wrap" }}>
          <button className="v-btn v-btn-plein" onClick={() => aller("client")}>
            Créer mon compte pour suivre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={carte}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
        <Champ label="Prénom" v={f.prenom} on={set("prenom")} />
        <Champ label="Nom *" v={f.nom} on={set("nom")} />
        <Champ label="E-mail *" v={f.email} on={set("email")} type="email" />
        <Champ label="Téléphone" v={f.tel} on={set("tel")} type="tel" />
      </div>

      <div style={sep}>Le déménagement</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
        <Champ label="Ville de départ" v={f.depart_ville} on={set("depart_ville")} />
        <Champ label="Code postal départ" v={f.depart_cp} on={set("depart_cp")} />
        <Champ label="Ville d'arrivée" v={f.arrivee_ville} on={set("arrivee_ville")} />
        <Champ label="Code postal arrivée" v={f.arrivee_cp} on={set("arrivee_cp")} />
        <Champ label="Date souhaitée" v={f.date_souhaitee} on={set("date_souhaitee")} type="date" />
        <div>
          <label style={lab}>Volume estimé</label>
          <select style={inp} value={f.volume_estime} onChange={set("volume_estime")}>
            <option value="">À préciser</option>
            {VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <label style={{ ...lab, marginTop: 14 }}>Précisions (étages, ascenseur, objets lourds…)</label>
      <textarea style={{ ...inp, minHeight: 70, resize: "vertical" }}
                value={f.description} onChange={set("description")}
                placeholder="Tout ce qui aide un déménageur à estimer." />

      {err && <div style={{ color: "#B91C1C", fontSize: 13, marginTop: 10 }}>{err}</div>}

      <button className="v-btn v-btn-plein" onClick={envoyer} disabled={envoi}
              style={{ width: "100%", marginTop: 16 }}>
        {envoi ? "Envoi…" : "Envoyer ma demande au réseau"}
      </button>
      <div style={{ fontSize: 11.5, color: V.brume, textAlign: "center", marginTop: 8 }}>
        Sans engagement. Aucun compte requis pour envoyer.
      </div>
    </div>
  );
}

function Champ({ label, v, on, type = "text" }) {
  return (
    <div>
      <label style={lab}>{label}</label>
      <input style={inp} value={v} onChange={on} type={type} />
    </div>
  );
}

const carte = {
  maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box",
  background: "#fff", border: `1px solid ${V.bord}`, borderRadius: 18,
  padding: "clamp(20px, 4vw, 32px)", boxShadow: "0 30px 60px -40px rgba(0,0,0,.3)",
};
const lab = {
  display: "block", fontFamily: MONO, fontSize: 10, fontWeight: 700,
  letterSpacing: ".1em", textTransform: "uppercase", color: V.sangle, marginBottom: 5,
};
const inp = {
  width: "100%", boxSizing: "border-box", padding: "11px 12px",
  border: `1px solid ${V.bord}`, borderRadius: 10, fontSize: 14, background: "#fff",
};
const sep = {
  fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
  textTransform: "uppercase", color: V.route, margin: "22px 0 4px",
  borderTop: `1px solid ${V.bord}`, paddingTop: 16,
};
