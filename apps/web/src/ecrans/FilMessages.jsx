import React, { useEffect, useRef, useState } from "react";
import {
  messagesFil, messageBureau, messageClient,
  televerserPieceMessage, urlPieceMessage,
} from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

/**
 * MAILPROD — fil de messages probant, partagé entre le bureau et l'espace
 * client. Bidirectionnel : chaque partie écrit et lit. Le contenu est un
 * registre immuable côté base (0095) — cet écran ne fait qu'afficher et poster.
 *
 * @param {string} affaireId
 * @param {"entreprise"|"client"} cote  qui utilise l'écran (détermine la commande d'envoi)
 */
export default function FilMessages({ affaireId, cote, amorce, modeles }) {
  const [messages, setMessages] = useState(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [pieces, setPieces] = useState([]);     // pièces en attente d'envoi
  const [chargePiece, setChargePiece] = useState(false);
  const finRef = useRef(null);
  const fichierRef = useRef(null);

  async function charger() {
    try {
      const d = await messagesFil(affaireId);
      setMessages(d.messages || []);
    } catch (e) { setErreur(e.message); setMessages([]); }
  }

  useEffect(() => { charger(); }, [affaireId]);
  useEffect(() => {
    if (finRef.current) finRef.current.scrollIntoView({ block: "end" });
  }, [messages]);

  async function ajouterFichiers(liste) {
    setErreur(null); setChargePiece(true);
    try {
      const ajouts = [];
      for (const f of liste) ajouts.push(await televerserPieceMessage(affaireId, f));
      setPieces((p) => [...p, ...ajouts]);
    } catch (e) { setErreur(e.message); }
    finally { setChargePiece(false); if (fichierRef.current) fichierRef.current.value = ""; }
  }

  async function envoyer() {
    const corps = texte.trim();
    if (!corps && pieces.length === 0) return;
    setEnvoi(true); setErreur(null);
    try {
      if (cote === "client") await messageClient(affaireId, corps, pieces);
      else await messageBureau(affaireId, corps, pieces);
      setTexte(""); setPieces([]);
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnvoi(false); }
  }

  const mien = (m) => m.role === (cote === "client" ? "client" : "entreprise");

  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5,
                    margin: "0 0 10px" }}>
        Échange tracé avec {cote === "client" ? "votre déménageur"
          : "le client"}. Chaque message est horodaté et conservé de façon
        inaltérable — il fait foi en cas de litige.
      </div>

      <div style={{ maxHeight: 380, overflowY: "auto", padding: "4px 2px",
                    display: "flex", flexDirection: "column", gap: 8 }}>
        {messages == null && (
          <div style={{ fontSize: 13, color: C.muet, textAlign: "center", padding: 12 }}>
            Chargement…
          </div>
        )}
        {messages && messages.length === 0 && (
          <div style={{ fontSize: 13, color: C.fantome, textAlign: "center", padding: 16 }}>
            Aucun message pour le moment. Écrivez le premier.
          </div>
        )}
        {(messages || []).map((m) => {
          const aMoi = mien(m);
          return (
            <div key={m.id} style={{ alignSelf: aMoi ? "flex-end" : "flex-start",
                                     maxWidth: "82%" }}>
              <div style={{ padding: "9px 12px", borderRadius: 12,
                background: aMoi ? C.bleu : "#F1F5F9",
                color: aMoi ? "#fff" : C.encre,
                borderBottomRightRadius: aMoi ? 4 : 12,
                borderBottomLeftRadius: aMoi ? 12 : 4,
                fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {m.corps}
                {(m.pieces || []).length > 0 && (
                  <div style={{ marginTop: m.corps ? 8 : 0, display: "flex",
                                flexDirection: "column", gap: 6 }}>
                    {m.pieces.map((p, i) => (
                      <PieceJointe key={i} piece={p} clair={aMoi} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: C.fantome, marginTop: 3,
                            textAlign: aMoi ? "right" : "left" }}>
                {m.role === "entreprise" ? "Déménageur" : "Client"} · {horodate(m.envoye_le)}
                {aMoi && m.lu_le ? " · lu" : ""}
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}

      {/* Bureau : insérer un modèle de mail (confirmation, relance…) rempli. */}
      {cote === "entreprise" && (modeles || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {modeles.map((m) => (
            <button key={m.cle} onClick={() =>
              setTexte((t) => (t ? t + "\n\n" : "") + m.corps)}
              style={{ fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                       border: `1.5px solid ${C.bord}`, background: "#fff",
                       color: C.bleu, borderRadius: 999, padding: "5px 11px" }}>
              + {m.titre}
            </button>
          ))}
        </div>
      )}

      {/* Bureau : reprendre les infos du dossier dans le message (mail affilié). */}
      {cote === "entreprise" && amorce && !texte && (
        <button onClick={() => setTexte(amorce)}
          style={{ ...S.boutonLien, paddingLeft: 0, fontSize: 12, marginTop: 8 }}>
          ⤵ Reprendre les infos du dossier
        </button>
      )}

      {/* Pièces en attente d'envoi */}
      {pieces.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {pieces.map((p, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11.5, background: "#EEF2F8", borderRadius: 8, padding: "4px 8px",
              color: C.encre }}>
              {p.type === "application/pdf" ? "📄" : "🖼️"} {raccourciNom(p.nom)}
              <button onClick={() => setPieces((l) => l.filter((_, j) => j !== i))}
                style={{ border: "none", background: "none", cursor: "pointer",
                         color: C.muet, fontSize: 14, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
        <button onClick={() => fichierRef.current && fichierRef.current.click()}
          disabled={chargePiece} title="Joindre une image ou un PDF"
          style={{ padding: "12px 12px", borderRadius: 10, cursor: "pointer",
                   border: `1.5px solid ${C.bord}`, background: "#fff",
                   fontSize: 16, color: C.muet }}>
          {chargePiece ? "…" : "📎"}
        </button>
        <input ref={fichierRef} type="file" multiple hidden
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files.length && ajouterFichiers([...e.target.files])} />
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)}
          placeholder="Écrire un message…" rows={2}
          style={{ ...S.input, flex: 1, minHeight: 44, resize: "vertical" }} />
        <button onClick={envoyer} disabled={envoi || (!texte.trim() && pieces.length === 0)}
          style={{ ...S.boutonPlein, padding: "12px 16px",
                   opacity: envoi || (!texte.trim() && pieces.length === 0) ? 0.5 : 1 }}>
          {envoi ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

function horodate(iso) {
  try {
    const d = new Date(iso);
    const auj = new Date();
    const memeJour = d.toDateString() === auj.toDateString();
    return memeJour
      ? d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-BE", { day: "2-digit", month: "short",
          hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function raccourciNom(nom) {
  if (!nom) return "fichier";
  return nom.length > 22 ? nom.slice(0, 12) + "…" + nom.slice(-7) : nom;
}

/** Une pièce jointe cliquable : ouvre le fichier via une URL signée courte. */
function PieceJointe({ piece, clair }) {
  const [ouverture, setOuverture] = useState(false);
  async function ouvrir() {
    setOuverture(true);
    try {
      const url = await urlPieceMessage(piece.chemin);
      window.open(url, "_blank", "noopener");
    } catch { /* silencieux : le fichier reste protégé */ }
    finally { setOuverture(false); }
  }
  const estImage = (piece.type || "").startsWith("image/");
  return (
    <button onClick={ouvrir} disabled={ouverture} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
      border: `1px solid ${clair ? "rgba(255,255,255,.4)" : C.bord}`,
      background: clair ? "rgba(255,255,255,.15)" : "#fff",
      color: clair ? "#fff" : C.encre, borderRadius: 8, padding: "6px 9px",
      fontSize: 12, fontWeight: 600, maxWidth: "100%" }}>
      {estImage ? "🖼️" : "📄"} {ouverture ? "Ouverture…" : raccourciNom(piece.nom)}
    </button>
  );
}
