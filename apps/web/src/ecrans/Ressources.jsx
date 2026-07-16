// =============================================================================
// Écran — Ressources (onglets Membres / Camions).
// Alignement page 10 : l'invitation OAuth existante devient l'onglet Membres ;
// l'onglet Camions livre le P0 n°4 — fiches complètes (nom, type, volume,
// immatriculation) + P1 inclus d'office car la table les portait déjà : CT,
// assurance, état mécanique, avec alertes qualifiées par le domaine
// (alertesVehicule → qualifierEcheance, une seule règle d'échéance).
// =============================================================================

import React, { useEffect, useState } from "react";
import { listerVehicules, sauverVehicule, supprimerVehicule } from "../lib/adaptateur.js";
import { alertesVehicule, TYPES_VEHICULE, ETATS_MECANIQUES } from "@domaine/flotte/vehicules.js";
import Equipe from "./Equipe.jsx";
import Heures from "./Heures.jsx";
import { C, S } from "../lib/theme.jsx";

const LIBELLE_TYPE = { fourgon: "Fourgon", porteur: "Porteur", hayon: "Hayon élévateur" };
const LIBELLE_MECA = { ok: "OK", surveiller: "À surveiller", urgent: "URGENT" };
const COULEUR_MECA = { ok: "#059669", surveiller: "#D97706", urgent: "#DC2626" };

