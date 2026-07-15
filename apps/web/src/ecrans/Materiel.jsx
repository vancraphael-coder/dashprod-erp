// =============================================================================
// Écran — Matériel d'emballage (Enlevé / Utilisé / Repris).
// Alignement page 06. Trois colonnes par article : ce qui quitte le dépôt, ce
// qui est consommé chez le client, ce qui revient. L'ÉCART (E − U − R) est la
// fuite de marge invisible : il s'affiche en rouge dès qu'il apparaît.
//
// L'équilibre est vérifié par le domaine Stocks (controleSolde, Module 8) —
// aucune règle réécrite ici. Le matériel UTILISÉ alimente automatiquement la
// ligne « Fourniture du matériel d'emballage » de l'offre.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { obtenirAffaire, obtenirEmballage, sauverEmballage } from "../lib/adaptateur.js";
import {
  CATALOGUE_EMBALLAGE, resumeEmballage, fournituresOffre,
} from "@domaine/stocks/emballage.js";
import { C, S } from "../lib/theme.jsx";

export default function Materiel({ affaireId, retour }) {
  const [affaire, setAffaire] = useState(null);
  const [emballage, setEmballage] = useState({});
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    obtenirAffaire(affaireId).then(setAffaire);
    obtenirEmballage(affaireId).then((e) => setEmballage(e || {})).catch(() => {});
  }, [affaireId]);

  const resume = useMemo(() => resumeEmballage(emballage), [emballage]);
  const fournitures = useMemo(() => fournituresOffre(emballage), [emballage]);

  function maj(cle, colonne, valeur) {
    const n = Math.max(0, parseInt(valeur, 10) || 0);
    setEmballage((e) => ({ ...e, [cle]: { ...(e[cle] || {}), [colonne]: n } }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try { await sauverEmballage(affaireId, emballage); setSauve(true); }
    catch (e) { setErreur(e.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossier</button>
        <div style={S.titre}>Matériel — {affaire?.client?.nom || "…"}</div>
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 2 }}>
          Enlevé du dépôt · Utilisé chez le client · Repris au retour
        </div>
      </div>

      {/* Écarts : le matériel parti et non justifié */}
      {resume.ecarts.length > 0 && (
        <div style={{ ...S.carte, background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#991B1B" }}>
            ⚠ Matériel non justifié
          </div>
          {resume.ecarts.map((e) => (
            <div key={e.cle} style={{ fontSize: 12, color: "#B91C1C", marginTop: 3 }}>
              {e.nom} : {e.ecart} manquant{e.ecart > 1 ? "s" : ""}
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 6, opacity: 0.85 }}>
            Enlevé − Utilisé − Repris. Perdu, cassé, ou oubli de saisie.
          </div>
        </div>
      )}

      {/* Grille E / U / R */}
      <div style={S.carte}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 52px 52px",
                      gap: 6, alignItems: "center" }}>
          <div />
          {["Enl.", "Util.", "Rep."].map((t) => (
            <div key={t} style={{ fontSize: 10, fontWeight: 700, color: C.fantome,
                                   textAlign: "center", textTransform: "uppercase" }}>
              {t}
            </div>
          ))}

          {CATALOGUE_EMBALLAGE.map((a) => {
            const ligne = resume.lignes.find((l) => l.cle === a.cle);
            const enEcart = ligne.e > 0 && !ligne.coherent;
            return (
              <React.Fragment key={a.cle}>
                <div style={{ fontSize: 13, color: C.encre,
                              fontWeight: enEcart ? 700 : 500 }}>
                  {a.nom}
                  {enEcart && (
                    <span style={{ color: C.rouge, fontSize: 11 }}> · −{ligne.ecart}</span>
                  )}
                </div>
                {["e", "u", "r"].map((col) => (
                  <input
                    key={col} inputMode="numeric" style={{
                      ...S.input, padding: "8px 4px", textAlign: "center",
                      borderColor: enEcart ? "#FECACA" : C.bord,
                    }}
                    value={(emballage[a.cle] || {})[col] ?? ""}
                    placeholder="0"
                    onChange={(e) => maj(a.cle, col, e.target.value)}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Ce qui partira sur l'offre */}
      {fournitures.length > 0 && (
        <div style={{ ...S.carte, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF",
                        textTransform: "uppercase", letterSpacing: ".05em" }}>
            Mentionné sur l'offre
          </div>
          <div style={{ fontSize: 12.5, color: "#1E3A8A", marginTop: 4 }}>
            Fourniture du matériel d'emballage ({fournitures.join(", ")})
          </div>
        </div>
      )}

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}

      <div style={{ margin: "0 16px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Matériel enregistré" : "Enregistrer le matériel"}
        </button>
      </div>
    </div>
  );
}
