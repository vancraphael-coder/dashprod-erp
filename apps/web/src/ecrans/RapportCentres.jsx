// =============================================================================
// COMPTE RENDU HEBDOMADAIRE — un clic, et la maison mère sait où en est chaque
// centre.
//
// Le contenu est choisi pour être ACTIONNABLE : pas un mur de chiffres, mais ce
// sur quoi on peut décider lundi matin — l'activité de la semaine, les moyens
// mobilisés, le remplissage du stockage, et les points qui clochent.
//
// Le chiffre d'affaires n'apparaît QUE pour la maison mère : la base ne le
// renvoie même pas aux responsables de centre.
// =============================================================================

import React, { useEffect, useState } from "react";
import { rapportHebdo, centreRapports, centreRapportEcrire } from "../lib/adaptateur.js";
import { CADENCES, fenetre, rapportTexteValide, historiqueRange }
  from "@domaine/organisation/rapport-centre.js";
import { C, S, euros } from "../lib/theme.jsx";

export default function RapportCentres({ retour }) {
  const [semaine, setSemaine] = useState(null);   // null = semaine en cours
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [chargement, setChargement] = useState(false);

  async function charger(s) {
    setChargement(true); setErr(null);
    try { setData(await rapportHebdo(null, s)); }
    catch (e) { setErr(e.message); }
    finally { setChargement(false); }
  }
  useEffect(() => { charger(semaine); }, [semaine]);

  function decaler(semaines) {
    const base = data?.debut ? new Date(`${data.debut}T00:00:00`) : new Date();
    base.setDate(base.getDate() + semaines * 7);
    setSemaine(base.toISOString().slice(0, 10));
  }

  const centres = data?.centres || [];

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Compte</button>
        <div style={S.titre}>Compte rendu hebdomadaire</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {data ? `Du ${jour(data.debut)} au ${jour(data.fin)}` : "Chargement…"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px",
                    alignItems: "center" }}>
        <button style={{ ...S.boutonLien }} onClick={() => decaler(-1)}>← Semaine</button>
        <button style={{ ...S.boutonLien, marginLeft: "auto" }}
                onClick={() => setSemaine(null)}>Cette semaine</button>
        <button style={{ ...S.boutonLien }} onClick={() => decaler(1)}>Semaine →</button>
      </div>

      {err && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{err}</div>}
      {chargement && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}

      {!chargement && centres.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
          Aucun centre actif à rapporter.
        </div>
      )}

      {centres.map((c) => {
        const alerte = Number(c.chantiers_sans_equipe) > 0;
        return (
          <div key={c.centre_id} style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.encre }}>
                {c.centre}
              </span>
              {data.sensible && c.facture_centimes != null && (
                <span style={{ fontSize: 14, fontWeight: 800, color: C.vert }}>
                  {euros(c.facture_centimes)}
                </span>
              )}
            </div>

            <Bloc titre="La semaine">
              <Chiffre label="Chantiers" valeur={c.chantiers} />
              <Chiffre label="Dossiers créés" valeur={c.dossiers_crees} />
              <Chiffre label="Effectués" valeur={c.effectues} />
              <Chiffre label="En cours" valeur={c.dossiers_ouverts} />
            </Bloc>

            <Bloc titre="Les moyens">
              <Chiffre label="Membres" valeur={c.membres} />
              <Chiffre label="Véhicules" valeur={c.vehicules} />
            </Bloc>

            {Number(c.boxes_total) > 0 && (
              <Bloc titre="Stockage">
                <Chiffre label="Boxes" valeur={c.boxes_total} />
                <Chiffre label="Occupés" valeur={c.boxes_occupes} />
                <Chiffre label="Remplissage"
                  valeur={`${Math.round((c.boxes_occupes / c.boxes_total) * 100)} %`} />
              </Bloc>
            )}

            {/* Ce qui mérite un coup de fil, pas juste un chiffre de plus. */}
            {alerte && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10,
                            background: C.teinteAmbre, border: `1px solid ${C.filetAmbre}`,
                            fontSize: 12.5, color: C.encreAmbre, lineHeight: 1.5 }}>
                {c.chantiers_sans_equipe} chantier
                {c.chantiers_sans_equipe > 1 ? "s" : ""} sans équipe affectée
                cette semaine.
              </div>
            )}
            {!alerte && (
              <div style={{ marginTop: 10, fontSize: 12, color: C.vert,
                            fontWeight: 600 }}>
                ✓ Tous les chantiers de la semaine ont une équipe.
              </div>
            )}

            {/* Le rapport TEXTE tri-cadence + historique. Vit SOUS les KPI, ne
                les modifie pas : les chiffres au-dessus restent la carte de
                Raphaël, ceci est en plus. */}
            <RapportTexte centreId={c.centre_id} peutRediger={data.sensible} />
          </div>
        );
      })}

      {data && !data.sensible && (
        <div style={{ margin: "0 16px 12px", fontSize: 11.5, color: C.fantome,
                      lineHeight: 1.5 }}>
          Les montants facturés ne figurent pas dans votre version : ils sont
          réservés à la maison mère.
        </div>
      )}
      <div style={{ height: 30 }} />
    </div>
  );
}

