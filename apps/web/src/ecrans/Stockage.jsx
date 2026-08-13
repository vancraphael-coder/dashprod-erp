// =============================================================================
// STOCKAGE — garde-meubles et centres logistiques (offre Pro).
//
// Deux pages, parce qu'on ne vend pas la même chose :
//
//   ZONES — une surface louée. Deux sous-pages : au sol (plancher simple) et
//           au sol avec étages (rayonnages superposés). Le tarif et la période
//           sont NÉGOCIÉS au contrat.
//
//   BOXES — des unités numérotées, de volume connu, à un niveau précis. Le prix
//           vient du barème de l'entreprise : on applique, on ne négocie pas.
//
// Tout est filtré par centre : un gestionnaire de dépôt ne voit que le sien.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  depots, stockZones, stockBoxes, definirZone, definirBox, supprimerStock,
  obtenirParametresPrix, axesStockage,
} from "../lib/adaptateur.js";
import {
  TYPES_ZONE, volumeZone, surfaceExploitable, tauxOccupation,
  montantPeriodeBox,
} from "@domaine/stocks/stockage.js";
import { repereDe, repereVersChamps } from "@domaine/stocks/repere.js";
import { BadgeRepere, SaisieRepere, MiniPlan } from "../composants/Repere.jsx";
import { C, S, euros } from "../lib/theme.jsx";

const PAGES = [["zones", "Zones"], ["boxes", "Boxes"]];
const SOUS_ZONES = [["sol", "Au sol"], ["sol_etages", "Au sol + étages"]];

