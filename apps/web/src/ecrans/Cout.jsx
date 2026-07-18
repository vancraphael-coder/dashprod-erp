// =============================================================================
// Écran — Coût (prix INTERNES). Page dédiée, accessible depuis le Compte.
// Ce que ça coûte à l'entreprise : carburant, taux horaire par défaut, prix
// FOURNISSEUR des cartons/fournitures (base des marges). Les taux horaires
// réels par membre se règlent dans Ressources ; le taux par défaut sert de
// repli. Persisté dans organisations.parametres_prix.couts (jsonb).
// =============================================================================

import React, { useEffect, useState } from "react";
import { obtenirParametresPrix, sauverParametresPrix } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

export default function Cout({ retour }) {
  const [params, setParams] = useState(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { obtenirParametresPrix().then(setParams).catch((e) => setErreur(e.message)); }, []);

  function majCout(cle, v) {
    setParams((p) => ({ ...p, couts: { ...(p.couts || {}), [cle]: num(v) } }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try { await sauverParametresPrix(params); setSauve(true); }
    catch (e) { setErreur(e.message); }
  }

  if (!params) return null;
  const c = params.couts || {};

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Coûts internes</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Ce que ça coûte à l'entreprise (base des marges).
        </div>
      </div>

      <Section titre="Exploitation">
        <Champ label="Carburant" suffixe="€/km"
               value={c.carburant_km} onChange={(v) => majCout("carburant_km", v)} />
        <Champ label="Taux horaire par défaut" suffixe="€/h"
               value={c.taux_defaut} onChange={(v) => majCout("taux_defaut", v)} />
      </Section>

      <Section titre="Prix fournisseur (cartons & fournitures)">
        <Champ label="Carton standard" suffixe="€"
               value={c.carton_standard} onChange={(v) => majCout("carton_standard", v)} />
        <Champ label="Carton penderie" suffixe="€"
               value={c.carton_penderie} onChange={(v) => majCout("carton_penderie", v)} />
        <Champ label="Carton livres" suffixe="€"
               value={c.carton_livres} onChange={(v) => majCout("carton_livres", v)} />
        <Champ label="Papier bulle (rouleau)" suffixe="€"
               value={c.papier_bulle} onChange={(v) => majCout("papier_bulle", v)} />
        <Champ label="Ruban adhésif" suffixe="€"
               value={c.ruban} onChange={(v) => majCout("ruban", v)} />
      </Section>

      <div style={{ margin: "0 16px 12px", fontSize: 11.5, color: C.muet, lineHeight: 1.5 }}>
        Les taux horaires réels de chaque membre se règlent dans Ressources
        (Membres) et alimentent automatiquement le coût main-d'œuvre du devis.
        Le taux par défaut ci-dessus sert de repli quand un taux manque.
      </div>

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
