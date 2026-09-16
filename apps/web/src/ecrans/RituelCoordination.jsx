// =============================================================================
// RITUEL DE COORDINATION — les trous, pas l'argent.
//
// CE QUE LA COORDINATION NE VOIT PAS ICI : les impayés. Ce n'est pas son
// travail, et lui montrer une somme qu'elle ne peut pas encaisser ne l'aide
// pas à couvrir jeudi. Deux postures, deux rituels — c'est précisément
// pourquoi un tableau de bord unique ne fonctionne pour personne.
//
// LE PLANNING MONTRE CE QUI EST PRÉVU. CET ÉCRAN MONTRE CE QUI MANQUE.
// C'est l'inversion qui compte : lundi matin, la question n'est pas « qu'est-ce
// qu'on fait cette semaine » — ça, le planning le dit — mais « qu'est-ce qui
// n'est pas couvert ». Un planning bien rempli cache ses trous ; un écran de
// trous ne montre que ça.
//
// DEUX BLOCS, et le second est le plus grave malgré les apparences :
//
//   1. LES MISSIONS SANS ÉQUIPE. Une date est posée, personne n'est dessus.
//   2. LES DOSSIERS CONFIRMÉS SANS MISSION. Le client a dit oui, il attend une
//      date, et personne ne l'a posée. Ça ne se voit sur AUCUN planning —
//      justement parce que rien n'y a été inscrit.
// =============================================================================

import React, { useEffect, useState } from "react";
import { rituelCoordination } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const jour = (iso) => (iso
  ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-BE",
    { weekday: "short", day: "numeric", month: "short" })
  : "date à poser");

export default function RituelCoordination({ ouvrirDossier, versPlanning }) {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    rituelCoordination()
      .then(setD)
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setD(null); });
  }, []);

  if (!d && !erreur) return null;
  const rien = d && d.trous.nb === 0 && d.sansMission.nb === 0;

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        <div style={S.titre}>Les trous</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {rien
            ? "Les quatorze prochains jours sont couverts."
            : "Ce qui n'est pas couvert dans les quatorze prochains jours."}
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {rien && d && (
        <div style={{ ...S.carte, background: C.teinteVerte,
                      border: `1px solid ${C.filetVert}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.encreVert }}>
            Rien ne manque.
          </div>
          <div style={{ fontSize: 12.5, color: C.encreVert, marginTop: 5,
                        lineHeight: 1.5 }}>
            {d.couverts} chantier{d.couverts > 1 ? "s" : ""} avec une équipe
            affectée. Aucun dossier confirmé sans date.
          </div>
        </div>
      )}

      {d && d.sansMission.nb > 0 && (
        <div style={{ ...S.carte, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: C.encreRouge,
                        textTransform: "uppercase", letterSpacing: ".04em" }}>
            Confirmés sans date
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.encreRouge,
                        marginTop: 2 }}>
            {d.sansMission.nb} dossier{d.sansMission.nb > 1 ? "s" : ""}
          </div>
          {/* Le point le plus grave, et le plus invisible : ça n'apparaît sur
              aucun planning, justement parce que rien n'y a été inscrit. */}
          <div style={{ fontSize: 12.5, color: C.encreRouge, marginTop: 2,
                        lineHeight: 1.5 }}>
            Le client a dit oui et attend une date. Ça n'apparaît sur aucun
            planning — rien n'y a été inscrit.
          </div>
          <div style={{ marginTop: 10 }}>
            {d.sansMission.lignes.map((l) => (
              <Ligne key={l.id} onClick={() => ouvrirDossier && ouvrirDossier(l.id)}
                     gauche={l.client || "Client sans nom"}
                     droite={l.date_souhaitee
                       ? `souhaité ${jour(l.date_souhaitee)}` : "sans souhait"}
                     alerte />
            ))}
          </div>
        </div>
      )}

      {d && d.trous.nb > 0 && (
        <div style={{ ...S.carte, background: C.teinteAmbre,
                      border: `1px solid ${C.filetAmbre}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: C.encreAmbre,
                        textTransform: "uppercase", letterSpacing: ".04em" }}>
            Sans équipe
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.encreAmbre,
                        marginTop: 2 }}>
            {d.trous.nb} chantier{d.trous.nb > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12.5, color: C.encreAmbre, marginTop: 2,
                        lineHeight: 1.5 }}>
            La date est posée, personne n'est affecté.
          </div>
          <div style={{ marginTop: 10 }}>
            {d.trous.lignes.map((l) => (
              <Ligne key={l.id} onClick={() => versPlanning && versPlanning()}
                     gauche={`${jour(l.date)}${l.heure ? ` ${l.heure.slice(0, 5)}` : ""}`}
                     droite={l.client || l.type || ""} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Ligne({ gauche, droite, onClick, alerte = false }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      style={{ display: "flex", width: "100%", gap: 10, alignItems: "baseline",
               padding: "8px 0", background: "none", border: "none",
               borderTop: "1px solid rgba(0,0,0,.07)", textAlign: "left",
               fontFamily: "inherit", cursor: onClick ? "pointer" : "default" }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600,
                     color: C.encre }}>{gauche}</span>
      <span style={{ fontSize: 12.5, flexShrink: 0,
                     fontWeight: alerte ? 700 : 400, color: C.muet }}>{droite}</span>
    </button>
  );
}
