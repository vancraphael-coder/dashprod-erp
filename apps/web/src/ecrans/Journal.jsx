// =============================================================================
// Écran — Journal d'enregistrements.
//
// Tout ce qui bouge dans l'entreprise, dans l'ordre où c'est arrivé :
// affectations sur l'agenda, modifications de dossiers, factures, congés,
// autorisations. Plus les DÉCISIONS, que personne ne peut déduire des données
// (« on accepte ce chantier malgré la marge faible »).
//
// Le principe qui compte, et il n'est pas ergonomique mais juridique :
// **rien ne se réécrit**. La table est en insertion seule. Une décision se
// remplace par une nouvelle qui cite l'ancienne — les deux restent lisibles.
// Entre associés, c'est ce qui permet de reconstituer une position sans avoir
// à se disputer sur qui a modifié quoi.
//
// Le journal expose des montants, des salaires et des droits : sa lecture est
// réservée en base à qui gère l'entreprise ou voit les prix.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { lireJournal, noterDecision } from "../lib/adaptateur.js";
import {
  FAMILLES, familleDe, phraseEvenement, parJour, filtrerParFamille,
} from "@domaine/noyau/journal.js";
import { C, S } from "../lib/theme.jsx";

/** Une couleur par famille — repérer d'un coup d'œil, pas décorer. */
const TONS = {
  decision:   { fond: "#EEF2FF", trait: "#4F46E5", texte: "#3730A3" },
  argent:     { fond: "#ECFDF5", trait: "#059669", texte: "#065F46" },
  dossier:    { fond: "#EFF6FF", trait: "#2563EB", texte: "#1E40AF" },
  planning:   { fond: "#FFFBEB", trait: "#D97706", texte: "#92400E" },
  equipe:     { fond: "#FDF2F8", trait: "#DB2777", texte: "#9D174D" },
  entreprise: { fond: "#F8FAFC", trait: "#64748B", texte: "#334155" },
  autre:      { fond: "#F8FAFC", trait: "#94A3B8", texte: "#475569" },
};

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];

function jourLisible(iso) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const auj = new Date().toISOString().slice(0, 10);
  if (iso === auj) return "Aujourd'hui";
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

const heure = (iso) => {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return ""; }
};

