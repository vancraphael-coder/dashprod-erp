// =============================================================================
// Bureau — Rapports de chantier d'un dossier.
//
// L'autre moitié de la boucle d'écart. Le terrain a constaté ; ici le bureau
// tranche : l'écart est-il validé, refusé, ou ajusté autrement ?
//
// Ce que cet écran affiche et que le terrain n'a PAS : l'impact cumulé en
// heures et en volume, une fois les écarts validés. C'est ce qui alimente un
// devis complémentaire — calculé au bureau, avec le barème.
//
// Les constats non facturables (dommage, réserve, incident) remontent aussi.
// Ils n'ajustent aucun prix mais ils engagent la responsabilité : les noyer
// dans la même liste que les suppléments serait la meilleure façon de les
// oublier.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { lireRapport, trancherConstat } from "../lib/adaptateur.js";
import { nature, syntheseRapport } from "@domaine/operations/rapport-chantier.js";
import { C, S } from "../lib/theme.jsx";

const DECISIONS = [
  { cle: "valide", libelle: "Valider", couleur: C.vert,
    aide: "L'écart est réel : il comptera dans le supplément." },
  { cle: "ajuste", libelle: "Ajuster", couleur: C.ambre,
    aide: "Retenu, mais autrement — précisez dans le motif." },
  { cle: "refuse", libelle: "Refuser", couleur: C.rouge,
    aide: "Pas de supplément. Le constat reste au dossier." },
];

const jour = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("fr-BE",
      { weekday: "short", day: "2-digit", month: "long" });
  } catch { return iso; }
};

