// =============================================================================
// Écran — Dossier (hub central).
// Modèle : roovers-mobile.jsx (fiche à sections : Contact, Relevé, Devis,
// Offre, Facture). Le volet Contact est inline : adresses multiples de
// chargement/déchargement avec étage, ascenseur, monte-meubles (table
// affaire_adresses du Module 3, enfin projetée), date/heure souhaitées,
// remarques. Les autres sections mènent aux écrans dédiés.
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import {
  obtenirOrganisation,
  obtenirAffaire, obtenirContact, sauverContact,
  listerVehicules, obtenirCamionsAffaire, sauverCamionsAffaire,
  obtenirClientFacturation, sauverClientFacturation,
  obtenirClientIdentite, sauverClientIdentite,
  listerMembresSimples, obtenirEquipeAffaire, sauverEquipeAffaire,
  validerDossierTerrain, obtenirInstance, confirmerAffaire, archiverAffaire,
  annulerAffaire, reporterAffaire, reprendreAffaire, etatFacturation,
  exigencesCloture, cloturerDossier, rouvrirDossier,
  reconciliationAffaire, confirmerMission, renvoyerChantier,
  prerequisEffectue, marquerEffectue, caissesPlan,
} from "../lib/adaptateur.js";
import { alertesVehicule } from "@domaine/flotte/vehicules.js";
import { urlItineraire } from "@domaine/communication/brief.js";
import { adresseDepot } from "@domaine/organisation/identite.js";
import { CIVILITES } from "@domaine/crm/civilite.js";
import { synthese, verdict, pictoStatut, lignesBilan, mentionDerogation }
  from "@domaine/crm/cloture.js";
import { C, S, Badge, BadgeFacturation, euros, declarerModifs, Confirmation }
  from "../lib/theme.jsx";

function adrVide() {
  return { id: "a" + Math.random().toString(36).slice(2, 8), adresse: "", type: "maison",
           codePostal: "", ville: "", etage: "", ascenseur: false, monteMeubles: false,
           escalier: false };
}

