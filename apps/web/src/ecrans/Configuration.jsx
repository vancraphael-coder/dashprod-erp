// =============================================================================
// Écran — Configuration des prix.
// Demande fondateur : le centre des prix ET des coûts, un onglet chacun, le
// plus bref et intuitif possible. Chaque valeur est éditable directement ;
// « Enregistrer » republie le barème (le moteur de chiffrage le lit ensuite,
// il acceptait déjà un barème en paramètre — architecture prête).
// =============================================================================

import React, { useEffect, useState } from "react";
import { obtenirParametresPrix, sauverParametresPrix } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

export default function Configuration({ retour }) {
  const [params, setParams] = useState(null);
  const [onglet, setOnglet] = useState("bareme");
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { obtenirParametresPrix().then(setParams).catch((e) => setErreur(e.message)); }, []);

  function majBareme(cle, v) {
    setParams((p) => ({ ...p, bareme_horaire: { ...p.bareme_horaire, [cle]: num(v) } }));
    setSauve(false);
  }
  function majTarif(cle, v) {
    setParams((p) => ({ ...p, tarifs: { ...p.tarifs, [cle]: num(v) } }));
    setSauve(false);
  }
  function majCout(cle, v) {
    setParams((p) => ({ ...p, couts: { ...p.couts, [cle]: num(v) } }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try { await sauverParametresPrix(params); setSauve(true); }
    catch (e) { setErreur(e.message); }
  }

  if (!params) return null;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
        <div style={S.titre}>Configuration des prix</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[["bareme", "Barème client"], ["couts", "Coûts internes"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? "#E7EFFC" : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 12.5, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>

      {onglet === "bareme" ? (
        <>
          {/* Ce qui est FACTURÉ au client */}
          <Section titre="Tarif horaire (HTVA / heure)">
            {[2, 3, 4, 5, 6].map((n) => (
              <Champ key={n} label={`${n} déménageurs`} suffixe="€/h"
                     value={params.bareme_horaire?.[n]}
                     onChange={(v) => majBareme(n, v)} />
            ))}
          </Section>
          <Section titre="Suppléments (HTVA)">
            <Champ label="Élévateur (forfait)" suffixe="€"
                   value={params.tarifs?.elevateur} onChange={(v) => majTarif("elevateur", v)} />
            <Champ label="Kilomètre facturé" suffixe="€/km"
                   value={params.tarifs?.km_facture} onChange={(v) => majTarif("km_facture", v)} />
            <Champ label="Emballage (régie)" suffixe="€/h"
                   value={params.tarifs?.emballage_horaire} onChange={(v) => majTarif("emballage_horaire", v)} />
            <Champ label="Emballage — km" suffixe="€/km"
                   value={params.tarifs?.emballage_km} onChange={(v) => majTarif("emballage_km", v)} />
            <Champ label="Heure sup. (forfait)" suffixe="€/dém./h"
                   value={params.tarifs?.heure_sup_forfait} onChange={(v) => majTarif("heure_sup_forfait", v)} />
            <Champ label="Assurance" suffixe="€"
                   value={params.tarifs?.assurance_htva} onChange={(v) => majTarif("assurance_htva", v)} />
          </Section>
        </>
      ) : (
        <>
          {/* Ce qui COÛTE réellement à l'entreprise (marge) */}
          <Section titre="Coûts d'exploitation">
            <Champ label="Carburant" suffixe="€/km"
                   value={params.couts?.carburant_km} onChange={(v) => majCout("carburant_km", v)} />
            <Champ label="Taux horaire par défaut" suffixe="€/h"
                   value={params.couts?.taux_defaut} onChange={(v) => majCout("taux_defaut", v)} />
          </Section>
          <div style={{ margin: "0 16px 12px", fontSize: 11.5, color: C.muet, lineHeight: 1.5 }}>
            Les taux horaires réels de chaque membre se règlent dans Ressources
            (Membres) et alimentent automatiquement le coût main-d'œuvre du devis.
            Le taux par défaut ci-dessus sert de repli quand un taux manque.
          </div>
        </>
      )}

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
