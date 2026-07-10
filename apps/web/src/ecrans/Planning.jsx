// =============================================================================
// Écran — Planning.
// Projection du module Opérations (S9) : missions groupées par jour (agenda.js),
// affectation des membres avec DÉTECTION DE CONFLITS en direct
// (conflitsAffectation : congé, double affectation le même jour — C-20). Le
// système signale, l'humain décide.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { listerMissions, listerMembresSimples, basculerAffectation } from "../lib/adaptateur.js";
import { grouperParJour, chargeDuJour } from "@domaine/operations/agenda.js";
import { conflitsAffectation } from "@domaine/operations/missions.js";
import { C, S } from "../lib/theme.jsx";

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function libelleJour(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export default function Planning({ retour }) {
  const [missions, setMissions] = useState([]);
  const [membres, setMembres] = useState([]);
  const [ouvert, setOuvert] = useState(null); // mission dont le panneau d'affectation est ouvert

  async function recharger() {
    setMissions(await listerMissions());
    setMembres(await listerMembresSimples());
  }
  useEffect(() => { recharger(); }, []);

  const jours = useMemo(() => grouperParJour(missions), [missions]);

  // Pour un membre et une mission : y a-t-il conflit ? (congé non géré en démo,
  // mais la double affectation le même jour l'est pleinement — C-20.)
  function conflitPour(membreId, mission) {
    const autres = missions
      .filter((m) => m.id !== mission.id)
      .filter((m) => (m.affectations || []).some((a) => a.utilisateur_id === membreId))
      .map((m) => ({ missionId: m.id, date: m.date }));
    return conflitsAffectation({
      date: mission.date, missionId: mission.id, conges: [], affectations: autres,
    });
  }

  async function basculer(missionId, membreId) {
    await basculerAffectation(missionId, membreId, "demenageur");
    await recharger();
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={S.titre}>Planning</div>
      </div>

      {jours.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Aucune mission planifiée.
        </div>
      )}

      {jours.map((j) => {
        const charge = chargeDuJour(j.missions);
        return (
          <div key={j.date} style={{ marginBottom: 6 }}>
            <div style={{ padding: "6px 20px", display: "flex", justifyContent: "space-between",
                          alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.encre, textTransform: "capitalize" }}>
                {libelleJour(j.date)}
              </span>
              <span style={{ fontSize: 11.5, color: C.muet }}>
                {charge.nbMissions} mission{charge.nbMissions > 1 ? "s" : ""} · {charge.effectif} affecté·s
              </span>
            </div>

            {j.missions.map((m) => {
              const affectes = (m.affectations || []).map((a) => a.utilisateur_id);
              const ouvertIci = ouvert === m.id;
              return (
                <div key={m.id} style={S.carte}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
                        {m.heure?.slice(0, 5)} · {m.client || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: C.muet, textTransform: "capitalize" }}>
                        {m.type}
                      </div>
                    </div>
                    <button style={{ ...S.boutonLien, border: `1.5px solid ${C.bord}`,
                                     borderRadius: 9, padding: "6px 10px" }}
                            onClick={() => setOuvert(ouvertIci ? null : m.id)}>
                      {affectes.length} affecté·s
                    </button>
                  </div>

                  {/* Pastilles des affectés */}
                  {affectes.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      {affectes.map((id) => {
                        const mem = membres.find((x) => x.id === id);
                        return (
                          <span key={id} style={{ fontSize: 11.5, fontWeight: 600, color: C.bleu,
                            background: "#E7EFFC", borderRadius: 999, padding: "3px 9px" }}>
                            {mem?.nom || id}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Panneau d'affectation avec conflits */}
                  {ouvertIci && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 10 }}>
                      <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8 }}>
                        Touchez un membre pour l'affecter ou le retirer. Un conflit
                        (déjà affecté ce jour-là) est signalé en rouge.
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {membres.map((mem) => {
                          const estAffecte = affectes.includes(mem.id);
                          const conflit = !estAffecte && conflitPour(mem.id, m).conflit;
                          return (
                            <button key={mem.id} onClick={() => basculer(m.id, mem.id)} style={{
                              padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5,
                              fontWeight: 600,
                              border: `1.5px solid ${estAffecte ? C.bleu : conflit ? "#F3C7C7" : C.bord}`,
                              background: estAffecte ? "#E7EFFC" : conflit ? "#FEF2F2" : C.blanc,
                              color: estAffecte ? C.bleu : conflit ? C.rouge : C.encre,
                            }}>
                              {estAffecte ? "✓ " : conflit ? "⚠ " : ""}{mem.nom}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