export default function Dossier({ affaireId, retour, versReleve, versDevis, versOffre, versFacture, versMail, versMateriel, versJournal, versRapports, modeTerrain }) {
  const [affaire, setAffaire] = useState(null);
  const [contact, setContact] = useState(null);
  const [org, setOrg] = useState(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [flotte, setFlotte] = useState([]);
  const [camions, setCamions] = useState([]);
  const [facturation, setFacturation] = useState(null);
  const [factOuvert, setFactOuvert] = useState(false);
  const [identite, setIdentite] = useState(null);
  const [membres, setMembres] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [instance, setInstance] = useState(null);
  const [modifie, setModifie] = useState(false);
  // L'argent a son propre cycle, dérivé des factures (0064). Nom distinct de
  // `facturation`, qui désigne ici les données de facturation DU CLIENT.
  const [cycleFacture, setCycleFacture] = useState(null);
  const [archivage, setArchivage] = useState(false);
  const enregistrerRef = useRef(null);

  useEffect(() => {
    // État de facturation : dérivé en base, jamais déduit de affaire.etat.
    etatFacturation(affaireId).then(setCycleFacture).catch(() => setCycleFacture(null));
    obtenirOrganisation().then(setOrg).catch(() => {});
    obtenirAffaire(affaireId).then(setAffaire);
    listerVehicules().then(setFlotte).catch(() => {});
    obtenirCamionsAffaire(affaireId).then(setCamions).catch(() => {});
    obtenirClientFacturation(affaireId).then(setFacturation).catch(() => {});
    obtenirClientIdentite(affaireId).then(setIdentite).catch(() => {});
    listerMembresSimples().then(setMembres).catch(() => {});
    obtenirEquipeAffaire(affaireId).then(setEquipe).catch(() => {});
    obtenirInstance(affaireId).then(setInstance).catch(() => {});
    obtenirContact(affaireId).then((c) => setContact({
      ...c,
      charges: c.charges.length ? c.charges : [adrVide()],
      decharges: c.decharges.length ? c.decharges : [adrVide()],
    }));
  }, [affaireId]);

  // Garde de modifications — DOIT être avant tout return conditionnel (règle
  // des hooks). Signale au shell les changements en attente ; la navigation
  // demandera Sauvegarder / Annuler avant de quitter.
  useEffect(() => {
    declarerModifs(modifie, () => enregistrerRef.current && enregistrerRef.current());
    return () => declarerModifs(false, null);
  }, [modifie]);

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
  function maj(champ, valeur) { setContact((c) => ({ ...c, [champ]: valeur })); setSauve(false); setModifie(true); }
  function majFact(champ, valeur) { setFacturation((f) => ({ ...f, [champ]: valeur })); setSauve(false); setModifie(true); }
  function majIdentite(champ, valeur) { setIdentite((x) => ({ ...x, [champ]: valeur })); setSauve(false); setModifie(true); }

  async function basculerCamion(id) {
    const suivant = camions.includes(id)
      ? camions.filter((x) => x !== id) : [...camions, id];
    setCamions(suivant);
    setSauve(false); setModifie(true);
  }
  function basculerMembre(id) {
    setEquipe((e) => e.includes(id) ? e.filter((x) => x !== id) : [...e, id]);
    setSauve(false); setModifie(true);
  }

  async function enregistrer() {
    setErreur(null);
    try {
      if (identite) await sauverClientIdentite(affaireId, identite);
      await sauverContact(affaireId, contact);
      await sauverCamionsAffaire(affaireId, camions);
      await sauverEquipeAffaire(affaireId, equipe);
      if (facturation) await sauverClientFacturation(affaireId, facturation);
      // Recharge l'affaire pour refléter le nom mis à jour dans l'en-tête.
      obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
      setSauve(true); setModifie(false);
    } catch (e) { setErreur(e.message); }
  }
  enregistrerRef.current = enregistrer;

  const chiffree = affaire.tvac_centimes != null;
  // Depuis la séparation des cycles (0064), on facture un dossier ENGAGÉ —
  // un acompte sur un dossier confirmé est légitime. Les anciens états
  // « facture » / « paye » ne sont plus des états du déménagement.
  const facturable = ["confirme", "planifie", "en_cours", "effectue", "clos"]
    .includes(affaire.etat);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {/* En consultation terrain, le retour vit dans le bandeau du haut :
            pas de second bouton retour ici (évite le double retour). */}
        {!modeTerrain && (
          <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.titre}>{affaire.client?.nom || "Dossier"}</div>
          {/* Deux badges : où en est le déménagement, où en est l'argent.
              Le cycle de facturation reste masqué au terrain (aucun prix). */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Badge etat={affaire.etat} />
            {!modeTerrain && <BadgeFacturation etat={cycleFacture?.etat} discret />}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {affaire.client?.tel || "—"}
          {/* Aucun montant pour le terrain : zéro prix, nulle part. */}
          {chiffree && !modeTerrain &&
            <> · <b style={{ color: C.encre }}>{euros(affaire.tvac_centimes)}</b></>}
        </div>
      </div>

      {/* La navigation entre sections vit dans la barre du bas (SousNavDossier)
          — plus de double barre en haut. */}

      {/* Rattrapage : offre SIGNÉE mais affaire jamais confirmée (affaires
          antérieures au correctif de chaîne). Confirmer crée la mission au
          planning et y reporte camions + équipe pressentis. */}
      {instance?.statut === "signee" && ["devis", "envoye"].includes(affaire.etat) && (
        <div style={{ margin: "0 16px 10px", padding: "11px 12px", borderRadius: 12,
          background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#065F46" }}>
            Offre signée — confirmation en attente
          </div>
          <div style={{ fontSize: 11.5, color: "#047857", marginTop: 2, marginBottom: 8 }}>
            Confirmez pour créer la mission au planning (camions et équipe
            pressentis y seront reportés).
          </div>
          <button onClick={async () => {
            try {
              await confirmerAffaire(affaireId);
              obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
            } catch (e) { setErreur(e.message); }
          }} style={{
            padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#059669", color: "#fff", fontSize: 13, fontWeight: 700,
          }}>Confirmer et planifier</button>
        </div>
      )}

      {/* Dossier venu du terrain : à valider par le bureau (brouillon → devis). */}
      {affaire.etat === "brouillon" && (
        <div style={{ margin: "0 16px 10px", padding: "11px 12px", borderRadius: 12,
          background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5B21B6" }}>
            Dossier créé sur le terrain — à valider
          </div>
          <div style={{ fontSize: 11.5, color: "#6D28D9", marginTop: 2, marginBottom: 8 }}>
            Complétez le relevé et le prix, puis validez pour lancer le chiffrage.
          </div>
          <button onClick={async () => {
            await validerDossierTerrain(affaireId);
            obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
          }} style={{
            padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700,
          }}>Valider ce dossier</button>
        </div>
      )}

      {/* Identité du client — éditable ici (le nom se corrige au même endroit
          que tout le reste, pas dans un écran séparé). */}
      {identite && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
            Client
          </div>
          {/* La civilité qualifie le CONTACT client (couple, madame, monsieur),
              pas la facturation : elle sert aux formules des documents. */}
          <label style={S.label}>Civilité</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {CIVILITES.map((c) => {
              const actif = identite.civilite === c.cle;
              return (
                <button key={c.cle} type="button"
                  onClick={() => majIdentite("civilite", actif ? null : c.cle)}
                  style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 700,
                    border: `1.5px solid ${actif ? C.bleu : C.bord}`,
                    background: actif ? "#E7EFFC" : C.blanc,
                    color: actif ? C.bleu : C.muet }}>
                  {actif ? "✓ " : ""}{c.libelle}
                </button>
              );
            })}
          </div>
          <label style={S.label}>Nom</label>
          <input style={S.input} value={identite.nom || ""}
                 onChange={(e) => majIdentite("nom", e.target.value)}
                 placeholder="Famille Dupont" />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Téléphone</label>
              <input style={S.input} value={identite.tel || ""} inputMode="tel"
                     onChange={(e) => majIdentite("tel", e.target.value)}
                     placeholder="0470 00 00 00" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Email</label>
              <input style={S.input} value={identite.email || ""} inputMode="email"
                     onChange={(e) => majIdentite("email", e.target.value)}
                     placeholder="client@exemple.be" />
            </div>
          </div>
        </div>
      )}

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

        {/* Visite préalable du chantier (le commercial passe estimer). */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muet, margin: "12px 0 4px" }}>
          Visite préalable (optionnel)
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Date de visite</label>
            <input style={S.input} type="date" value={contact.dateVisite || ""}
                   onChange={(e) => maj("dateVisite", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Heure</label>
            <input style={S.input} type="time" value={contact.heureVisite || ""}
                   onChange={(e) => maj("heureVisite", e.target.value)} />
          </div>
        </div>

        {/* Journée d'emballage, distincte : renseignée, elle génère sa propre
            mission à la confirmation (trigger 0021). */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muet, margin: "12px 0 4px" }}>
          Emballage (jour séparé, optionnel)
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Date d'emballage</label>
            <input style={S.input} type="date" value={contact.dateEmballage || ""}
                   onChange={(e) => maj("dateEmballage", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Heure</label>
            <input style={S.input} type="time" value={contact.heureEmballage || ""}
                   onChange={(e) => maj("heureEmballage", e.target.value)} />
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

      {/* Équipe pressentie — sélectionnable comme les camions. Reportée sur la
          mission à la confirmation (0026). Un membre en congé ce jour-là
          pourrait être signalé ici à terme (données RH). */}
      {membres.length > 0 && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 8 }}>
            Équipe ({equipe.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {membres.map((m) => {
              const sel = equipe.includes(m.id);
              return (
                <button key={m.id} onClick={() => basculerMembre(m.id)} style={{
                  padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600,
                  border: `1.5px solid ${sel ? C.bleu : C.bord}`,
                  background: sel ? "#E7EFFC" : C.blanc,
                  color: sel ? C.bleu : C.encre,
                }}>
                  {sel ? "✓ " : "👤 "}{m.nom}
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
        const url = urlItineraire(contact.charges, contact.decharges, adresseDepot(org));
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

      {/* Coût de trajet : le versant COÛT réel (marge), distinct du km facturé
          au barème. Interne — jamais montré au terrain (aucun prix). */}
      {!modeTerrain && (
      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
          Coût de trajet <span style={{ fontWeight: 500, color: C.muet }}>(interne)</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Km</label>
            <input style={S.input} inputMode="decimal" value={contact.trajetKm ?? ""}
                   onChange={(e) => maj("trajetKm", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Durée</label>
            <input style={S.input} value={contact.trajetDuree || ""}
                   onChange={(e) => maj("trajetDuree", e.target.value)} placeholder="45 min" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Prix/km (€)</label>
            <input style={S.input} inputMode="decimal" value={contact.trajetPrixKm ?? ""}
                   onChange={(e) => maj("trajetPrixKm", e.target.value)} placeholder="0" />
          </div>
        </div>
        {contact.trajetKm > 0 && contact.trajetPrixKm > 0 && (
          <div style={{ fontSize: 12, color: C.muet, marginTop: 6 }}>
            Coût trajet ({contact.trajetKm} km × {contact.trajetPrixKm} €) ={" "}
            <b style={{ color: C.encre }}>
              {(contact.trajetKm * contact.trajetPrixKm).toLocaleString("fr-BE", {
                style: "currency", currency: "EUR",
              })}
            </b>
          </div>
        )}
      </div>
      )}

      {/* Données de facturation — le bouton facturation entreprise n'a rien à
          faire côté terrain (donnée commerciale, aucun prix). Masqué. */}
      {!modeTerrain && (
      <div style={S.carte}>
        <button onClick={() => setFactOuvert(!factOuvert)} style={{
          ...S.boutonLien, paddingLeft: 0, width: "100%", textAlign: "left",
          display: "flex", justifyContent: "space-between", fontSize: 13,
          fontWeight: 700, color: C.encre,
        }}>
          <span>Facturation {facturation?.tva_num ? "· société" : "· particulier"}</span>
          <span style={{ color: C.muet }}>{factOuvert ? "−" : "+"}</span>
        </button>
        {factOuvert && facturation && (
          <div style={{ marginTop: 8 }}>
            <label style={S.label}>Société</label>
            <input style={S.input} value={facturation.societe || ""}
                   onChange={(e) => majFact("societe", e.target.value)}
                   placeholder="Raison sociale (si professionnel)" />
            <label style={S.label}>N° TVA</label>
            <input style={S.input} value={facturation.tva_num || ""}
                   onChange={(e) => majFact("tva_num", e.target.value)}
                   placeholder="BE0123.456.789" />
            <label style={S.label}>Adresse de facturation</label>
            <input style={S.input} value={facturation.fact_lignes || ""}
                   onChange={(e) => majFact("fact_lignes", e.target.value)}
                   placeholder="Rue et numéro" />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 110 }}>
                <label style={S.label}>Code postal</label>
                <input style={S.input} value={facturation.fact_cp || ""}
                       onChange={(e) => majFact("fact_cp", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Ville</label>
                <input style={S.input} value={facturation.fact_ville || ""}
                       onChange={(e) => majFact("fact_ville", e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.fantome, marginTop: 6 }}>
              Sans adresse de facturation, la facture reprend l'adresse de déchargement.
            </div>
          </div>
        )}
      </div>
      )}

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

        {/* Ce que le terrain a constaté sur place, et les écarts à trancher.
            L'autre moitié de la boucle : le terrain observe, le bureau décide. */}
        {!modeTerrain && versRapports && (
          <button onClick={() => versRapports(affaireId)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            marginTop: 10, padding: "11px 13px", borderRadius: 11,
            cursor: "pointer", border: `1px solid ${C.bord}`,
            background: C.blanc, textAlign: "left" }}>
            <span>🧰</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.encre }}>
              Rapports de chantier
            </span>
            <span style={{ fontSize: 11.5, color: C.fantome }}>Ouvrir</span>
          </button>
        )}

        {/* L'historique du dossier : qui a changé quoi, quand, et les
            décisions consignées. En insertion seule — rien ne s'y réécrit. */}
        {!modeTerrain && versJournal && (
          <button onClick={() => versJournal(affaireId)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            marginTop: 10, padding: "11px 13px", borderRadius: 11,
            cursor: "pointer", border: `1px solid ${C.bord}`,
            background: C.blanc, textAlign: "left" }}>
            <span>📖</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.encre }}>
              Historique de ce dossier
            </span>
            <span style={{ fontSize: 11.5, color: C.fantome }}>Ouvrir</span>
          </button>
        )}

        {/* Passer « en cours » à « effectué » : action du bureau, avec les
            prérequis affichés (validés / manquants) pour savoir ce qui bloque. */}
        {!modeTerrain && affaire.etat === "en_cours" && (
          <ZoneMarquerEffectue affaireId={affaireId}
                               onFait={() => obtenirAffaire(affaireId).then(setAffaire)} />
        )}

        {/* Réconciliation terrain → bureau : le chef d'équipe a remonté des
            chantiers, le bureau confirme (ou renvoie). C'est ici, et seulement
            ici, que le dossier devient officiellement « effectué ». */}
        {!modeTerrain && !["clos"].includes(affaire.etat) && (
          <ZoneReconciliation affaire={affaire} affaireId={affaireId}
                              onFait={() => obtenirAffaire(affaireId).then(setAffaire)} />
        )}

        {/* Plan de pose des caisses : le client a numéroté ses caisses et dit
            où chacune va (pièce de la nouvelle adresse). On n'affiche QUE ce
            plan — jamais le contenu, qui reste privé au client. Utile au
            terrain pour déposer chaque caisse au bon endroit. */}
        <PlanCaisses affaireId={affaireId} />

        {/* Clôture : la dernière étape du cycle. La check-list vient de la
            base, pas de l'écran — ce qui s'affiche ici est exactement ce qui
            sera vérifié au moment d'appuyer. */}
        {!modeTerrain && ["effectue", "clos"].includes(affaire.etat) && (
          <ZoneCloture affaire={affaire} affaireId={affaireId}
                       onFait={() => obtenirAffaire(affaireId).then(setAffaire)} />
        )}

        {/* Désistement client : le chantier ne se fera pas, ou pas à cette
            date. Annuler ou reporter libère automatiquement l'équipe et les
            camions du planning (les missions ouvertes sont annulées). */}
        {!modeTerrain && (
          <ZoneDesistement affaire={affaire} affaireId={affaireId}
                           onFait={() => { declarerModifs(false, null); retour(); }} />
        )}

        {/* Archiver : sort le dossier des listes — rien n'est supprimé, tout
            se retrouve (et se restaure) dans Compte → Archivage. */}
        {!modeTerrain && (
          <button onClick={() => setArchivage(true)}
                  style={{ ...S.boutonLien, color: C.muet, width: "100%",
                           textAlign: "center", marginTop: 10 }}>
            🗂 Archiver ce dossier
          </button>
        )}
        {archivage && (
          <Confirmation
            question="Archiver ce dossier ? Il disparaîtra des listes (récupérable dans Compte → Archivage)."
            action="Archiver" couleur={C.rouge}
            onConfirmer={async () => {
              await archiverAffaire(affaireId);
              declarerModifs(false, null);
              retour();
            }}
            onAnnuler={() => setArchivage(false)} />
        )}
      </div>
    </div>
  );
}

/**
 * Désistement client. Deux issues distinctes :
 *  — REPORTER : le chantier se fera plus tard. Avec une nouvelle date, il est
 *    replanifié immédiatement ; sans date, le dossier attend en « reporté » et
 *    repartira tout seul dès qu'une date sera saisie.
 *  — ANNULER : le chantier ne se fera pas. Définitif (le dossier reste
 *    consultable et archivable, rien n'est supprimé).
 * Dans les deux cas, les missions ouvertes sont annulées côté serveur : équipe
 * et camions se libèrent au planning sans intervention.
 */
const ANNULABLE = ["brouillon", "devis", "envoye", "confirme", "planifie", "en_cours", "reporte"];
const REPORTABLE = ["envoye", "confirme", "planifie"];

/**
 * ZONE DE CLÔTURE — la fin du dossier, rendue vérifiable.
 *
 * Trois états possibles :
 *  — le dossier est clôturé : on montre le bilan FIGÉ (jamais recalculé) et
 *    le seul geste restant, rouvrir, qui exige un motif écrit ;
 *  — tout est en ordre : un bouton, franc ;
 *  — il manque quelque chose : la liste nommée, et la possibilité de passer
 *    outre avec un motif — jamais en silence, jamais par défaut.
 */
/**
 * ZONE DE RÉCONCILIATION — le bureau tranche ce que le terrain a remonté.
 *
 * Le chef d'équipe clôt sa mission : elle passe « terminée sur le terrain ».
 * C'est une indication, pas un verdict. Ici, le bureau (patron/secrétariat)
 * confirme chaque chantier — ou le renvoie au terrain. Quand tous sont
 * confirmés, le dossier devient « effectué » et la facturation s'ouvre.
 *
 * On n'affiche cette zone que lorsqu'il y a quelque chose à réconcilier : des
 * chantiers en attente, ou tout juste confirmés.
 */
/**
 * ZONE « MARQUER EFFECTUÉ » — le bureau fait passer le dossier de « en cours »
 * à « effectué ». Le bouton n'est actif que si tous les prérequis sont verts ;
 * sinon, la liste montre exactement ce qui est validé et ce qui manque.
 */
function ZoneMarquerEffectue({ affaireId, onFait }) {
  const [pre, setPre] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    prerequisEffectue(affaireId).then(setPre).catch(() => setPre(null));
  }, [affaireId]);

  if (!pre) return null;

  async function marquer() {
    setEnCours(true); setErreur(null);
    try { await marquerEffectue(affaireId); onFait(); }
    catch (e) { setErreur(e.message || "Refusé"); setEnCours(false); }
  }

  return (
    <div style={{ ...S.carte, border: `1px solid ${C.bord}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Marquer le dossier effectué
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
        {pre.peut_effectuer
          ? "Tout est prêt : le chantier peut être déclaré effectué."
          : "Quelques points à régler avant de pouvoir déclarer le dossier effectué."}
      </div>

      <div style={{ marginTop: 10 }}>
        {(pre.points || []).map((p) => {
          const ok = p.statut === "ok";
          return (
            <div key={p.cle} style={{ display: "flex", gap: 8, alignItems: "baseline",
                                      padding: "5px 0" }}>
              <span style={{ fontSize: 13, flexShrink: 0,
                             color: ok ? "#15803D" : C.ambre }}>
                {ok ? "✓" : "○"}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600,
                               color: ok ? C.encre : C.encre }}>{p.libelle}</span>
                {p.detail && (
                  <span style={{ display: "block", fontSize: 11, color: C.muet, marginTop: 1 }}>
                    {p.detail}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}

      <button disabled={!pre.peut_effectuer || enCours} onClick={marquer}
              style={{ ...S.boutonPlein, width: "100%", marginTop: 12,
                       opacity: pre.peut_effectuer ? 1 : 0.5,
                       background: pre.peut_effectuer
                         ? "linear-gradient(135deg, #059669, #047857)" : "#94A3B8" }}>
        {enCours ? "…" : "✓ Marquer effectué"}
      </button>
      {!pre.peut_effectuer && (
        <div style={{ fontSize: 10.5, color: C.fantome, textAlign: "center", marginTop: 6 }}>
          Le bouton s'activera une fois les points ci-dessus validés.
        </div>
      )}
    </div>
  );
}

/**
 * Plan de pose des caisses (vue bureau/terrain). Le client numérote ses caisses
 * et indique la pièce de destination ; on affiche numéro → pièce → adresse,
 * jamais le contenu (privé). Rien ne s'affiche s'il n'y a pas de caisse.
 */
function PlanCaisses({ affaireId }) {
  const [plan, setPlan] = useState(null);
  useEffect(() => { caissesPlan(affaireId).then(setPlan).catch(() => setPlan([])); }, [affaireId]);
  if (!plan || plan.length === 0) return null;

  return (
    <div style={S.carte}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 2 }}>
        Plan de pose des caisses
      </div>
      <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8, lineHeight: 1.45 }}>
        Numéroté par le client. Le contenu reste privé — on ne voit que la
        destination.
      </div>
      {plan.map((c) => (
        <div key={c.numero} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "baseline", padding: "6px 0",
              borderTop: `1px solid ${C.doux}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.encre }}>
            n°{c.numero}
            {c.fragile && <span style={{ color: "#DC2626", fontSize: 11 }}> · fragile</span>}
          </span>
          <span style={{ fontSize: 12.5, color: C.encre, textAlign: "right" }}>
            {c.piece_dest || "pièce ?"}
            {c.adresse && <span style={{ color: C.muet }}> · {c.adresse}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ZoneReconciliation({ affaire, affaireId, onFait }) {
  const [recon, setRecon] = useState(null);
  const [renvoi, setRenvoi] = useState(null);   // mission en cours de renvoi
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const recharger = () => reconciliationAffaire(affaireId).then(setRecon).catch(() => setRecon(null));
  useEffect(() => { recharger(); }, [affaireId, affaire.etat]);

  if (!recon) return null;
  // Rien à réconcilier : aucun chantier en attente ET le dossier n'est pas
  // encore effectué (sinon la clôture prend le relais).
  if (recon.en_attente_bureau === 0 && affaire.etat === "effectue") return null;
  if (recon.en_attente_bureau === 0 && recon.encore_ouvertes > 0) return null;
  if (recon.en_attente_bureau === 0 && recon.confirmees === 0) return null;

  async function agir(fn) {
    setEnCours(true); setErreur(null);
    try { await fn(); setRenvoi(null); setMotif(""); await recharger(); onFait(); }
    catch (e) { setErreur(e.message || "Refusé"); }
    finally { setEnCours(false); }
  }

  const enAttente = (recon.missions || []).filter((m) => m.etat === "terminee_terrain");

  return (
    <div style={{ ...S.carte, border: `1px solid ${C.bord}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Confirmation du bureau
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
        {enAttente.length > 0
          ? "Le terrain a remonté ces chantiers comme terminés. À vous de confirmer — le dossier deviendra « effectué » et facturable."
          : "Tous les chantiers sont confirmés."}
      </div>

      {enAttente.map((m) => (
        <div key={m.id} style={{ marginTop: 10, padding: 11, borderRadius: 10,
          border: "1px solid #FDE68A", background: "#FFFBEB" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
              {m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : "Chantier"}
              {m.date ? ` · ${new Date(m.date + "T00:00:00").toLocaleDateString("fr-BE",
                { day: "numeric", month: "short" })}` : ""}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B45309" }}>
              remonté du terrain
            </span>
          </div>

          {renvoi === m.id ? (
            <div style={{ marginTop: 8 }}>
              <input value={motif} onChange={(e) => setMotif(e.target.value)}
                     placeholder="Ce qui reste à faire (ex. cave oubliée)…"
                     style={{ ...S.input }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button disabled={enCours}
                  onClick={() => agir(() => renvoyerChantier(m.id, motif))}
                  style={{ ...S.boutonLien, color: C.rouge, fontWeight: 700 }}>
                  Renvoyer au terrain
                </button>
                <button onClick={() => { setRenvoi(null); setMotif(""); }}
                        style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button disabled={enCours}
                onClick={() => agir(() => confirmerMission(m.id))}
                style={{ ...S.boutonPlein, flex: 1, padding: "10px",
                         background: "linear-gradient(135deg, #059669, #047857)" }}>
                ✓ Confirmer effectué
              </button>
              <button onClick={() => setRenvoi(m.id)}
                      style={{ ...S.boutonLien, color: C.muet }}>Pas fini</button>
            </div>
          )}
        </div>
      ))}

      {recon.confirmees > 0 && enAttente.length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#15803D", fontWeight: 600 }}>
          ✓ {recon.confirmees} chantier{recon.confirmees > 1 ? "s" : ""} confirmé{recon.confirmees > 1 ? "s" : ""}.
        </div>
      )}

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
    </div>
  );
}

function ZoneCloture({ affaire, affaireId, onFait }) {
  const [exig, setExig] = useState(null);
  const [motif, setMotif] = useState("");
  const [mode, setMode] = useState(null); // null | "forcer" | "rouvrir"
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const clos = affaire.etat === "clos";

  useEffect(() => {
    if (clos) { setExig(null); return; }
    exigencesCloture(affaireId).then(setExig).catch(() => setExig(null));
  }, [affaireId, affaire.etat, clos]);

  async function agir(fn) {
    setEnCours(true); setErreur(null);
    try { await fn(); setMode(null); setMotif(""); onFait(); }
    catch (e) { setErreur(e.message || "Refusé"); }
    finally { setEnCours(false); }
  }

  if (clos) {
    const bilan = affaire.cloture_bilan;
    const derog = mentionDerogation(bilan);
    return (
      <div style={{ ...S.carte, background: "#F1F5F9", border: `1px solid ${C.bord}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
          🔒 Dossier clôturé
        </div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
          Plus rien n'y bouge : ni les missions, ni les factures, ni les heures.
          Le bilan ci-dessous a été figé ce jour-là ; il ne se recalcule pas.
        </div>
        {derog && (
          <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 9,
                        background: "#FFF7ED", border: "1px solid #FDE68A",
                        fontSize: 11.5, color: "#92400E", lineHeight: 1.45 }}>
            {derog}
          </div>
        )}
        {lignesBilan(bilan).map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between",
                                padding: "5px 0", fontSize: 12.5 }}>
            <span style={{ color: C.muet }}>{l}</span>
            <span style={{ fontWeight: 700, color: C.encre }}>{v}</span>
          </div>
        ))}

        {mode !== "rouvrir" ? (
          <button onClick={() => setMode("rouvrir")}
                  style={{ ...S.boutonLien, color: C.muet, marginTop: 10 }}>
            Rouvrir ce dossier
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6 }}>
              Pourquoi ? Le motif reste au journal, et la clôture précédente
              est conservée avec son bilan.
            </div>
            <input value={motif} onChange={(e) => setMotif(e.target.value)}
                   placeholder="Erreur de facturation constatée…"
                   style={{ ...S.input }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button disabled={!motif.trim() || enCours}
                      onClick={() => agir(() => rouvrirDossier(affaireId, motif))}
                      style={{ ...S.boutonPlein, flex: 1,
                               opacity: motif.trim() ? 1 : 0.5 }}>
                Rouvrir
              </button>
              <button onClick={() => { setMode(null); setMotif(""); }}
                      style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
            </div>
          </div>
        )}
        {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
      </div>
    );
  }

  if (!exig) return null;
  const s = synthese(exig);

  return (
    <div style={{ ...S.carte, border: `1px solid ${C.bord}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Clôturer le dossier
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
        {verdict(exig)}
      </div>

      <div style={{ marginTop: 10 }}>
        {s.points.map((p) => {
          const manque = p.statut === "manquant";
          const couleur = p.statut === "ok" ? "#15803D"
                        : manque && p.bloquant ? C.rouge
                        : manque ? "#92400E" : C.fantome;
          return (
            <div key={p.cle} style={{ display: "flex", gap: 8, alignItems: "baseline",
                                      padding: "4px 0", fontSize: 12.5 }}>
              <span style={{ color: couleur, fontWeight: 800, width: 14 }}>
                {pictoStatut(p.statut)}
              </span>
              <span style={{ flex: 1, color: manque ? C.encre : C.muet }}>
                {p.libelle}
                {p.detail && (
                  <span style={{ display: "block", fontSize: 11, color: couleur, marginTop: 1 }}>
                    {p.detail}
                  </span>
                )}
              </span>
              {manque && !p.bloquant && (
                <span style={{ fontSize: 10.5, color: "#92400E" }}>réserve</span>
              )}
            </div>
          );
        })}
      </div>

      {s.peutCloturer && mode !== "forcer" && (
        <button disabled={enCours}
                onClick={() => agir(() => cloturerDossier(affaireId, null))}
                style={{ ...S.boutonPlein, width: "100%", marginTop: 12,
                         background: "linear-gradient(135deg, #0F172A, #334155)" }}>
          🔒 Clôturer — le dossier deviendra définitif
        </button>
      )}

      {s.peutForcer && mode !== "forcer" && (
        <button onClick={() => setMode("forcer")}
                style={{ ...S.boutonLien, color: C.muet, width: "100%",
                         textAlign: "center", marginTop: 10 }}>
          Clôturer malgré {s.nbBloquants} point{s.nbBloquants > 1 ? "s" : ""} — motif obligatoire
        </button>
      )}

      {mode === "forcer" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6, lineHeight: 1.45 }}>
            Ce motif est inscrit dans le bilan figé et dans le journal. Il
            expliquera, dans deux ans, pourquoi ce dossier a été clôturé
            incomplet.
          </div>
          <input value={motif} onChange={(e) => setMotif(e.target.value)}
                 placeholder="Client insolvable, créance passée en perte…"
                 style={{ ...S.input }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button disabled={!motif.trim() || enCours}
                    onClick={() => agir(() => cloturerDossier(affaireId, motif))}
                    style={{ ...S.boutonPlein, flex: 1, opacity: motif.trim() ? 1 : 0.5 }}>
              Clôturer avec ce motif
            </button>
            <button onClick={() => { setMode(null); setMotif(""); }}
                    style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
          </div>
        </div>
      )}

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
    </div>
  );
}

function ZoneDesistement({ affaire, affaireId, onFait }) {
  const [mode, setMode] = useState(null); // null | "reporter" | "annuler"
  const [motif, setMotif] = useState("");
  const [nouvelleDate, setNouvelleDate] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const peutAnnuler = ANNULABLE.includes(affaire.etat);
  const peutReporter = REPORTABLE.includes(affaire.etat);

  // Annuler une annulation : un désistement encodé par erreur doit pouvoir se
  // défaire. Le dossier repart de « confirmé » et ses missions redeviennent
  // planifiées — mais NON PARTAGÉES, pour que le bureau revalide avant que le
  // terrain se remobilise.
  if (affaire.etat === "annule") {
    return (
      <div style={{ ...S.carte, background: "#FFF7ED", border: "1px solid #FDE68A" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
          Dossier annulé
        </div>
        <div style={{ fontSize: 12, color: "#92400E", marginTop: 4, lineHeight: 1.5 }}>
          Il n'apparaît plus au planning, ni au bureau ni au terrain.
        </div>
        <button
          onClick={async () => {
            try { await reprendreAffaire(affaireId, "reprise depuis le dossier"); onFait(); }
            catch (e) { alert(e.message || "Reprise refusée"); }
          }}
          style={{ ...S.boutonPlein, marginTop: 12 }}>
          Annuler l'annulation — remettre le dossier en route
        </button>
      </div>
    );
  }

  if (!peutAnnuler && !peutReporter) return null;

  async function confirmer() {
    setErreur(null); setEnCours(true);
    try {
      if (mode === "annuler") await annulerAffaire(affaireId, motif);
      else await reporterAffaire(affaireId, nouvelleDate || null, motif);
      onFait();
    } catch (e) {
      setErreur(e.message || "Opération refusée");
      setEnCours(false);
    }
  }

  const bouton = (cle, libelle, couleur) => (
    <button onClick={() => { setMode(cle); setErreur(null); }} style={{
      flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
      fontSize: 12.5, fontWeight: 700, background: "#fff",
      border: `1.5px solid ${C.bord}`, color: couleur,
    }}>{libelle}</button>
  );

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bord}` }}>
      {affaire.etat === "reporte" && (
        <div style={{ marginBottom: 10, padding: "9px 11px", borderRadius: 10,
          background: "#FFFBEB", border: "1px solid #FDE68A",
          fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
          Dossier reporté, en attente d'une date. Saisissez la nouvelle date du
          déménagement plus haut : le chantier sera replanifié automatiquement.
        </div>
      )}

      {!mode && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muet,
            textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
            Désistement client
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {peutReporter && bouton("reporter", "📅 Reporter", C.ambre)}
            {peutAnnuler && bouton("annuler", "✕ Annuler", C.rouge)}
          </div>
        </>
      )}

      {mode && (
        <div style={{ padding: 12, borderRadius: 11,
          background: mode === "annuler" ? "#FEF2F2" : "#FFFBEB",
          border: `1px solid ${mode === "annuler" ? "#FECACA" : "#FDE68A"}` }}>
          <div style={{ fontSize: 13, fontWeight: 800,
            color: mode === "annuler" ? "#991B1B" : "#92400E", marginBottom: 8 }}>
            {mode === "annuler" ? "Annuler le dossier" : "Reporter le chantier"}
          </div>

          {mode === "reporter" && (
            <>
              <label style={S.label}>Nouvelle date (laisser vide si inconnue)</label>
              <input style={S.input} type="date" value={nouvelleDate}
                     onChange={(e) => setNouvelleDate(e.target.value)} />
            </>
          )}

          <label style={S.label}>Motif (tracé dans l'historique)</label>
          <input style={S.input} value={motif} onChange={(e) => setMotif(e.target.value)}
                 placeholder={mode === "annuler"
                   ? "Ex. : client a choisi un concurrent"
                   : "Ex. : compromis de vente décalé"} />

          <div style={{ fontSize: 11.5, color: C.muet, margin: "8px 0 10px", lineHeight: 1.5 }}>
            {mode === "annuler"
              ? "L'équipe et les camions seront libérés au planning. Le dossier reste consultable."
              : nouvelleDate
                ? "Le chantier sera replanifié à cette date avec la même équipe."
                : "Le dossier passera en « reporté » et libèrera le planning jusqu'à une nouvelle date."}
          </div>

          {erreur && <div style={{ fontSize: 12, color: C.rouge, marginBottom: 8 }}>{erreur}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={enCours} onClick={confirmer} style={{
              flex: 1, padding: "11px", borderRadius: 10, border: "none",
              cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff",
              background: mode === "annuler" ? C.rouge : C.ambre,
            }}>
              {enCours ? "…" : mode === "annuler" ? "Confirmer l'annulation" : "Confirmer le report"}
            </button>
            <button disabled={enCours} onClick={() => { setMode(null); setMotif(""); }} style={{
              padding: "11px 16px", borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: 700, background: "#fff",
              border: `1.5px solid ${C.bord}`, color: C.muet,
            }}>Retour</button>
          </div>
        </div>
      )}
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
                 placeholder="Rue des Tulipes 14" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ width: 110 }}>
              <label style={S.label}>Code postal</label>
              <input style={S.input} value={a.codePostal || ""} inputMode="numeric"
                     onChange={(e) => onMaj(a.id, "codePostal", e.target.value)}
                     placeholder="1300" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Ville</label>
              <input style={S.input} value={a.ville || ""}
                     onChange={(e) => onMaj(a.id, "ville", e.target.value)}
                     placeholder="Wavre" />
            </div>
          </div>
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
          <div style={{ display: "flex", gap: 14, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.ascenseur}
                     onChange={(e) => onMaj(a.id, "ascenseur", e.target.checked)} />
              Ascenseur
            </label>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.escalier}
                     onChange={(e) => onMaj(a.id, "escalier", e.target.checked)} />
              Escalier
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
