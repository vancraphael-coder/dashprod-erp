// =============================================================================
// Écran — Services (réglages). Trois blocs qui font vivre les natures :
//
//   · Sous-traitance — la grille négociée (homme/heure, camion, km, remise).
//     Par organisation : vous négociez avec un donneur d'ordre, pas par dépôt.
//   · Lift — les couronnes kilométriques. La maison mère pose la grille de
//     référence ; chaque centre peut poser la sienne et l'emporte alors.
//   · Stockage — ce que x, y et z veulent dire CHEZ VOUS, et ce qui existe
//     réellement (allées, rangées, étages).
//
// Sans cet écran, les trois modules de calcul tournaient sur leurs valeurs de
// repli sans que personne puisse les corriger.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  obtenirParametresPrix, sauverParametresPrix, depots, definirTarifsCentre,
  axesStockage, definirAxesStockage,
} from "../lib/adaptateur.js";
import { tarif as tarifST } from "@domaine/chiffrage/sous-traitance.js";
import {
  COURONNES_DEFAUT, couronnes, decrireGrille, supplements, formaterHeures,
} from "@domaine/chiffrage/lift.js";
import { axes, valeurAxe } from "@domaine/stocks/repere.js";
import { C, S, euros } from "../lib/theme.jsx";

const BLOCS = [["sous_traitance", "Sous-traitance"], ["lift", "Lift"],
               ["stockage", "Stockage"]];

export default function Services({ retour }) {
  const [bloc, setBloc] = useState("sous_traitance");
  const [params, setParams] = useState(null);
  const [centres, setCentres] = useState([]);
  const [axesOrg, setAxesOrg] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    obtenirParametresPrix().then(setParams).catch((e) => setErr(e.message));
    depots().then(setCentres).catch(() => setCentres([]));
    axesStockage().then(setAxesOrg).catch(() => setAxesOrg(null));
  }, []);

  function annonce(t) { setMsg(t); setErr(null); }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Paramètres</button>
        <div style={S.titre}>Services</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Ce qui règle la sous-traitance, le lift et le stockage.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
        {BLOCS.map(([cle, lib]) => (
          <button key={cle} onClick={() => { setBloc(cle); setMsg(null); }} style={{
            flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer",
            fontSize: 13, fontWeight: 700,
            border: `1.5px solid ${bloc === cle ? C.bleu : C.bord}`,
            background: bloc === cle ? C.bleuClair : C.blanc,
            color: bloc === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      {err && <div style={{ ...S.carte, color: C.rouge, fontSize: 13 }}>{err}</div>}
      {msg && <div style={{ ...S.carte, color: C.vert, fontSize: 13 }}>{msg}</div>}

      {!params && !err && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet,
                      fontSize: 13 }}>Chargement…</div>
      )}

      {params && bloc === "sous_traitance" && (
        <BlocSousTraitance params={params} setParams={setParams}
                           onErr={setErr} onOk={annonce} />
      )}
      {params && bloc === "lift" && (
        <BlocLift params={params} setParams={setParams} centres={centres}
                  setCentres={setCentres} onErr={setErr} onOk={annonce} />
      )}
      {bloc === "stockage" && (
        <BlocStockage valeur={axesOrg} setValeur={setAxesOrg}
                      onErr={setErr} onOk={annonce} />
      )}
    </div>
  );
}

/* ── Sous-traitance ──────────────────────────────────────────────────────── */

