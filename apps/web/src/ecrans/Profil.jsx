// =============================================================================
// Écran — Compte (personnel).
//
// Le Compte est PERSONNEL, y compris pour un administrateur : son inventaire,
// ses vêtements, ses congés. Les réglages de l'entreprise ont quitté cet écran
// et vivent désormais dans Paramètres, accessible d'ici pour qui en a le droit.
//
// L'inventaire s'appuie sur les mêmes fonctions que le profil Terrain :
// une seule table equipements_rh, deux portes d'entrée.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerEquipement, ajouterEquipement, changerEtatEquipement,
  listerConges, ajouterConge, supprimerConge, supprimerEquipement, modeDonnees,
} from "../lib/adaptateur.js";
import { deconnecter } from "../lib/supabase.js";
import { C, S } from "../lib/theme.jsx";

const ETATS = { neuf: "Neuf", bon: "Bon", use: "Usé", a_remplacer: "À remplacer" };
const COULEUR = { neuf: C.bleu, bon: C.vert, use: C.ambre, a_remplacer: C.rouge };
const SUITE = { bon: "use", use: "a_remplacer", a_remplacer: "neuf", neuf: "bon" };

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

const jour = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE",
      { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

export default function Profil({ profil, versParametres, versDiagnostic, peutConfigurer }) {
  const [onglet, setOnglet] = useState("inventaire");

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        <div style={S.titre}>Compte</div>
      </div>

      <div style={S.carte}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
          {profil?.nom || "—"}
        </div>
        <div style={{ fontSize: 13, color: C.muet }}>{profil?.email || ""}</div>
        {profil?.capacites && (
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
            {profil.capacites.length} capacités actives
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, margin: "0 16px 12px" }}>
        {[["inventaire", "Outils & vêtements"], ["conges", "Mes congés"]].map(([cle, lib]) => (
          <button key={cle} onClick={() => setOnglet(cle)} style={{
            flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
            fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
            background: onglet === cle ? "#E7EFFC" : C.blanc,
            color: onglet === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      {onglet === "inventaire" ? <Inventaire profil={profil} /> : <Conges profil={profil} />}

      {peutConfigurer && versParametres && (
        <div style={{ margin: "18px 16px 0" }}>
          <button onClick={versParametres} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14,
            border: `1px solid ${C.bord}`, borderRadius: 14, background: C.blanc,
            boxShadow: "0 1px 3px rgba(15,23,42,.05)", cursor: "pointer",
            textAlign: "left" }}>
            <span style={{ fontSize: 19 }}>⚙️</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.encre }}>
                Paramètres
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: C.muet, marginTop: 2 }}>
                Barème, coûts, catalogues, textes, archivage.
              </span>
            </span>
            <span style={{ color: C.fantome, fontSize: 18 }}>›</span>
          </button>
        </div>
      )}

      <div style={{ margin: "0 16px" }}>
        <button onClick={versDiagnostic} style={{ background: "none", border: "none",
          color: C.bleu, fontSize: 13, fontWeight: 600, cursor: "pointer",
          padding: "18px 2px 4px" }}>
          Diagnostic de branchement
        </button>
        {modeDonnees() === "reel" && (
          <button onClick={async () => { await deconnecter(); window.location.reload(); }}
            style={{ display: "block", width: "100%", marginTop: 8, padding: 13,
              border: "1.5px solid #FECACA", borderRadius: 11, background: "#FEF2F2",
              color: "#991B1B", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Se déconnecter
          </button>
        )}
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Inventaire({ profil }) {
  const [liste, setListe] = useState([]);
  const [creation, setCreation] = useState(false);
  const [ajout, setAjout] = useState({ categorie: "outil", article: "" });
  const monId = profil?.utilisateur_id;

  function recharger() {
    if (monId) listerEquipement(monId).then(setListe).catch(() => {});
  }
  useEffect(recharger, [monId]);

  async function creerStandard() {
    setCreation(true);
    for (const art of INVENTAIRE_STANDARD) await ajouterEquipement(monId, art).catch(() => {});
    setCreation(false);
    recharger();
  }
  async function ajouterArticle() {
    const nom = ajout.article.trim();
    if (!nom || !monId) return;
    await ajouterEquipement(monId, { categorie: ajout.categorie, article: nom }).catch(() => {});
    setAjout((a) => ({ ...a, article: "" }));
    recharger();
  }
  async function cycler(art) {
    await changerEtatEquipement(art.id, SUITE[art.etat] || "bon", monId);
    recharger();
  }

  async function retirer(art) {
    await supprimerEquipement(art.id).catch(() => {});
    recharger();
  }

  const rendre = (arr) => arr.map((art) => (
    <div key={art.id} style={{
      display: "flex", width: "100%", alignItems: "center", gap: 8,
      padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: "#fff",
      border: `1.5px solid ${art.etat === "a_remplacer" ? "#FECACA" : C.bord}` }}>
      <span onClick={() => cycler(art)}
            style={{ flex: 1, fontSize: 13.5, color: C.encre, fontWeight: 600,
                     cursor: "pointer" }}>{art.article}</span>
      <span onClick={() => cycler(art)}
            style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                     color: "#fff", cursor: "pointer",
                     background: COULEUR[art.etat] || C.muet }}>
        {ETATS[art.etat] || art.etat}
      </span>
      <button onClick={() => retirer(art)} title="Retirer cet article"
              style={{ border: "none", background: "none", cursor: "pointer",
                       fontSize: 15, color: C.rouge, padding: "2px 4px",
                       lineHeight: 1 }}>✕</button>
    </div>
  ));

  if (liste.length === 0) {
    return (
      <div style={{ ...S.carte, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.muet, marginBottom: 12 }}>
          Aucun inventaire pour le moment.
        </div>
        <button style={S.boutonPlein} onClick={creerStandard} disabled={creation}>
          {creation ? "Création…" : "Créer mon inventaire standard"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Vêtements</label>
        {rendre(liste.filter((x) => x.categorie === "vetement"))}
        <label style={S.label}>Outils</label>
        {rendre(liste.filter((x) => x.categorie === "outil"))}
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Ajouter un article</label>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...S.input, width: 118 }} value={ajout.categorie}
                  onChange={(e) => setAjout((a) => ({ ...a, categorie: e.target.value }))}>
            <option value="outil">Outil</option>
            <option value="vetement">Vêtement</option>
          </select>
          <input style={{ ...S.input, flex: 1 }} value={ajout.article} placeholder="Nom"
                 onChange={(e) => setAjout((a) => ({ ...a, article: e.target.value }))}
                 onKeyDown={(e) => e.key === "Enter" && ajouterArticle()} />
          <button onClick={ajouterArticle} style={{
            padding: "11px 14px", borderRadius: 10, border: "none", background: C.bleu,
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+</button>
        </div>
        <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
          Touchez un article pour changer son état (Bon → Usé → À remplacer →
          Neuf). Le bureau voit l'état en direct dans Ressources.
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Conges({ profil }) {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState({ debut: "", fin: "", motif: "" });
  const [erreur, setErreur] = useState(null);
  const monId = profil?.utilisateur_id;

  function recharger() {
    listerConges()
      .then((c) => setListe((c || []).filter((x) => x.utilisateur_id === monId)))
      .catch((e) => setErreur(e.message));
  }
  useEffect(recharger, [monId]);

  async function ajouter() {
    setErreur(null);
    if (!form.debut || !form.fin) { setErreur("Indiquez une date de début et de fin."); return; }
    if (form.fin < form.debut) { setErreur("La date de fin précède la date de début."); return; }
    try {
      await ajouterConge({ utilisateurId: monId, ...form });
      setForm({ debut: "", fin: "", motif: "" });
      recharger();
    } catch (e) { setErreur(e.message); }
  }

  async function retirer(id) {
    setErreur(null);
    try { await supprimerConge(id); recharger(); }
    catch (e) { setErreur(e.message); }
  }

  return (
    <>
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>
          {liste.length === 0 ? "Aucun congé enregistré" : `${liste.length} congé${liste.length > 1 ? "s" : ""}`}
        </label>
        {liste.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10,
                                   padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: C.encre }}>
                {jour(c.debut)} → {jour(c.fin)}
              </span>
              {c.motif && (
                <span style={{ display: "block", fontSize: 11.5, color: C.fantome, marginTop: 2 }}>
                  {c.motif}
                </span>
              )}
            </span>
            <button onClick={() => retirer(c.id)} style={{ border: "none", background: "none",
              cursor: "pointer", fontSize: 15, color: C.rouge, padding: "2px 6px" }}>✕</button>
          </div>
        ))}
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Poser un congé</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} type="date" value={form.debut}
                 onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))} />
          <input style={{ ...S.input, flex: 1 }} type="date" value={form.fin}
                 onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))} />
        </div>
        <input style={{ ...S.input, marginTop: 8 }} value={form.motif}
               placeholder="Motif (facultatif)"
               onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} />
        {erreur && (
          <div style={{ fontSize: 12.5, color: C.rouge, marginTop: 8 }}>{erreur}</div>
        )}
        <button style={{ ...S.boutonPlein, marginTop: 10 }} onClick={ajouter}>
          Enregistrer le congé
        </button>
        <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
          Les congés apparaissent dans le planning et bloquent l'affectation aux
          chantiers sur la période.
        </div>
      </div>
    </>
  );
}
