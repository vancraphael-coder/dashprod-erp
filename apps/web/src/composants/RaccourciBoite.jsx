// =============================================================================
// Raccourci vers la boîte mail.
//
// Dashprod ne sait pas quelle messagerie vous utilisez, et n'a aucun moyen de
// le deviner : l'adresse du compte ne dit rien du webmail (une adresse chez un
// nom de domaine peut être relevée dans Gmail, Outlook ou autre chose).
//
// On demande donc UNE FOIS, puis on retient. Le choix est local à l'appareil —
// c'est une préférence de poste de travail, pas une donnée d'entreprise : la
// même personne peut relever ses mails dans Outlook au bureau et dans Gmail
// sur son téléphone.
// =============================================================================

import React, { useState } from "react";
import { C, S } from "../lib/theme.jsx";

const CLE = "dashprod.webmail";

export const WEBMAILS = Object.freeze([
  { cle: "gmail", nom: "Gmail", url: "https://mail.google.com/" },
  { cle: "outlook", nom: "Outlook", url: "https://outlook.office.com/mail/" },
  { cle: "proton", nom: "Proton", url: "https://mail.proton.me/" },
  { cle: "autre", nom: "Autre…", url: null },
]);

/** Le choix retenu, ou null. Un stockage indisponible ne casse rien. */
export function lireWebmail() {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? JSON.parse(brut) : null;
  } catch { return null; }
}

function ecrireWebmail(v) {
  try { localStorage.setItem(CLE, JSON.stringify(v)); } catch { /* sans effet */ }
}

export function oublierWebmail() {
  try { localStorage.removeItem(CLE); } catch { /* sans effet */ }
}

export default function RaccourciBoite() {
  const [choix, setChoix] = useState(lireWebmail);
  const [ouvert, setOuvert] = useState(false);
  const [perso, setPerso] = useState("");

  function retenir(v) {
    ecrireWebmail(v); setChoix(v); setOuvert(false);
    window.open(v.url, "_blank", "noopener");
  }

  function validerPerso() {
    let u = perso.trim();
    if (!u) return;
    // Sans schéma, `window.open` traiterait l'adresse comme un chemin relatif
    // et ouvrirait une page blanche de Dashprod.
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    retenir({ cle: "autre", nom: "Ma boîte", url: u });
  }

  if (choix?.url && !ouvert) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <a href={choix.url} target="_blank" rel="noreferrer noopener"
           style={{ fontSize: 12.5, fontWeight: 700, color: C.bleu,
                    textDecoration: "none" }}>
          ✉️ Ouvrir {choix.nom}
        </a>
        <button onClick={() => setOuvert(true)}
                title="Changer de messagerie"
                style={{ border: "none", background: "none", cursor: "pointer",
                         fontSize: 11.5, color: C.fantome }}>
          changer
        </button>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)}
              style={{ ...S.boutonLien, padding: 0, fontSize: 12.5 }}>
        ✉️ Ouvrir ma boîte mail
      </button>
    );
  }

  return (
    <div style={{ ...S.carte, margin: "8px 0 0" }}>
      <div style={{ fontSize: 12.5, color: C.encre, fontWeight: 700,
                    marginBottom: 2 }}>
        Quelle messagerie utilisez-vous ?
      </div>
      <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8,
                    lineHeight: 1.5 }}>
        Retenu sur cet appareil seulement — vous pouvez en utiliser une autre
        ailleurs.
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {WEBMAILS.filter((w) => w.url).map((w) => (
          <button key={w.cle} onClick={() => retenir(w)} style={puce}>
            {w.nom}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input style={{ ...S.input, flex: 1 }} value={perso}
               onChange={(e) => setPerso(e.target.value)}
               placeholder="webmail.mondomaine.be" />
        <button style={S.boutonPlein} onClick={validerPerso}>Retenir</button>
      </div>
      <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 6 }}
              onClick={() => setOuvert(false)}>Annuler</button>
    </div>
  );
}

const puce = {
  padding: "7px 13px", borderRadius: 999, cursor: "pointer",
  fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${C.bord}`,
  background: C.blanc, color: C.encre,
};
