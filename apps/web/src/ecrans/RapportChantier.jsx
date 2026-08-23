// =============================================================================
// Terrain — Rapport de chantier.
//
// Ce que l'équipe remonte de la journée : le déroulé, et surtout les ÉCARTS
// entre ce que le bureau avait prévu et ce qui s'est réellement passé.
//
// Le piano dont personne n'avait parlé, les quinze cartons en plus, l'escalier
// impraticable : aujourd'hui ça se règle par un coup de téléphone, et ça se
// perd. Ici c'est un objet, il remonte, et le bureau tranche.
//
// Ce que le terrain NE fait PAS : donner un prix. Il estime un temps ou un
// volume. Le montant se calcule au bureau, avec le barème — pas dans la poche
// d'un déménageur devant un client.
// =============================================================================

import React, { useEffect, useState } from "react";
import { lireRapport, ecrireDeroule, declarerConstat } from "../lib/adaptateur.js";
import { NATURES, nature, constatValide, syntheseRapport }
  from "@domaine/operations/rapport-chantier.js";
import { heureDe, secondesTravail, formaterDuree } from "@domaine/operations/pointage.js";
import { C } from "../lib/theme.jsx";

const ETIQUETTE_ETAT = {
  declare: { texte: "en attente du bureau", couleur: "#94A3B8" },
  valide:  { texte: "validé",   couleur: "#34D399" },
  refuse:  { texte: "refusé",   couleur: "#F87171" },
  ajuste:  { texte: "ajusté",   couleur: "#FBBF24" },
};

export default function RapportChantier({ mission, peutRediger }) {
  const [rapport, setRapport] = useState(null);
  const [deroule, setDeroule] = useState("");
  const [ouvert, setOuvert] = useState(null);   // nature en cours de saisie
  const [f, setF] = useState({ description: "", minutes: "", volume: "" });
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    try {
      const r = await lireRapport({ missionId: mission.id });
      const premier = r[0] || null;
      setRapport(premier);
      setDeroule(premier?.deroule || "");
    } catch (e) { setErreur(e.message); }
  }
  useEffect(() => { charger(); }, [mission.id]);

  async function enregistrerDeroule() {
    setEnCours(true); setErreur(null);
    try { await ecrireDeroule(mission.id, deroule); await charger(); }
    catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  async function declarer() {
    setErreur(null);
    const v = constatValide({ nature: ouvert, description: f.description,
                              minutes: f.minutes, volume_m3: f.volume });
    if (!v.ok) { setErreur(v.message); return; }
    setEnCours(true);
    try {
      await declarerConstat(mission.id, {
        nature: ouvert, description: f.description,
        minutes: f.minutes, volume: f.volume,
      });
      setOuvert(null);
      setF({ description: "", minutes: "", volume: "" });
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  const constats = rapport?.constats || [];
  const synthese = syntheseRapport({ constats });
  const natureOuverte = nature(ouvert);

  return (
    <div style={{ background: "#0F172A", borderRadius: 12, padding: 14,
                  marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em",
                    textTransform: "uppercase", color: "#94A3B8",
                    marginBottom: 10 }}>
        Rapport de chantier
      </div>

      {/* Les heures du chantier, remontées par le terrain. Lecture seule ici :
          elles viennent du pointage (départ / arrivée). Une durée n'apparaît
          que si les deux sont saisies — sinon on montre ce qui est connu. */}
      <CadranHeures sessions={mission.sessions} />

      {/* Déroulé — la phrase du chef, pas un formulaire. */}
      {peutRediger ? (
        <>
          <textarea value={deroule} rows={2}
            placeholder="Comment s'est passée la journée ?"
            onChange={(e) => setDeroule(e.target.value)}
            onBlur={() => deroule !== (rapport?.deroule || "") && enregistrerDeroule()}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 9, border: "1.5px solid #475569", background: "#1E293B",
              color: "#fff", fontSize: 13, fontFamily: "inherit",
              resize: "vertical" }} />
        </>
      ) : deroule ? (
        <div style={{ fontSize: 13, color: C.filetNeutre, lineHeight: 1.5,
                      padding: "8px 10px", background: "#1E293B",
                      borderRadius: 9 }}>{deroule}</div>
      ) : null}

      {/* Écarts déjà déclarés */}
      {constats.map((c) => {
        const n = nature(c.nature);
        const et = ETIQUETTE_ETAT[c.etat] || ETIQUETTE_ETAT.declare;
        return (
          <div key={c.id} style={{ marginTop: 8, padding: "9px 11px",
                 borderRadius: 9, background: "#1E293B",
                 borderLeft: `3px solid ${et.couleur}` }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                {n?.titre || c.nature}
              </span>
              <span style={{ fontSize: 10.5, color: et.couleur, fontWeight: 700 }}>
                {et.texte}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#CBD5E1", marginTop: 3,
                          lineHeight: 1.45 }}>{c.description}</div>
            {(c.minutes > 0 || c.volume_m3 > 0) && (
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
                {c.minutes > 0 ? `+${c.minutes} min` : ""}
                {c.minutes > 0 && c.volume_m3 > 0 ? " · " : ""}
                {c.volume_m3 > 0 ? `+${c.volume_m3} m³` : ""}
              </div>
            )}
            {c.motif && (
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3,
                            fontStyle: "italic" }}>Bureau : {c.motif}</div>
            )}
          </div>
        );
      })}

      {/* Déclarer un écart. Un bouton par nature : le terrain choisit ce qu'il
          voit, il ne remplit pas un formulaire à trous. */}
      {!ouvert && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {NATURES.map((n) => (
            <button key={n.cle} onClick={() => { setOuvert(n.cle); setErreur(null); }}
              style={{ padding: "7px 11px", borderRadius: 999, cursor: "pointer",
                border: "1px solid #475569", background: "transparent",
                color: "#CBD5E1", fontSize: 11.5, fontWeight: 700 }}>
              + {n.titre}
            </button>
          ))}
        </div>
      )}

      {ouvert && (
        <div style={{ marginTop: 10, padding: 11, borderRadius: 10,
                      background: "#1E293B" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#fff" }}>
            {natureOuverte?.titre}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2,
                        marginBottom: 8, lineHeight: 1.4 }}>
            {natureOuverte?.aide}
          </div>

          <textarea value={f.description} rows={2} autoFocus
            placeholder="Ce que vous avez constaté"
            onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))}
            style={champSombre} />

          {natureOuverte?.facturable && (
            <>
              <div style={{ fontSize: 11, color: "#94A3B8", margin: "8px 0 4px",
                            lineHeight: 1.4 }}>
                Estimez le supplément. Le bureau calculera le prix — vous n'avez
                rien à annoncer au client.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" min="0" value={f.minutes} placeholder="minutes"
                  onChange={(e) => setF((x) => ({ ...x, minutes: e.target.value }))}
                  style={{ ...champSombre, flex: 1 }} />
                <input type="number" min="0" step="0.5" value={f.volume}
                  placeholder="m³"
                  onChange={(e) => setF((x) => ({ ...x, volume: e.target.value }))}
                  style={{ ...champSombre, flex: 1 }} />
              </div>
            </>
          )}

          {erreur && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: "#FCA5A5",
                          lineHeight: 1.4 }}>{erreur}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={declarer} disabled={enCours} style={{
              flex: 1, padding: "10px", borderRadius: 9, border: "none",
              cursor: "pointer", background: "#FBBF24", color: "#0F172A",
              fontSize: 13, fontWeight: 800 }}>
              {enCours ? "…" : "Déclarer"}
            </button>
            <button onClick={() => { setOuvert(null); setErreur(null); }}
              style={{ padding: "10px 14px", borderRadius: 9, cursor: "pointer",
                border: "1px solid #475569", background: "transparent",
                color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {synthese.a_traiter > 0 && !ouvert && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "#94A3B8",
                      textAlign: "center" }}>
          {synthese.a_traiter} écart{synthese.a_traiter > 1 ? "s" : ""} en attente
          du bureau
        </div>
      )}
    </div>
  );
}

