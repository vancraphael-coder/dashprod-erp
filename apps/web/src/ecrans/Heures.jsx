// =============================================================================
// Écran — Heures travaillées.
// Demande fondateur : logique par membre ET globale. Les heures viennent des
// sessions de chrono réelles (pas de saisie), agrégées par le domaine
// (heuresParMembre, heuresGlobales). Les pauses sont exclues.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { missionsAvecChrono, listerMembresSimples } from "../lib/adaptateur.js";
import { heuresParMembre, heuresGlobales, formaterDuree } from "@domaine/operations/chrono.js";
import { C, S } from "../lib/theme.jsx";

export default function Heures({ retour }) {
  const [missions, setMissions] = useState([]);
  const [membres, setMembres] = useState([]);
  const [vue, setVue] = useState("membre");

  useEffect(() => {
    missionsAvecChrono().then(setMissions).catch(() => {});
    listerMembresSimples().then(setMembres).catch(() => {});
  }, []);

  const parMembre = useMemo(() => heuresParMembre(missions), [missions]);
  const global = useMemo(() => heuresGlobales(missions), [missions]);
  const nom = (id) => membres.find((m) => m.id === id)?.nom || id;

  // Classement décroissant des membres par heures.
  const classement = useMemo(() =>
    Object.entries(parMembre).sort((a, b) => b[1] - a[1]), [parMembre]);
  const maxSec = classement.length ? classement[0][1] : 1;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
        <div style={S.titre}>Heures travaillées</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[["membre", "Par membre"], ["global", "Global"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setVue(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${vue === cle ? C.bleu : C.bord}`,
              background: vue === cle ? "#E7EFFC" : C.blanc,
              color: vue === cle ? C.bleu : C.muet, fontSize: 12.5, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>

      {vue === "global" ? (
        <>
          <div style={{ ...S.carte, textAlign: "center", padding: "22px 16px" }}>
            <div style={{ fontSize: 12, color: C.muet, textTransform: "uppercase",
                          letterSpacing: ".05em" }}>Total terrain</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: C.encre, marginTop: 4 }}>
              {formaterDuree(global)}
            </div>
            <div style={{ fontSize: 12, color: C.fantome, marginTop: 2 }}>
              Temps chantier réel · {missions.filter((m) => m.sessions?.length).length} chantiers chronométrés
            </div>
          </div>
          <div style={{ margin: "0 16px", fontSize: 11.5, color: C.muet, lineHeight: 1.5 }}>
            Le total global compte chaque chantier une seule fois (temps mobilisé
            sur le terrain), pas multiplié par le nombre de déménageurs.
          </div>
        </>
      ) : (
        <>
          {classement.length === 0 ? (
            <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
              Aucune heure chronométrée pour le moment.
            </div>
          ) : (
            <div style={S.carte}>
              {classement.map(([id, sec]) => (
                <div key={id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                fontSize: 13.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: C.encre }}>{nom(id)}</span>
                    <span style={{ fontWeight: 800, color: C.encre }}>{formaterDuree(sec)}</span>
                  </div>
                  <div style={{ height: 8, background: "#EEF2F7", borderRadius: 999 }}>
                    <div style={{ height: "100%", width: `${Math.round((sec / maxSec) * 100)}%`,
                      background: "linear-gradient(90deg, #2563EB, #1D4ED8)", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ margin: "0 16px", fontSize: 11.5, color: C.muet, lineHeight: 1.5 }}>
            Chaque membre cumule le temps des chantiers où il était affecté.
            Utile pour équilibrer la charge et préparer la paie.
          </div>
        </>
      )}
    </div>
  );
}
