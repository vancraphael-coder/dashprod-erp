// =============================================================================
// Écran — Planning (calendrier mensuel + journée).
// Deux niveaux (alignement page 09) : la GRILLE du mois donne la densité d'un
// coup d'œil (pastilles) ; toucher un jour ouvre ses missions, avec affectation
// et détection de conflits en direct (C-20 : le système signale, l'humain
// décide). Le bureau raisonne en mois, pas en liste infinie.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { listerMissions, listerMembresSimples, basculerAffectation } from "../lib/adaptateur.js";
import { grilleMois, missionsDuJour, chargeDuJour } from "@domaine/operations/agenda.js";
import { conflitsAffectation } from "@domaine/operations/missions.js";
import { C, S } from "../lib/theme.jsx";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
              "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function aujourdhui() { return new Date().toISOString().slice(0, 10); }

function dateLongue(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch { return iso; }
}

export default function Planning({ ouvrirDossier }) {
  const [missions, setMissions] = useState([]);
  const [membres, setMembres] = useState([]);
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth());
  const [jourSel, setJourSel] = useState(aujourdhui());
  const [ouvert, setOuvert] = useState(null);

  async function recharger() {
    setMissions(await listerMissions());
    setMembres(await listerMembresSimples());
  }
  useEffect(() => { recharger(); }, []);

  const grille = useMemo(() => grilleMois(annee, mois, missions), [annee, mois, missions]);
  const duJour = useMemo(() => missionsDuJour(missions, jourSel), [missions, jourSel]);
  const charge = useMemo(() => chargeDuJour(duJour), [duJour]);

  function moisPrecedent() {
    if (mois === 0) { setMois(11); setAnnee(annee - 1); } else setMois(mois - 1);
  }
  function moisSuivant() {
    if (mois === 11) { setMois(0); setAnnee(annee + 1); } else setMois(mois + 1);
  }

  /** Le membre est-il déjà pris sur une AUTRE mission le même jour ? (C-20) */
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
      {/* Navigation du mois */}
      <div style={{ ...S.entete, display: "flex", justifyContent: "space-between",
                    alignItems: "center" }}>
        <button onClick={moisPrecedent} style={btnFleche}>←</button>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.encre }}>
          {MOIS[mois]} {annee}
        </div>
        <button onClick={moisSuivant} style={btnFleche}>→</button>
      </div>

      {/* Grille du mois */}
      <div style={{ ...S.carte, padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3,
                      textAlign: "center" }}>
          {JOURS_COURTS.map((j) => (
            <div key={j} style={{ fontSize: 9.5, fontWeight: 700, color: C.fantome,
                                   padding: "4px 0" }}>{j}</div>
          ))}
          {Array.from({ length: grille.decalage }).map((_, i) => <div key={"v" + i} />)}
          {grille.jours.map((j) => {
            const estAujourdhui = j.date === aujourdhui();
            const selectionne = j.date === jourSel;
            return (
              <button key={j.date} onClick={() => { setJourSel(j.date); setOuvert(null); }}
                style={{
                  position: "relative", aspectRatio: "1", borderRadius: 9,
                  border: selectionne ? `2px solid ${C.bleu}` : "1.5px solid transparent",
                  background: estAujourdhui ? C.bleu : selectionne ? "#E7EFFC" : "transparent",
                  color: estAujourdhui ? "#fff" : C.encre,
                  fontSize: 13.5, fontWeight: (estAujourdhui || selectionne) ? 700 : 500,
                  cursor: "pointer",
                }}>
                {j.jour}
                {j.nb > 0 && (
                  <span style={{
                    position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)",
                    width: 5, height: 5, borderRadius: "50%",
                    background: estAujourdhui ? "#fff" : C.ambre,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Journée sélectionnée */}
      <div style={{ padding: "4px 20px 8px", display: "flex", justifyContent: "space-between",
                    alignItems: "baseline" }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.encre,
                       textTransform: "capitalize" }}>
          {dateLongue(jourSel)}
        </span>
        {charge.nbMissions > 0 && (
          <span style={{ fontSize: 11.5, color: C.muet }}>
            {charge.nbMissions} mission{charge.nbMissions > 1 ? "s" : ""} · {charge.effectif} affecté·s
          </span>
        )}
      </div>

      {duJour.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Aucune mission ce jour.
        </div>
      )}

      {duJour.map((m) => {
        const affectes = (m.affectations || []).map((a) => a.utilisateur_id);
        const ouvertIci = ouvert === m.id;
        return (
          <div key={m.id} style={{ ...S.carte,
            borderLeft: `4px solid ${m.type === "emballage" ? "#6366F1" : C.bleu}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div onClick={() => ouvrirDossier && m.affaire_id && ouvrirDossier(m.affaire_id)}
                   style={{ cursor: ouvrirDossier ? "pointer" : "default", flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
                  {(m.heure || "").slice(0, 5)} · {m.client || "—"}
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

            {affectes.length === 0 && !ouvertIci && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: C.ambre, fontWeight: 600 }}>
                ⚠ Aucune équipe affectée
              </div>
            )}

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

            {ouvertIci && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8 }}>
                  Touchez un membre pour l'affecter ou le retirer. Un membre déjà pris
                  ce jour-là est signalé en rouge — sans être interdit.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {membres.map((mem) => {
                    const estAffecte = affectes.includes(mem.id);
                    const conflit = !estAffecte && conflitPour(mem.id, m).conflit;
                    return (
                      <button key={mem.id} onClick={() => basculer(m.id, mem.id)} style={{
                        padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                        fontSize: 12.5, fontWeight: 600,
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
}

const btnFleche = {
  width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${C.bord}`,
  background: "#fff", cursor: "pointer", fontSize: 16, color: C.encre, fontWeight: 700,
};
