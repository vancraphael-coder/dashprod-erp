// =============================================================================
// APP TERRAIN — Mes chantiers (l'app des équipes sur le terrain).
// Alignement page 11. Deux apps en une : le BUREAU voit tout ; le TERRAIN voit
// SES chantiers, sans prix ni coûts. Le cloisonnement est RÉEL (RLS +
// capacités), pas une simulation d'affichage.
//
// Cet écran : liste de mes missions triées par date (aujourd'hui en tête),
// fiche chantier repliable (adresses + itinéraire, équipe, camions, à démonter,
// remarques, brief WhatsApp), et chrono sur sessions serveur (supérieur au
// chrono navigateur du modèle, qui se perd si l'app se ferme).
// =============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  mesMissionsTerrain, chronoDemarrer, chronoArreter, chronoPause,
} from "../lib/adaptateur.js";
import {
  dureeSecondes, chronoEnCours, formaterChrono, enPause, listePauses,
} from "@domaine/operations/chrono.js";
import { urlItineraire } from "@domaine/communication/brief.js";
import { C, S } from "../lib/theme.jsx";

function aujourdhui() { return new Date().toISOString().slice(0, 10); }

function dateLongue(iso) {
  if (!iso) return "Date à définir";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch { return iso; }
}

export default function Terrain({ profil, versConsult }) {
  const [missions, setMissions] = useState([]);
  const [ouvert, setOuvert] = useState(null);
  const [chargement, setChargement] = useState(true);

  async function recharger() {
    if (!profil?.utilisateur_id) return;
    setMissions(await mesMissionsTerrain(profil.utilisateur_id).catch(() => []));
    setChargement(false);
  }
  useEffect(() => { recharger(); }, [profil?.utilisateur_id]);

  const triees = useMemo(() => {
    const auj = aujourdhui();
    return [...missions].sort((a, b) => {
      // Aujourd'hui d'abord, puis chronologique.
      const aAuj = a.date === auj, bAuj = b.date === auj;
      if (aAuj && !bAuj) return -1;
      if (bAuj && !aAuj) return 1;
      return (a.date || "").localeCompare(b.date || "");
    });
  }, [missions]);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Mes chantiers</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Bonjour {profil?.nom || ""} — {triees.length} mission{triees.length > 1 ? "s" : ""}
        </div>
      </div>

      {chargement && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet }}>Chargement…</div>
      )}
      {!chargement && triees.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Aucun chantier affecté pour le moment.
        </div>
      )}

      {triees.map((m) => (
        <Chantier key={m.id} mission={m} profil={profil}
                  ouvert={ouvert === m.id}
                  onToggle={() => setOuvert(ouvert === m.id ? null : m.id)}
                  onChrono={recharger} versConsult={versConsult} />
      ))}
    </div>
  );
}

