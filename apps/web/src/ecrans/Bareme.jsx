// =============================================================================
// Écran — Barème (prix CLIENT). Page dédiée, accessible depuis le Compte.
// Ce qui est facturé au client : tarif horaire par équipe, prix des cartons,
// forfait, élévateur (lift), et les autres suppléments. Persisté dans
// organisations.parametres_prix (jsonb) — le moteur de chiffrage le lit.
// =============================================================================

import React, { useEffect, useState, useRef} from "react";
import { obtenirParametresPrix, sauverParametresPrix } from "../lib/adaptateur.js";
import { catalogueSupplements, ajouterSupplement, retirerSupplement, UNITES_SUPPLEMENT }
  from "@domaine/chiffrage/supplements.js";
import { C, S, declarerModifs} from "../lib/theme.jsx";

export default function Bareme({ retour }) {
  const [params, setParams] = useState(null);
  const [sauve, setSauve] = useState(false);
  // `sauve` signale « vient d'être enregistré » ; il vaut false à l'ouverture,
  // il ne peut donc pas servir de drapeau « modifié ». D'où `touche`, mis à
  // vrai par la première modification réelle.
  const [touche, setTouche] = useState(false);
  const sauverRef = useRef(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { obtenirParametresPrix().then(setParams).catch((e) => setErreur(e.message)); }, []);

  function majBareme(cle, v) {
    setParams((p) => ({ ...p, bareme_horaire: { ...p.bareme_horaire, [cle]: num(v) } }));
    marquerTouche();
  }
  function majTarif(cle, v) {
    setParams((p) => ({ ...p, tarifs: { ...(p.tarifs || {}), [cle]: num(v) } }));
    marquerTouche();
  }

  /** Une modification réelle : le garde-fou s'arme. */
  function marquerTouche() { setSauve(false); setTouche(true); }

  // Garde de modifications — AVANT tout return conditionnel (règle des hooks).
  // Toute navigation, y compris la flèche retour, demandera d'abord
  // « Enregistrer / Annuler les modifications ».
  useEffect(() => {
    declarerModifs(touche, () => sauverRef.current && sauverRef.current());
    return () => declarerModifs(false, null);
  }, [touche]);
  sauverRef.current = enregistrer;

  async function enregistrer() {
    setErreur(null);
    try { await sauverParametresPrix(params); setSauve(true); setTouche(false); }
    catch (e) { setErreur(e.message); }
  }

  const supplements = catalogueSupplements(params?.supplements || []);
  function majSup(cle, champ, valeur) {
    setParams((p) => ({ ...p, supplements:
      catalogueSupplements(p.supplements).map((s) =>
        s.cle === cle ? { ...s, [champ]: valeur } : s) }));
    marquerTouche();
  }
  function ajouter() {
    setParams((p) => ({ ...p, supplements: ajouterSupplement(p.supplements || []) }));
    marquerTouche();
  }
  function retirer(cle) {
    setParams((p) => ({ ...p, supplements: retirerSupplement(p.supplements, cle) }));
    marquerTouche();
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

      <Section titre="Suppléments">
        <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 10,
                      lineHeight: 1.5, padding: "0 2px" }}>
          Vos suppléments récurrents (piano, cave difficile, étage sans
          ascenseur…). Ils apparaîtront sur le devis, à cocher selon le dossier.
        </div>
        {supplements.map((sp) => (
          <div key={sp.cle} style={{ display: "flex", gap: 6, alignItems: "center",
                 marginBottom: 8 }}>
            <input style={{ ...S.input, flex: 1, margin: 0 }} value={sp.libelle}
                   placeholder="Nom du supplément"
                   onChange={(e) => majSup(sp.cle, "libelle", e.target.value)} />
            <input style={{ ...S.input, width: 74, margin: 0 }} type="number" min="0"
                   value={sp.montant_centimes / 100}
                   onChange={(e) => majSup(sp.cle, "montant_centimes",
                     Math.round(Number(e.target.value) * 100))} />
            <select style={{ ...S.input, width: 96, margin: 0 }} value={sp.unite}
                    onChange={(e) => majSup(sp.cle, "unite", e.target.value)}>
              {UNITES_SUPPLEMENT.map((u) => (
                <option key={u.cle} value={u.cle}>{u.nom}</option>
              ))}
            </select>
            <button onClick={() => retirer(sp.cle)} style={{ border: "none",
              background: "none", color: C.rouge, cursor: "pointer", fontSize: 18,
              padding: "0 4px" }}>×</button>
          </div>
        ))}
        <button onClick={ajouter} style={{ ...S.boutonLien, paddingLeft: 0 }}>
          + Ajouter un supplément
        </button>
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