export default function RapportsDossier({ affaireId, retour }) {
  const [rapports, setRapports] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [ouvert, setOuvert] = useState(null);   // constat en cours d'arbitrage
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    setErreur(null);
    try { setRapports(await lireRapport({ affaireId })); }
    catch (e) { setErreur(e.message); setRapports([]); }
  }
  useEffect(() => { charger(); }, [affaireId]);

  // Tous les constats du dossier, toutes missions confondues : c'est ainsi
  // qu'on facture — au dossier, pas au chantier.
  const tous = useMemo(
    () => (rapports || []).flatMap((r) => r.constats || []), [rapports]);
  const synthese = useMemo(() => syntheseRapport({ constats: tous }), [tous]);

  async function trancher(constatId, decision) {
    setEnCours(true); setErreur(null);
    try {
      await trancherConstat(constatId, decision, motif);
      setOuvert(null); setMotif("");
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Dossier</button>}
        <div style={S.titre}>Rapports de chantier</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Ce que l'équipe a constaté sur place.
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>
      )}

      {rapports === null && !erreur && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}

      {rapports && rapports.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13,
                      lineHeight: 1.5 }}>
          Aucun rapport pour ce dossier.<br />
          <span style={{ fontSize: 12, color: C.fantome }}>
            Le chef d'équipe le rédige depuis son chantier.
          </span>
        </div>
      )}

      {/* Ce qui appelle une décision, en tête : c'est pour ça qu'on ouvre
          l'écran. */}
      {synthese.a_traiter > 0 && (
        <div style={{ margin: "0 16px 12px", padding: "11px 13px",
                      borderRadius: 11, background: "#FFFBEB",
                      border: "1px solid #FDE68A", fontSize: 12.5,
                      color: "#92400E", lineHeight: 1.5 }}>
          <b>{synthese.a_traiter} écart{synthese.a_traiter > 1 ? "s" : ""} à trancher.</b>
          {" "}Tant qu'ils ne le sont pas, ils ne comptent dans aucun supplément.
        </div>
      )}

      {/* Impact des écarts VALIDÉS. Sans montant : le prix se calcule avec le
          barème, dans le devis complémentaire. */}
      {(synthese.impact.nb > 0 || synthese.sensibles > 0) && (
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Impact retenu</label>
          {synthese.impact.minutes > 0 && (
            <L l="Temps supplémentaire"
               v={`${synthese.heures_sup} h (${synthese.impact.minutes} min)`} />
          )}
          {synthese.impact.volume_m3 > 0 && (
            <L l="Volume supplémentaire" v={`${synthese.impact.volume_m3} m³`} />
          )}
          {synthese.impact.nb === 0 && (
            <div style={{ fontSize: 12.5, color: C.muet, padding: "6px 0" }}>
              Aucun écart facturable retenu.
            </div>
          )}
          {synthese.sensibles > 0 && (
            <div style={{ marginTop: 8, padding: "9px 11px", borderRadius: 9,
                          background: "#FEF2F2", border: "1px solid #FECACA",
                          fontSize: 11.5, color: "#991B1B", lineHeight: 1.45 }}>
              {synthese.sensibles} constat{synthese.sensibles > 1 ? "s" : ""} sans
              impact sur le prix (dommage, réserve, incident) — mais qui engagent
              votre responsabilité.
            </div>
          )}
          <div style={{ fontSize: 11, color: C.fantome, marginTop: 8,
                        lineHeight: 1.5 }}>
            Reportez ce temps et ce volume dans un devis complémentaire : le prix
            se calcule avec votre barème, jamais depuis le terrain.
          </div>
        </div>
      )}

      {(rapports || []).map((r) => (
        <div key={r.rapport_id} style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: C.encre,
                           textTransform: "capitalize" }}>
              {jour(r.date)}
            </span>
            <span style={{ fontSize: 11.5, color: C.fantome }}>
              {r.redige_par || "—"}
            </span>
          </div>

          {r.deroule && (
            <div style={{ fontSize: 13, color: C.encre, lineHeight: 1.5,
                          padding: "9px 11px", borderRadius: 9,
                          background: "#F8FAFC", marginBottom: 8 }}>
              {r.deroule}
            </div>
          )}

          {(r.constats || []).map((c) => {
            const n = nature(c.nature);
            const enArbitrage = ouvert === c.id;
            const teinte = c.etat === "valide" ? C.vert
                         : c.etat === "refuse" ? C.rouge
                         : c.etat === "ajuste" ? C.ambre : C.bord;
            return (
              <div key={c.id} style={{ padding: "10px 0",
                     borderTop: `1px solid ${C.doux}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span aria-hidden="true" style={{ width: 3, alignSelf: "stretch",
                          borderRadius: 2, background: teinte }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 12.5,
                                   fontWeight: 700, color: C.encre }}>
                      {n?.titre || c.nature}
                      {!n?.facturable && (
                        <span style={{ marginLeft: 6, fontSize: 10,
                          background: "#FEF2F2", color: "#991B1B",
                          border: "1px solid #FECACA", borderRadius: 999,
                          padding: "1px 6px", fontWeight: 700 }}>
                          sans impact prix
                        </span>
                      )}
                    </span>
                    <span style={{ display: "block", fontSize: 13, color: C.muet,
                                   marginTop: 2, lineHeight: 1.45 }}>
                      {c.description}
                    </span>
                    {(c.minutes > 0 || c.volume_m3 > 0) && (
                      <span style={{ display: "block", fontSize: 11.5,
                                     color: C.fantome, marginTop: 2 }}>
                        Estimation terrain :
                        {c.minutes > 0 ? ` +${c.minutes} min` : ""}
                        {c.minutes > 0 && c.volume_m3 > 0 ? " ·" : ""}
                        {c.volume_m3 > 0 ? ` +${c.volume_m3} m³` : ""}
                      </span>
                    )}
                    {c.motif && (
                      <span style={{ display: "block", fontSize: 11.5,
                                     color: C.fantome, marginTop: 2,
                                     fontStyle: "italic" }}>
                        Motif : {c.motif}
                      </span>
                    )}
                  </span>
                  {c.etat !== "declare" && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: teinte,
                                   flexShrink: 0 }}>
                      {c.etat === "valide" ? "✓ validé"
                        : c.etat === "refuse" ? "refusé" : "ajusté"}
                    </span>
                  )}
                </div>

                {c.etat === "declare" && !enArbitrage && (
                  <button onClick={() => { setOuvert(c.id); setMotif(""); }}
                    style={{ ...S.boutonLien, paddingLeft: 11, marginTop: 4 }}>
                    Trancher →
                  </button>
                )}

                {enArbitrage && (
                  <div style={{ marginTop: 8, padding: 11, borderRadius: 10,
                                background: "#F8FAFC",
                                border: `1px solid ${C.bord}` }}>
                    <input value={motif} placeholder="Motif (facultatif)"
                      onChange={(e) => setMotif(e.target.value)}
                      style={{ ...S.input, margin: "0 0 8px" }} />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {DECISIONS.map((d) => (
                        <button key={d.cle} title={d.aide} disabled={enCours}
                          onClick={() => trancher(c.id, d.cle)}
                          style={{ flex: 1, minWidth: 84, padding: "9px",
                            borderRadius: 9, cursor: "pointer", fontSize: 12.5,
                            fontWeight: 700, border: `1.5px solid ${d.couleur}`,
                            background: C.blanc, color: d.couleur }}>
                          {d.libelle}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setOuvert(null)}
                      style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 6 }}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {(r.constats || []).length === 0 && (
            <div style={{ fontSize: 12.5, color: C.fantome, paddingTop: 6 }}>
              Aucun écart signalé — chantier conforme au prévu.
            </div>
          )}
        </div>
      ))}

      <div style={{ height: 30 }} />
    </div>
  );
}

function L({ l, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12,
                  padding: "7px 0", borderTop: `1px solid ${C.doux}` }}>
      <span style={{ fontSize: 12.5, color: C.muet }}>{l}</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: C.encre }}>{v}</span>
    </div>
  );
}
