// =============================================================================
// Écran — Archivage. Page dédiée, accessible depuis le Compte.
// Trois sous-onglets par type d'archive : Dossiers, Camions, Membres. Chaque
// élément archivé peut être RESTAURÉ (récupéré) d'un tap avec confirmation.
// Archiver n'a jamais supprimé : tout est ici.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerAffairesArchives, desarchiverAffaire,
  listerVehiculesArchives, desarchiverVehicule,
  listerMembresArchives, desarchiverMembre,
} from "../lib/adaptateur.js";
import { C, S, Confirmation } from "../lib/theme.jsx";

export default function Archivage({ retour }) {
  const [onglet, setOnglet] = useState("dossiers");

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Archivage</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[["dossiers", "Dossiers"], ["camions", "Camions"], ["membres", "Membres"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? C.bleuClair : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 12.5, fontWeight: 700,
            }}>{lib}</button>
          ))}
        </div>
      </div>

      {onglet === "dossiers" && <ListeDossiers />}
      {onglet === "camions" && <ListeCamions />}
      {onglet === "membres" && <ListeMembres />}
    </div>
  );
}

/** Ligne générique d'archive avec bouton Restaurer + confirmation. */
function LigneArchive({ titre, sousTitre, onRestaurer }) {
  const [confirme, setConfirme] = useState(false);
  return (
    <div style={{ ...S.carte, padding: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>{titre}</div>
          {sousTitre && <div style={{ fontSize: 11.5, color: C.muet }}>{sousTitre}</div>}
        </div>
        {!confirme && (
          <button onClick={() => setConfirme(true)} style={{
            padding: "8px 14px", borderRadius: 10, cursor: "pointer",
            border: `1.5px solid ${C.bleu}`, background: C.bleuClair,
            color: C.bleu, fontSize: 12.5, fontWeight: 700,
          }}>Restaurer</button>
        )}
      </div>
      {confirme && (
        <Confirmation
          question="Restaurer cet élément ? Il réapparaîtra dans les listes actives."
          action="Restaurer" couleur={C.vert}
          onConfirmer={async () => { await onRestaurer(); setConfirme(false); }}
          onAnnuler={() => setConfirme(false)} />
      )}
    </div>
  );
}

function Vide({ quoi }) {
  return (
    <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
      Aucun {quoi} archivé.
    </div>
  );
}

function ListeDossiers() {
  const [liste, setListe] = useState(null);
  function recharger() { listerAffairesArchives().then(setListe).catch(() => setListe([])); }
  useEffect(recharger, []);
  if (liste === null) return null;
  if (liste.length === 0) return <Vide quoi="dossier" />;
  return (
    <>
      {liste.map((a) => (
        <LigneArchive key={a.id} titre={a.client}
          sousTitre={`${a.etat}${a.date ? " · " + a.date : ""}`}
          onRestaurer={async () => { await desarchiverAffaire(a.id); recharger(); }} />
      ))}
    </>
  );
}

function ListeCamions() {
  const [liste, setListe] = useState(null);
  function recharger() { listerVehiculesArchives().then(setListe).catch(() => setListe([])); }
  useEffect(recharger, []);
  if (liste === null) return null;
  if (liste.length === 0) return <Vide quoi="camion" />;
  return (
    <>
      {liste.map((v) => (
        <LigneArchive key={v.id} titre={`🚛 ${v.nom}`}
          sousTitre={v.immatriculation || ""}
          onRestaurer={async () => { await desarchiverVehicule(v.id); recharger(); }} />
      ))}
    </>
  );
}

function ListeMembres() {
  const [liste, setListe] = useState(null);
  function recharger() { listerMembresArchives().then(setListe).catch(() => setListe([])); }
  useEffect(recharger, []);
  if (liste === null) return null;
  if (liste.length === 0) return <Vide quoi="membre" />;
  return (
    <>
      {liste.map((m) => (
        <LigneArchive key={m.id} titre={m.nom || m.email || "Membre"}
          sousTitre={m.email || ""}
          onRestaurer={async () => { await desarchiverMembre(m.id); recharger(); }} />
      ))}
    </>
  );
}
