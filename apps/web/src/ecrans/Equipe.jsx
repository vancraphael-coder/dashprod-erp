// =============================================================================
// Écran — Équipe (invitations).
// Réservé à qui détient gerer_referentiels (S3) : le master invite un email et
// choisit son secteur — un rôle de la matrice S3, une seule vérité (ROLES,
// noyau/permissions.js). Résout la demande : « c'est lui qui décide qui est
// dans quel secteur de son entreprise ».
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerMembres, inviterMembre, listerConges, ajouterConge, supprimerConge,
  definirMetier, listerMembresSimples,
} from "../lib/adaptateur.js";
import { ROLES } from "@domaine/noyau/permissions.js";
import { C, S } from "../lib/theme.jsx";

const LIBELLES_ROLE = {
  direction: "Direction", coordination: "Coordination", commercial: "Commercial",
  chef_equipe: "Chef d'équipe", demenageur: "Déménageur",
};
const METIERS = { chef_equipe: "Chef d'équipe", chauffeur: "Chauffeur", demenageur: "Déménageur" };
const COULEUR_METIER = { chef_equipe: "#6366F1", chauffeur: "#2563EB", demenageur: "#64748B" };

export default function Equipe({ retour, integre }) {
  const [membres, setMembres] = useState([]);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState("demenageur");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [metiers, setMetiers] = useState({});   // id → metier (fusion des sources)
  const [conges, setConges] = useState([]);
  const [ouvert, setOuvert] = useState(null);   // fiche membre dépliée
  const [nouveauConge, setNouveauConge] = useState({ debut: "", fin: "" });

  function recharger() {
    listerMembres().then(setMembres).catch(() => {});
    listerMembresSimples().then((l) =>
      setMetiers(Object.fromEntries(l.map((m) => [m.id, m.metier])))).catch(() => {});
    listerConges().then(setConges).catch(() => {});
  }
  useEffect(recharger, []);

  async function changerMetier(id, metier) {
    setErreur(null);
    try { await definirMetier(id, metier); recharger(); }
    catch (e) { setErreur(e.message); }
  }
  async function poserConge(membreId) {
    if (!nouveauConge.debut || !nouveauConge.fin) return;
    setErreur(null);
    try {
      await ajouterConge({ utilisateurId: membreId, ...nouveauConge });
      setNouveauConge({ debut: "", fin: "" });
      recharger();
    } catch (e) { setErreur(e.message); }
  }

  async function inviter() {
    setErreur(null); setSucces(null); setEnCours(true);
    try {
      await inviterMembre({ email, nom, roleCle: role });
      setSucces(`${email} invité·e — secteur ${LIBELLES_ROLE[role]}.`);
      setEmail(""); setNom("");
      recharger();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  }

  const contenu = (
    <>

      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
          Inviter un membre
        </div>
        <div style={{ fontSize: 12, color: C.muet }}>
          Vous décidez du secteur : l'accès et les écrans s'adaptent automatiquement.
        </div>

        <label style={S.label}>Nom</label>
        <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)}
               placeholder="Jean Dupont" />
        <label style={S.label}>Email Google</label>
        <input style={S.input} type="email" value={email}
               onChange={(e) => setEmail(e.target.value)} placeholder="jean@gmail.com" />
        <label style={S.label}>Secteur</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(ROLES).map((cle) => (
            <button key={cle} onClick={() => setRole(cle)} style={{
              padding: "7px 12px", borderRadius: 999, cursor: "pointer",
              border: `1.5px solid ${role === cle ? C.bleu : C.bord}`,
              background: role === cle ? "#E7EFFC" : C.blanc,
              color: role === cle ? C.bleu : C.muet, fontSize: 12, fontWeight: 600,
            }}>{LIBELLES_ROLE[cle] || cle}</button>
          ))}
        </div>

        {erreur && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#FEF2F2",
                        border: "1px solid #FECACA", borderRadius: 9, color: "#991B1B",
                        fontSize: 12.5 }}>{erreur}</div>
        )}
        {succes && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#ECFDF5",
                        border: "1px solid #A7F3D0", borderRadius: 9, color: "#065F46",
                        fontSize: 12.5 }}>{succes}</div>
        )}

        <button style={{ ...S.boutonPlein, marginTop: 14 }} disabled={!email || enCours}
                onClick={inviter}>
          {enCours ? "Invitation…" : "Inviter"}
        </button>
      </div>

      <div style={{ padding: "0 16px 8px", fontSize: 12, fontWeight: 700, color: C.muet }}>
        MEMBRES ({membres.length})
      </div>
      {membres.map((m) => {
        const ouvertIci = ouvert === m.id;
        const metier = metiers[m.id] || "demenageur";
        const sesConges = conges.filter((c) => c.utilisateur_id === m.id);
        return (
          <div key={m.id} style={{ ...S.carte, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", cursor: "pointer" }}
                 onClick={() => setOuvert(ouvertIci ? null : m.id)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>
                  {m.nom || m.email}
                </div>
                <div style={{ fontSize: 12, color: C.muet }}>{m.email}</div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff",
                  background: COULEUR_METIER[metier], borderRadius: 999, padding: "3px 8px" }}>
                  {METIERS[metier]}
                </span>
                {sesConges.length > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400E",
                    background: "#FFFBEB", borderRadius: 999, padding: "3px 8px" }}>
                    {sesConges.length} congé{sesConges.length > 1 ? "s" : ""}
                  </span>
                )}
                {m.roles.length === 0 && (
                  <span style={{ fontSize: 11, color: C.rouge }}>en attente</span>
                )}
              </div>
            </div>

            {ouvertIci && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 8 }}>
                {/* Rôles d'ACCÈS (permissions, S3) — informatif */}
                {m.roles.length > 0 && (
                  <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8 }}>
                    Accès : {m.roles.map((r) => LIBELLES_ROLE[r] || r).join(", ")}
                  </div>
                )}

                {/* Métier TERRAIN — distinct des permissions (synthèse §4) */}
                <label style={S.label}>Métier terrain</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(METIERS).map(([cle, lib]) => (
                    <button key={cle} onClick={() => changerMetier(m.id, cle)} style={{
                      flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
                      fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${metier === cle ? COULEUR_METIER[cle] : C.bord}`,
                      background: metier === cle ? COULEUR_METIER[cle] : "#fff",
                      color: metier === cle ? "#fff" : C.muet,
                    }}>{lib}</button>
                  ))}
                </div>

                {/* Congés : saisie directe direction (créés approuvés) */}
                <label style={S.label}>Congés</label>
                {sesConges.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between",
                                            alignItems: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 12.5, color: C.encre }}>
                      {c.debut} → {c.fin}{c.motif ? ` · ${c.motif}` : ""}
                    </span>
                    <button onClick={async () => { await supprimerConge(c.id); recharger(); }}
                            style={{ ...S.boutonLien, color: C.rouge, padding: "2px 6px" }}>
                      ×
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input style={{ ...S.input, flex: 1 }} type="date" value={nouveauConge.debut}
                         onChange={(e) => setNouveauConge({ ...nouveauConge, debut: e.target.value })} />
                  <input style={{ ...S.input, flex: 1 }} type="date" value={nouveauConge.fin}
                         onChange={(e) => setNouveauConge({ ...nouveauConge, fin: e.target.value })} />
                  <button style={{ ...S.boutonPlein, width: "auto", padding: "0 14px", marginTop: 0,
                                    opacity: nouveauConge.debut && nouveauConge.fin ? 1 : 0.5 }}
                          disabled={!nouveauConge.debut || !nouveauConge.fin}
                          onClick={() => poserConge(m.id)}>+</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
  if (integre) return contenu;
  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Équipe</div>
      </div>
      {contenu}
    </div>
  );
}
