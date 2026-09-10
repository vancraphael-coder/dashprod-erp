// =============================================================================
// Composant — formulaire de création de société.
//
// Deux écrans l'appellent :
//   * Inscription.jsx  — compte authentifié rattaché à aucune organisation.
//   * MesSocietes.jsx  — personne déjà rattachée quelque part qui monte la
//                        sienne. Le cas existe : un salarié qui se lance, un
//                        gérant qui ouvre une seconde structure.
//
// La commande, les règles de validation et le rafraîchissement du jeton ne
// vivent QUE ici. Dupliqués dans deux écrans, ils auraient divergé au premier
// changement de garde d'invitation — et la divergence aurait été invisible
// jusqu'au jour où un seul des deux parcours aurait cessé de fonctionner.
//
// L'habillage reste au parent, par la prop `styles` : la vitrine et
// l'application n'ont pas le même thème, et un composant partagé n'a pas à
// trancher cette question à leur place.
// =============================================================================

import React, { useState } from "react";
import { creerMaSociete } from "../lib/adaptateur.js";
import { tvaBelgeValide } from "@domaine/organisation/identite.js";

const VIDE = { nom: "", nomAdmin: "", bce: "", tva: "", tel: "", code: "" };

/**
 * @param styles          { champ, label, aide, mono, alerte } — habillage du parent.
 * @param onCreee         (resultat) => void, appelé après création réussie.
 * @param libelleBouton   texte du bouton de validation.
 * @param boutonProps     { className, style } appliqués au bouton.
 * @param autoFocus       met le focus sur le code d'invitation.
 */
export default function FormulaireSociete({
  styles, onCreee, libelleBouton = "Créer ma société", boutonProps = {},
  autoFocus = true,
}) {
  const [f, setF] = useState(VIDE);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const champ = styles?.champ || {};
  const label = styles?.label || {};
  const aide = styles?.aide || {};
  const mono = styles?.mono || {};
  // Le bandeau d'erreur est un TRIPLET (fond, filet, encre) fourni par le
  // parent : la vitrine et l'application n'ont pas la même palette, et poser
  // des teintes en dur ici casserait le mode nuit côté application.
  const alerte = styles?.alerte || {};

  const tvaOk = tvaBelgeValide(f.tva);
  // Le code est exigé en base tant que le lancement est fermé. On le rend
  // obligatoire ici aussi : mieux vaut un bouton grisé qu'un refus après coup.
  const pret = f.nom.trim().length > 1 && tvaOk && f.code.trim().length > 3;

  const maj = (cle) => (e) => setF((x) => ({ ...x, [cle]: e.target.value }));

  async function creer() {
    setErreur(null);
    setEnCours(true);
    try {
      const res = await creerMaSociete(f);
      setF(VIDE);
      onCreee?.(res);
    } catch (e) {
      setErreur(e?.message || "Création refusée");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <label style={{ ...label, marginTop: 0 }}>
        Code d'invitation <span style={{ color: "#DC2626" }}>*</span>
      </label>
      <input style={{ ...champ, ...mono }} value={f.code} placeholder="DP-XXXXXXXX"
             autoFocus={autoFocus}
             onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toUpperCase() }))} />
      <div style={aide}>
        Dashprod ouvre par vagues. Ce code vous a été transmis par l'équipe.
      </div>

      <label style={label}>
        Nom de la société <span style={{ color: "#DC2626" }}>*</span>
      </label>
      <input style={champ} value={f.nom} placeholder="Déménagements Dupont SRL"
             onChange={maj("nom")} />

      <label style={label}>Votre nom</label>
      <input style={champ} value={f.nomAdmin} placeholder="Jean Dupont"
             onChange={maj("nomAdmin")} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={label}>Numéro d'entreprise</label>
          <input style={champ} value={f.bce} placeholder="0123.456.749"
                 onChange={maj("bce")} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={label}>TVA <span style={{ color: "#DC2626" }}>*</span></label>
          <input style={{ ...champ, borderColor: !f.tva || tvaOk ? champ.borderColor : "#DC2626" }}
                 value={f.tva} placeholder="BE0123456749" onChange={maj("tva")} />
        </div>
      </div>
      {f.tva && !tvaOk && (
        <div style={{ ...aide, color: "#DC2626" }}>
          Format attendu : BE suivi de 10 chiffres.
        </div>
      )}

      <label style={label}>Téléphone</label>
      <input style={champ} value={f.tel} placeholder="0470 00 00 00" onChange={maj("tel")} />

      {erreur && (
        <div style={{ fontSize: 12.5, borderRadius: 10, padding: "10px 12px",
                      marginTop: 12, lineHeight: 1.5, ...alerte }}>
          {erreur}
        </div>
      )}

      <button {...boutonProps}
              style={{ ...(boutonProps.style || {}), opacity: pret && !enCours ? 1 : 0.5 }}
              disabled={!pret || enCours} onClick={creer}>
        {enCours ? "Création…" : libelleBouton}
      </button>
    </div>
  );
}
