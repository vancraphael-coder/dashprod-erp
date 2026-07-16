// =============================================================================
// APP TERRAIN — Création rapide & signalement.
// Alignement page 11 §5/§6. Deux outils du terrain :
//  - Saisie rapide d'un dossier (« le bureau complétera le prix ») → brouillon.
//  - Signalement d'un souci véhicule (capacité signaler_materiel).
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  creerDossierTerrain, listerVehicules, signalerSouci,
} from "../lib/adaptateur.js";
import { ETATS_MECANIQUES } from "@domaine/flotte/vehicules.js";
import { C, S } from "../lib/theme.jsx";

const LIBELLE_MECA = { ok: "OK", surveiller: "À surveiller", urgent: "URGENT" };
const COULEUR_MECA = { ok: "#059669", surveiller: "#D97706", urgent: "#DC2626" };

export default function TerrainOutils({ retour }) {
  const [onglet, setOnglet] = useState("creation");
  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Mes chantiers</button>}
        <div style={S.titre}>Outils terrain</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[["creation", "Nouveau dossier"], ["souci", "Signaler un souci"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? "#E7EFFC" : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 12.5, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>
      {onglet === "creation" ? <CreationRapide /> : <SignalerSouci />}
    </div>
  );
}

function CreationRapide() {
  const [f, setF] = useState({ clientNom: "", tel: "", chargement: "", dechargement: "", date: "", notes: "" });
  const [etat, setEtat] = useState(null); // null | "envoi" | "ok"
  const maj = (k, v) => { setF((x) => ({ ...x, [k]: v })); setEtat(null); };

  async function envoyer() {
    setEtat("envoi");
    try { await creerDossierTerrain(f); setEtat("ok");
      setF({ clientNom: "", tel: "", chargement: "", dechargement: "", date: "", notes: "" });
    } catch { setEtat(null); }
  }

  return (
    <>
      <div style={{ margin: "0 16px 12px", padding: "10px 12px", borderRadius: 10,
        background: "#F5F3FF", border: "1px solid #DDD6FE", fontSize: 12, color: "#5B21B6" }}>
        Saisie rapide — le bureau complètera le prix et confirmera.
      </div>
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Client</label>
        <input style={S.input} value={f.clientNom}
               onChange={(e) => maj("clientNom", e.target.value)} placeholder="Nom du client" />
        <label style={S.label}>Téléphone</label>
        <input style={S.input} value={f.tel} inputMode="tel"
               onChange={(e) => maj("tel", e.target.value)} placeholder="0470 00 00 00" />
        <label style={S.label}>Chargement</label>
        <input style={S.input} value={f.chargement}
               onChange={(e) => maj("chargement", e.target.value)} placeholder="Adresse de départ" />
        <label style={S.label}>Déchargement</label>
        <input style={S.input} value={f.dechargement}
               onChange={(e) => maj("dechargement", e.target.value)} placeholder="Adresse d'arrivée" />
        <label style={S.label}>Date souhaitée</label>
        <input style={S.input} type="date" value={f.date}
               onChange={(e) => maj("date", e.target.value)} />
        <label style={S.label}>Notes</label>
        <textarea style={{ ...S.input, minHeight: 54 }} value={f.notes}
                  onChange={(e) => maj("notes", e.target.value)}
                  placeholder="Précisions utiles au bureau" />
      </div>
      <div style={{ margin: "0 16px" }}>
        <button style={{ ...S.boutonPlein, opacity: f.clientNom.trim() ? 1 : 0.5 }}
                disabled={!f.clientNom.trim() || etat === "envoi"} onClick={envoyer}>
          {etat === "envoi" ? "Envoi…" : etat === "ok" ? "✓ Envoyé au bureau" : "Envoyer au bureau"}
        </button>
      </div>
    </>
  );
}

function SignalerSouci() {
  const [vehicules, setVehicules] = useState([]);
  const [selection, setSelection] = useState(null);
  const [etat, setEtat] = useState("surveiller");
  const [note, setNote] = useState("");
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => { listerVehicules().then(setVehicules).catch(() => {}); }, []);

  async function envoyer() {
    if (!selection) return;
    await signalerSouci({ vehiculeId: selection, etat, note });
    setEnvoye(true);
    setTimeout(() => setEnvoye(false), 2500);
    setNote("");
  }

  return (
    <>
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Véhicule concerné</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {vehicules.map((v) => (
            <button key={v.id} onClick={() => setSelection(v.id)} style={{
              padding: "7px 12px", borderRadius: 999, cursor: "pointer",
              fontSize: 12.5, fontWeight: 600,
              border: `1.5px solid ${selection === v.id ? C.bleu : C.bord}`,
              background: selection === v.id ? "#E7EFFC" : "#fff",
              color: selection === v.id ? C.bleu : C.encre,
            }}>🚛 {v.nom}</button>
          ))}
        </div>

        {selection && (
          <>
            <label style={S.label}>État constaté</label>
            <div style={{ display: "flex", gap: 6 }}>
              {ETATS_MECANIQUES.map((e) => (
                <button key={e} onClick={() => setEtat(e)} style={{
                  flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
                  fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${etat === e ? COULEUR_MECA[e] : C.bord}`,
                  background: etat === e ? COULEUR_MECA[e] : "#fff",
                  color: etat === e ? "#fff" : C.muet,
                }}>{LIBELLE_MECA[e]}</button>
              ))}
            </div>
            <label style={S.label}>Détail du problème</label>
            <textarea style={{ ...S.input, minHeight: 54 }} value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Bruit, voyant, dommage…" />
          </>
        )}
      </div>

      {selection && (
        <div style={{ margin: "0 16px" }}>
          <button style={S.boutonPlein} onClick={envoyer}>
            {envoye ? "✓ Signalé au bureau" : "Signaler au bureau"}
          </button>
        </div>
      )}
    </>
  );
}
