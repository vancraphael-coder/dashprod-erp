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
import { rapportHebdo } from "../lib/adaptateur.js";
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
                            background: "#FFFBEB", border: "1px solid #FDE68A",
                            fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>
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