function RapportTexte({ centreId, peutRediger }) {
  const [cadence, setCadence] = useState("jour");
  const [texte, setTexte] = useState("");
  const [histo, setHisto] = useState([]);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ouvert, setOuvert] = useState(false);

  async function charger() {
    try { setHisto(historiqueRange(await centreRapports(centreId))); }
    catch { setHisto([]); }
  }
  useEffect(() => { if (ouvert) charger(); }, [ouvert, centreId]);

  async function enregistrer() {
    setErr(null); setMsg(null);
    const v = rapportTexteValide(texte);
    if (!v.ok) { setErr(v.message); return; }
    const f = fenetre(cadence, new Date());
    try {
      await centreRapportEcrire(centreId, cadence, f.debut, f.fin, v.texte);
      setTexte(""); setMsg("Rapport enregistré.");
      await charger();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.doux}` }}>
      <button onClick={() => setOuvert((o) => !o)}
        style={{ ...S.boutonLien, paddingLeft: 0, fontWeight: 700 }}>
        {ouvert ? "▾ " : "▸ "}Rapport du responsable
      </button>

      {ouvert && (
        <div style={{ marginTop: 8 }}>
          {peutRediger && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {CADENCES.map((c) => (
                  <button key={c.cle} onClick={() => setCadence(c.cle)}
                    style={{
                      ...S.boutonLien, padding: "4px 10px", borderRadius: 8,
                      fontSize: 12, fontWeight: cadence === c.cle ? 800 : 500,
                      background: cadence === c.cle ? C.teinte : "transparent",
                      color: cadence === c.cle ? C.encre : C.muet,
                    }}>{c.titre}</button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.fantome }}>
                  {fenetre(cadence, new Date()).titre}
                </span>
              </div>
              <textarea value={texte} onChange={(e) => setTexte(e.target.value)}
                placeholder="Ce qui s'est passé sur la période…"
                style={{ ...S.input, minHeight: 64, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
                {msg && <span style={{ fontSize: 12, color: C.vert }}>{msg}</span>}
                {err && <span style={{ fontSize: 12, color: C.rouge }}>{err}</span>}
              </div>
            </>
          )}

          {/* L'historique — toutes cadences confondues, du plus récent. */}
          {histo.length === 0 ? (
            <div style={{ marginTop: 8, fontSize: 12, color: C.fantome }}>
              Aucun rapport pour l'instant.
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              {histo.map((h) => (
                <div key={h.id} style={{ marginTop: 8, paddingTop: 8,
                      borderTop: `1px solid ${C.doux}` }}>
                  <div style={{ fontSize: 11, color: C.fantome, marginBottom: 2 }}>
                    {LIBELLE_CADENCE[h.cadence] || h.cadence}
                    {" · "}{jour(h.debut)}
                    {h.redige_par ? ` · ${h.redige_par}` : ""}
                  </div>
                  <div style={{ fontSize: 13, color: C.encre, whiteSpace: "pre-wrap",
                                lineHeight: 1.5 }}>{h.texte}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const LIBELLE_CADENCE = { jour: "Jour", semaine: "Semaine", mois: "Mois" };

function Bloc({ titre, children }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.doux}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: ".06em", color: C.fantome, marginBottom: 6 }}>
        {titre}
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Chiffre({ label, valeur }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.encre }}>{valeur ?? 0}</div>
      <div style={{ fontSize: 10.5, color: C.muet, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function jour(iso) {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-BE",
      { day: "2-digit", month: "long" });
  } catch { return iso; }
}
