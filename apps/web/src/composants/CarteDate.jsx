// =============================================================================
// La CARTE DE DATE — une date, et qui la fera.
//
// C'est au moment où l'on pose une date qu'on pense à l'équipe. Séparer les
// deux en deux endroits de l'écran obligeait à redescendre plus bas, et
// l'affectation finissait oubliée : le dossier était « prêt » et personne
// n'était prévu.
//
// La BILLE porte l'état, en taille bouton — assez grande pour être le repère
// visuel de la carte, et pour que son suivi 3D se voie. C'est elle qu'on
// regarde pour savoir si la date est pourvue, avant même de lire.
// =============================================================================

import React, { useState } from "react";
import {
  etatAffectation, couleurVoyant, resumeAffectation, exigence,
} from "@domaine/planning/affectation.js";
import Bille from "./Bille.jsx";
import { C, S } from "../lib/theme.jsx";

const TON = { gris: "gris", orange: "orange", vert: "vert" };
const BORD = { gris: "#94A3B8", orange: "#FB923C", vert: "#34D399" };

/**
 * @param {string} typeMission visite | emballage | demenagement | lift | …
 * @param {string} libelle ce que l'écran annonce
 * @param {boolean} facultative une date optionnelle se dit
 */
export default function CarteDate({
  typeMission, libelle, facultative = false,
  date, heure, onDate, onHeure,
  affectation, onAffectation, membres, flotte,
}) {
  const [ouvert, setOuvert] = useState(false);
  const a = affectation || { membres: [], vehicules: [] };
  const ex = exigence(typeMission);

  // Sans date, il n'y a rien à affecter : le voyant reste éteint et ne réclame
  // pas une équipe pour un jour qui n'existe pas.
  const posee = Boolean(date);
  const verdict = posee
    ? etatAffectation(typeMission, a, flotte)
    : { etat: "vide", manques: [], note: ex.note };
  const couleur = couleurVoyant(verdict.etat);

  function basculerMembre(id) {
    const l = a.membres || [];
    onAffectation({ ...a,
      membres: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }
  function basculerVehicule(id) {
    const l = a.vehicules || [];
    onAffectation({ ...a,
      vehicules: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }

  // Un lift ne se réserve qu'avec un lift : proposer un fourgon n'aurait
  // aucun sens.
  const flotteOfferte = ex.categorie
    ? (flotte || []).filter((v) => (v.categorie || "camion") === ex.categorie)
    : (flotte || []);

  return (
    <div style={{
      ...S.carte,
      padding: 0, overflow: "hidden",
      borderLeft: `3px solid ${posee ? BORD[couleur] : C.bord}`,
      opacity: posee ? 1 : 0.88,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 14px 11px" }}>
        <Bille taille="bouton" ton={posee ? TON[couleur] : "gris"}
               signe={posee ? undefined : "plus"}
               titre={`${libelle} — ${resumeAffectation(a)}`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>
            {libelle}
            {facultative && (
              <span style={{ fontWeight: 400, fontSize: 11.5, color: C.muet }}>
                {" "}— optionnel
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 2 }}>
            {posee
              ? resumeAffectation(a)
                + (verdict.etat === "partiel" && verdict.manques[0]
                   ? ` — ${verdict.manques[0].toLowerCase()}` : "")
              : "Aucune date posée"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 14px 12px" }}>
        <div style={{ flex: 2 }}>
          <label style={S.label}>Date</label>
          <input style={S.input} type="date" value={date || ""}
                 onChange={(e) => onDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Heure</label>
          <input style={S.input} type="time" value={heure || ""}
                 onChange={(e) => onHeure(e.target.value)} />
        </div>
      </div>

      {posee && (
        <>
          <button onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}
            style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%",
              padding: "10px 14px", border: "none",
              borderTop: `1px solid ${C.bord}`, background: "none",
              cursor: "pointer", textAlign: "left",
            }}>
            <Bille taille="jeton" ton="bleu" signe="chevron" actif={ouvert} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700,
                           color: C.encre }}>
              Qui la fait
            </span>
            <span style={{ fontSize: 11.5, color: C.muet }}>
              {resumeAffectation(a)}
            </span>
          </button>

          {ouvert && (
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5,
                            margin: "2px 0 10px" }}>
                {ex.note}
              </div>

              <Titre>Équipe</Titre>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(membres || []).length === 0 && (
                  <span style={{ fontSize: 12, color: C.muet }}>
                    Aucun membre actif.
                  </span>
                )}
                {(membres || []).map((m) => (
                  <Jeton key={m.id} actif={(a.membres || []).includes(m.id)}
                         onClick={() => basculerMembre(m.id)} texte={m.nom} />
                ))}
              </div>

              {/* Une visite n'emporte pas de véhicule : ne pas proposer un
                  choix sans objet. */}
              {ex.vehicule !== "aucun" && ex.titre !== "Visite" && (
                <div style={{ marginTop: 12 }}>
                  <Titre>
                    Véhicules{ex.categorie ? ` — ${ex.categorie}s seulement` : ""}
                  </Titre>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {flotteOfferte.length === 0 && (
                      <span style={{ fontSize: 12, color: C.muet }}>
                        {ex.categorie
                          ? `Aucun véhicule de catégorie ${ex.categorie}.`
                          : "Aucun véhicule."}
                      </span>
                    )}
                    {flotteOfferte.map((v) => (
                      <Jeton key={v.id} actif={(a.vehicules || []).includes(v.id)}
                             onClick={() => basculerVehicule(v.id)} texte={v.nom} />
                    ))}
                  </div>
                </div>
              )}

              {verdict.manques.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7,
                              marginTop: 12, fontSize: 11.5, lineHeight: 1.5,
                              color: verdict.etat === "vide" ? C.muet : C.ambre }}>
                  <Bille taille="puce" ton={couleur} signe="attention"
                         style={{ marginTop: 1 }} />
                  <span>{verdict.manques.join(" · ")}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Titre = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet, marginBottom: 6,
                textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</div>
);

function Jeton({ actif, onClick, texte }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 999, cursor: "pointer",
      fontSize: 12.5, fontWeight: 700,
      border: `1.5px solid ${actif ? C.bleu : C.bord}`,
      background: actif ? C.bleuClair : C.blanc,
      color: actif ? C.bleu : C.muet,
    }}>{texte}</button>
  );
}
