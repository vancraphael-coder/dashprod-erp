// =============================================================================
// Écran — Contrats de stockage (boxe & zone).
//
// Ce sont les deux natures RÉCURRENTES : elles ne se facturent pas une fois
// mais période après période. D'où un écran distinct du dossier — un dossier
// se clôt, un contrat court.
//
// PRINCIPE : aucune facture n'est émise automatiquement. On montre, mois par
// mois, ce qui est dû et ce qui a déjà été facturé ; le bureau décide.
// Facturer sans regard humain un contrat résilié la veille fâche un client
// pour rien, et la correction coûte plus cher que la saisie.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  stockContrats, echeancesStockage, marquerEcheance, obtenirParametresPrix,
  litigesContrat, ouvrirLitigeContrat,
} from "../lib/adaptateur.js";
import { montantEcheance, estFacturee } from "@domaine/stocks/stockage.js";
import { C, S, euros } from "../lib/theme.jsx";

export default function Contrats({ retour }) {
  const [liste, setListe] = useState(null);
  const [echeances, setEcheances] = useState([]);
  const [bareme, setBareme] = useState([]);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ouvert, setOuvert] = useState(null);

  async function recharger() {
    try {
      const [cs, es, pp] = await Promise.all([
        stockContrats().catch(() => []),
        echeancesStockage().catch(() => []),
        obtenirParametresPrix().catch(() => ({})),
      ]);
      setListe(cs); setEcheances(es); setBareme(pp?.stockage_boxes || []);
    } catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { recharger(); }, []);

  // Les échéances regroupées par contrat, du plus récent au plus ancien.
  const parContrat = useMemo(() => {
    const m = new Map();
    for (const e of echeances) {
      if (!m.has(e.contrat_id)) m.set(e.contrat_id, []);
      m.get(e.contrat_id).push(e);
    }
    for (const v of m.values()) {
      v.sort((a, b) => String(b.periode_debut).localeCompare(a.periode_debut));
    }
    return m;
  }, [echeances]);

  const dues = useMemo(
    () => echeances.filter((e) => !estFacturee(e)), [echeances]);

  async function facturer(e) {
    setErr(null); setMsg(null);
    const m = montantEcheance(e, bareme);
    if (m.hors_bareme && !window.confirm(
      "Un box de ce contrat n'entre dans aucune tranche du barème : le montant "
      + "serait de 0 €.\n\nMarquer quand même comme facturé ?")) return;
    try {
      await marquerEcheance(e.contrat_id, e.periode_debut, m.centimes);
      setMsg(`${mois(e.periode_debut)} marqué comme facturé.`);
      await recharger();
    } catch (ex) { setErr(ex.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Retour</button>
        <div style={S.titre}>Contrats</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Boxes et zones — facturés période après période.
        </div>
      </div>

      {err && <div style={{ ...S.carte, color: C.rouge, fontSize: 13 }}>{err}</div>}
      {msg && <div style={{ ...S.carte, color: C.vert, fontSize: 13 }}>{msg}</div>}

      {dues.length > 0 && (
        <div style={{ ...S.carte, borderLeft: `3px solid ${C.ambre}` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
            {dues.length} période{dues.length > 1 ? "s" : ""} à facturer
          </div>
          <div style={{ fontSize: 12, color: C.muet, marginTop: 3 }}>
            Rien n'est émis automatiquement : vous décidez de chaque échéance.
          </div>
        </div>
      )}

      {liste === null && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet,
                      fontSize: 13 }}>Chargement…</div>
      )}
      {liste?.length === 0 && (
        <div style={{ ...S.carte, fontSize: 12.5, color: C.muet }}>
          Aucun contrat. Créez-en un depuis le « + » en choisissant Boxe ou Zone.
        </div>
      )}

      {(liste || []).map((c) => {
        const ses = parContrat.get(c.id) || [];
        const sesDues = ses.filter((e) => !estFacturee(e));
        const estOuvert = ouvert === c.id;
        return (
          <div key={c.id} style={S.carte}>
            <div style={{ display: "flex", alignItems: "center", gap: 10,
                          cursor: "pointer" }}
                 onClick={() => setOuvert(estOuvert ? null : c.id)}>
              <span style={{ fontSize: 19 }}>{c.nature === "box" ? "📦" : "🏭"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
                  {c.client || "—"}
                </div>
                <div style={{ fontSize: 11.5, color: C.muet }}>
                  {c.nature === "box" ? "Boxe" : "Zone"}
                  {" · depuis "}{jour(c.debut)}
                  {c.fin ? ` · jusqu'au ${jour(c.fin)}` : ""}
                </div>
              </div>
              {sesDues.length > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 9px",
                               borderRadius: 999, color: C.ambre,
                               background: `${C.ambre}1F`, whiteSpace: "nowrap" }}>
                  {sesDues.length} due{sesDues.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {estOuvert && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`,
                            paddingTop: 8 }}>
                {ses.length === 0 && (
                  <div style={{ fontSize: 12.5, color: C.muet }}>
                    Aucune période échue.
                  </div>
                )}
                {ses.map((e) => (
                  <Echeance key={e.periode_debut} e={e} bareme={bareme}
                            onFacturer={() => facturer(e)} />
                ))}
                <LitigeContrat contratId={c.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Une période : ce qu'elle vaut, et si elle a déjà été facturée. */
function Echeance({ e, bareme, onFacturer }) {
  const m = montantEcheance(e, bareme);
  const faite = estFacturee(e);

  return (
    <div style={{ padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.encre,
                        textTransform: "capitalize" }}>
            {mois(e.periode_debut)}
          </div>
          {m.lignes.map((l) => (
            <div key={l.cle} style={{ fontSize: 11.5, color: C.muet }}>
              {l.libelle}
            </div>
          ))}
          {/* Le prorata s'annonce : un montant réduit sans explication passe
              pour une erreur, et le client appelle. */}
          {m.proratise && (
            <div style={{ fontSize: 11.5, color: C.bleu }}>
              Prorata — {m.jours_couverts} jour{m.jours_couverts > 1 ? "s" : ""}
              {" sur "}{m.jours_mois} ({euros(m.plein_centimes)} le mois plein)
            </div>
          )}
          {m.hors_bareme && (
            <div style={{ fontSize: 11.5, color: C.rouge }}>
              Un box n'entre dans aucune tranche du barème.
            </div>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.encre,
                      whiteSpace: "nowrap" }}>
          {euros(m.centimes)}
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        {faite ? (
          <span style={{ fontSize: 11.5, color: C.vert, fontWeight: 700 }}>
            Facturé {e.facturee_le ? `le ${jour(e.facturee_le.slice(0, 10))}` : ""}
            {e.montant_facture_centimes != null
              && e.montant_facture_centimes !== m.centimes
              ? ` — ${euros(e.montant_facture_centimes)} à l'époque`
              : ""}
          </span>
        ) : (
          <button style={{ ...S.boutonLien, paddingLeft: 0 }} onClick={onFacturer}>
            Marquer comme facturé
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Les litiges du contrat. Un dégât survenu au cinquième mois d'entreposage ne
 * porte sur aucune affaire : il porte sur le CONTRAT. C'est ce que garantit
 * la contrainte `litiges_porte_sur_une_chose` (migration 0115).
 */
function LitigeContrat({ contratId }) {
  const [liste, setListe] = useState([]);
  const [ouvre, setOuvre] = useState(false);
  const [titre, setTitre] = useState("");
  const [err, setErr] = useState(null);

  async function charger() {
    try { setListe(await litigesContrat(contratId)); }
    catch { setListe([]); }
  }
  useEffect(() => { charger(); }, [contratId]);

  async function creer() {
    setErr(null);
    if (!titre.trim()) { setErr("Décrivez le litige en une phrase."); return; }
    try {
      await ouvrirLitigeContrat(contratId, titre.trim());
      setTitre(""); setOuvre(false); charger();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 8 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: C.muet,
                    textTransform: "uppercase", letterSpacing: ".03em" }}>
        Litiges ({liste.length})
      </div>
      {liste.map((l) => (
        <div key={l.id} style={{ fontSize: 12.5, color: C.encre, marginTop: 5 }}>
          {l.titre}
          <span style={{ color: C.muet }}> — {l.etape || l.etat || "ouvert"}</span>
        </div>
      ))}

      {err && <div style={{ fontSize: 12, color: C.rouge, marginTop: 5 }}>{err}</div>}

      {ouvre ? (
        <div style={{ marginTop: 8 }}>
          <input style={S.input} value={titre} autoFocus
                 onChange={(e) => setTitre(e.target.value)}
                 placeholder="Dégât des eaux sur le mobilier entreposé" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={S.boutonPlein} onClick={creer}>Ouvrir le litige</button>
            <button style={S.boutonLien}
                    onClick={() => { setOuvre(false); setErr(null); }}>Annuler</button>
          </div>
        </div>
      ) : (
        <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 4 }}
                onClick={() => setOuvre(true)}>+ Ouvrir un litige</button>
      )}
    </div>
  );
}

/* ── Dates ──────────────────────────────────────────────────────────────── */

function mois(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
}

function jour(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}
