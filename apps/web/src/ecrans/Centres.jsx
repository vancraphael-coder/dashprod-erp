// =============================================================================
// CENTRES LOGISTIQUES — la vue de la maison mère.
//
// C'est ici, et nulle part ailleurs, qu'on décide QUI travaille OÙ. Un
// responsable de centre pilote son exploitation ; il ne se choisit pas ses
// collègues et ne se donne pas de véhicules. La base refuse de toute façon —
// cet écran ne fait que rendre la règle lisible.
//
// Trois onglets : les centres, la répartition des membres, celle des véhicules.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  depots, definirDepot, archiverDepot, repartitionCentres,
  affecterMembreCentre, affecterAuCentre,
} from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const ONGLETS = [["centres", "Centres"], ["membres", "Membres"],
                 ["vehicules", "Véhicules"]];

export default function Centres({ retour, peutGererCentres = false }) {
  const [onglet, setOnglet] = useState("centres");
  const [liste, setListe] = useState(null);
  const [rep, setRep] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [voirArchives, setVoirArchives] = useState(false);

  async function recharger() {
    try { setListe(await depots(voirArchives)); }
    catch (e) { setErr(e.message); setListe([]); }
    try { setRep(await repartitionCentres()); }
    catch { setRep(null); }   // un responsable de centre n'y a pas droit
  }
  useEffect(() => { recharger(); }, [voirArchives]);

  /**
   * Archiver n'est pas « décocher actif ». La base refuse tant que le centre
   * porte de l'exploitation, et son message dit précisément quoi déplacer —
   * on le remonte tel quel plutôt que de le reformuler en « impossible ».
   */
  async function archiver(d, oui) {
    setErr(null); setMsg(null);
    if (oui && !window.confirm(
      `Archiver « ${d.nom} » ?\n\nLe centre sortira des listes et des `
      + `sélecteurs. Vous pourrez le réactiver à tout moment.`)) return;
    try {
      await archiverDepot(d.id, oui);
      setMsg(oui ? `« ${d.nom} » est archivé.` : `« ${d.nom} » est réactivé.`);
      await recharger();
    } catch (e) { setErr(e.message); }
  }

  async function enregistrer() {
    setErr(null);
    if (!form.nom?.trim()) { setErr("Le nom du centre est requis."); return; }
    try { await definirDepot(form); setForm(null); await recharger(); }
    catch (e) { setErr(e.message); }
  }

  async function affecterMembre(membre, centreId, responsable) {
    setErr(null); setMsg(null);
    try {
      await affecterMembreCentre(membre.id, centreId, responsable);
      setMsg(`${membre.nom} — affectation enregistrée.`);
      await recharger();
    } catch (e) { setErr(e.message); }
  }

  // La vue de RÉPARTITION (qui est où) n'existe qu'au siège, et seulement
  // quand la base l'autorise. Mais AJOUTER un centre ne doit PAS en dépendre :
  // sinon on ne peut jamais créer le PREMIER (cercle vicieux — la répartition
  // n'apparaît qu'une fois qu'on est déjà multi-centres). Le droit d'ajouter
  // vient de la capacité de gérer les référentiels, transmise par l'app.
  const maisonMere = rep != null;   // vue de répartition
  const peutGerer = peutGererCentres;  // droit d'ajouter / modifier un centre

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Compte</button>
        <div style={S.titre}>Centres logistiques</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {maisonMere
            ? "Vous voyez tous les centres et répartissez les moyens."
            : "Vous voyez votre centre."}
        </div>
      </div>

      {maisonMere && (
        <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
          {ONGLETS.map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 11, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? C.bleuClair : C.blanc,
              color: onglet === cle ? C.bleu : C.muet }}>{lib}</button>
          ))}
        </div>
      )}

      {err && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{err}</div>}
      {msg && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.vert }}>{msg}</div>}

      {/* ── Les centres ──────────────────────────────────────────────────── */}
      {(!maisonMere || onglet === "centres") && (
        <>
          {liste == null && <Attente />}
          {liste && liste.length === 0 && !form && (
            <div style={S.carte}>
              <div style={{ fontSize: 13, color: C.encre, lineHeight: 1.55 }}>
                Aucun centre déclaré — votre entreprise fonctionne comme un site
                unique.
              </div>
              <div style={{ fontSize: 12, color: C.muet, marginTop: 6, lineHeight: 1.5 }}>
                Créez un centre le jour où vous ouvrez un second dépôt : vous
                pourrez alors y rattacher équipes, véhicules et dossiers, et
                nommer un responsable qui ne verra que lui.
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
                {d.le_mien && <Etiq texte="votre centre" />}
                {d.archive_le
                  ? <Etiq texte="archivé" sourd />
                  : (!d.actif && <span style={{ fontSize: 10.5, color: C.muet }}>inactif</span>)}
              </div>
              {(d.adresse || d.ville) && (
                <div style={{ fontSize: 12.5, color: C.muet, marginTop: 3 }}>
                  {[d.adresse, [d.code_postal, d.ville].filter(Boolean).join(" ")]
                    .filter(Boolean).join(" · ")}
                </div>
              )}
              {(d.responsables || []).length > 0 && (
                <div style={{ fontSize: 12.5, color: C.encre, marginTop: 6 }}>
                  Responsable{d.responsables.length > 1 ? "s" : ""} :{" "}
                  <b>{d.responsables.join(", ")}</b>
                </div>
              )}
              <div style={{ display: "flex", gap: 18, marginTop: 10, paddingTop: 10,
                            borderTop: `1px solid ${C.doux}` }}>
                <Compteur label="Membres" valeur={d.membres} />
                <Compteur label="Véhicules" valeur={d.vehicules} />
                <Compteur label="Dossiers ouverts" valeur={d.dossiers_ouverts} />
              </div>
              {peutGerer && (
                <div style={{ display: "flex", gap: 14, marginTop: 8,
                              alignItems: "center", flexWrap: "wrap" }}>
                  <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                          onClick={() => setForm({ ...d })}>Modifier</button>
                  {d.archive_le ? (
                    <button style={S.boutonLien}
                            onClick={() => archiver(d, false)}>Réactiver</button>
                  ) : (
                    <button style={{ ...S.boutonLien, color: C.rouge }}
                            onClick={() => archiver(d, true)}>Archiver</button>
                  )}
                </div>
              )}
            </div>
          ))}

          {peutGerer && (form ? (
            <div style={S.carte}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
                {form.id ? "Modifier le centre" : "Nouveau centre"}
              </div>
              <label style={S.label}>Nom</label>
              <input style={S.input} value={form.nom || ""} placeholder="Centre de Namur"
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
          ))}
        </>
      )}

      {/* ── Répartition des membres ──────────────────────────────────────── */}
      {maisonMere && onglet === "membres" && (
        <>
          <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                        lineHeight: 1.5 }}>
            Qui travaille où. Un membre sans centre appartient à la maison mère et
            voit toute l'entreprise — réservez cela à la direction.
          </div>
          {(rep.membres || []).map((m) => (
            <div key={m.id} style={S.carte}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: C.encre }}>
                  {m.nom}
                </span>
                {m.responsable && <Etiq texte="responsable" />}
              </div>
              <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 2 }}>
                {(m.roles || []).join(" · ") || "—"}
              </div>
              <label style={S.label}>Centre</label>
              <select style={S.input} value={m.centre_id || ""}
                onChange={(e) => affecterMembre(m, e.target.value || null, m.responsable)}>
                <option value="">Maison mère (voit tout)</option>
                {(rep.centres || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              {m.centre_id && (
                <label style={{ display: "flex", alignItems: "center", gap: 8,
                                marginTop: 10, fontSize: 13, color: C.encre,
                                cursor: "pointer" }}>
                  <input type="checkbox" checked={m.responsable}
                         onChange={(e) => affecterMembre(m, m.centre_id, e.target.checked)} />
                  Responsable de ce centre
                </label>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── Répartition des véhicules ────────────────────────────────────── */}
      {maisonMere && onglet === "vehicules" && (
        <>
          <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                        lineHeight: 1.5 }}>
            Un véhicule appartient à un centre : il n'apparaîtra pas dans le
            planning des autres.
          </div>
          {(rep.vehicules || []).map((v) => (
            <div key={v.id} style={S.carte}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>
                {v.nom || "Véhicule"}
              </div>
              <label style={S.label}>Centre</label>
              <select style={S.input} value={v.centre_id || ""}
                onChange={async (e) => {
                  setErr(null);
                  try {
                    await affecterAuCentre("vehicule", v.id, e.target.value || null);
                    await recharger();
                  } catch (er) { setErr(er.message); }
                }}>
                <option value="">Maison mère (disponible partout)</option>
                {(rep.centres || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          ))}
        </>
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

// `sourd` : une étiquette d'état éteint (archivé). Elle ne doit pas attirer
// l'œil comme « votre centre » — c'est une mention, pas une mise en avant.
const Etiq = ({ texte, sourd = false }) => (
  <span style={{ fontSize: 10.5, fontWeight: 700,
    color: sourd ? C.muet : C.bleu,
    background: sourd ? C.doux : C.bleuClair,
    borderRadius: 999, padding: "2px 8px" }}>{texte}</span>
);

const Attente = () => (
  <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
    Chargement…
  </div>
);
