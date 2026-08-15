// =============================================================================
// Les blocs du dossier propres à sa NATURE.
//
// Un déménagement, une sous-traitance et un lift ne se saisissent pas de la
// même façon. Plutôt que de gonfler Dossier.jsx de conditions, chaque nature
// a son bloc ici, et le dossier n'affiche que celui qui la concerne.
//
// Le chiffrage passe par les modules purs (`@domaine/chiffrage/...`) : cet
// écran saisit et affiche, il ne calcule rien lui-même.
// =============================================================================

import React, { useEffect, useState } from "react";
import { nature as natureDe, comporte } from "@domaine/commercial/natures.js";
import { chiffrer as chiffrerST, tauxHoraireEffectif }
  from "@domaine/chiffrage/sous-traitance.js";
import { chiffrer as chiffrerLift, formaterHeures }
  from "@domaine/chiffrage/lift.js";
import { obtenirParametresPrix, depots } from "../lib/adaptateur.js";
import { C, S, euros } from "../lib/theme.jsx";

/**
 * Le bandeau qui rappelle ce qu'on est en train de vendre. Sans lui, un
 * dossier de lift et un déménagement se ressemblent trop — et on découvre
 * l'erreur à la facturation.
 */
export function BandeauNature({ cle }) {
  const n = natureDe(cle);
  if (!n || cle === "demenagement") return null;   // le cas par défaut se tait
  return (
    <div style={{ ...S.carte, borderLeft: `3px solid ${C.bleu}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        {n.titre}
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 3, lineHeight: 1.5 }}>
        {n.resume}
      </div>
      {!comporte(cle, "releve") && (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
          Ni relevé de meubles, ni emballage — la base le refuserait.
        </div>
      )}
    </div>
  );
}

/* ── Sous-traitance ──────────────────────────────────────────────────────── */

export function BlocSousTraitance({ valeur, onChange }) {
  const [grille, setGrille] = useState(null);
  const m = valeur || {};

  useEffect(() => {
    obtenirParametresPrix().then((p) => setGrille(p?.sous_traitance || {}))
      .catch(() => setGrille({}));
  }, []);

  const r = chiffrerST(m, grille || {});
  const taux = tauxHoraireEffectif(m, grille || {});

  function maj(cle, v) { onChange({ ...m, [cle]: v === "" ? null : Number(v) }); }

  return (
    <div style={S.carte}>
      <Titre>Prestation</Titre>

      <div style={{ display: "flex", gap: 8 }}>
        <Petit label="Hommes" value={m.hommes} onChange={(v) => maj("hommes", v)} />
        <Petit label="Heures" value={m.heures} onChange={(v) => maj("heures", v)} pas="0.5" />
        <Petit label="Camions" value={m.camions} onChange={(v) => maj("camions", v)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Petit label="Jours" value={m.jours} onChange={(v) => maj("jours", v)} />
        <Petit label="Kilomètres" value={m.km} onChange={(v) => maj("km", v)} />
      </div>

      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8 }}>
        Le camion n'est compté que si c'est vous qui le fournissez.
      </div>

      {!r.complet ? (
        <Avertir>Indiquez au moins un homme : sans main-d'œuvre, il n'y a pas
          de prestation à facturer.</Avertir>
      ) : (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`,
                      paddingTop: 10 }}>
          {r.heures_facturees !== Math.ceil(m.heures || 0) && (
            <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6 }}>
              {r.heures_facturees} h facturées (minimum contractuel).
            </div>
          )}
          {r.lignes.map((l) => (
            <Ligne key={l.cle} g={l.libelle} d={euros(l.centimes)} />
          ))}
          {r.remise_centimes > 0 && (
            <Ligne g={`Remise négociée ${r.remise_pct} %`}
                   d={`− ${euros(r.remise_centimes)}`} />
          )}
          <div style={{ display: "flex", justifyContent: "space-between",
                        fontWeight: 800, fontSize: 15, marginTop: 6,
                        borderTop: `1px solid ${C.bord}`, paddingTop: 6 }}>
            <span>Total HTVA</span><span>{euros(r.total_centimes)}</span>
          </div>
          {taux != null && (
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 4 }}>
              Soit {euros(taux)} de l'heure-homme, remise comprise.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Lift ────────────────────────────────────────────────────────────────── */

