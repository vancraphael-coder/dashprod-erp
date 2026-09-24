/**
 * JAUGE DES ÉTAPES DE LA JOURNÉE — un KPI qui se lit sans lire.
 *
 * Une piste étapée qui se remplit de trois vagues translucides superposées,
 * et un petit camion posé sur le front de remplissage. Le chef d'équipe avance
 * ou recule d'un geste ; le bureau voit la même jauge bouger dans sa journée.
 *
 * LÉGÈRE PAR CONSTRUCTION : du SVG et deux animations CSS, aucune bibliothèque,
 * aucun calcul par image. Les vagues s'arrêtent si l'utilisateur a demandé
 * moins de mouvement. Les couleurs viennent du type de travail (réglable dans
 * Apparence) et des jetons du thème : la jauge suit le mode nuit.
 *
 * `api` est injectable pour les tests visuels.
 */
import React, { useCallback, useEffect, useState } from "react";
import { etatEtapes, deplacer } from "@domaine/operations/etapes-journee.js";
import * as adaptateur from "../lib/adaptateur.js";
import { C } from "../lib/theme.jsx";

const CSS = `
@keyframes dpVague { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes dpCamion { 0%,100% { transform: translate(-58%, 0); } 50% { transform: translate(-58%, -1.5px); } }
.dp-vague { position: absolute; left: 0; top: 0; width: 200%; height: 100%;
  animation: dpVague var(--d, 7s) linear infinite; }
.dp-vague.inverse { animation-direction: reverse; }
.dp-camion { transition: left .7s cubic-bezier(.34,1.3,.64,1); }
.dp-camion.roule { animation: dpCamion 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .dp-vague, .dp-camion.roule { animation: none; }
  .dp-camion { transition: none; }
}`;

// Une vague sur deux périodes : la translation de −50 % boucle sans raccord.
const VAGUE = "M0 8 Q12.5 0 25 8 T50 8 T75 8 T100 8 T125 8 T150 8 T175 8 T200 8 V20 H0 Z";

/** Relit l'étape de plusieurs missions, toutes les 15 s tant que l'écran est visible. */
export function useEtapesMissions(ids, { api = adaptateur, intervalle = 15000 } = {}) {
  const [etapes, setEtapes] = useState({});
  const cle = (ids || []).join(",");
  const charger = useCallback(async () => {
    if (!ids?.length) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    try { setEtapes(await api.etapesMissions(ids)); } catch { /* garde l'état connu */ }
  }, [cle]);
  useEffect(() => {
    charger();
    if (!ids?.length) return undefined;
    const t = setInterval(charger, intervalle);
    return () => clearInterval(t);
  }, [charger, intervalle]);
  return [etapes, charger];
}

/**
 * La jauge seule (lecture). `compact` : une ligne, pour une liste.
 */
