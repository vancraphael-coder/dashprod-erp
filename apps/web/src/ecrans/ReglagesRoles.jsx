// =============================================================================
// RÉGLAGE — RÔLES ET CAPACITÉS.
//
// LE MANQUE QU'IL COMBLE, et c'était le plus structurant des dix. Les rôles et
// leurs capacités étaient posés à la création de la société, puis figés.
// `Equipe.jsx` permettait des dérogations MEMBRE PAR MEMBRE ; rien ne
// permettait de dire ce que « chef d'équipe » signifie DANS CETTE entreprise.
//
// Conséquence : toute société voulant un découpage différent accordait des
// dérogations individuelles en série. Le rôle perdait son sens, et la question
// « qui peut quoi ici » n'avait plus de réponse lisible — alors que c'est
// exactement le sommet « paramétrage » de la pyramide.
//
// POURQUOI CET ÉCRAN EST DANS LES RÉGLAGES ET PAS DANS RESSOURCES. Décider ce
// qu'un rôle peut faire n'est pas gérer une équipe : c'est définir
// l'entreprise. Les deux écrans ne répondent pas à la même question —
// « qu'est-ce qu'un chef d'équipe chez nous » d'un côté, « qui est chef
// d'équipe » de l'autre.
//
// L'AVERTISSEMENT AVANT LE REFUS. La base refuse de retirer une clé de voûte
// qui laisserait zéro détenteur (migration 0191). L'écran calcule la même
// règle avec le même code de domaine et prévient AVANT le clic : un refus qu'on
// pouvait annoncer est un refus de trop.
// =============================================================================

import React, { useEffect, useState } from "react";
import { capacitesDesRoles, definirCapaciteRole, peutRetirerCapaciteRole }
  from "../lib/adaptateur.js";
import { CAPACITES, estCleDeVoute } from "@domaine/rh/capacites.js";
import { C, S } from "../lib/theme.jsx";

export default function ReglagesRoles({ retour }) {
  const [parRole, setParRole] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [enCours, setEnCours] = useState(null);

  function charger() {
    capacitesDesRoles()
      .then(setParRole)
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setParRole({}); });
  }
  useEffect(charger, []);

  async function basculer(roleCle, cap, accorder) {
    setErreur(null);
    // On prévient avant de demander : la base refusera de toute façon, mais un
    // refus qu'on pouvait annoncer est un refus de trop.
    if (!accorder && estCleDeVoute(cap)) {
      const verdict = await peutRetirerCapaciteRole(roleCle, cap)
        .catch(() => ({ permis: true }));
      if (!verdict.permis) { setErreur(verdict.motif); return; }
    }
    setEnCours(`${roleCle}:${cap}`);
    try {
      const r = await definirCapaciteRole(roleCle, cap, accorder);
      if (r?.ok === false) setErreur(r.motif);
      charger();
    } catch (e) {
      setErreur(e?.message || "Changement refusé");
    } finally {
      setEnCours(null);
    }
  }

  if (parRole === null) return null;
  const roles = Object.entries(parRole.roles || {})
    .sort((a, b) => b[1].capacites.length - a[1].capacites.length
                 || a[0].localeCompare(b[0]));

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Paramètres</button>}
        <div style={S.titre}>Rôles et capacités</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2, lineHeight: 1.5 }}>
          Ce qu'un rôle peut faire chez vous. Pour savoir QUI porte un rôle,
          c'est dans Ressources.
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13,
                      lineHeight: 1.5 }}>
          {erreur}
        </div>
      )}

      {roles.map(([cle, r]) => {
        const estOuvert = ouvert === cle;
        return (
          <div key={cle} style={S.carte}>
            <button onClick={() => setOuvert(estOuvert ? null : cle)}
              style={{ display: "flex", width: "100%", alignItems: "center",
                       gap: 10, background: "none", border: "none",
                       padding: 0, cursor: "pointer", fontFamily: "inherit",
                       textAlign: "left" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
                  {r.libelle || cle}
                </div>
                <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
                  {r.capacites.length} capacité{r.capacites.length > 1 ? "s" : ""}
                  {" · "}
                  {r.membresActifs === 0
                    ? "personne"
                    : `${r.membresActifs} personne${r.membresActifs > 1 ? "s" : ""}`}
                </div>
              </div>
              <span style={{ fontSize: 12, color: C.muet }}>
                {estOuvert ? "▲" : "▼"}
              </span>
            </button>

            {estOuvert && (
              <div style={{ marginTop: 12 }}>
                {CAPACITES.map((c) => {
                  const a = r.capacites.includes(c.cle);
                  const travaux = enCours === `${cle}:${c.cle}`;
                  return (
                    <div key={c.cle}
                      style={{ display: "flex", gap: 10, alignItems: "flex-start",
                               padding: "9px 0",
                               borderTop: `1px solid ${C.bord}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600,
                                      color: a ? C.encre : C.muet }}>
                          {c.titre}
                          {estCleDeVoute(c.cle) && (
                            <span style={{ fontSize: 10.5, fontWeight: 800,
                                           marginLeft: 6, padding: "2px 7px",
                                           borderRadius: 999,
                                           background: C.teinteAmbre,
                                           color: C.encreAmbre }}>
                              clé de voûte
                            </span>
                          )}
                        </div>
                        {a && c.detail && (
                          <div style={{ fontSize: 11.5, color: C.muet,
                                        marginTop: 3, lineHeight: 1.45 }}>
                            {c.detail}
                          </div>
                        )}
                      </div>
                      <button disabled={Boolean(enCours)}
                        onClick={() => basculer(cle, c.cle, !a)}
                        style={{ ...S.boutonLien, padding: 0, flexShrink: 0,
                                 opacity: travaux ? 0.5 : 1,
                                 color: a ? C.encreRouge : C.encreVert }}>
                        {travaux ? "…" : a ? "Retirer" : "Accorder"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ ...S.carte, background: C.teinteAmbre,
                    border: `1px solid ${C.filetAmbre}` }}>
        <div style={{ fontSize: 12.5, color: C.encreAmbre, lineHeight: 1.55 }}>
          Deux capacités sont des <strong>clés de voûte</strong> : sans
          « Confier les accès », plus personne ne peut redonner de droits ; sans
          « Gérer les référentiels », plus personne ne peut reparamétrer. Leur
          retrait est refusé s'il ne resterait personne pour les porter — y
          compris par une dérogation individuelle.
        </div>
      </div>
    </div>
  );
}