function BlocSousTraitance({ params, setParams, onErr, onOk }) {
  const g = tarifST(params.sous_traitance);

  function maj(cle, v) {
    setParams((p) => ({ ...p,
      sous_traitance: { ...tarifST(p.sous_traitance), [cle]: v === "" ? 0 : Number(v) } }));
  }

  async function enregistrer() {
    try {
      await sauverParametresPrix({ ...params, sous_traitance: tarifST(params.sous_traitance) });
      onOk("Grille de sous-traitance enregistrée.");
    } catch (e) { onErr(e.message); }
  }

  return (
    <>
      <div style={S.carte}>
        <Intro>
          Ce que vous facturez à un vendeur de mobilier ou à un transporteur qui
          vous confie une livraison. Le camion n'est compté que si c'est vous
          qui le fournissez.
        </Intro>
        <Champ label="Homme / heure" suffixe="€" centimes
               value={g.homme_heure_centimes}
               onChange={(v) => maj("homme_heure_centimes", v)} />
        <Champ label="Camion / jour" suffixe="€" centimes
               value={g.camion_jour_centimes}
               onChange={(v) => maj("camion_jour_centimes", v)} />
        <Champ label="Kilomètre" suffixe="€" centimes
               value={g.km_centimes} onChange={(v) => maj("km_centimes", v)} />
        <Champ label="Minimum d'heures facturées" suffixe="h"
               value={g.heures_minimum}
               onChange={(v) => maj("heures_minimum", v)}
               aide="Protège le déplacement d'une équipe pour une courte mission." />
        <Champ label="Remise négociée" suffixe="%"
               value={g.remise_pct} onChange={(v) => maj("remise_pct", v)}
               aide="Bornée à 90 % : une prestation gratuite ne se chiffre pas." />
      </div>

      <div style={S.carte}>
        <Titre>Exemple</Titre>
        <Exemple grille={g} />
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
      </div>
    </>
  );
}

function Exemple({ grille }) {
  // 2 hommes, 4 h, 1 camion, 30 km — la mission la plus courante.
  const brut = 2 * 4 * grille.homme_heure_centimes
             + grille.camion_jour_centimes + 30 * grille.km_centimes;
  const remise = Math.round(brut * grille.remise_pct / 100);
  return (
    <div style={{ fontSize: 13, color: C.encre, lineHeight: 1.7 }}>
      <div style={{ color: C.muet, fontSize: 12 }}>
        2 hommes × 4 h, 1 camion, 30 km
      </div>
      <Ligne g="Main-d'œuvre" d={euros(2 * 4 * grille.homme_heure_centimes)} />
      <Ligne g="Camion" d={euros(grille.camion_jour_centimes)} />
      <Ligne g="Kilomètres" d={euros(30 * grille.km_centimes)} />
      {grille.remise_pct > 0 && (
        <Ligne g={`Remise ${grille.remise_pct} %`} d={`− ${euros(remise)}`} />
      )}
      <div style={{ borderTop: `1px solid ${C.bord}`, marginTop: 6, paddingTop: 6,
                    display: "flex", justifyContent: "space-between",
                    fontWeight: 800 }}>
        <span>Total HTVA</span><span>{euros(brut - remise)}</span>
      </div>
    </div>
  );
}

/* ── Lift ────────────────────────────────────────────────────────────────── */

