// =============================================================================
// Écran — Fermetures de l'entreprise (Paramètres → Planning).
//
// Le congé annuel collectif, les ponts. Ces périodes se superposent, sur le
// planning, aux congés des membres et aux jours fériés légaux belges (ceux-là
// calculés, pas saisis). Le déménageur ne gère ici que SES fermetures.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerFermetures, ajouterFermeture, supprimerFermeture,
} from "../lib/adaptateur.js";
import { joursFeriesBelges } from "@domaine/planning/jours-feries.js";
import { C, S } from "../lib/theme.jsx";

const jour = (iso) => {
  if (!iso) return "";
  try { return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE",
    { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return iso; }
};

export default function Fermetures({ retour }) {
  const [liste, setListe] = useState(null);
  const [f, setF] = useState({ debut: "", fin: "", motif: "" });
  const [erreur, setErreur] = useState(null);
  const annee = new Date().getFullYear();

  async function recharger() {
    setListe(await listerFermetures().catch(() => []));
  }
  useEffect(() => { recharger(); }, []);

  const pret = f.debut && f.fin && f.fin >= f.debut;

  async function ajouter() {
    setErreur(null);
    try {
      await ajouterFermeture(f);
      setF({ debut: "", fin: "", motif: "" });
      await recharger();
    } catch (e) { setErreur(e.message); }
  }

  if (liste === null) return null;
  const feries = joursFeriesBelges(annee);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Paramètres</button>}
        <div style={S.titre}>Fermetures de l'entreprise</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Congé annuel, ponts. Visibles sur le planning.
        </div>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Ajouter une fermeture</label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muet, marginBottom: 3 }}>Du</div>
            <input type="date" style={S.input} value={f.debut}
                   onChange={(e) => setF((x) => ({ ...x, debut: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muet, marginBottom: 3 }}>Au</div>
            <input type="date" style={S.input} value={f.fin} min={f.debut}
                   onChange={(e) => setF((x) => ({ ...x, fin: e.target.value }))} />
          </div>
        </div>
        <label style={S.label}>Motif</label>
        <input style={S.input} value={f.motif} placeholder="Congé annuel, pont…"
               onChange={(e) => setF((x) => ({ ...x, motif: e.target.value }))} />
        {erreur && (
          <div style={{ fontSize: 12.5, color: C.rouge, marginTop: 8 }}>{erreur}</div>
        )}
        <button style={{ ...S.boutonPlein, marginTop: 12, opacity: pret ? 1 : .5 }}
                disabled={!pret} onClick={ajouter}>
          Ajouter
        </button>
      </div>

      {liste.length > 0 && (
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Vos fermetures</label>
          {liste.map((x) => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between",
                   alignItems: "center", gap: 10, padding: "10px 0",
                   borderTop: `1px solid ${C.doux}` }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700,
                               color: C.encre }}>
                  {jour(x.debut)}{x.fin !== x.debut ? ` → ${jour(x.fin)}` : ""}
                </span>
                {x.motif && (
                  <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                                 marginTop: 2 }}>{x.motif}</span>
                )}
              </span>
              <button onClick={async () => {
                await supprimerFermeture(x.id); await recharger();
              }} style={{ background: "none", border: "none", color: C.rouge,
                          fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}>
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Les fériés légaux ne se saisissent pas : ils sont calculés. On les
          montre pour que le déménageur sache ce qui est déjà couvert. */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>
          Jours fériés légaux {annee}
        </label>
        <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 8,
                      lineHeight: 1.5 }}>
          Calculés automatiquement et affichés sur le planning. Rien à saisir.
        </div>
        {feries.map((h) => (
          <div key={h.date} style={{ display: "flex", justifyContent: "space-between",
                 padding: "6px 0", borderTop: `1px solid ${C.doux}`, fontSize: 12.5 }}>
            <span style={{ color: C.muet }}>{jour(h.date)}</span>
            <span style={{ color: C.encre, fontWeight: 600 }}>{h.nom}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 30 }} />
    </div>
  );
}