function Chantier({ mission, profil, ouvert, onToggle, onChrono, versConsult }) {
  const estAujourdhui = mission.date === aujourdhui();
  const [secondes, setSecondes] = useState(dureeSecondes(mission.sessions));
  const [pauses, setPauses] = useState(listePauses(mission.sessions));
  const enCours = chronoEnCours(mission.sessions);
  const pause = enPause(mission.sessions);
  const timer = useRef(null);

  // Tic d'affichage quand le chrono tourne.
  useEffect(() => {
    if (enCours || pause) {
      timer.current = setInterval(() => {
        setSecondes(dureeSecondes(mission.sessions));
        setPauses(listePauses(mission.sessions));
      }, 1000);
    } else {
      setSecondes(dureeSecondes(mission.sessions));
      setPauses(listePauses(mission.sessions));
    }
    return () => clearInterval(timer.current);
  }, [enCours, pause, mission.sessions]);

  async function basculerChrono() {
    if (enCours) await chronoArreter(mission.id);
    else await chronoDemarrer(mission.id);
    await onChrono();
  }
  async function basculerPause() {
    await chronoPause(mission.id);
    await onChrono();
  }

  const itineraire = urlItineraire(mission.charges, mission.decharges);
  const enAttente = mission.etat === "brouillon";

  return (
    <div style={{ ...S.carte,
      borderLeft: `4px solid ${estAujourdhui ? C.vert : C.bleu}` }}>
      {/* Bandeau à valider */}
      {enAttente && (
        <div style={{ margin: "-4px 0 8px", padding: "5px 9px", borderRadius: 8,
          background: "#F5F3FF", color: "#5B21B6", fontSize: 11, fontWeight: 700 }}>
          En attente de validation par le bureau
        </div>
      )}

      <div onClick={onToggle} style={{ cursor: "pointer" }}>
        {estAujourdhui && (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: C.vert,
            textTransform: "uppercase", letterSpacing: ".05em" }}>Aujourd'hui</div>
        )}
        <div style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
          {mission.client || "—"}
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, textTransform: "capitalize" }}>
          {dateLongue(mission.date)}{mission.heure ? ` · ${(mission.heure || "").slice(0, 5)}` : ""}
          {mission.type === "emballage" ? " · emballage" : ""}
        </div>
      </div>

      {ouvert && (
        <div style={{ marginTop: 12 }}>
          {/* Chrono — sessions serveur */}
          <div style={{ background: "#0F172A", borderRadius: 12, padding: "14px",
            textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#fff",
              fontFamily: "ui-monospace, monospace", letterSpacing: ".04em" }}>
              {formaterChrono(secondes)}
            </div>
            {pauses.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {pauses.map((pz) => (
                  <div key={pz.n} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 12, fontFamily: "ui-monospace, monospace",
                    color: pz.enCours ? "#FBBF24" : "#94A3B8", padding: "1px 8px" }}>
                    <span>Pause {pz.n}{pz.enCours ? " · en cours" : ""}</span>
                    <span>{formaterChrono(pz.secondes)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
              {/* Démarrer / Stop final : pilote le compteur principal. */}
              <button onClick={basculerChrono} style={{
                padding: "11px 22px", borderRadius: 999, border: "none",
                cursor: "pointer", fontSize: 14, fontWeight: 800,
                background: enCours ? "#DC2626" : "#22C55E", color: "#fff",
              }}>
                {enCours ? "⏹ Stop" : "▶ Démarrer"}
              </button>
              {/* Pause : marque un arrêt d'équipe, le compteur principal continue. */}
              {enCours && (
                <button onClick={basculerPause} style={{
                  padding: "11px 22px", borderRadius: 999,
                  border: `1.5px solid ${pause ? "#FBBF24" : "#475569"}`,
                  cursor: "pointer", fontSize: 14, fontWeight: 800,
                  background: pause ? "#FBBF24" : "transparent",
                  color: pause ? "#0F172A" : "#E2E8F0",
                }}>
                  {pause ? "Reprendre" : "⏸ Pause"}
                </button>
              )}
            </div>
          </div>

          {/* Adresses + itinéraire */}
          <Bloc titre="Chargement" liste={mission.charges} couleur={C.bleu} />
          <Bloc titre="Déchargement" liste={mission.decharges} couleur="#6366F1" />
          {itineraire && (
            <a href={itineraire} target="_blank" rel="noreferrer" style={{
              display: "block", textAlign: "center", padding: "11px", marginBottom: 10,
              borderRadius: 10, textDecoration: "none", fontSize: 13.5, fontWeight: 700,
              color: "#fff", background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            }}>🗺️ Itinéraire</a>
          )}

          {/* Équipe & camions */}
          {(mission.equipe.length > 0 || mission.camions.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {mission.equipe.map((n) => (
                <span key={n} style={puce(C.bleu)}>👤 {n}</span>
              ))}
              {mission.camions.map((n) => (
                <span key={n} style={puce("#0F766E")}>🚛 {n}</span>
              ))}
            </div>
          )}

          {/* À démonter */}
          {mission.aDemonter.length > 0 && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: 10, padding: "9px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF",
                textTransform: "uppercase" }}>À démonter</div>
              <div style={{ fontSize: 12.5, color: "#1E3A8A", marginTop: 2 }}>
                {mission.aDemonter.map((it) => `${it.quantite}× ${it.nom}`).join(" · ")}
              </div>
            </div>
          )}

          {/* Remarques */}
          {mission.remarques && (
            <div style={{ fontSize: 12.5, color: C.muet, marginBottom: 10, lineHeight: 1.5 }}>
              <b style={{ color: C.encre }}>Remarques.</b> {mission.remarques}
            </div>
          )}

          {/* Consultation du dossier : les trois pages du bureau (dossier,
              relevé, matériel) en LECTURE SEULE — la même information, sans
              risque de modification. */}
          {versConsult && (
            <button onClick={() => versConsult(mission.affaire_id)} style={{
              width: "100%", padding: "11px", borderRadius: 10,
              border: `1.5px solid ${C.bleu}`, background: C.bleuClair,
              color: C.bleu, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>📖 Consulter le dossier</button>
          )}
        </div>
      )}
    </div>
  );
}

function Bloc({ titre, liste, couleur }) {
  const l = (liste || []).filter((a) => a.adresse);
  if (l.length === 0) return null;
  return (
    <div style={{ borderLeft: `3px solid ${couleur}`, paddingLeft: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        color: "#64748B" }}>{titre}</div>
      {l.map((a, i) => (
        <div key={a.id || i} style={{ fontSize: 12.5, color: C.encre }}>
          {l.length > 1 ? `${i + 1}. ` : ""}{a.adresse}
          {a.etage ? ` · étage ${a.etage}` : ""}
          {a.ascenseur ? " · ascenseur" : ""}
          {a.monteMeubles ? " · monte-meubles" : ""}
        </div>
      ))}
    </div>
  );
}

const puce = (couleur) => ({
  fontSize: 11.5, fontWeight: 600, color: couleur,
  background: couleur + "18", borderRadius: 999, padding: "3px 9px",
});
