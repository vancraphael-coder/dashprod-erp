// =============================================================================
// Écran — Offre & Signature.
// Projection du module Documents (S9) : envoi = instanciation figée + C.B.D.
// jointe automatiquement (S6, non désactivable) ; signature = dossier de
// preuve (C-26) qui déverrouille la transition d'affaire vers « confirmé »
// (invariant C-02 : aucun autre chemin n'y mène).
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import { obtenirAffaire, envoyerOffre, obtenirInstance, signerOffre } from "../lib/adaptateur.js";
import { instanceIntacte } from "@domaine/documents/instances.js";
import { C, S, euros } from "../lib/theme.jsx";

const TYPE_PAR_FORMULE = {
  tarifaire: "offre_tarifaire", emballage: "offre_emballage", forfait: "offre_forfait",
};

export default function Offre({ affaireId, retour }) {
  const [affaire, setAffaire] = useState(null);
  const [instance, setInstance] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [signature, setSignature] = useState(false); // pad ouvert ?

  async function recharger() {
    const a = await obtenirAffaire(affaireId);
    setAffaire(a);
    setInstance(await obtenirInstance(affaireId));
  }
  useEffect(() => { recharger(); }, [affaireId]);

  async function envoyer() {
    if (!affaire?.faits) { setErreur("Chiffrez d'abord le devis."); return; }
    setErreur(null); setEnCours(true);
    try {
      const contenu = {
        client: affaire.client?.nom, faits: affaire.faits,
        tvac_centimes: affaire.tvac_centimes, date: new Date().toISOString().slice(0, 10),
      };
      const type = TYPE_PAR_FORMULE[affaire.faits.formule] || "offre_tarifaire";
      await envoyerOffre(affaireId, { type, contenu });
      await recharger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  const intacte = instance && instance.contenu && instance.empreinte_sha256
    ? instanceIntacte({ contenu: instance.contenu, empreinte: instance.empreinte_sha256 })
    : instance ? instanceIntacte(instance) : null;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={S.titre}>Offre — {affaire?.client?.nom || "…"}</div>
      </div>

      {!instance && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, color: C.muet, lineHeight: 1.6 }}>
            L'envoi fige le document : contenu gelé, empreinte calculée, C.B.D.
            jointe automatiquement — plus rien ne peut le modifier ensuite (C-02).
          </div>
          {affaire && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#F8FAFC",
                          borderRadius: 10, border: `1px solid ${C.bord}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, color: C.muet }}>Montant TVAC</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
                  {affaire.tvac_centimes != null ? euros(affaire.tvac_centimes) : "à chiffrer"}
                </span>
              </div>
            </div>
          )}
          {erreur && <div style={{ marginTop: 10, fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
          <button style={{ ...S.boutonPlein, marginTop: 14 }} disabled={enCours} onClick={envoyer}>
            {enCours ? "Instanciation…" : "Envoyer l'offre (fige le document)"}
          </button>
        </div>
      )}

      {instance && instance.statut !== "signee" && (
        <>
          <div style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.vert }}>DOCUMENT ENVOYÉ</span>
              {intacte != null && (
                <span style={{ fontSize: 11, color: intacte ? C.vert : C.rouge }}>
                  {intacte ? "✓ intègre" : "⚠ altéré"}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.muet, marginTop: 6, wordBreak: "break-all" }}>
              Empreinte : {instance.empreinte_sha256 || instance.empreinte}
            </div>
          </div>
          {!signature ? (
            <div style={{ margin: "0 16px" }}>
              <button style={S.boutonPlein} onClick={() => setSignature(true)}>
                Recueillir la signature
              </button>
            </div>
          ) : (
            <PadSignature
              onAnnuler={() => setSignature(false)}
              onSigner={async ({ nom, image }) => {
                setEnCours(true); setErreur(null);
                try {
                  await signerOffre(instance.id, { affaireId, nom, canal: "ecran", image });
                  setSignature(false);
                  await recharger();
                } catch (e) { setErreur(e.message); }
                finally { setEnCours(false); }
              }}
            />
          )}
          {erreur && <div style={{ margin: "0 16px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
        </>
      )}

      {instance && instance.statut === "signee" && (
        <div style={{ ...S.carte, textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.encre, marginTop: 6 }}>
            Offre signée
          </div>
          <div style={{ fontSize: 12.5, color: C.muet, marginTop: 4 }}>
            Le dossier passe automatiquement à l'état Confirmé.
          </div>
        </div>
      )}
    </div>
  );
}

/** Pad de signature tactile minimal — canvas natif, sans dépendance. */
function PadSignature({ onSigner, onAnnuler }) {
  const canvasRef = useRef(null);
  const dessine = useRef(false);
  const [nom, setNom] = useState("");
  const [vide, setVide] = useState(true);

  function pos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function debut(e) {
    dessine.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function trace(e) {
    if (!dessine.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e, canvasRef.current);
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = C.encre;
    ctx.lineTo(x, y); ctx.stroke();
    setVide(false);
  }
  function fin() { dessine.current = false; }
  function effacer() {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setVide(true);
  }

  return (
    <div style={S.carte}>
      <label style={S.label}>Nom du signataire</label>
      <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)}
             placeholder="Cédric Hermand" />
      <label style={S.label}>Signature</label>
      <canvas
        ref={canvasRef} width={440} height={140}
        style={{ width: "100%", height: 140, border: `1.5px dashed ${C.bord}`,
                 borderRadius: 10, touchAction: "none", background: "#fff" }}
        onMouseDown={debut} onMouseMove={trace} onMouseUp={fin} onMouseLeave={fin}
        onTouchStart={debut} onTouchMove={trace} onTouchEnd={fin}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={{ ...S.boutonLien, border: `1.5px solid ${C.bord}`, borderRadius: 10,
                          flex: 1, textAlign: "center" }} onClick={effacer}>Effacer</button>
        <button style={{ ...S.boutonLien, border: `1.5px solid ${C.bord}`, borderRadius: 10,
                          flex: 1, textAlign: "center" }} onClick={onAnnuler}>Annuler</button>
      </div>
      <button
        style={{ ...S.boutonPlein, marginTop: 10, opacity: (nom && !vide) ? 1 : 0.5 }}
        disabled={!nom || vide}
        onClick={() => onSigner({ nom, image: canvasRef.current.toDataURL("image/png") })}
      >
        Valider la signature
      </button>
    </div>
  );
}
