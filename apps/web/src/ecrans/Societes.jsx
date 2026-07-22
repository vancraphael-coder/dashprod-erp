// =============================================================================
// Écran — Sociétés (réservé à l'éditeur Dashprod).
//
// Crée une nouvelle entreprise cliente sur une base VIERGE : aucun client,
// aucune affaire, aucune facture, aucun barème. Cinq rôles standards et un
// premier administrateur, rien d'autre.
//
// L'accès est contrôlé par PostgreSQL (fonction est_editeur), pas par cet
// écran : masquer un bouton n'est pas une sécurité. Si un utilisateur non
// éditeur appelait la commande, la base la refuserait.
//
// IMPORTANT — la suppression n'existe pas. Le journal d'audit référence les
// utilisateurs d'une organisation et ne s'efface jamais. On désactive.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerOrganisations, creerOrganisation, activerOrganisation,
} from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const VIDE = { nom: "", emailAdmin: "", nomAdmin: "", bce: "", tva: "", tel: "", email: "" };

export default function Societes({ retour }) {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(VIDE);
  const [creation, setCreation] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  function recharger() {
    listerOrganisations().then(setListe).catch((e) => { setErreur(e.message); setListe([]); });
  }
  useEffect(recharger, []);

  const pret = form.nom.trim() && form.emailAdmin.includes("@");

  async function creer() {
    setErreur(null); setSucces(null); setCreation(true);
    try {
      const res = await creerOrganisation(form);
      setSucces(`${form.nom} créée. ${form.emailAdmin} peut se connecter avec Google `
                + `— son espace est vierge et prêt à configurer.`);
      setForm(VIDE);
      recharger();
      return res;
    } catch (e) {
      setErreur(e.message || "Création refusée");
    } finally { setCreation(false); }
  }

  async function basculer(o) {
    setErreur(null);
    try { await activerOrganisation(o.id, !o.actif); recharger(); }
    catch (e) { setErreur(e.message); }
  }

  if (liste === null) return null;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Paramètres</button>}
        <div style={S.titre}>Sociétés</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Les entreprises hébergées sur Dashprod. Chacune sur sa propre base,
          cloisonnée des autres.
        </div>
      </div>

      <div style={S.carte}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 10,
                      textTransform: "uppercase", letterSpacing: ".03em" }}>
          Nouvelle société
        </div>

        <label style={{ ...S.label, marginTop: 0 }}>
          Nom légal <span style={{ color: C.rouge }}>*</span>
        </label>
        <input style={S.input} value={form.nom} placeholder="Déménagements Dupont SRL"
               onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />

        <label style={S.label}>
          E-mail du premier administrateur <span style={{ color: C.rouge }}>*</span>
          <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
            son compte Google
          </span>
        </label>
        <input style={S.input} value={form.emailAdmin} placeholder="patron@dupont.be"
               onChange={(e) => setForm((f) => ({ ...f, emailAdmin: e.target.value }))} />

        <label style={S.label}>Nom de l'administrateur</label>
        <input style={S.input} value={form.nomAdmin} placeholder="Jean Dupont"
               onChange={(e) => setForm((f) => ({ ...f, nomAdmin: e.target.value }))} />

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>BCE</label>
            <input style={S.input} value={form.bce} placeholder="BE 0123.456.789"
                   onChange={(e) => setForm((f) => ({ ...f, bce: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>TVA</label>
            <input style={S.input} value={form.tva} placeholder="BE0123456789"
                   onChange={(e) => setForm((f) => ({ ...f, tva: e.target.value }))} />
          </div>
        </div>

        <div style={{ padding: "10px 12px", borderRadius: 10, marginTop: 12,
                      background: "#FFFBEB", border: "1px solid #FDE68A",
                      fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
          Une société créée ne peut pas être supprimée : le journal d'audit
          conserve ses traces et ne s'efface jamais. Elle peut seulement être
          désactivée. Vérifiez le nom et l'e-mail avant de valider.
        </div>

        {erreur && (
          <div style={{ fontSize: 12.5, color: C.rouge, marginTop: 10 }}>{erreur}</div>
        )}
        {succes && (
          <div style={{ fontSize: 12.5, color: "#065F46", background: "#ECFDF5",
                        border: "1px solid #A7F3D0", borderRadius: 10,
                        padding: "10px 12px", marginTop: 10, lineHeight: 1.5 }}>
            ✓ {succes}
          </div>
        )}

        <button style={{ ...S.boutonPlein, marginTop: 12, opacity: pret ? 1 : .5 }}
                disabled={!pret || creation} onClick={creer}>
          {creation ? "Création…" : "Créer la société"}
        </button>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>
          {liste.length} société{liste.length > 1 ? "s" : ""}
        </label>
        {liste.map((o) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10,
                                   padding: "11px 0", borderTop: `1px solid ${C.doux}`,
                                   opacity: o.actif === false ? .5 : 1 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700,
                             color: C.encre }}>
                {o.nom}
                {o.est_editeur && (
                  <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 6,
                                 padding: "2px 6px", borderRadius: 20,
                                 background: C.bleuClair, color: C.bleu }}>éditeur</span>
                )}
              </span>
              <span style={{ display: "block", fontSize: 11, color: C.fantome, marginTop: 2 }}>
                {o.membres} membre{o.membres > 1 ? "s" : ""} · {o.clients} client
                {o.clients > 1 ? "s" : ""} · {o.affaires} dossier{o.affaires > 1 ? "s" : ""}
                {" · "}
                <span style={{ color: o.prete ? "#065F46" : C.ambre, fontWeight: 700 }}>
                  {o.prete ? "configurée" : "à configurer"}
                </span>
              </span>
            </span>
            {!o.est_editeur && (
              <button onClick={() => basculer(o)}
                      style={{ ...S.boutonLien, border: `1.5px solid ${C.bord}`,
                               borderRadius: 9, padding: "6px 10px", fontSize: 11.5 }}>
                {o.actif === false ? "Réactiver" : "Désactiver"}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}
