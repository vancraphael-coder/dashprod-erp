// =============================================================================
// DÉPENSES — la boîte à facturer : piloter les sorties, voir ce qui reste.
//
// L'écran est double : en haut le BILAN (pour 100 € encaissés, où va l'argent ?),
// en bas la SAISIE et la liste. Le bilan lit le domaine pur
// (pilotage/finances-libres.js) ; l'écran n'assemble et n'affiche.
// =============================================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  bilanFinancier, santeFinanciere, CATEGORIES_DEPENSE,
} from "@domaine/pilotage/finances-libres.js";
import {
  depensesPeriode, ajouterDepense, reglerDepense, supprimerDepense,
  paiementsPeriode,
} from "../lib/adaptateur.js";
import { C, S, euros } from "../lib/theme.jsx";

const libelleCat = (cle) =>
  CATEGORIES_DEPENSE.find((c) => c.cle === cle)?.libelle || cle;

export default function Depenses({ retour }) {
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7)); // AAAA-MM
  const [depenses, setDepenses] = useState([]);
  const [recettes, setRecettes] = useState(0);
  const [form, setForm] = useState({ libelle: "", montant: "", categorie: "divers",
                                     dette: false, echeance: "" });
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const bornes = useMemo(() => {
    const [a, m] = periode.split("-").map(Number);
    const debut = `${periode}-01`;
    const fin = new Date(a, m, 0).toISOString().slice(0, 10);   // dernier jour du mois
    return { debut, fin };
  }, [periode]);

  async function charger() {
    try {
      setDepenses(await depensesPeriode(bornes));
      const pmts = await paiementsPeriode(bornes).catch(() => []);
      setRecettes((pmts || []).reduce((s, p) => s + (p.montant_centimes || 0), 0));
    } catch (e) { setErreur(e.message); }
  }
  useEffect(() => { charger(); }, [bornes.debut, bornes.fin]);

  const bilan = useMemo(() => bilanFinancier({
    recettes_centimes: recettes, depenses,
  }), [recettes, depenses]);
  const sante = useMemo(() => santeFinanciere(bilan), [bilan]);

  async function ajouter() {
    setErreur(null);
    const montant = Math.round(Number(String(form.montant).replace(",", ".")) * 100);
    if (!form.libelle.trim() || !(montant > 0)) {
      setErreur("Un libellé et un montant sont nécessaires."); return;
    }
    setEnCours(true);
    try {
      await ajouterDepense({
        libelle: form.libelle, montant_centimes: montant,
        categorie: form.categorie, regle: !form.dette,
        echeance: form.dette ? (form.echeance || null) : null,
      });
      setForm({ libelle: "", montant: "", categorie: "divers", dette: false, echeance: "" });
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  const couleurSante = { ok: C.vert, attention: C.ambre, critique: C.rouge }[sante.niveau];

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        {retour && (
          <button onClick={retour} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: C.muet }}>←</button>
        )}
        <div style={{ fontSize: 18, fontWeight: 800, color: C.encre }}>Dépenses & dettes</div>
        <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)}
          style={{ ...S.input, width: "auto", marginLeft: "auto", padding: "6px 10px" }} />
      </div>

      {/* Le bilan : pour 100 € encaissés, où va l'argent ? */}
      <div style={{ ...S.carte, borderLeft: `3px solid ${couleurSante}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <Chiffre libelle="Recettes" valeur={euros(bilan.recettes_centimes)} />
          <Chiffre libelle="Dépenses" valeur={euros(bilan.depenses_centimes)}
                   sous={`${bilan.pct_depenses} %`} />
          <Chiffre libelle="Reste" valeur={euros(bilan.reste_centimes)}
                   sous={`${bilan.pct_reste} %`}
                   couleur={bilan.reste_centimes < 0 ? C.rouge : C.vert} />
          {bilan.dettes_centimes > 0 && (
            <Chiffre libelle="Dettes en cours" valeur={euros(bilan.dettes_centimes)}
                     couleur={C.ambre} />
          )}
        </div>
        {sante.message && (
          <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: couleurSante }}>
            {sante.message}
          </div>
        )}
        {/* Ventilation par poste, barre proportionnelle. */}
        {bilan.postes.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
            {bilan.postes.map((p) => (
              <div key={p.categorie}>
                <div style={{ display: "flex", justifyContent: "space-between",
                              fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: C.encre }}>{libelleCat(p.categorie)}</span>
                  <span style={{ color: C.muet, fontWeight: 700 }}>
                    {euros(p.montant_centimes)} · {p.pct_recettes} %
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: C.bord }}>
                  <div style={{ height: 6, borderRadius: 999, background: C.bleu,
                    width: `${Math.min(100, p.pct_recettes)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saisie rapide */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Noter une dépense</label>
        <input style={S.input} value={form.libelle} placeholder="Libellé (ex. Plein gasoil)"
          onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input style={{ ...S.input, flex: 1 }} value={form.montant} inputMode="decimal"
            placeholder="Montant €"
            onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} />
          <select style={{ ...S.input, flex: 1 }} value={form.categorie}
            onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}>
            {CATEGORIES_DEPENSE.map((c) => (
              <option key={c.cle} value={c.cle}>{c.libelle}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <button onClick={() => setForm((f) => ({ ...f, dette: !f.dette }))}
            style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${form.dette ? C.ambre : C.bord}`,
              background: form.dette ? `${C.ambre}18` : "transparent",
              color: form.dette ? C.ambre : C.muet, fontWeight: 700, fontSize: 12.5 }}>
            {form.dette ? "Dette à payer" : "Déjà réglée"}
          </button>
          {form.dette && (
            <input type="date" style={{ ...S.input, flex: 1 }} value={form.echeance}
              onChange={(e) => setForm((f) => ({ ...f, echeance: e.target.value }))} />
          )}
        </div>
        {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
        <button style={{ ...S.boutonPlein, marginTop: 10, opacity: enCours ? 0.6 : 1 }}
          disabled={enCours} onClick={ajouter}>
          {enCours ? "Enregistrement…" : "Ajouter"}
        </button>
      </div>

      {/* La liste */}
      {depenses.length > 0 && (
        <div style={S.carte}>
          {depenses.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "9px 0",
                borderBottom: `1px solid ${C.bord}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: C.encre, fontWeight: 600 }}>{d.libelle}</div>
                <div style={{ fontSize: 11, color: C.muet }}>
                  {d.date_depense} · {libelleCat(d.categorie)}
                  {!d.regle && <span style={{ color: C.ambre, fontWeight: 700 }}>
                    {" · dette"}{d.echeance ? ` (éch. ${d.echeance})` : ""}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: C.encre }}>
                  {euros(d.montant_centimes)}
                </span>
                {!d.regle && (
                  <button onClick={() => reglerDepense(d.id).then(charger)}
                    style={{ fontSize: 11, fontWeight: 700, color: C.vert,
                      border: `1px solid ${C.vert}`, background: "transparent",
                      borderRadius: 8, padding: "3px 8px", cursor: "pointer" }}>
                    Réglé
                  </button>
                )}
                <button onClick={() => supprimerDepense(d.id).then(charger)}
                  style={{ fontSize: 15, color: C.muet, border: "none",
                    background: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chiffre({ libelle, valeur, sous, couleur }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.fantome,
                    textTransform: "uppercase", letterSpacing: .4 }}>{libelle}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: couleur || C.encre }}>{valeur}</div>
      {sous && <div style={{ fontSize: 11, color: C.muet }}>{sous}</div>}
    </div>
  );
}