const champSombre = {
  width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 8,
  border: "1.5px solid #475569", background: "#0F172A", color: "#fff",
  fontSize: 13, fontFamily: "inherit", resize: "vertical",
};

/**
 * Cadran des heures du chantier, en lecture. Les valeurs viennent du pointage
 * terrain. Aucune durée n'est projetée depuis l'horloge : elle n'apparaît que
 * si départ ET arrivée sont saisis (mêmes règles que le compteur terrain).
 */
function CadranHeures({ sessions }) {
  const travail = (sessions || []).find((x) => (x.type || "travail") === "travail") || {};
  const depart = travail.debut ? new Date(travail.debut) : null;
  const arrivee = travail.fin ? new Date(travail.fin) : null;
  const pauses = (sessions || []).filter((x) => x.type === "pause")
    .map((p) => ({ debut: p.debut ? new Date(p.debut) : null,
                   fin: p.fin ? new Date(p.fin) : null }));
  const duree = depart && arrivee ? secondesTravail(depart, arrivee, pauses) : null;

  const Case = ({ libelle, valeur, fort }) => (
    <div style={{ flex: 1, textAlign: "center", padding: "6px 4px" }}>
      <div style={{ fontSize: 9.5, color: "#64748B", textTransform: "uppercase",
                    letterSpacing: ".04em" }}>{libelle}</div>
      <div style={{ fontSize: fort ? 16 : 14, fontWeight: 800,
                    color: valeur ? "#fff" : "#475569",
                    fontFamily: "ui-monospace, monospace", marginTop: 2 }}>
        {valeur || "—:—"}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 10,
                  background: "#1E293B", borderRadius: 9, padding: "4px 2px" }}>
      <Case libelle="Départ" valeur={depart ? heureDe(depart) : null} />
      <div style={{ color: "#475569" }}>→</div>
      <Case libelle="Arrivée" valeur={arrivee ? heureDe(arrivee) : null} />
      <div style={{ width: 1, alignSelf: "stretch", background: "#334155" }} />
      <Case libelle="Durée" fort valeur={duree != null ? formaterDuree(duree) : null} />
    </div>
  );
}