function BlocLift({ params, setParams, centres, setCentres, onErr, onOk }) {
  const [centreId, setCentreId] = useState(null);   // null = maison mère

  const sup = supplements(params.lift_supplements);
  function majSupp(cle, v) {
    setParams((p) => ({ ...p,
      lift_supplements: { ...supplements(p.lift_supplements),
                          [cle]: v === "" ? 0 : Number(v) } }));
  }

  const listeMaison = couronnes(params.lift_couronnes);
  const affichee = listeMaison.length ? listeMaison : couronnes(COURONNES_DEFAUT);
  const centre = centres.find((c) => c.id === centreId) || null;
  const listeCentre = centre ? couronnes(centre.tarifs?.lift_couronnes) : [];

  const edite = centreId ? listeCentre : affichee;
  const suitLaMaison = Boolean(centreId) && listeCentre.length === 0;

  function poser(nouvelle) {
    if (!centreId) {
      setParams((p) => ({ ...p, lift_couronnes: nouvelle }));
    } else {
      setCentres((cs) => cs.map((c) => c.id === centreId
        ? { ...c, tarifs: { ...(c.tarifs || {}), lift_couronnes: nouvelle } } : c));
    }
  }

  function majCouronne(i, cle, v) {
    const base = edite.length ? edite : couronnes(COURONNES_DEFAUT);
    poser(base.map((c, j) => j === i ? { ...c, [cle]: v === "" ? 0 : Number(v) } : c));
  }
  function ajouter() {
    const base = edite.length ? edite : [];
    const dernier = base[base.length - 1];
    poser([...base, { jusqua_km: (dernier?.jusqua_km || 0) + 15,
                      prix_centimes: dernier?.prix_centimes || 20000,
                      heures_incluses: dernier?.heures_incluses ?? 1 }]);
  }
  function retirer(i) { poser(edite.filter((_, j) => j !== i)); }

  async function enregistrer() {
    try {
      if (!centreId) {
        await sauverParametresPrix({ ...params,
          lift_couronnes: couronnes(params.lift_couronnes),
          lift_supplements: supplements(params.lift_supplements) });
        onOk("Grille de la maison mère enregistrée.");
      } else {
        await definirTarifsCentre(centreId,
          { ...(centre.tarifs || {}), lift_couronnes: listeCentre });
        // Les suppléments sont communs : on les enregistre au passage, sinon
        // les modifier depuis l'onglet d'un centre les perdrait en silence.
        await sauverParametresPrix({ ...params,
          lift_supplements: supplements(params.lift_supplements) });
        onOk(`Grille de « ${centre.nom} » enregistrée.`);
      }
    } catch (e) { onErr(e.message); }
  }

  return (
    <>
      <div style={S.carte}>
        <Intro>
          Le prix d'un lift vendu seul suit la distance depuis le centre. La
          maison mère pose la grille de référence ; un centre qui déclare la
          sienne l'emporte. Au-delà du dernier anneau, le prix se prolonge au
          kilomètre plutôt que de refuser la course.
        </Intro>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 4 }}>
          <Puce actif={!centreId} onClick={() => setCentreId(null)}
                texte="Maison mère" />
          {centres.map((c) => (
            <Puce key={c.id} actif={centreId === c.id}
                  onClick={() => setCentreId(c.id)}
                  texte={c.nom}
                  sourd={couronnes(c.tarifs?.lift_couronnes).length === 0} />
          ))}
        </div>
      </div>

      {suitLaMaison && (
        <div style={{ ...S.carte, fontSize: 12.5, color: C.muet }}>
          « {centre.nom} » suit aujourd'hui la grille de la maison mère.
          Ajoutez une couronne pour lui en donner une propre.
        </div>
      )}

      <div style={S.carte}>
        <Titre>{centreId ? centre?.nom : "Grille de référence"}</Titre>
        {edite.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.muet, padding: "6px 0" }}>
            Aucune couronne.
          </div>
        )}
        {decrireGrille(edite).map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end",
                                marginBottom: 8 }}>
            <div style={{ flex: "0 0 58px", fontSize: 11.5, color: C.muet,
                          paddingBottom: 10 }}>
              dès {l.de_km} km
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Jusqu'à (km)</label>
              <input style={S.input} type="number" min={1} value={l.jusqua_km}
                     onChange={(e) => majCouronne(i, "jusqua_km", e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Prix (€)</label>
              <input style={S.input} type="number" step="0.01"
                     value={(l.prix_centimes / 100).toFixed(2)}
                     onChange={(e) => majCouronne(i, "prix_centimes",
                       Math.round(Number(e.target.value) * 100))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Temps inclus (h)</label>
              <input style={S.input} type="number" min={0} step="0.25"
                     value={l.heures_incluses ?? 0}
                     onChange={(e) => majCouronne(i, "heures_incluses", e.target.value)} />
            </div>
            <button style={{ ...S.boutonLien, color: C.rouge, paddingBottom: 10 }}
                    onClick={() => retirer(i)}>Retirer</button>
          </div>
        ))}
        <button style={S.boutonLien} onClick={ajouter}>+ Ajouter une couronne</button>
      </div>

      {/* Ce que le bureau fixe au-delà des anneaux. Commun à tous les centres :
          un anneau change d'un dépôt à l'autre, pas le prix d'une heure. */}
      <div style={S.carte}>
        <Titre>Suppléments (tous centres)</Titre>
        <Champ label="Heure au-delà du temps inclus" suffixe="€" centimes
               value={sup.heure_centimes}
               onChange={(v) => majSupp("heure_centimes", v)} />
        <Champ label="Homme supplémentaire, par heure" suffixe="€" centimes
               value={sup.homme_heure_centimes}
               onChange={(v) => majSupp("homme_heure_centimes", v)}
               aide="Un homme en plus reprend tout le temps sur place, mais ne
                     double pas le prix : le déplacement et la machine sont
                     déjà payés." />
        <Champ label="Kilomètre au-delà du dernier anneau" suffixe="€" centimes
               value={sup.km_centimes}
               onChange={(v) => majSupp("km_centimes", v)} />
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
      </div>
    </>
  );
}