export function BlocLift({ valeur, onChange, centreId }) {
  const [reglages, setReglages] = useState(null);
  const [supp, setSupp] = useState(null);
  const [centres, setCentres] = useState([]);
  const m = valeur || {};

  useEffect(() => {
    Promise.all([obtenirParametresPrix().catch(() => ({})),
                 depots().catch(() => [])])
      .then(([p, cs]) => {
        setCentres(cs);
        setSupp(p?.lift_supplements || {});
        setReglages({
          maisonMere: p?.lift_couronnes || [],
          parCentre: Object.fromEntries(
            (cs || []).map((c) => [c.id, c.tarifs?.lift_couronnes || []])),
        });
      });
  }, []);

  const centreRetenu = m.centreId || centreId || centres[0]?.id || null;
  const r = reglages ? chiffrerLift(m, reglages, centreRetenu, supp) : null;

  const ORIGINE = {
    centre: "grille propre à ce centre",
    maison_mere: "grille de la maison mère",
    defaut: "grille par défaut — aucune n'est encore réglée",
  };

  function maj(cle, v) {
    onChange({ ...m, [cle]: v === "" ? null : Number(v) });
  }

  return (
    <div style={S.carte}>
      <Titre>Course</Titre>

      {centres.length > 1 && (
        <>
          <label style={S.label}>Centre de départ</label>
          <select style={S.input} value={centreRetenu || ""}
                  onChange={(e) => onChange({ ...m, centreId: e.target.value })}>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Distance (km)</label>
          <input style={{ ...S.input, textAlign: "center" }} type="number"
                 min={0} step="0.1" value={m.km ?? ""}
                 onChange={(e) => maj("km", e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Temps sur place (h)</label>
          <input style={{ ...S.input, textAlign: "center" }} type="number"
                 min={0} step="0.25" value={m.heures ?? ""}
                 onChange={(e) => maj("heures", e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Hommes en plus</label>
          <input style={{ ...S.input, textAlign: "center" }} type="number"
                 min={0} value={m.hommes_supp ?? ""}
                 onChange={(e) => maj("hommes_supp", e.target.value)} />
        </div>
      </div>

      {r && !r.grille_absente && r.couronne && (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
          Cette couronne comprend {formaterHeures(r.heures_incluses)} sur place.
          Un homme en plus reprend le temps sans doubler le prix.
        </div>
      )}

      {r && r.grille_absente && (
        <Avertir>Aucune couronne n'est réglée. Renseignez-les dans
          Paramètres → Services → Lift.</Avertir>
      )}

      {r && !r.grille_absente && m.km != null && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`,
                      paddingTop: 10 }}>
          {r.lignes.map((l) => (
            <Ligne key={l.cle} g={l.libelle} d={euros(l.centimes)} />
          ))}
          <div style={{ display: "flex", justifyContent: "space-between",
                        fontWeight: 800, fontSize: 15, marginTop: 6,
                        borderTop: `1px solid ${C.bord}`, paddingTop: 6 }}>
            <span>Total HTVA</span><span>{euros(r.total_centimes)}</span>
          </div>
          {/* D'où vient la grille : indispensable quand un client discute. */}
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 4 }}>
            {ORIGINE[r.origine]}
            {r.hors_couronne && r.km_supplementaires > 0
              ? ` · ${r.km_supplementaires} km au-delà du dernier anneau` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Petits éléments ─────────────────────────────────────────────────────── */

const Titre = ({ children }) => (
  <div style={{ fontSize: 11.5, fontWeight: 800, color: C.muet, marginBottom: 8,
                textTransform: "uppercase", letterSpacing: ".03em" }}>{children}</div>
);

const Ligne = ({ g, d }) => (
  <div style={{ display: "flex", justifyContent: "space-between",
                fontSize: 13, lineHeight: 1.7 }}>
    <span style={{ color: C.muet }}>{g}</span>
    <span style={{ color: C.encre }}>{d}</span>
  </div>
);

const Avertir = ({ children }) => (
  <div style={{ fontSize: 12, color: C.muet, marginTop: 10, padding: "9px 11px",
                borderRadius: 10, background: C.doux, lineHeight: 1.5 }}>
    {children}
  </div>
);

function Petit({ label, value, onChange, pas }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={S.label}>{label}</label>
      <input style={{ ...S.input, textAlign: "center" }} type="number" min={0}
             step={pas || "1"} value={value ?? ""}
             onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
