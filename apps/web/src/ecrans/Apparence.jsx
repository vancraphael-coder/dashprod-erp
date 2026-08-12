// =============================================================================
// APPARENCE — le réglage visuel de l'app entreprise.
//
// Trois choix : le mode (clair / nuit), la couleur d'accent, la matière des
// cartes. Un aperçu montre le résultat AVANT de valider — on ne demande à
// personne de recharger pour découvrir ce qu'il a choisi.
//
// Les styles de l'app étant calculés au chargement, appliquer un nouveau
// réglage recharge la page. C'est assumé et annoncé plutôt que masqué.
// =============================================================================

import React, { useState } from "react";
import { C, S, FC } from "../lib/theme.jsx";
import MolettesCouleur from "./MolettesCouleur.jsx";
import {
  ACCENTS, MATIERES, PROFONDEURS, MODES, APPARENCE_DEFAUT, UTILITES,
  lireApparence, ecrireApparence, jetons, matiereCarte, accentDe,
  couleurUtilite, ecrireCouleur,
} from "../lib/apparence.js";

export default function Apparence({ retour }) {
  const initial = lireApparence();
  const [app, setApp] = useState(initial);
  const modifie = JSON.stringify(app) !== JSON.stringify(initial);

  const maj = (cle, val) => setApp((a) => ({ ...a, [cle]: val }));
  const acc = accentDe(app.accent);

  function appliquer() {
    ecrireApparence(app);
    window.location.reload();
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Paramètres</button>
        <div style={S.titre}>Apparence</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Un réglage propre à cet appareil — il ne change rien pour vos collègues.
        </div>
      </div>

      {/* Aperçu : ce que donneront les écrans avec le réglage en cours. */}
      <Apercu app={app} />

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Mode</label>
        <div style={{ display: "grid", gap: 8 }}>
          {MODES.map((m) => (
            <Choix key={m.cle} actif={app.mode === m.cle} titre={m.nom}
                   resume={m.resume} onClick={() => maj("mode", m.cle)} />
          ))}
        </div>
        {app.mode === "nuit" && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10,
                        background: "#FFFBEB", border: "1px solid #FDE68A",
                        fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
            Le mode nuit est encore en rodage : quelques encadrés d'écrans
            secondaires gardent un fond clair et ne suivent pas encore. Les
            écrans principaux — dossiers, planning, devis, facture — sont prêts.
          </div>
        )}
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Couleur d'accent</label>
        <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 14,
                      lineHeight: 1.5 }}>
          Elle habille les boutons, les liens et les éléments actifs. Les couleurs
          de sens — vert « effectué », rouge « en retard » — ne changent pas.
        </div>

        {/* Deux molettes : la teinte à gauche, le dégradé à droite, l'aperçu
            au milieu. Toutes les couleurs sont atteignables. */}
        <MolettesCouleur
          teinte={acc.teinte} degrade={acc.degrade} accent={acc}
          onChange={(d) => maj("accent", {
            teinte: d.teinte ?? acc.teinte,
            degrade: d.degrade ?? acc.degrade,
          })} />

        <label style={S.label}>Départs rapides</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ACCENTS.map((p) => {
            const c = accentDe(p.cle);
            const choisi = acc.teinte === p.teinte && acc.degrade === p.degrade;
            return (
              <button key={p.cle} onClick={() => maj("accent", p.cle)}
                title={p.nom} aria-label={p.nom} aria-pressed={choisi}
                style={{ width: 34, height: 34, borderRadius: 11, cursor: "pointer",
                  background: `linear-gradient(135deg, ${c.vif}, ${c.fonce})`,
                  border: choisi ? `3px solid ${C.encre}` : `1px solid ${C.bord}`,
                  display: "grid", placeItems: "center", color: "#fff",
                  fontSize: 13, fontWeight: 800 }}>
                {choisi ? "✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Profondeur</label>
        <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 10,
                      lineHeight: 1.5 }}>
          À quel point les cartes se détachent du fond.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {PROFONDEURS.map((m) => (
            <Choix key={m.cle} actif={app.profondeur === m.cle} titre={m.nom}
                   resume={m.resume} onClick={() => maj("profondeur", m.cle)} />
          ))}
        </div>

        <label style={S.label}>Arrondi des angles</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="range" min={6} max={26} step={2} value={app.rayon}
                 onChange={(e) => maj("rayon", Number(e.target.value))}
                 style={{ flex: 1, accentColor: acc.vif }} />
          <span style={{ fontFamily: FC, fontSize: 12.5, color: C.encre,
                         minWidth: 44, textAlign: "right" }}>{app.rayon} px</span>
        </div>
      </div>

      {/* La matière : de quoi la carte est faite. */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Matière des cartes</label>
        <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 10,
                      lineHeight: 1.5 }}>
          Pleine, ou en verre — le verre retient votre couleur d'accent et la
          fait glisser sous la souris.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {MATIERES.map((m) => (
            <Choix key={m.cle} actif={app.matiere === m.cle} titre={m.nom}
                   resume={m.resume} onClick={() => maj("matiere", m.cle)} />
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10,
                        marginTop: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={app.relief !== false}
                 onChange={(e) => maj("relief", e.target.checked)}
                 style={{ marginTop: 2 }} />
          <span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700,
                           color: C.encre }}>Mouvement au survol</span>
            <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                           marginTop: 2, lineHeight: 1.45 }}>
              Les cartes s'inclinent sous la souris et la lumière suit le
              curseur. Sans effet au doigt.
            </span>
          </span>
        </label>
      </div>

      {/* Les couleurs qui portent un sens — réglables une par une. */}
      {UTILITES.map((u) => (
        <div key={u.cle} style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>{u.nom}</label>
          <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 12,
                        lineHeight: 1.5 }}>{u.resume}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {u.entrees.map((e) => {
              const val = couleurUtilite(app, u.cle, e.cle);
              const change = val.toLowerCase() !== e.defaut.toLowerCase();
              return (
                <div key={e.cle} style={{ display: "flex", alignItems: "center",
                                          gap: 11 }}>
                  <input type="color" value={val} aria-label={e.nom}
                    onChange={(ev) => setApp((a) =>
                      ecrireCouleur(a, u.cle, e.cle, ev.target.value))}
                    style={{ width: 40, height: 32, padding: 0, cursor: "pointer",
                             border: `1px solid ${C.bord}`, borderRadius: 8,
                             background: "none" }} />
                  <span style={{ flex: 1, fontSize: 13, color: C.encre }}>{e.nom}</span>
                  <span style={{ fontFamily: FC, fontSize: 11,
                                 color: C.fantome }}>{val.toUpperCase()}</span>
                  {change && (
                    <button onClick={() => setApp((a) =>
                      ecrireCouleur(a, u.cle, e.cle, null))}
                      title="Revenir à la couleur d'origine"
                      style={{ background: "none", border: "none", cursor: "pointer",
                               color: C.muet, fontSize: 15, padding: 2 }}>↺</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ margin: "0 16px 12px" }}>
        <button style={{ ...S.boutonPlein, opacity: modifie ? 1 : .5 }}
                disabled={!modifie} onClick={appliquer}>
          Appliquer{modifie ? " et recharger" : ""}
        </button>
        <button style={{ ...S.boutonLien, width: "100%", textAlign: "center",
                         marginTop: 8 }}
                onClick={() => setApp({ ...APPARENCE_DEFAUT })}>
          Revenir au réglage d'origine
        </button>
        {modifie && (
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8,
                        textAlign: "center", lineHeight: 1.5 }}>
            L'application se rechargera pour appliquer le nouveau réglage.
          </div>
        )}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

/** Un choix en ligne, avec sa pastille de sélection. */
function Choix({ actif, titre, resume, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={actif}
      style={{ display: "flex", alignItems: "flex-start", gap: 11, width: "100%",
        padding: "12px 13px", cursor: "pointer", textAlign: "left",
        borderRadius: 12, background: actif ? C.bleuClair : "transparent",
        border: `1.5px solid ${actif ? C.bleu : C.bord}` }}>
      <span aria-hidden style={{ width: 16, height: 16, borderRadius: 999,
        marginTop: 1, flexShrink: 0,
        border: `2px solid ${actif ? C.bleu : C.bord}`,
        background: actif ? C.bleu : "transparent",
        boxShadow: actif ? `inset 0 0 0 3px ${C.blanc}` : "none" }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700,
                       color: C.encre }}>{titre}</span>
        <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                       marginTop: 2, lineHeight: 1.45 }}>{resume}</span>
      </span>
    </button>
  );
}

