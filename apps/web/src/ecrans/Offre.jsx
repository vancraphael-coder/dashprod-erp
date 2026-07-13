// =============================================================================
// Écran — Offre & Signature.
// Trois temps : (1) APERÇU vivant du contrat, tant que rien n'est envoyé ;
// (2) ENVOI = instanciation figée (contenu gelé + empreinte + C.B.D. jointe,
// S6/C-02) — le contrat rendu vient dès lors du contenu FIGÉ, plus de la base
// courante ; (3) SIGNATURE (C-26) qui déverrouille la transition vers
// « confirmé » — aucun autre chemin n'y mène.
// Impression : window.print() + CSS ciblant .contrat-imprimable (index.html).
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import {
  obtenirAffaire, composerOffre, envoyerOffre, obtenirInstance, signerOffre,
} from "../lib/adaptateur.js";
import { instanceIntacte } from "@domaine/documents/instances.js";
import { ACOMPTE_PCT } from "@domaine/documents/cgv.js";
import Contrat from "./Contrat.jsx";
import { C, S, euros } from "../lib/theme.jsx";

const TYPE_PAR_FORMULE = {
  tarifaire: "offre_tarifaire", emballage: "offre_emballage", forfait: "offre_forfait",
};

export default function Offre({ affaireId, retour }) {
  const [affaire, setAffaire] = useState(null);
  const [instance, setInstance] = useState(null);
  const [apercu, setApercu] = useState(null);   // contenu composé, avant envoi
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [padOuvert, setPadOuvert] = useState(false);

  async function recharger() {
    setAffaire(await obtenirAffaire(affaireId));
    const inst = await obtenirInstance(affaireId);
    setInstance(inst);
    if (!inst) setApercu(await composerOffre(affaireId));
  }
  useEffect(() => { recharger(); }, [affaireId]);

  async function envoyer() {
    setErreur(null); setEnCours(true);
    try {
      const contenu = await composerOffre(affaireId);   // recomposé à l'instant du gel
      const type = TYPE_PAR_FORMULE[contenu.formule] || "offre_tarifaire";
      await envoyerOffre(affaireId, { type, contenu });
      await recharger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  if (!affaire) return null;

  const contenu = instance?.contenu || apercu;
  const signee = instance?.statut === "signee";
  const chiffree = affaire.tvac_centimes != null;
  const intacte = instance?.contenu
    ? instanceIntacte({
        contenu: instance.contenu,
        empreinte: instance.empreinte_sha256 || instance.empreinte,
      })
    : null;
  const acompte = contenu ? Math.round(contenu.tvac_centimes * ACOMPTE_PCT / 100) : 0;

  return (
    <div style={S.page}>
      <div style={{ ...S.entete }} className="no-print">
        <button style={S.boutonLien} onClick={retour}>← Dossier</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.titre}>Offre — {affaire.client?.nom || "…"}</div>
          {instance && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
              background: signee ? "#ECFDF5" : "#EFF6FF",
              color: signee ? "#065F46" : "#1E40AF",
            }}>{signee ? "SIGNÉE" : "ENVOYÉE"}</span>
          )}
        </div>
      </div>

      {!chiffree && (
        <div style={{ ...S.carte, color: C.muet, fontSize: 13 }}>
          Cette affaire n'est pas encore chiffrée — établissez le devis d'abord.
        </div>
      )}

      {/* Le document lui-même : aperçu vivant, puis contenu figé après envoi. */}
      {chiffree && contenu && (
        <Contrat contenu={contenu} signature={instance?.signature} />
      )}

      {/* Preuve d'intégrité (spécifique Dashprod, discret, hors impression) */}
      {instance && (
        <div className="no-print" style={{ ...S.carte, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: C.muet }}>
              Document scellé · C.B.D. jointe
            </span>
            {intacte != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: intacte ? C.vert : C.rouge }}>
                {intacte ? "✓ intègre" : "⚠ altéré"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.fantome, marginTop: 4, wordBreak: "break-all" }}>
            {instance.empreinte_sha256 || instance.empreinte}
          </div>
        </div>
      )}

      {erreur && (
        <div className="no-print" style={{ margin: "0 16px 10px", fontSize: 12.5, color: C.rouge }}>
          {erreur}
        </div>
      )}

      {/* Actions */}
      <div className="no-print" style={{ margin: "0 16px 20px" }}>
        {!instance && chiffree && (
          <>
            <button style={S.boutonPlein} disabled={enCours} onClick={envoyer}>
              {enCours ? "Instanciation…" : "Envoyer l'offre (fige le document)"}
            </button>
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8, textAlign: "center",
                          lineHeight: 1.5 }}>
              L'envoi gèle le document et calcule son empreinte : plus rien ne pourra
              le modifier, même si les tarifs changent.
            </div>
          </>
        )}

        {instance && !signee && !padOuvert && (
          <button style={S.boutonPlein} onClick={() => setPadOuvert(true)}>
            Recueillir la signature du client
          </button>
        )}

        {instance && !signee && padOuvert && (
          <PadSignature
            enCours={enCours}
            onAnnuler={() => setPadOuvert(false)}
            onSigner={async ({ nom, image }) => {
              setEnCours(true); setErreur(null);
              try {
                await signerOffre(instance.id, { affaireId, nom, canal: "ecran", image });
                setPadOuvert(false);
                await recharger();
              } catch (e) { setErreur(e.message); }
              finally { setEnCours(false); }
            }}
          />
        )}

        {signee && (
          <div style={{ padding: "10px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0",
                        borderRadius: 10, fontSize: 12.5, color: "#065F46", fontWeight: 600,
                        marginBottom: 10 }}>
            Offre acceptée — le dossier est confirmé. Acompte de {ACOMPTE_PCT} % à
            réclamer : <b>{euros(acompte)}</b>.
          </div>
        )}

        {instance && (
          <button style={{ ...S.boutonLien, width: "100%", textAlign: "center", marginTop: 10,
                            border: `1.5px solid ${C.bord}`, borderRadius: 11, padding: "11px" }}
                  onClick={() => window.print()}>
            🖨️ Imprimer / Enregistrer en PDF
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Pad de signature — pointer events (doigt, stylet, souris) et mise à l'échelle
 * devicePixelRatio pour un tracé net sur écran haute densité.
 */
function PadSignature({ onSigner, onAnnuler, enCours }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const wrapRef = useRef(null);
  const dessine = useRef(false);
  const precedent = useRef(null);
  const [nom, setNom] = useState("");
  const [encre, setEncre] = useState(false);

  useEffect(() => {
    function preparer() {
      const cv = canvasRef.current, w = wrapRef.current;
      if (!cv || !w) return;
      const dpr = window.devicePixelRatio || 1;
      const largeur = w.clientWidth, hauteur = 160;
      cv.width = largeur * dpr; cv.height = hauteur * dpr;
      cv.style.width = largeur + "px"; cv.style.height = hauteur + "px";
      const ctx = cv.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "#0F172A";
      ctxRef.current = ctx;
    }
    preparer();
    window.addEventListener("resize", preparer);
    return () => window.removeEventListener("resize", preparer);
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const debut = (e) => {
    e.preventDefault();
    dessine.current = true; setEncre(true);
    precedent.current = pos(e);
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
  };
  const trace = (e) => {
    if (!dessine.current) return;
    const p = pos(e), ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(precedent.current.x, precedent.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    precedent.current = p;
  };
  const fin = () => { dessine.current = false; };
  const effacer = () => {
    const cv = canvasRef.current;
    ctxRef.current.clearRect(0, 0, cv.width, cv.height);
    setEncre(false);
  };

  return (
    <div style={{ ...S.carte, margin: "0 0 10px" }}>
      <label style={{ ...S.label, marginTop: 0 }}>Nom du signataire</label>
      <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)}
             placeholder="Prénom Nom" />
      <label style={S.label}>Signature</label>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={debut} onPointerMove={trace}
          onPointerUp={fin} onPointerLeave={fin}
          style={{ width: "100%", height: 160, border: `1.5px dashed ${C.bord}`,
                   borderRadius: 12, background: "#fff", touchAction: "none" }}
        />
        {!encre && (
          <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                         pointerEvents: "none", color: C.fantome, fontSize: 13 }}>
            Signez ici avec le doigt
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={{ ...S.boutonLien, flex: 1, textAlign: "center",
                          border: `1.5px solid ${C.bord}`, borderRadius: 10 }}
                onClick={effacer}>Effacer</button>
        <button style={{ ...S.boutonLien, flex: 1, textAlign: "center",
                          border: `1.5px solid ${C.bord}`, borderRadius: 10 }}
                onClick={onAnnuler}>Annuler</button>
      </div>
      <button
        style={{ ...S.boutonPlein, marginTop: 10, opacity: (nom && encre && !enCours) ? 1 : 0.5 }}
        disabled={!nom || !encre || enCours}
        onClick={() => onSigner({ nom, image: canvasRef.current.toDataURL("image/png") })}
      >
        {enCours ? "Enregistrement…" : "Valider la signature"}
      </button>
    </div>
  );
}
