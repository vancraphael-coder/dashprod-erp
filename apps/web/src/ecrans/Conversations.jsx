// =============================================================================
// CONVERSATIONS — la boîte de réception Mailprod du bureau.
//
// La logique du lot 13 va jusqu'au bout de la chaîne :
//   boîte → conversation → client → mission(s).
// Une conversation n'était reliée qu'au DOSSIER ; on la relie désormais aux
// missions de ce dossier. Quand un client écrit « on peut décaler mercredi ? »,
// le bureau voit tout de suite QUELLE mission est concernée et l'ouvre d'un
// geste, au lieu de rouvrir le dossier pour la chercher.
//
// Mise en page : le fil vivait à l'étroit dans une carte à hauteur fixe. Ici
// il occupe la hauteur disponible et l'en-tête reste collé — on lit une
// conversation, pas un encadré.
// =============================================================================

import React, { useEffect, useState } from "react";
import { conversations, missionsAffaire } from "../lib/adaptateur.js";
import { libelleTypeMission } from "@domaine/operations/missions.js";
import FilMessages from "./FilMessages.jsx";
import RaccourciBoite from "../composants/RaccourciBoite.jsx";
import { C, S, couleurMission } from "../lib/theme.jsx";

export default function Conversations({ ouvrirDossier, ouvrirPlanning }) {
  const [liste, setListe] = useState(null);
  const [ouvert, setOuvert] = useState(null);   // {affaire_id, client}
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    conversations().then(setListe).catch((e) => { setErreur(e.message); setListe([]); });
  }, []);

  if (ouvert) {
    return (
      <VueConversation conv={ouvert} onRetour={() => setOuvert(null)}
        ouvrirDossier={ouvrirDossier} ouvrirPlanning={ouvrirPlanning} />
    );
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div style={S.titre}>Conversations</div>
          {/* Le bureau passe son temps entre Dashprod et sa boîte : un aller
              simple évite de rechercher l'onglet à chaque fois. */}
          <RaccourciBoite />
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Tous vos échanges avec les clients, au même endroit.
        </div>
      </div>

      {erreur && <div style={{ margin: "0 16px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      {liste == null && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}
      {liste && liste.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
          Aucune conversation pour le moment.
        </div>
      )}

      {(liste || []).map((c) => (
        <button key={c.affaire_id} onClick={() => setOuvert(c)}
          style={{ ...S.carte, textAlign: "left", cursor: "pointer",
                   border: `1px solid ${c.non_lus > 0 ? C.bleu : C.bord}`,
                   display: "block", boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>
              {c.client || "—"}
            </span>
            <span style={{ fontSize: 11, color: C.fantome, whiteSpace: "nowrap" }}>
              {horodate(c.dernier_le)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12.5, color: C.muet, overflow: "hidden",
                           textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {c.dernier_role === "entreprise" ? "Vous : " : ""}{c.dernier_message}
            </span>
            {c.non_lus > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff",
                background: C.bleu, borderRadius: 999, padding: "2px 8px",
                whiteSpace: "nowrap" }}>{c.non_lus}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Une conversation ouverte : le pont client → mission(s) en tête, puis le fil.
 * L'en-tête est collant et le fil prend la hauteur restante — on lit vraiment
 * l'échange, il ne reste plus tassé dans une petite carte.
 */
function VueConversation({ conv, onRetour, ouvrirDossier, ouvrirPlanning }) {
  const [missions, setMissions] = useState(null);

  useEffect(() => {
    missionsAffaire(conv.affaire_id)
      .then((m) => setMissions(m || []))
      .catch(() => setMissions([]));
  }, [conv.affaire_id]);

  return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column",
                  height: "100vh", paddingBottom: 0 }}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={onRetour}>← Conversations</button>
        <div style={S.titre}>{conv.client || "Conversation"}</div>
      </div>

      {/* LE PONT VERS LES MISSIONS. Ce dont on parle dans le fil, ce sont
          presque toujours des dates : les montrer ici, cliquables, évite
          l'aller-retour par le dossier. */}
      {missions && missions.length > 0 && (
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 7,
                      flexWrap: "wrap" }}>
          {missions.map((m) => {
            const coul = couleurMission(m.type);
            return (
              <button key={m.id}
                onClick={() => ouvrirPlanning
                  ? ouvrirPlanning(m.date)
                  : ouvrirDossier && ouvrirDossier(conv.affaire_id)}
                title={ouvrirPlanning ? "Voir au planning" : "Ouvrir le dossier"}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                  padding: "6px 11px", borderRadius: 999,
                  border: `1.5px solid ${coul}`, background: coul + "14",
                  color: coul }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%",
                               background: coul }} />
                {libelleTypeMission(m.type)}
                {m.date && (
                  <span style={{ color: C.muet, fontWeight: 600 }}>
                    · {jourCourt(m.date)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Le fil occupe tout le reste et défile seul. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto",
                    padding: "0 16px 12px" }}>
        <FilMessages affaireId={conv.affaire_id} cote="entreprise" pleineHauteur />
      </div>

      {ouvrirDossier && (
        <div style={{ padding: "8px 16px",
                      borderTop: `1px solid ${C.bord}`, background: S.page.background }}>
          <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                  onClick={() => ouvrirDossier(conv.affaire_id)}>
            Ouvrir le dossier complet →
          </button>
        </div>
      )}
    </div>
  );
}

function jourCourt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-BE",
      { day: "2-digit", month: "short" });
  } catch { return ""; }
}

function horodate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const auj = new Date();
    return d.toDateString() === auj.toDateString()
      ? d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
  } catch { return ""; }
}