/**
 * L'aperçu. Il ne dépend PAS du thème chargé : il recalcule les jetons à partir
 * du réglage en cours, pour montrer honnêtement le résultat.
 */
function Apercu({ app }) {
  const T = jetons(app);
  const mat = matiereCarte(app, T);
  const a = accentDe(app.accent);
  return (
    <div style={{ margin: "0 16px 12px", padding: 16, borderRadius: 16,
                  background: app.mode === "nuit" ? "#070B18" : "#F4F7FE",
                  border: `1px solid ${C.bord}` }}>
      <div style={{ fontFamily: FC, fontSize: 10, fontWeight: 700,
                    letterSpacing: ".1em", textTransform: "uppercase",
                    color: C.muet, marginBottom: 10 }}>Aperçu</div>

      <div style={{ borderRadius: app.rayon, padding: 14, ...mat }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "baseline" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.encre }}>
            Famille Dupont
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.vert }}>Effectué</span>
        </div>
        <div style={{ fontSize: 12, color: T.muet, marginTop: 3 }}>
          Namur → Liège · 12 juin
        </div>
        <div style={{ height: 1, background: T.bord, margin: "11px 0" }} />
        {/* Les couleurs de sens, telles qu'elles seront lues sur un planning. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 11 }}>
          {[["etats", "effectue", "Effectué"], ["etats", "en_cours", "En cours"],
            ["missions", "demenagement", "Déménagement"], ["missions", "visite", "Visite"],
            ["planning", "conge", "Congé"]].map(([f, c, nom]) => {
            const coul = couleurUtilite(app, f, c);
            return (
              <span key={f + c} style={{ fontSize: 10.5, fontWeight: 700,
                color: coul, background: coul + "22", borderRadius: 999,
                padding: "3px 9px", border: `1px solid ${coul}55` }}>{nom}</span>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ flex: 1, padding: "9px 12px", borderRadius: 10,
            background: `linear-gradient(135deg, ${a.vif}, ${a.fonce})`,
            color: "#fff", fontSize: 12.5, fontWeight: 700, textAlign: "center" }}>
            Action
          </span>
          <span style={{ padding: "9px 12px", borderRadius: 10,
            border: `1.5px solid ${T.bord}`, color: T.encre,
            fontSize: 12.5, fontWeight: 600 }}>Secondaire</span>
        </div>
      </div>
    </div>
  );
}
