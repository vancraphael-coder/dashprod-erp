// =============================================================================
// APP TERRAIN — Mon profil (2 onglets : Véhicule / Inventaire).
// Demande fondateur : chaque membre a une page profil avec son véhicule (état
// et signalement rapide) et son inventaire personnel — vêtements et outils —
// pré-rempli depuis une liste standard, dont il modifie l'état quand il veut
// (RLS 0030 : le membre écrit sur SON équipement, le bureau voit tout).
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerVehicules, signalerSouci,
  listerEquipement, ajouterEquipement, changerEtatEquipement,
} from "../lib/adaptateur.js";
import { deconnecter } from "../lib/supabase.js";
import { C, S, FC } from "../lib/theme.jsx";

const ETATS_EQUIP = { neuf: "Neuf", bon: "Bon", use: "Usé", a_remplacer: "À remplacer" };
const COULEUR_EQUIP = { neuf: "#059669", bon: "#2563EB", use: "#D97706", a_remplacer: "#DC2626" };
const LIBELLE_MECA = { ok: "OK", surveiller: "À surveiller", urgent: "URGENT" };
const COULEUR_MECA = { ok: "#059669", surveiller: "#D97706", urgent: "#DC2626" };

// Inventaire standard d'un déménageur (modèle terrain) : posé en un tap.
const INVENTAIRE_STANDARD = [
  { categorie: "vetement", article: "Veste de travail" },
  { categorie: "vetement", article: "Pantalon de travail" },
  { categorie: "vetement", article: "T-shirts (x3)" },
  { categorie: "vetement", article: "Chaussures de sécurité" },
  { categorie: "vetement", article: "Gants" },
  { categorie: "outil", article: "Diable" },
  { categorie: "outil", article: "Sangles (x4)" },
  { categorie: "outil", article: "Couvertures (x10)" },
  { categorie: "outil", article: "Boîte à outils" },
  { categorie: "outil", article: "Cutter" },
];

export default function TerrainProfil({ profil }) {
  const [onglet, setOnglet] = useState("vehicule");

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Mon profil</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {profil?.nom || ""}{profil?.email ? ` · ${profil.email}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[["vehicule", "🚛 Véhicule"], ["inventaire", "🧥 Inventaire"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? C.bleuClair : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 12.5, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>

      {onglet === "vehicule" ? <OngletVehicule /> : <OngletInventaire profil={profil} />}

      <div style={{ margin: "18px 16px 0" }}>
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
                style={{ ...S.boutonLien, color: C.rouge, width: "100%", textAlign: "center" }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

/** Onglet Véhicule : l'état des camions, signalement rapide d'un souci. */
function OngletVehicule() {
  const [vehicules, setVehicules] = useState([]);
  const [selection, setSelection] = useState(null);
  const [etat, setEtat] = useState("surveiller");
  const [note, setNote] = useState("");
  const [envoye, setEnvoye] = useState(false);

  function recharger() { listerVehicules().then(setVehicules).catch(() => {}); }
  useEffect(recharger, []);

  async function envoyer() {
    if (!selection) return;
    await signalerSouci({ vehiculeId: selection, etat, note });
    setEnvoye(true); setNote("");
    setTimeout(() => setEnvoye(false), 2500);
    recharger();
  }

  return (
    <>
      {vehicules.map((v) => {
        const ouvert = selection === v.id;
        return (
          <div key={v.id} style={{ ...S.carte, padding: 13 }}>
            <div onClick={() => setSelection(ouvert ? null : v.id)}
                 style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>🚛 {v.nom}</div>
                <div style={{ fontSize: 11.5, color: C.muet, fontFamily: FC }}>
                  {v.immatriculation || "—"}
                  {v.carte_carburant ? ` · carte ${v.carte_carburant}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px",
                borderRadius: 999, color: "#fff",
                background: COULEUR_MECA[v.etat_mecanique || "ok"] }}>
                {LIBELLE_MECA[v.etat_mecanique || "ok"]}
              </span>
            </div>

            {ouvert && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 8 }}>
                <label style={S.label}>Signaler un état</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.keys(LIBELLE_MECA).map((e) => (
                    <button key={e} onClick={() => setEtat(e)} style={{
                      flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
                      fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${etat === e ? COULEUR_MECA[e] : C.bord}`,
                      background: etat === e ? COULEUR_MECA[e] : "#fff",
                      color: etat === e ? "#fff" : C.muet,
                    }}>{LIBELLE_MECA[e]}</button>
                  ))}
                </div>
                <label style={S.label}>Détail</label>
                <textarea style={{ ...S.input, minHeight: 50 }} value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Bruit, voyant, dommage…" />
                <button style={{ ...S.boutonPlein, marginTop: 10 }} onClick={envoyer}>
                  {envoye ? "✓ Signalé au bureau" : "Signaler au bureau"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Onglet Inventaire : équipement personnel, pré-rempli en un tap. */
function OngletInventaire({ profil }) {
  const [liste, setListe] = useState([]);
  const [creation, setCreation] = useState(false);
  const monId = profil?.utilisateur_id;

  function recharger() {
    if (monId) listerEquipement(monId).then(setListe).catch(() => {});
  }
  useEffect(recharger, [monId]);

  async function creerStandard() {
    setCreation(true);
    for (const art of INVENTAIRE_STANDARD) {
      await ajouterEquipement(monId, art).catch(() => {});
    }
    setCreation(false);
    recharger();
  }
  async function cycler(art) {
    const suite = { bon: "use", use: "a_remplacer", a_remplacer: "neuf", neuf: "bon" };
    await changerEtatEquipement(art.id, suite[art.etat] || "bon", monId);
    recharger();
  }

  const vetements = liste.filter((x) => x.categorie === "vetement");
  const outils = liste.filter((x) => x.categorie === "outil");

  const rendre = (arr) => arr.map((art) => (
    <button key={art.id} onClick={() => cycler(art)} style={{
      display: "flex", width: "100%", justifyContent: "space-between",
      alignItems: "center", padding: "10px 12px", marginBottom: 6,
      borderRadius: 10, cursor: "pointer", background: "#fff",
      border: `1.5px solid ${art.etat === "a_remplacer" ? "#FECACA" : C.bord}`,
    }}>
      <span style={{ fontSize: 13.5, color: C.encre, fontWeight: 600 }}>{art.article}</span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
        color: "#fff", background: COULEUR_EQUIP[art.etat] }}>
        {ETATS_EQUIP[art.etat]}
      </span>
    </button>
  ));

  return (
    <>
      {liste.length === 0 ? (
        <div style={{ ...S.carte, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.muet, marginBottom: 12 }}>
            Aucun inventaire pour le moment.
          </div>
          <button style={S.boutonPlein} onClick={creerStandard} disabled={creation}>
            {creation ? "Création…" : "Créer mon inventaire standard"}
          </button>
          <div style={{ fontSize: 11, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
            Veste, pantalon, t-shirts, chaussures, gants · diable, sangles,
            couvertures, boîte à outils, cutter.
          </div>
        </div>
      ) : (
        <>
          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>Vêtements</label>
            {rendre(vetements)}
            <label style={S.label}>Outils</label>
            {rendre(outils)}
          </div>
          <div style={{ margin: "0 16px", fontSize: 11.5, color: C.fantome, lineHeight: 1.5 }}>
            Touchez un article pour changer son état (Bon → Usé → À remplacer →
            Neuf). Le bureau voit l'état en direct dans Ressources.
          </div>
        </>
      )}
    </>
  );
}
