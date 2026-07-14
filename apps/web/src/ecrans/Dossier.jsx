// =============================================================================
// Écran — Dossier (hub central).
// Modèle : roovers-mobile.jsx (fiche à sections : Contact, Relevé, Devis,
// Offre, Facture). Le volet Contact est inline : adresses multiples de
// chargement/déchargement avec étage, ascenseur, monte-meubles (table
// affaire_adresses du Module 3, enfin projetée), date/heure souhaitées,
// remarques. Les autres sections mènent aux écrans dédiés.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  obtenirAffaire, obtenirContact, sauverContact,
  listerVehicules, obtenirCamionsAffaire, sauverCamionsAffaire,
} from "../lib/adaptateur.js";
import { alertesVehicule } from "@domaine/flotte/vehicules.js";
import { urlItineraire } from "@domaine/communication/brief.js";
import { C, S, Badge, euros } from "../lib/theme.jsx";

function adrVide() {
  return { id: "a" + Math.random().toString(36).slice(2, 8), adresse: "", type: "maison",
           etage: "", ascenseur: false, monteMeubles: false };
}

export default function Dossier({ affaireId, retour, versReleve, versDevis, versOffre, versFacture, versMail }) {
  const [affaire, setAffaire] = useState(null);
  const [contact, setContact] = useState(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [flotte, setFlotte] = useState([]);
  const [camions, setCamions] = useState([]);

  useEffect(() => {
    obtenirAffaire(affaireId).then(setAffaire);
    listerVehicules().then(setFlotte).catch(() => {});
    obtenirCamionsAffaire(affaireId).then(setCamions).catch(() => {});
    obtenirContact(affaireId).then((c) => setContact({
      ...c,
      charges: c.charges.length ? c.charges : [adrVide()],
      decharges: c.decharges.length ? c.decharges : [adrVide()],
    }));
  }, [affaireId]);

  if (!affaire || !contact) return null;

  function majAdr(liste, id, champ, valeur) {
    setContact((c) => ({
      ...c,
      [liste]: c[liste].map((a) => a.id === id ? { ...a, [champ]: valeur } : a),
    }));
    setSauve(false);
  }
  function ajouterAdr(liste) {
    setContact((c) => ({ ...c, [liste]: [...c[liste], adrVide()] }));
    setSauve(false);
  }
  function retirerAdr(liste, id) {
    setContact((c) => ({ ...c, [liste]: c[liste].filter((a) => a.id !== id) }));
    setSauve(false);
  }
  function maj(champ, valeur) { setContact((c) => ({ ...c, [champ]: valeur })); setSauve(false); }

  async function basculerCamion(id) {
    const suivant = camions.includes(id)
      ? camions.filter((x) => x !== id) : [...camions, id];
    setCamions(suivant);
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try {
      await sauverContact(affaireId, contact);
      await sauverCamionsAffaire(affaireId, camions);
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  const chiffree = affaire.tvac_centimes != null;
  const facturable = ["confirme", "effectue", "facture", "paye"].includes(affaire.etat);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.titre}>{affaire.client?.nom || "Dossier"}</div>
          <Badge etat={affaire.etat} />
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {affaire.client?.tel || "—"}
          {chiffree && <> · <b style={{ color: C.encre }}>{euros(affaire.tvac_centimes)}</b></>}
        </div>
      </div>

      {/* Sections du parcours */}
      <div style={{ padding: "0 16px", display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        {[
          ["📦 Relevé", () => versReleve(affaireId), true],
          ["💶 Devis", () => versDevis(affaireId), true],
          ["✍️ Offre", () => versOffre(affaireId), chiffree],
          ["✉️ Mail", () => versMail && versMail(affaireId), chiffree],
          ["🧾 Facture", () => versFacture(affaireId), facturable],
        ].map(([lib, fn, actif]) => (
          <button key={lib} onClick={actif ? fn : undefined} style={{
            border: `1.5px solid ${C.bord}`, background: C.blanc,
            color: actif ? C.encre : C.fantome, borderRadius: 999,
            padding: "7px 13px", fontSize: 12.5, fontWeight: 700,
            cursor: actif ? "pointer" : "default", whiteSpace: "nowrap",
            opacity: actif ? 1 : 0.55,
          }}>{lib}</button>
        ))}
      </div>

      {/* Date & heure souhaitées */}
      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
          Date souhaitée
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Date</label>
            <input style={S.input} type="date" value={contact.date}
                   onChange={(e) => maj("date", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Heure</label>
            <input style={S.input} type="time" value={contact.heure}
                   onChange={(e) => maj("heure", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Camions pressentis — reportés sur la mission à la confirmation (0022).
          Un camion en alerte (méca urgente, CT expiré) reste sélectionnable
          mais s'affiche en rouge : le système signale, l'humain décide. */}
      {flotte.length > 0 && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 8 }}>
            Camions ({camions.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {flotte.map((v) => {
              const sel = camions.includes(v.id);
              const alerte = alertesVehicule(v).niveau === "urgent";
              return (
                <button key={v.id} onClick={() => basculerCamion(v.id)} style={{
                  padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600,
                  border: `1.5px solid ${sel ? C.bleu : alerte ? "#F3C7C7" : C.bord}`,
                  background: sel ? "#E7EFFC" : alerte ? "#FEF2F2" : C.blanc,
                  color: sel ? C.bleu : alerte ? C.rouge : C.encre,
                }}>
                  {alerte ? "⚠ " : "🚛 "}{v.nom}
                  <span style={{ color: sel ? C.bleu : C.fantome, fontWeight: 500 }}>
                    {" "}· {v.volume_m3 || "?"} m³
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Adresses */}
      <BlocAdresses titre="Chargement" liste={contact.charges}
        onMaj={(id, ch, v) => majAdr("charges", id, ch, v)}
        onAjouter={() => ajouterAdr("charges")}
        onRetirer={(id) => retirerAdr("charges", id)} />
      <BlocAdresses titre="Déchargement" liste={contact.decharges}
        onMaj={(id, ch, v) => majAdr("decharges", id, ch, v)}
        onAjouter={() => ajouterAdr("decharges")}
        onRetirer={(id) => retirerAdr("decharges", id)} />

      {/* Itinéraire multi-arrêts : zéro API payante — Maps s'ouvre, on lit
          distance et durée (alignement 02 §3). */}
      {(() => {
        const url = urlItineraire(contact.charges, contact.decharges);
        return url ? (
          <div style={{ margin: "0 16px 14px" }}>
            <a href={url} target="_blank" rel="noreferrer" style={{
              display: "block", textAlign: "center", padding: "13px",
              borderRadius: 12, textDecoration: "none", fontSize: 14, fontWeight: 700,
              color: "#fff", background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            }}>
              🗺️ Ouvrir l'itinéraire (Google Maps)
            </a>
          </div>
        ) : null;
      })()}

      {/* Remarques */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Remarques</label>
        <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }}
                  value={contact.notes} onChange={(e) => maj("notes", e.target.value)}
                  placeholder="Piano au salon. Rue étroite. Cuisine à démonter…" />
      </div>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      <div style={{ margin: "0 16px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Dossier enregistré" : "Enregistrer le dossier"}
        </button>
      </div>
    </div>
  );
}

function BlocAdresses({ titre, liste, onMaj, onAjouter, onRetirer }) {
  return (
    <div style={S.carte}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
        {titre} ({liste.length})
      </div>
      {liste.map((a, i) => (
        <div key={a.id} style={{ borderTop: i > 0 ? `1px solid ${C.bord}` : "none",
                                  paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0 }}>
          <label style={S.label}>Adresse {liste.length > 1 ? i + 1 : ""}</label>
          <input style={S.input} value={a.adresse}
                 onChange={(e) => onMaj(a.id, "adresse", e.target.value)}
                 placeholder="Rue des Tulipes 14, 1300 Wavre" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Type</label>
              <select style={S.input} value={a.type}
                      onChange={(e) => onMaj(a.id, "type", e.target.value)}>
                <option value="maison">Maison</option>
                <option value="appart">Appartement</option>
                <option value="bureau">Bureau</option>
                <option value="garde-meuble">Garde-meuble</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Étage</label>
              <input style={S.input} value={a.etage}
                     onChange={(e) => onMaj(a.id, "etage", e.target.value)}
                     placeholder="RDC / 2e" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.ascenseur}
                     onChange={(e) => onMaj(a.id, "ascenseur", e.target.checked)} />
              Ascenseur
            </label>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.monteMeubles}
                     onChange={(e) => onMaj(a.id, "monteMeubles", e.target.checked)} />
              Monte-meubles
            </label>
            {liste.length > 1 && (
              <button onClick={() => onRetirer(a.id)}
                      style={{ ...S.boutonLien, color: C.rouge, marginLeft: "auto" }}>
                Retirer
              </button>
            )}
          </div>
        </div>
      ))}
      <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 8 }} onClick={onAjouter}>
        + Ajouter une adresse
      </button>
    </div>
  );
}