export default function Stockage({ retour }) {
  const [page, setPage] = useState("zones");
  const [centres, setCentres] = useState([]);
  const [depotId, setDepotId] = useState(null);
  // Les axes sont chargés UNE fois ici et descendus : ils ne changent pas
  // d'une zone à l'autre, et deux écrans qui les rechargent chacun de leur
  // côté finiraient par en afficher deux versions le temps d'un aller-retour.
  const [axesOrg, setAxesOrg] = useState(null);

  useEffect(() => {
    depots().then((d) => {
      setCentres(d);
      if (d.length && !depotId) setDepotId(d[0].id);
    }).catch(() => setCentres([]));
    // Un échec n'est pas bloquant : le domaine retombe sur allée/rangée/étage.
    axesStockage().then(setAxesOrg).catch(() => setAxesOrg(null));
  }, []);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Paramètres</button>
        <div style={S.titre}>Stockage</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Vos zones et vos boxes, et qui les occupe.
        </div>
      </div>

      {/* Le centre concerné — masqué s'il n'y en a qu'un. */}
      {centres.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto",
                      padding: "0 16px 12px" }}>
          {centres.map((d) => (
            <button key={d.id} onClick={() => setDepotId(d.id)} style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 999, cursor: "pointer",
              fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${depotId === d.id ? C.bleu : C.bord}`,
              background: depotId === d.id ? C.bleuClair : C.blanc,
              color: depotId === d.id ? C.bleu : C.muet }}>
              {d.nom}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
        {PAGES.map(([cle, lib]) => (
          <button key={cle} onClick={() => setPage(cle)} style={{
            flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer",
            fontSize: 13.5, fontWeight: 700,
            border: `1.5px solid ${page === cle ? C.bleu : C.bord}`,
            background: page === cle ? C.bleuClair : C.blanc,
            color: page === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      {centres.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Créez d'abord un centre logistique depuis Compte → Centres logistiques.
        </div>
      )}

      {centres.length > 0 && page === "zones"
        && <PageZones depotId={depotId} axesOrg={axesOrg} />}
      {centres.length > 0 && page === "boxes"
        && <PageBoxes depotId={depotId} axesOrg={axesOrg} />}
    </div>
  );
}

/* ── Page ZONES ──────────────────────────────────────────────────────────── */

function PageZones({ depotId, axesOrg }) {
  const [sous, setSous] = useState("sol");
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  async function recharger() {
    try { setListe(await stockZones(depotId)); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { recharger(); }, [depotId]);

  const filtrees = (liste || []).filter((z) => z.type === sous);

  async function enregistrer() {
    setErr(null);
    try {
      await definirZone({ ...form, centre_id: depotId, type: sous });
      setForm(null); await recharger();
    } catch (e) { setErr(e.message); }
  }

  async function supprimer(id) {
    try {
      const r = await supprimerStock("zone", id);
      if (!r.ok) setErr(r.message); else await recharger();
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
        {SOUS_ZONES.map(([cle, lib]) => (
          <button key={cle} onClick={() => { setSous(cle); setForm(null); }} style={{
            flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
            fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${sous === cle ? C.bleu : C.bord}`,
            background: sous === cle ? C.bleuClair : "transparent",
            color: sous === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                    lineHeight: 1.5 }}>
        {TYPES_ZONE.find((t) => t.cle === sous)?.resume}
        {" "}Le tarif et la période se négocient au contrat.
      </div>

      {err && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{err}</div>}
      {liste == null && <Attente />}
      {liste && filtrees.length === 0 && !form && <Vide texte="Aucune zone de ce type." />}

      {filtrees.map((z) => (
        <div key={z.id} style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>{z.nom}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BadgeRepere entite={z} genre="zone" reglageAxes={axesOrg} />
              <Pastille occupe={z.occupee} client={z.client} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            <Mesure label="Surface au sol" valeur={`${z.surface_m2 ?? "—"} m²`} />
            {z.type === "sol_etages" && (
              <>
                <Mesure label="Niveaux" valeur={z.niveaux} />
                <Mesure label="Surface exploitable"
                        valeur={`${surfaceExploitable(z)} m²`} accent />
              </>
            )}
            <Mesure label="Volume" valeur={`${volumeZone(z)} m³`} />
            {z.boxes > 0 && <Mesure label="Boxes" valeur={z.boxes} />}
          </div>
          {z.remarque && (
            <div style={{ fontSize: 12, color: C.muet, marginTop: 8 }}>{z.remarque}</div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                    onClick={() => setForm({ ...z })}>Modifier</button>
            <button style={{ ...S.boutonLien, color: C.rouge }}
                    onClick={() => supprimer(z.id)}>Supprimer</button>
          </div>
        </div>
      ))}

      {form ? (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
            {form.id ? "Modifier la zone" : "Nouvelle zone"}
          </div>
          <label style={S.label}>Nom</label>
          <input style={S.input} value={form.nom || ""}
                 placeholder="Zone A, Allée 2…"
                 onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Surface (m²)</label>
              <input style={S.input} type="number" inputMode="decimal"
                     value={form.surface_m2 ?? ""}
                     onChange={(e) => setForm({ ...form, surface_m2: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Hauteur (m)</label>
              <input style={S.input} type="number" inputMode="decimal"
                     value={form.hauteur_m ?? ""}
                     onChange={(e) => setForm({ ...form, hauteur_m: e.target.value })} />
            </div>
            {sous === "sol_etages" && (
              <div style={{ flex: "0 0 30%" }}>
                <label style={S.label}>Niveaux</label>
                <input style={S.input} type="number" min={1}
                       value={form.niveaux ?? 1}
                       onChange={(e) => setForm({ ...form, niveaux: e.target.value })} />
              </div>
            )}
          </div>
          <label style={S.label}>Remarque</label>
          <input style={S.input} value={form.remarque || ""}
                 onChange={(e) => setForm({ ...form, remarque: e.target.value })} />

          <div style={{ marginTop: 12, paddingTop: 12,
                        borderTop: `1px solid ${C.bord}` }}>
            <SaisieRepere
              genre="zone" reglageAxes={axesOrg}
              valeur={repereDe(form, "zone")}
              onChange={(r) => setForm({ ...form, ...repereVersChamps(r, "zone") })} />
            <MiniPlan entites={filtrees.filter((z) => z.id !== form.id)}
                      genre="zone" courant={form} reglageAxes={axesOrg} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
            <button style={S.boutonLien} onClick={() => setForm(null)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div style={{ margin: "0 16px 12px" }}>
          <button style={S.boutonPlein}
                  onClick={() => setForm({ niveaux: sous === "sol_etages" ? 2 : 1 })}>
            + Ajouter une zone {sous === "sol" ? "au sol" : "à étages"}
          </button>
        </div>
      )}
    </>
  );
}

/* ── Page BOXES ──────────────────────────────────────────────────────────── */

function PageBoxes({ depotId, axesOrg }) {
  const [liste, setListe] = useState(null);
  const [zones, setZones] = useState([]);
  const [bareme, setBareme] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  async function recharger() {
    try { setListe(await stockBoxes(depotId)); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => {
    recharger();
    stockZones(depotId).then(setZones).catch(() => {});
    obtenirParametresPrix().then((p) => setBareme(p?.stockage_boxes || []))
      .catch(() => {});
  }, [depotId]);

  const occ = useMemo(() => tauxOccupation(liste || []), [liste]);
  // Les boxes se lisent par niveau : c'est ainsi qu'on les retrouve au dépôt.
  const parNiveau = useMemo(() => {
    const g = new Map();
    for (const b of liste || []) g.set(b.niveau, [...(g.get(b.niveau) || []), b]);
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [liste]);

  async function enregistrer() {
    setErr(null);
    try {
      await definirBox({ ...form, centre_id: depotId });
      setForm(null); await recharger();
    } catch (e) { setErr(e.message); }
  }
  async function supprimer(id) {
    try {
      const r = await supprimerStock("box", id);
      if (!r.ok) setErr(r.message); else await recharger();
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div style={S.carte}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Mesure label="Boxes" valeur={occ.total} />
          <Mesure label="Occupés" valeur={occ.occupes} accent />
          <Mesure label="Libres" valeur={occ.libres} />
          <Mesure label="Occupation" valeur={`${occ.taux} %`} />
        </div>
      </div>

      <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                    lineHeight: 1.5 }}>
        Chaque box porte son numéro, son volume et son niveau. Le prix vient du
        barème de l'entreprise (Paramètres → Barèmes).
      </div>

      {err && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{err}</div>}
      {liste == null && <Attente />}
      {liste && liste.length === 0 && !form && <Vide texte="Aucun box." />}

      {parNiveau.map(([niveau, boxes]) => (
        <div key={niveau} style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>
            {niveau === 0 ? "Rez-de-chaussée" : `Niveau ${niveau}`}
          </label>
          {boxes.map((b) => {
            const prix = montantPeriodeBox(bareme, Number(b.volume_m3), "mensuel");
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10,
                     padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13,
                               fontWeight: 800, color: C.encre, minWidth: 62 }}>
                  {b.numero}
                </span>
                <span style={{ fontSize: 12.5, color: C.muet, minWidth: 58 }}>
                  {b.volume_m3} m³
                </span>
                <span style={{ flex: 1, fontSize: 12, color: C.muet,
                               display: "flex", alignItems: "center", gap: 6 }}>
                  {b.zone || ""}
                  <BadgeRepere entite={b} genre="box" reglageAxes={axesOrg} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 700,
                  color: prix.hors_bareme ? C.ambre : C.encre, whiteSpace: "nowrap" }}>
                  {prix.hors_bareme ? "hors barème" : `${euros(prix.centimes)}/mois`}
                </span>
                <Pastille occupe={b.occupe} client={b.client} compact />
                <button style={{ ...S.boutonLien, padding: 4 }}
                        onClick={() => setForm({ ...b })}>✎</button>
                <button style={{ ...S.boutonLien, padding: 4, color: C.rouge }}
                        onClick={() => supprimer(b.id)}>✕</button>
              </div>
            );
          })}
        </div>
      ))}

      {form ? (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
            {form.id ? "Modifier le box" : "Nouveau box"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Numéro</label>
              <input style={S.input} value={form.numero || ""} placeholder="B-101"
                     onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Volume (m³)</label>
              <input style={S.input} type="number" inputMode="decimal"
                     value={form.volume_m3 ?? ""}
                     onChange={(e) => setForm({ ...form, volume_m3: e.target.value })} />
            </div>
          </div>
          {/* Le niveau n'a PAS de champ à part : c'est le z du repère. Deux
              saisies pour la même colonne divergeraient à la première frappe. */}
          <label style={S.label}>Zone (facultatif)</label>
          <select style={S.input} value={form.zone_id || ""}
                  onChange={(e) => setForm({ ...form, zone_id: e.target.value || null })}>
            <option value="">Aucune</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
          </select>
          {form.volume_m3 > 0 && (
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8 }}>
              Au barème : {(() => {
                const p = montantPeriodeBox(bareme, Number(form.volume_m3), "mensuel");
                return p.hors_bareme
                  ? "aucune tranche ne couvre ce volume — complétez le barème."
                  : `${euros(p.centimes)} par mois.`;
              })()}
            </div>
          )}

          <div style={{ marginTop: 12, paddingTop: 12,
                        borderTop: `1px solid ${C.bord}` }}>
            <SaisieRepere
              genre="box" reglageAxes={axesOrg}
              valeur={repereDe(form, "box")}
              onChange={(r) => setForm({ ...form, ...repereVersChamps(r, "box") })} />
            <MiniPlan entites={(liste || []).filter((b) => b.id !== form.id)}
                      genre="box" courant={form} reglageAxes={axesOrg} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
            <button style={S.boutonLien} onClick={() => setForm(null)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div style={{ margin: "0 16px 12px" }}>
          <button style={S.boutonPlein} onClick={() => setForm({ niveau: 0 })}>
            + Ajouter un box
          </button>
        </div>
      )}
    </>
  );
}

/* ── Éléments partagés ───────────────────────────────────────────────────── */

function Mesure({ label, valeur, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em",
                    color: C.fantome }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800,
                    color: accent ? C.bleu : C.encre, marginTop: 2 }}>{valeur}</div>
    </div>
  );
}

function Pastille({ occupe, client, compact }) {
  return (
    <span style={{ fontSize: compact ? 10 : 11, fontWeight: 700,
      whiteSpace: "nowrap", borderRadius: 999, padding: compact ? "2px 7px" : "3px 9px",
      color: occupe ? "#065F46" : C.muet,
      background: occupe ? "#ECFDF5" : "transparent",
      border: `1px solid ${occupe ? "#A7F3D0" : C.bord}` }}>
      {occupe ? (compact ? "occupé" : `Occupé — ${client}`) : "libre"}
    </span>
  );
}

const Attente = () => (
  <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
    Chargement…
  </div>
);
const Vide = ({ texte }) => (
  <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
    {texte}
  </div>
);