/* ── Stockage — les axes ─────────────────────────────────────────────────── */

function BlocStockage({ valeur, setValeur, onErr, onOk }) {
  const A = axes(valeur);

  function maj(axe, cle, v) {
    setValeur({ ...A, [axe]: { ...A[axe], [cle]: cle === "libelle" ? v : Number(v) } });
  }

  async function enregistrer() {
    try {
      await definirAxesStockage(axes(valeur));
      onOk("Axes du dépôt enregistrés.");
    } catch (e) { onErr(e.message); }
  }

  return (
    <>
      <div style={S.carte}>
        <Intro>
          Ce que x, y et z veulent dire chez vous, et ce qui existe réellement.
          Les formulaires proposeront ensuite ces positions au lieu d'un champ
          libre — on ne range plus un box dans une allée qui n'existe pas.
        </Intro>
      </div>

      {["x", "y", "z"].map((cle) => (
        <div key={cle} style={S.carte}>
          <Titre>Axe {cle.toUpperCase()}</Titre>
          <label style={S.label}>Nom</label>
          <input style={S.input} value={A[cle].libelle}
                 onChange={(e) => maj(cle, "libelle", e.target.value)} />

          <label style={S.label}>Affichage</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[["lettre", "Lettres (A, B, C…)"], ["nombre", "Nombres (1, 2, 3…)"]]
              .map(([f, lib]) => (
              <button key={f} onClick={() => maj(cle, "format", f)} style={{
                flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                fontSize: 12.5, fontWeight: 700,
                border: `1.5px solid ${A[cle].format === f ? C.bleu : C.bord}`,
                background: A[cle].format === f ? C.bleuClair : C.blanc,
                color: A[cle].format === f ? C.bleu : C.muet }}>{lib}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>De</label>
              <input style={S.input} type="number" value={A[cle].min}
                     onChange={(e) => maj(cle, "min", e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>À</label>
              <input style={S.input} type="number" value={A[cle].max}
                     onChange={(e) => maj(cle, "max", e.target.value)} />
            </div>
          </div>

          <div style={{ fontSize: 12, color: C.muet, marginTop: 8 }}>
            {A[cle].libelle} {valeurAxe(A[cle].min, A[cle])} à{" "}
            {valeurAxe(A[cle].max, A[cle])} —{" "}
            {A[cle].max - A[cle].min + 1} positions.
          </div>
        </div>
      ))}

      <div style={{ padding: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
      </div>
    </>
  );
}

/* ── Petits éléments partagés ────────────────────────────────────────────── */

const Titre = ({ children }) => (
  <div style={{ fontSize: 11.5, fontWeight: 800, color: C.muet, marginBottom: 8,
                textTransform: "uppercase", letterSpacing: ".03em" }}>{children}</div>
);

const Intro = ({ children }) => (
  <div style={{ fontSize: 12.5, color: C.muet, lineHeight: 1.6,
                marginBottom: 10 }}>{children}</div>
);

const Ligne = ({ g, d }) => (
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span style={{ color: C.muet }}>{g}</span><span>{d}</span>
  </div>
);

const Puce = ({ actif, onClick, texte, sourd }) => (
  <button onClick={onClick} style={{
    flexShrink: 0, padding: "8px 14px", borderRadius: 999, cursor: "pointer",
    fontSize: 12.5, fontWeight: 700,
    border: `1.5px solid ${actif ? C.bleu : C.bord}`,
    background: actif ? C.bleuClair : C.blanc,
    color: actif ? C.bleu : sourd ? C.muet : C.encre,
    opacity: sourd && !actif ? 0.75 : 1 }}>{texte}</button>
);

function Champ({ label, suffixe, value, onChange, centimes, aide }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={S.label}>{label}{suffixe ? ` (${suffixe})` : ""}</label>
      <input style={S.input} type="number" step={centimes ? "0.01" : "1"}
             value={centimes ? (value / 100).toFixed(2) : value}
             onChange={(e) => onChange(centimes
               ? Math.round(Number(e.target.value) * 100) : e.target.value)} />
      {aide && (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3 }}>{aide}</div>
      )}
    </div>
  );
}
