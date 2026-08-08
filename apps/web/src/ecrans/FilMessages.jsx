import React, { useEffect, useRef, useState } from "react";
import { messagesFil, messageBureau, messageClient } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

/**
 * MAILPROD — fil de messages probant, partagé entre le bureau et l'espace
 * client. Bidirectionnel : chaque partie écrit et lit. Le contenu est un
 * registre immuable côté base (0095) — cet écran ne fait qu'afficher et poster.
 *
 * @param {string} affaireId
 * @param {"entreprise"|"client"} cote  qui utilise l'écran (détermine la commande d'envoi)
 */
export default function FilMessages({ affaireId, cote, amorce }) {
  const [messages, setMessages] = useState(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const finRef = useRef(null);

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

  async function envoyer() {
    const corps = texte.trim();
    if (!corps) return;
    setEnvoi(true); setErreur(null);
    try {
      if (cote === "client") await messageClient(affaireId, corps);
      else await messageBureau(affaireId, corps);
      setTexte("");
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

      {/* Bureau : reprendre les infos du dossier dans le message (mail affilié). */}
      {cote === "entreprise" && amorce && !texte && (
        <button onClick={() => setTexte(amorce)}
          style={{ ...S.boutonLien, paddingLeft: 0, fontSize: 12, marginTop: 8 }}>
          ⤵ Reprendre les infos du dossier
        </button>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)}
          placeholder="Écrire un message…" rows={2}
          style={{ ...S.input, flex: 1, minHeight: 44, resize: "vertical" }} />
        <button onClick={envoyer} disabled={envoi || !texte.trim()}
          style={{ ...S.boutonPlein, padding: "12px 16px",
                   opacity: envoi || !texte.trim() ? 0.5 : 1 }}>
          {envoi ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

function horodate(iso) {
  if (!iso) return "";
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
