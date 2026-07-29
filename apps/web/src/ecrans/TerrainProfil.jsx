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
import { maPaie } from "../lib/adaptateur.js";
import { formaterDuree } from "@domaine/operations/pointage.js";
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
          {[["vehicule", "🚛 Véhicule"], ["inventaire", "🧥 Inventaire"],
            ["paie", "⏱ Mes heures"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? C.bleuClair : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 12.5, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>

      {onglet === "vehicule" && <OngletVehicule />}
      {onglet === "inventaire" && <OngletInventaire profil={profil} />}
      {onglet === "paie" && <OngletPaie />}

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
  const [ouvert, setOuvert] = useState(null);

  function recharger() { listerVehicules().then(setVehicules).catch(() => {}); }
  useEffect(recharger, []);

  return (
    <>
      {vehicules.map((v) => (
        <CarteVehicule key={v.id} v={v}
          ouvert={ouvert === v.id}
          onToggle={() => setOuvert(ouvert === v.id ? null : v.id)}
          onEnvoye={recharger} />
      ))}
    </>
  );
}

/** Une carte camion = son PROPRE brouillon (état + note). Plus de champ
    partagé entre tous les camions. */
function CarteVehicule({ v, ouvert, onToggle, onEnvoye }) {
  const [etat, setEtat] = useState("surveiller");
  const [note, setNote] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function envoyer() {
    setErreur(null);
    try {
      await signalerSouci({ vehiculeId: v.id, etat, note });
      setEnvoye(true); setNote("");
      setTimeout(() => setEnvoye(false), 2500);
      onEnvoye();
    } catch (e) { setErreur(e.message || "Envoi impossible"); }
  }

  return (
    <div style={{ ...S.carte, padding: 13 }}>
      <div onClick={onToggle}
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
          {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 6 }}>{erreur}</div>}
          <button style={{ ...S.boutonPlein, marginTop: 10 }} onClick={envoyer}>
            {envoye ? "✓ Signalé au bureau" : "Signaler au bureau"}
          </button>
        </div>
      )}
    </div>
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

/**
 * Mes heures et mon brut — la vue du déménageur sur SA paie.
 *
 * Le premier motif de litige sur un chantier, c'est le décompte des heures.
 * Chacun peut donc vérifier les siennes, mois par mois. La base ne répond que
 * sur l'appelant : les salaires des collègues restent invisibles.
 */
function OngletPaie() {
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));
  const [etat, setEtat] = useState({ chargement: true, d: null, erreur: null });

  useEffect(() => {
    let vivant = true;
    setEtat((e) => ({ ...e, chargement: true }));
    maPaie(periode)
      .then((d) => vivant && setEtat({ chargement: false, d, erreur: null }))
      .catch((e) => vivant && setEtat({ chargement: false, d: null, erreur: e.message }));
    return () => { vivant = false; };
  }, [periode]);

  const { chargement, d, erreur } = etat;
  const moisPrecedent = () => {
    const [a, m] = periode.split("-").map(Number);
    const t = new Date(Date.UTC(a, m - 2, 1));
    setPeriode(t.toISOString().slice(0, 7));
  };
  const moisSuivant = () => {
    const [a, m] = periode.split("-").map(Number);
    const t = new Date(Date.UTC(a, m, 1));
    if (t <= new Date()) setPeriode(t.toISOString().slice(0, 7));
  };
  const libelleMois = () => {
    try {
      return new Date(periode + "-01T00:00:00").toLocaleDateString("fr-BE",
        { month: "long", year: "numeric" });
    } catch { return periode; }
  };
  const eur = (c) => c == null ? "—"
    : (c / 100).toFixed(2).replace(".", ",") + " €";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "0 16px", marginBottom: 10 }}>
        <button onClick={moisPrecedent} style={navMois}>←</button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 13.5,
          fontWeight: 800, textTransform: "capitalize" }}>{libelleMois()}</span>
        <button onClick={moisSuivant} style={navMois}>→</button>
      </div>

      {chargement && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}
      {erreur && (
        <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>
      )}

      {d && !chargement && (
        <>
          <div style={S.carte}>
            <div style={{ textAlign: "center", padding: "6px 0" }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.encre,
                fontFamily: "ui-monospace, monospace" }}>
                {String(d.heures ?? 0).replace(".", ",")} h
              </div>
              <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
                sur {d.jours_travailles || 0} chantier
                {(d.jours_travailles || 0) > 1 ? "s" : ""}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between",
              padding: "10px 0 0", borderTop: `1px solid ${C.doux}`, marginTop: 10 }}>
              <span style={{ fontSize: 12.5, color: C.muet }}>Taux horaire</span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                {d.taux_horaire ? `${String(d.taux_horaire).replace(".", ",")} €/h` : "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between",
              padding: "8px 0 0" }}>
              <span style={{ fontSize: 13, color: C.encre, fontWeight: 700 }}>
                Brut estimé
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
                {eur(d.brut_centimes)}
              </span>
            </div>

            {d.avertissement && (
              <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 9,
                background: "#FFFBEB", border: "1px solid #FDE68A",
                fontSize: 11.5, color: "#92400E", lineHeight: 1.45 }}>
                {d.avertissement}
              </div>
            )}
            {d.message_net && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: C.fantome,
                            lineHeight: 1.45 }}>
                {d.message_net}
              </div>
            )}
          </div>

          {(d.detail || []).length > 0 && (
            <div style={S.carte}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.fantome,
                textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
                Détail par chantier
              </div>
              {d.detail.map((x, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderTop: `1px solid ${C.doux}` }}>
                  <span style={{ fontSize: 12.5, color: C.muet }}>
                    {new Date(x.date + "T00:00:00").toLocaleDateString("fr-BE",
                      { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.encre }}>
                    {formaterDuree(x.secondes)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ margin: "0 16px 12px", fontSize: 11.5, color: C.fantome,
                        lineHeight: 1.5 }}>
            Ce décompte reprend vos heures déclarées, pauses déduites. Le document
            de paie officiel est établi par le secrétariat social.
          </div>
        </>
      )}
    </>
  );
}

const navMois = {
  width: 36, height: 36, borderRadius: 10, cursor: "pointer",
  border: `1.5px solid ${C.bord}`, background: C.blanc, color: C.encre,
  fontSize: 15, fontWeight: 700,
};