export default function Journal({ retour, affaireId }) {
  const [entrees, setEntrees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [famille, setFamille] = useState("tout");
  const [sujetFiltre, setSujetFiltre] = useState(null);
  const [jours, setJours] = useState(30);
  const [note, setNote] = useState("");
  const [ecrit, setEcrit] = useState(false);

  const depuis = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - jours);
    return d.toISOString().slice(0, 10);
  }, [jours]);

  async function charger() {
    setErreur(null);
    try {
      setEntrees(await lireJournal({ depuis, affaireId, limite: 400 }));
    } catch (e) { setErreur(e.message); setEntrees([]); }
  }
  useEffect(() => { charger(); }, [depuis, affaireId]);

  const filtrees = useMemo(() => {
    const parFamille = filtrerParFamille(entrees || [], famille);
    // Filtre par sujet : on clique un nom de dossier pour ne voir que lui,
    // sans quitter la vue d'ensemble.
    return sujetFiltre
      ? parFamille.filter((e) => e.sujet === sujetFiltre)
      : parFamille;
  }, [entrees, famille, sujetFiltre]);
  const groupes = useMemo(() => parJour(filtrees), [filtrees]);

  async function consigner() {
    const t = note.trim();
    if (t.length < 3) return;
    setEcrit(true); setErreur(null);
    try {
      await noterDecision(t, affaireId
        ? { entiteType: "affaires", entiteId: affaireId } : {});
      setNote("");
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEcrit(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
        <div style={S.titre}>Journal</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {affaireId ? "Tout ce qui s'est passé sur ce dossier."
                     : "Tout ce qui bouge dans l'entreprise."}
        </div>
      </div>

      {/* Consigner une décision. C'est la seule chose que le système ne peut
          pas déduire : pourquoi on a tranché comme ça. */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Consigner une décision</label>
        <textarea
          value={note} rows={2}
          placeholder="Ex. : on accepte le chantier Dupont malgré la marge faible, client historique."
          onChange={(e) => setNote(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px",
            borderRadius: 10, border: `1.5px solid ${C.bord}`, fontSize: 13,
            fontFamily: "inherit", resize: "vertical", background: "#fff" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <button style={{ ...S.boutonPlein, margin: 0, flex: 1,
                           opacity: note.trim().length > 2 ? 1 : .5 }}
                  disabled={note.trim().length < 3 || ecrit} onClick={consigner}>
            {ecrit ? "Enregistrement…" : "Consigner"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
          Une entrée du journal ne peut plus être modifiée ni effacée. Pour
          revenir sur une décision, consignez-en une nouvelle : les deux
          resteront lisibles.
        </div>
      </div>

      {/* Filtres */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 6,
                    overflowX: "auto" }}>
        {[["tout", "Tout"], ...FAMILLES.map((f) => [f.cle, f.libelle])].map(([c, lib]) => (
          <button key={c} onClick={() => setFamille(c)} style={{
            padding: "7px 13px", borderRadius: 999, whiteSpace: "nowrap",
            cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${famille === c ? C.bleu : C.bord}`,
            background: famille === c ? "#E7EFFC" : C.blanc,
            color: famille === c ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      <div style={{ padding: "0 16px 10px", display: "flex", gap: 6 }}>
        {[[7, "7 jours"], [30, "30 jours"], [90, "3 mois"], [365, "1 an"]]
          .map(([j, lib]) => (
          <button key={j} onClick={() => setJours(j)} style={{
            padding: "6px 11px", borderRadius: 8, cursor: "pointer",
            fontSize: 11.5, fontWeight: 700,
            border: `1px solid ${jours === j ? C.bord : "transparent"}`,
            background: jours === j ? C.blanc : "transparent",
            color: jours === j ? C.encre : C.fantome }}>{lib}</button>
        ))}
      </div>

      {sujetFiltre && (
        <div style={{ margin: "0 16px 10px", padding: "9px 12px",
          borderRadius: 10, background: "#E7EFFC", border: `1px solid ${C.bord}`,
          display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.encre }}>
            Filtré sur <b>{sujetFiltre}</b>
          </span>
          <button onClick={() => setSujetFiltre(null)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.bleu, fontSize: 12.5, fontWeight: 700 }}>
            Voir tout
          </button>
        </div>
      )}

      {erreur && (
        <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>
      )}

      {entrees === null && !erreur && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}

      {entrees && groupes.length === 0 && !erreur && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Rien à signaler sur cette période.
        </div>
      )}

      {groupes.map(([jour, liste]) => (
        <div key={jour} style={{ marginBottom: 4 }}>
          <div style={{ padding: "10px 20px 6px", fontSize: 11.5, fontWeight: 800,
                        color: C.fantome, textTransform: "uppercase",
                        letterSpacing: ".05em" }}>
            {jourLisible(jour)}
          </div>
          <div style={{ ...S.carte, marginTop: 0, paddingTop: 4, paddingBottom: 4 }}>
            {liste.map((e) => {
              const ton = TONS[familleDe(e.type)] || TONS.autre;
              const estDecision = e.type === "Decision.Notee";
              return (
                <div key={e.id} style={{ display: "flex", gap: 10,
                       padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
                  <span style={{ fontFamily: "ui-monospace, monospace",
                                 fontSize: 11, color: C.fantome, flexShrink: 0,
                                 paddingTop: 2, width: 36 }}>
                    {heure(e.quand)}
                  </span>
                  <span aria-hidden="true" style={{ width: 3, borderRadius: 2,
                          background: ton.trait, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13,
                      color: estDecision ? ton.texte : C.encre,
                      fontWeight: estDecision ? 600 : 500,
                      lineHeight: 1.45 }}>
                      {phraseEvenement(e)}
                    </span>
                    {/* Le sujet : DE QUOI parle cette ligne. Sans lui,
                        « Dossier modifié — heure » est illisible dès qu'on a
                        plus de trois clients. Masqué dans l'historique d'un
                        dossier, où il serait répété à chaque ligne. */}
                    {!affaireId && e.sujet && (
                      <button
                        onClick={() => setSujetFiltre(
                          sujetFiltre === e.sujet ? null : e.sujet)}
                        title={sujetFiltre === e.sujet
                          ? "Voir tout" : `Ne voir que « ${e.sujet} »`}
                        style={{ display: "inline-flex", alignItems: "center",
                        gap: 5, marginTop: 3, padding: "2px 8px",
                        cursor: "pointer", borderRadius: 999, background: ton.fond,
                        border: `1px solid ${ton.trait}33` }}>
                        <span aria-hidden="true" style={{ width: 6, height: 6,
                          borderRadius: "50%", background: ton.trait }} />
                        <span style={{ fontSize: 11, fontWeight: 700,
                                       color: ton.texte }}>{e.sujet}</span>
                      </button>
                    )}
                    <span style={{ display: "block", fontSize: 11,
                                   color: C.fantome, marginTop: 2 }}>
                      {e.qui || "système"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ height: 30 }} />
    </div>
  );
}
