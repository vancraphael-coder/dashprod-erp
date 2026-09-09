// =============================================================================
// Écran — Mes sociétés.
//
// LE MANQUE QU'IL COMBLE. Une personne rattachée à une organisation n'avait
// aucun moyen d'en créer une seconde, ni de revenir à la première. Le
// sélecteur de société (ChoixSociete, main.jsx) ne s'affiche qu'à un moment
// précis : jeton sans organisation ET plusieurs appartenances. Dès qu'un choix
// est posé, `appartenance_active` l'épingle, le jeton le porte, et l'écran ne
// réapparaît plus jamais. La base sait faire depuis 0081 ; l'interface, non.
//
// CE QUE L'ÉCRAN N'EST PAS. À ne pas confondre avec Societes.jsx, réservé à
// l'éditeur, qui crée des organisations CLIENTES pour un autre administrateur.
// Ici il s'agit des sociétés dont JE suis membre, et de celle que je monte pour
// moi-même.
//
// UNE SEULE À LA FOIS. Le cloisonnement tient au jeton, pas à cet écran :
// changer de société sans rafraîchir la session laisserait l'ancien jeton
// commander le RLS. `choisirSociete` s'en charge, on recharge derrière.
// =============================================================================

import React, { useEffect, useState } from "react";
import { mesSocietes, choisirSociete } from "../lib/adaptateur.js";
import FormulaireSociete from "../composants/FormulaireSociete.jsx";
import { C, S } from "../lib/theme.jsx";

export default function MesSocietes({ retour }) {
  const [liste, setListe] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [creation, setCreation] = useState(false);

  useEffect(() => {
    mesSocietes()
      .then((l) => setListe(l || []))
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setListe([]); });
  }, []);

  async function basculer(orgId) {
    setErreur(null);
    setEnCours(orgId);
    try {
      await choisirSociete(orgId);
      window.location.reload();
    } catch (e) {
      setErreur(e?.message || "Bascule impossible");
      setEnCours(null);
    }
  }

  const champ = { ...S.input, marginTop: 0 };
  const label = { ...S.label };
  const aide = { fontSize: 11.5, color: C.muet, marginTop: 4, lineHeight: 1.45 };

  if (liste === null) return null;

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Mes sociétés</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Vous n'en ouvrez qu'une à la fois. Les données ne se croisent jamais.
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      <div style={S.carte}>
        {liste.length === 0 && (
          <div style={{ fontSize: 13, color: C.muet }}>
            Aucune société rattachée à ce compte.
          </div>
        )}
        {liste.map((s) => (
          <div key={s.org_id}
               style={{ display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 0",
                        borderTop: `1px solid ${C.bord}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
                {s.nom}
              </div>
              {s.role_principal && (
                <div style={{ fontSize: 11.5, color: C.muet, marginTop: 2 }}>
                  {String(s.role_principal).replace(/_/g, " ")}
                </div>
              )}
            </div>
            {s.active ? (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.encreVert,
                             background: C.teinteVerte,
                             border: `1px solid ${C.filetVert}`,
                             borderRadius: 999, padding: "4px 10px" }}>
                ouverte
              </span>
            ) : (
              <button style={S.boutonLien} disabled={Boolean(enCours)}
                      onClick={() => basculer(s.org_id)}>
                {enCours === s.org_id ? "Ouverture…" : "Ouvrir"}
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={S.carte}>
        {!creation ? (
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
              Créer une autre société
            </div>
            <div style={{ fontSize: 12.5, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
              Base vierge : aucun client, aucune affaire, aucun barème. Votre
              société actuelle n'est pas touchée, et vous pourrez revenir dessus
              d'ici.
            </div>
            <button style={{ ...S.boutonLien, marginTop: 10 }}
                    onClick={() => setCreation(true)}>
              Ouvrir le formulaire
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.encre,
                          marginBottom: 10, textTransform: "uppercase",
                          letterSpacing: ".03em" }}>
              Nouvelle société
            </div>
            <FormulaireSociete
              styles={{ champ, label, aide, mono: { letterSpacing: ".05em" },
                        alerte: { color: C.encreRouge, background: C.teinteRouge,
                                  border: `1px solid ${C.filetRouge}` } }}
              libelleBouton="Créer et l'ouvrir"
              boutonProps={{ style: { ...S.boutonPlein, marginTop: 16 } }}
              // La commande bascule déjà l'appartenance active sur la nouvelle
              // société et rafraîchit le jeton. Un rechargement suffit : on
              // atterrit dedans.
              onCreee={() => window.location.reload()} />
            <button style={{ ...S.boutonLien, marginTop: 10 }}
                    onClick={() => setCreation(false)}>
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