export default function Ressources() {
  const [onglet, setOnglet] = useState("camions");
  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Ressources</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[["camions", "🚛 Camions"], ["membres", "👥 Membres"], ["heures", "⏱️ Heures"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? "#E7EFFC" : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 13, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>
      {onglet === "camions" ? <OngletCamions />
        : onglet === "heures" ? <Heures />
        : <Equipe integre />}
    </div>
  );
}

function OngletCamions() {
  const [camions, setCamions] = useState([]);
  const [ouvert, setOuvert] = useState(null);
  const [erreur, setErreur] = useState(null);

  function recharger() { listerVehicules().then(setCamions).catch((e) => setErreur(e.message)); }
  useEffect(recharger, []);

  const urgents = camions.filter((v) => alertesVehicule(v).niveau === "urgent");

  async function maj(id, champ, valeur) {
    setErreur(null);
    try {
      const v = camions.find((x) => x.id === id);
      // L'état mécanique horodate son constat automatiquement.
      const extra = champ === "etat_mecanique" && valeur !== "ok"
        ? { meca_constat_le: new Date().toISOString().slice(0, 10) } : {};
      await sauverVehicule({ ...v, [champ]: valeur, ...extra });
      recharger();
    } catch (e) { setErreur(e.message); }
  }

  async function ajouter() {
    setErreur(null);
    try {
      const id = await sauverVehicule({
        nom: `Camion ${camions.length + 1}`, type: "fourgon", volume_m3: 20,
        immatriculation: "", etat_mecanique: "ok",
      });
      recharger();
      setOuvert(id);
    } catch (e) { setErreur(e.message); }
  }

  return (
    <>
      {/* Alerte agrégée : intervention nécessaire */}
      {urgents.length > 0 && (
        <div style={{ ...S.carte, background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#991B1B" }}>
            ⚠ Intervention nécessaire
          </div>
          {urgents.map((v) => (
            <div key={v.id} style={{ fontSize: 12, color: "#B91C1C", marginTop: 3 }}>
              {v.nom} — {alertesVehicule(v).raisons.join(" · ")}
            </div>
          ))}
        </div>
      )}

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}

      {camions.map((v) => {
        const alerte = alertesVehicule(v);
        const ouvertIci = ouvert === v.id;
        return (
          <div key={v.id} style={S.carte}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                 onClick={() => setOuvert(ouvertIci ? null : v.id)}>
              <span style={{ fontSize: 20 }}>{alerte.niveau === "urgent" ? "🔴" : "🚛"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>{v.nom}</div>
                <div style={{ fontSize: 11.5, color: C.muet }}>
                  {LIBELLE_TYPE[v.type] || v.type || "—"} · {v.volume_m3 || "?"} m³
                  {v.immatriculation ? ` · ${v.immatriculation}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px",
                borderRadius: 999, color: "#fff",
                background: COULEUR_MECA[v.etat_mecanique] || C.muet }}>
                {LIBELLE_MECA[v.etat_mecanique] || "?"}
              </span>
            </div>

            {alerte.raisons.length > 0 && !ouvertIci && (
              <div style={{ marginTop: 6, fontSize: 11.5,
                color: alerte.niveau === "urgent" ? C.rouge : C.ambre, fontWeight: 600 }}>
                {alerte.raisons.join(" · ")}
              </div>
            )}

            {ouvertIci && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 6 }}>
                <label style={S.label}>Nom</label>
                <input style={S.input} value={v.nom || ""}
                       onChange={(e) => maj(v.id, "nom", e.target.value)} />
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Type</label>
                    <select style={S.input} value={v.type || "fourgon"}
                            onChange={(e) => maj(v.id, "type", e.target.value)}>
                      {TYPES_VEHICULE.map((t) => (
                        <option key={t} value={t}>{LIBELLE_TYPE[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Volume (m³)</label>
                    <input style={S.input} inputMode="decimal" value={v.volume_m3 ?? ""}
                           onChange={(e) => maj(v.id, "volume_m3", e.target.value)} />
                  </div>
                </div>
                <label style={S.label}>Immatriculation</label>
                <input style={S.input} value={v.immatriculation || ""}
                       onChange={(e) => maj(v.id, "immatriculation", e.target.value)}
                       placeholder="1-ABC-123" />
                <label style={S.label}>Code carte carburant</label>
                <input style={S.input} value={v.carte_carburant || ""}
                       onChange={(e) => maj(v.id, "carte_carburant", e.target.value)}
                       placeholder="Code / n° de carte" />
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Contrôle technique</label>
                    <input style={S.input} type="date" value={v.ct_echeance || ""}
                           onChange={(e) => maj(v.id, "ct_echeance", e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Assurance</label>
                    <input style={S.input} type="date" value={v.assurance_echeance || ""}
                           onChange={(e) => maj(v.id, "assurance_echeance", e.target.value)} />
                  </div>
                </div>

                <label style={S.label}>État mécanique</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {ETATS_MECANIQUES.map((etat) => (
                    <button key={etat} onClick={() => maj(v.id, "etat_mecanique", etat)} style={{
                      flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
                      fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${v.etat_mecanique === etat ? COULEUR_MECA[etat] : C.bord}`,
                      background: v.etat_mecanique === etat ? COULEUR_MECA[etat] : "#fff",
                      color: v.etat_mecanique === etat ? "#fff" : C.muet,
                    }}>{LIBELLE_MECA[etat]}</button>
                  ))}
                </div>
                {v.etat_mecanique !== "ok" && (
                  <>
                    <label style={S.label}>Détail du problème</label>
                    <textarea style={{ ...S.input, minHeight: 54 }} value={v.meca_note || ""}
                              onChange={(e) => maj(v.id, "meca_note", e.target.value)}
                              placeholder="Bruit embrayage, à contrôler…" />
                    {v.meca_constat_le && (
                      <div style={{ fontSize: 11, color: C.fantome, marginTop: 4 }}>
                        Signalé le {v.meca_constat_le}
                      </div>
                    )}
                  </>
                )}

                <button onClick={async () => { await supprimerVehicule(v.id); recharger(); }}
                        style={{ ...S.boutonLien, color: C.rouge, marginTop: 12 }}>
                  Retirer ce camion
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ margin: "0 16px" }}>
        <button style={S.boutonPlein} onClick={ajouter}>+ Ajouter un camion</button>
      </div>
    </>
  );
}
