// =============================================================================
// Écran — Carnet de contacts.
//
// Bâti sur `clients` : ce n'est pas un second fichier, c'est une LECTURE de
// l'existant. Créer un carnet à part aurait fait deux fiches pour un même
// client, deux numéros à tenir à jour, et un jour l'un des deux faux sans
// qu'on sache lequel.
//
// Trois usages, dans cet ordre :
//   · retrouver quelqu'un et l'appeler ;
//   · voir ce qu'il a commandé, rangé par état ;
//   · relancer une mission chez lui SANS retaper ses coordonnées.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { carnet, epinglerContact } from "../lib/adaptateur.js";
import {
  parGroupe, nbMissions, typesHabituels, natureHabituelle,
  coordonneesManquantes,
} from "@domaine/crm/carnet.js";
import { nature as natureDe } from "@domaine/commercial/natures.js";
import { C, S, euros, ETATS_UI } from "../lib/theme.jsx";

export default function Carnet({ retour, ouvrirDossier, nouvelleAffaire }) {
  const [liste, setListe] = useState(null);
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(null);
  const [err, setErr] = useState(null);

  async function charger() {
    try { setListe(await carnet()); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { charger(); }, []);

  // La recherche filtre en local : le carnet tient en mémoire, et un
  // aller-retour serveur à chaque frappe rendrait la saisie saccadée.
  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return liste || [];
    return (liste || []).filter((c) =>
      [c.nom, c.societe, c.tel, c.email, c.ville]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(t)));
  }, [liste, q]);

  async function epingler(c) {
    setErr(null);
    try { await epinglerContact(c.id, !c.epingle); await charger(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Retour</button>
        <div style={S.titre}>Carnet</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Vos contacts et ce qu'ils ont commandé.
        </div>
      </div>

      <div style={{ padding: "0 16px 12px" }}>
        <input style={S.input} value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Nom, société, téléphone…" />
      </div>

      {err && <div style={{ ...S.carte, color: C.rouge, fontSize: 13 }}>{err}</div>}
      {liste === null && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet,
                      fontSize: 13 }}>Chargement…</div>
      )}
      {liste?.length === 0 && (
        <div style={{ ...S.carte, fontSize: 12.5, color: C.muet }}>
          Aucun contact pour l'instant. Ils apparaissent dès le premier dossier.
        </div>
      )}
      {liste?.length > 0 && filtres.length === 0 && (
        <div style={{ ...S.carte, fontSize: 12.5, color: C.muet }}>
          Aucun contact ne correspond à « {q} ».
        </div>
      )}

      {filtres.map((c) => (
        <Fiche key={c.id} c={c} ouvert={ouvert === c.id}
               basculer={() => setOuvert(ouvert === c.id ? null : c.id)}
               onEpingler={() => epingler(c)}
               ouvrirDossier={ouvrirDossier}
               nouvelleAffaire={nouvelleAffaire} />
      ))}
    </div>
  );
}

function Fiche({ c, ouvert, basculer, onEpingler, ouvrirDossier, nouvelleAffaire }) {
  const groupes = parGroupe(c.missions);
  const n = nbMissions(c.missions);
  const types = typesHabituels(c.natures);
  const habituelle = natureHabituelle(c.missions);
  const manque = coordonneesManquantes(c);

  return (
    <div style={S.carte}>
      <div style={{ display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer" }} onClick={basculer}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
            {c.epingle ? "★ " : ""}{c.societe || c.nom}
          </div>
          <div style={{ fontSize: 11.5, color: C.muet }}>
            {c.societe && c.nom !== c.societe ? `${c.nom} · ` : ""}
            {n > 0 ? `${n} mission${n > 1 ? "s" : ""}` : "Aucune mission"}
            {types.length > 0 ? ` · ${types.join(", ")}` : ""}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onEpingler(); }}
                title={c.epingle ? "Retirer des favoris" : "Épingler ce contact"}
                style={{ border: "none", background: "none", cursor: "pointer",
                         fontSize: 16, color: c.epingle ? C.ambre : C.bord }}>
          ★
        </button>
      </div>

      {ouvert && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`,
                      paddingTop: 10 }}>
          {/* Les coordonnées, actionnables : le carnet sert d'abord à joindre
              quelqu'un, pas à le contempler. */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap",
                        marginBottom: 10 }}>
            {c.tel && (
              <a href={`tel:${String(c.tel).replace(/\s/g, "")}`}
                 style={lien}>{c.tel}</a>
            )}
            {c.email && <a href={`mailto:${c.email}`} style={lien}>{c.email}</a>}
          </div>
          {(c.adresse || c.ville) && (
            <div style={{ fontSize: 12, color: C.muet, marginBottom: 8 }}>
              {[c.adresse, [c.cp, c.ville].filter(Boolean).join(" ")]
                .filter(Boolean).join(", ")}
            </div>
          )}
          {c.tva_num && (
            <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8 }}>
              TVA {c.tva_num}
            </div>
          )}
          {manque.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.ambre, marginBottom: 8 }}>
              Sans {manque.join(" ni ")}, ce contact ne sert pas de raccourci.
            </div>
          )}

          {/* Le pré-remplissage : c'est là tout l'intérêt pour un récurrent. */}
          <button style={{ ...S.boutonPlein, marginBottom: 10 }}
                  onClick={() => nouvelleAffaire
                    && nouvelleAffaire(habituelle || "demenagement", c.id)}>
            Nouvelle mission
            {habituelle ? ` — ${natureDe(habituelle)?.titre}` : ""}
          </button>
          {habituelle && (
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: -6,
                          marginBottom: 10 }}>
              Nature proposée d'après ses commandes précédentes.
            </div>
          )}

          {groupes.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.muet }}>
              Aucune mission enregistrée.
            </div>
          )}
          {groupes.map((g) => (
            <div key={g.cle} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muet,
                            textTransform: "uppercase", letterSpacing: ".03em" }}>
                {g.titre} ({g.missions.length})
              </div>
              {g.missions.map((m) => (
                <button key={m.id} onClick={() => ouvrirDossier && ouvrirDossier(m.id)}
                  style={{ display: "flex", width: "100%", alignItems: "center",
                           gap: 8, padding: "7px 0", border: "none",
                           background: "none", cursor: "pointer", textAlign: "left",
                           borderTop: `1px solid ${C.doux}` }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: C.encre }}>
                    {natureDe(m.nature)?.titre || "Dossier"}
                    {m.date ? ` · ${jour(m.date)}` : ""}
                  </span>
                  {m.tvac_centimes != null && (
                    <span style={{ fontSize: 12, color: C.muet }}>
                      {euros(m.tvac_centimes)}
                    </span>
                  )}
                  <span style={{ fontSize: 10.5, fontWeight: 700,
                                 color: ETATS_UI[m.etat]?.couleur || C.muet }}>
                    {ETATS_UI[m.etat]?.libelle || m.etat}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const lien = { fontSize: 13, fontWeight: 700, color: C.bleu,
               textDecoration: "none" };

function jour(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}
