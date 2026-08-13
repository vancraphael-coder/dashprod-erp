// =============================================================================
// CENTRES LOGISTIQUES — les dépôts de l'entreprise (offre Pro).
//
// Chaque centre a ses équipes, ses véhicules et ses dossiers. La direction voit
// tout et arbitre ; un gestionnaire de dépôt ne voit que le sien — le
// cloisonnement est tenu en base, pas ici.
//
// Une entreprise à un seul site n'a rien à faire de cet écran : c'est pour
// celles qui ouvrent un deuxième centre que la question se pose.
// =============================================================================

import React, { useEffect, useState } from "react";
import { depots, definirDepot } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

export default function Depots({ retour }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  async function recharger() {
    try { setListe(await depots()); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { recharger(); }, []);

  async function enregistrer() {
    setErr(null);
    if (!form.nom?.trim()) { setErr("Le nom du centre est requis."); return; }
    try { await definirDepot(form); setForm(null); await recharger(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Paramètres</button>
        <div style={S.titre}>Centres logistiques</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Chaque centre a ses équipes, ses véhicules et son planning.
        </div>
      </div>

      {err && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{err}</div>}

      {liste == null && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}

      {liste && liste.length === 0 && !form && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, color: C.encre, lineHeight: 1.55 }}>
            Aucun centre déclaré — votre entreprise fonctionne comme un site
            unique, et c'est très bien ainsi.
          </div>
          <div style={{ fontSize: 12, color: C.muet, marginTop: 6, lineHeight: 1.5 }}>
            Créez un centre le jour où vous ouvrez un second dépôt : vous pourrez
            alors rattacher chaque équipe, chaque véhicule et chaque dossier au
            sien, et nommer un gestionnaire qui ne verra que lui.
          </div>
        </div>
      )}

      {(liste || []).map((d) => (
        <div key={d.id} style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 15.5, fontWeight: 800, color: C.encre }}>
              {d.nom}
            </span>
            {d.le_mien && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.bleu,
                background: C.bleuClair, borderRadius: 999, padding: "2px 8px" }}>
                votre centre
              </span>
            )}
            {!d.actif && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muet }}>
                inactif
              </span>
            )}
          </div>
          {(d.adresse || d.ville) && (
            <div style={{ fontSize: 12.5, color: C.muet, marginTop: 3 }}>
              {[d.adresse, [d.code_postal, d.ville].filter(Boolean).join(" ")]
                .filter(Boolean).join(" · ")}
            </div>
          )}
          {d.tel && (
            <div style={{ fontSize: 12.5, color: C.muet }}>{d.tel}</div>
          )}

          <div style={{ display: "flex", gap: 18, marginTop: 10, paddingTop: 10,
                        borderTop: `1px solid ${C.doux}` }}>
            <Compteur label="Membres" valeur={d.membres} />
            <Compteur label="Véhicules" valeur={d.vehicules} />
            <Compteur label="Dossiers ouverts" valeur={d.dossiers_ouverts} />
          </div>

          <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 8 }}
                  onClick={() => setForm({ ...d })}>Modifier</button>
        </div>
      ))}

      {form ? (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
            {form.id ? "Modifier le centre" : "Nouveau centre"}
          </div>
          <label style={S.label}>Nom</label>
          <input style={S.input} value={form.nom || ""} placeholder="Dépôt de Namur"
                 onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <label style={S.label}>Adresse</label>
          <input style={S.input} value={form.adresse || ""}
                 onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: "0 0 34%" }}>
              <label style={S.label}>Code postal</label>
              <input style={S.input} value={form.code_postal || ""} inputMode="numeric"
                     onChange={(e) => setForm({ ...form, code_postal: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Ville</label>
              <input style={S.input} value={form.ville || ""}
                     onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            </div>
          </div>
          <label style={S.label}>Téléphone</label>
          <input style={S.input} value={form.tel || ""} inputMode="tel"
                 onChange={(e) => setForm({ ...form, tel: e.target.value })} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12,
                          fontSize: 13, color: C.encre, cursor: "pointer" }}>
            <input type="checkbox" checked={form.actif !== false}
                   onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
            Centre en activité
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
            <button style={S.boutonLien} onClick={() => setForm(null)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div style={{ margin: "0 16px 12px" }}>
          <button style={S.boutonPlein} onClick={() => setForm({ actif: true })}>
            + Ajouter un centre
          </button>
        </div>
      )}
      <div style={{ height: 30 }} />
    </div>
  );
}

function Compteur({ label, valeur }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em",
                    color: C.fantome }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.encre, marginTop: 2 }}>
        {valeur ?? 0}
      </div>
    </div>
  );
}
