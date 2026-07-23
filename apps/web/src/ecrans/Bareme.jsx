// =============================================================================
// Écran — Barème (prix CLIENT). Page dédiée, accessible depuis le Compte.
// Ce qui est facturé au client : tarif horaire par équipe, prix des cartons,
// forfait, élévateur (lift), et les autres suppléments. Persisté dans
// organisations.parametres_prix (jsonb) — le moteur de chiffrage le lit.
// =============================================================================

import React, { useEffect, useState } from "react";
import { obtenirParametresPrix, sauverParametresPrix } from "../lib/adaptateur.js";
import Paie from "./Paie.jsx";
import { C, S } from "../lib/theme.jsx";

export default function Bareme({ retour }) {
  // Deux onglets : le prix CLIENT (barème) et le coût SALARIÉ (paie).
  // Ils vivent au même endroit parce qu'ils répondent à la même question :
  // combien vaut une heure de chantier, vue du client et vue de l'entreprise.
  const [vue, setVue] = useState("bareme");
  if (vue === "paie") return <Paie retour={() => setVue("bareme")} />;
  const [params, setParams] = useState(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { obtenirParametresPrix().then(setParams).catch((e) => setErreur(e.message)); }, []);

  function majBareme(cle, v) {
    setParams((p) => ({ ...p, bareme_horaire: { ...p.bareme_horaire, [cle]: num(v) } }));
    setSauve(false);
  }
  function majTarif(cle, v) {
    setParams((p) => ({ ...p, tarifs: { ...(p.tarifs || {}), [cle]: num(v) } }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try { await sauverParametresPrix(params); setSauve(true); }
    catch (e) { setErreur(e.message); }
  }

  if (!params) return null;
  const t = params.tarifs || {};

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Barème — prix client</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Ce qui est facturé au client.
        </div>

      </div>

      <div style={{ display: "flex", gap: 8, margin: "0 16px 12px" }}>
        {[["bareme", "Prix client"], ["paie", "Paie"]].map(([cle, lib]) => (
          <button key={cle} onClick={() => setVue(cle)} style={{
            flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
            fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${vue === cle ? C.bleu : C.bord}`,
            background: vue === cle ? "#E7EFFC" : C.blanc,
            color: vue === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      <Section titre="Tarif horaire (HTVA / heure)">
        {[2, 3, 4, 5, 6].map((n) => (
          <Champ key={n} label={`${n} déménageurs`} suffixe="€/h"
                 value={params.bareme_horaire?.[n]}
                 onChange={(v) => majBareme(n, v)} />
        ))}
      </Section>

      <Section titre="Forfait & déplacement">
        <Champ label="Forfait de base" suffixe="€"
               value={t.forfait_base} onChange={(v) => majTarif("forfait_base", v)} />
        <Champ label="Kilomètre facturé" suffixe="€/km"
               value={t.km_facture} onChange={(v) => majTarif("km_facture", v)} />
      </Section>

      <Section titre="Matériel facturé (cartons & fournitures)">
        <Champ label="Carton standard" suffixe="€"
               value={t.carton_standard} onChange={(v) => majTarif("carton_standard", v)} />
        <Champ label="Carton penderie" suffixe="€"
               value={t.carton_penderie} onChange={(v) => majTarif("carton_penderie", v)} />
        <Champ label="Carton livres" suffixe="€"
               value={t.carton_livres} onChange={(v) => majTarif("carton_livres", v)} />
        <Champ label="Papier bulle (rouleau)" suffixe="€"
               value={t.papier_bulle} onChange={(v) => majTarif("papier_bulle", v)} />
        <Champ label="Ruban adhésif" suffixe="€"
               value={t.ruban} onChange={(v) => majTarif("ruban", v)} />
      </Section>

      <Section titre="Suppléments (HTVA)">
        <Champ label="Élévateur / lift (forfait)" suffixe="€"
               value={t.elevateur} onChange={(v) => majTarif("elevateur", v)} />
        <Champ label="Emballage (régie)" suffixe="€/h"
               value={t.emballage_horaire} onChange={(v) => majTarif("emballage_horaire", v)} />
        <Champ label="Emballage — km" suffixe="€/km"
               value={t.emballage_km} onChange={(v) => majTarif("emballage_km", v)} />
        <Champ label="Heure sup. (forfait)" suffixe="€/dém./h"
               value={t.heure_sup_forfait} onChange={(v) => majTarif("heure_sup_forfait", v)} />
        <Champ label="Assurance" suffixe="€"
               value={t.assurance_htva} onChange={(v) => majTarif("assurance_htva", v)} />
      </Section>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      <div style={{ margin: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Section({ titre, children }) {
  return (
    <div style={S.carte}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                    textTransform: "uppercase", letterSpacing: ".03em" }}>{titre}</div>
      {children}
    </div>
  );
}

function Champ({ label, value, suffixe, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: C.encre }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
               style={{ width: 74, textAlign: "right", padding: "7px 9px",
                        border: `1.5px solid ${C.bord}`, borderRadius: 8, fontSize: 14 }} />
        <span style={{ fontSize: 11.5, color: C.fantome, width: 52 }}>{suffixe}</span>
      </div>
    </div>
  );
}

const num = (v) => (v === "" || v == null ? 0 : Number(v));