export function Jauge({ type, etape, couleur = C.bleu, compact = false }) {
  const e = etatEtapes(type, etape);
  const pct = Math.round(e.pct * 1000) / 10;
  const haut = compact ? 12 : 16;
  const camionH = compact ? 11 : 13;
  // Le camion roule SUR la piste, et reste dedans même journée terminée.
  const xCamion = Math.min(Math.max(pct, 2.5), 96);
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={e.total} aria-valuenow={e.rang}
         aria-valuetext={e.courante ? e.courante.long : "Pas commencé"}
         style={{ position: "relative", paddingTop: camionH + 1 }}>
      <style>{CSS}</style>

      {/* Le camion, posé sur le front de remplissage. */}
      <svg className={`dp-camion${e.commence && !e.termine ? " roule" : ""}`}
           viewBox="0 0 26 14" width={compact ? 20 : 24} height={camionH}
           aria-hidden="true"
           style={{ position: "absolute", top: 1, left: `${xCamion}%`,
                    transform: "translate(-58%, 0)", opacity: e.commence ? 1 : 0.45 }}>
        <rect x="1" y="2" width="14" height="8" rx="1.6" fill={couleur} />
        <path d="M15 5h5l3.5 3.2V10H15z" fill={couleur} opacity=".82" />
        <rect x="16.4" y="6" width="3" height="2" rx=".5" fill={C.blanc} opacity=".85" />
        <circle cx="5.5" cy="11" r="2.1" fill={C.encre} />
        <circle cx="19.5" cy="11" r="2.1" fill={C.encre} />
      </svg>

      {/* La piste */}
      <div style={{ position: "relative", height: haut, borderRadius: 999,
                    background: C.doux, boxShadow: `inset 0 0 0 1px ${C.bord}`,
                    overflow: "hidden" }}>
        {/* Le remplissage : trois vagues translucides superposées. */}
        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, overflow: "hidden",
                      transition: "width .7s cubic-bezier(.34,1.2,.64,1)",
                      background: couleur + "14" }}>
          {[["6s", ".55", false], ["9s", ".38", true], ["13s", ".26", false]].map(([d, o, inv], i) => (
            <svg key={i} className={`dp-vague${inv ? " inverse" : ""}`} viewBox="0 0 200 20"
                 preserveAspectRatio="none" aria-hidden="true"
                 style={{ "--d": d, top: `${i * 16 - 4}%` }}>
              <path d={VAGUE} fill={couleur} fillOpacity={o} />
            </svg>
          ))}
        </div>

        {/* Les crans d'étape */}
        {e.etapes.slice(0, -1).map((et, i) => {
          const x = ((i + 1) / e.total) * 100;
          return (
            <span key={et.cle} aria-hidden="true" style={{
              position: "absolute", top: "50%", left: `${x}%`, width: 2, height: haut - 6,
              transform: "translate(-50%, -50%)", borderRadius: 2,
              background: i + 1 <= e.rang ? C.blanc : C.bord, opacity: i + 1 <= e.rang ? 0.9 : 1,
            }} />
          );
        })}
      </div>

      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8,
                      marginTop: 6, fontSize: 11.5, lineHeight: 1.3 }}>
          <span style={{ color: C.encre, fontWeight: 800, minWidth: 0 }}>
            {e.termine ? "✓ " : ""}{e.courante ? e.courante.long : "Pas commencé"}
          </span>
          <span style={{ color: C.muet, whiteSpace: "nowrap" }}>{e.rang}/{e.total}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Jauge + commandes du chef d'équipe. Le déplacement est confirmé par la base ;
 * si un autre chef a bougé entre-temps, on relit au lieu d'écraser.
 */
export default function EtapesMission({ mission, etat, couleur, peutPiloter = false,
                                        compact = false, onChange, api = adaptateur }) {
  const cle = etat?.etape || null;
  const e = etatEtapes(mission.type, cle);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null);

  async function pas(sens) {
    const cible = deplacer(mission.type, cle, sens);
    if (!cible) return;
    setEnvoi(true); setMessage(null);
    try {
      const r = await api.etapeDeplacer(mission.id, e.rang, cible.rang, cible.cle);
      if (r && r.ok === false) setMessage(r.message || "Refusé.");
      onChange && (await onChange());
    } catch (err) { setMessage(err.message); }
    finally { setEnvoi(false); }
  }

  const reculerPossible = e.rang > 0;
  const avancerPossible = !e.termine;

  return (
    <div onClick={(ev) => ev.stopPropagation()} style={{ marginTop: compact ? 8 : 10 }}>
      <Jauge type={mission.type} etape={cle} couleur={couleur} compact={compact} />
      {compact && (
        <div style={{ marginTop: 4, fontSize: 11, color: C.muet, display: "flex",
                      justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: e.commence ? C.encre : C.muet, fontWeight: 700 }}>
            {e.termine ? "✓ " : ""}{e.courante ? e.courante.court : "Pas commencé"}
          </span>
          <span>{e.rang}/{e.total}</span>
        </div>
      )}

      {peutPiloter && (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, marginTop: 10 }}>
          <button onClick={() => pas(-1)} disabled={envoi || !reculerPossible}
                  aria-label={e.precedente ? `Revenir à ${e.precedente.court}` : "Revenir au début"}
                  style={{ width: 48, minHeight: 46, borderRadius: 12, cursor: "pointer",
                           border: `1.5px solid ${C.bord}`, background: C.blanc,
                           color: C.muet, fontSize: 18, fontWeight: 800 }}>◀</button>
          <button onClick={() => pas(+1)} disabled={envoi || !avancerPossible}
                  style={{ minHeight: 46, borderRadius: 12, border: "none", cursor: "pointer",
                           background: avancerPossible ? couleur || C.bleu : C.doux,
                           color: avancerPossible ? "#fff" : C.muet,
                           fontSize: 14, fontWeight: 900, padding: "0 12px",
                           whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {envoi ? "…" : e.termine ? "✓ Journée terminée"
              : `${e.commence ? "Étape suivante" : "Démarrer"} · ${e.suivante.court} ▶`}
          </button>
        </div>
      )}
      {message && (
        <div style={{ marginTop: 6, fontSize: 12, color: C.ambre, fontWeight: 700 }}>{message}</div>
      )}
    </div>
  );
}
