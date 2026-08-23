// =============================================================================
// LES LISTES DE RÉGLAGES — la grammaire commune de Compte et de Paramètres.
//
// POURQUOI CE FICHIER EXISTE
// --------------------------
// `Groupe` et `Entree` vivaient dans Parametres.jsx. `BlocPortes` et `Porte`
// vivaient dans Profil.jsx — même structure, mêmes filets, mêmes arrondis,
// écrits deux fois. Profil.jsx portait EN PLUS deux copies littérales d'une
// troisième variante (`carteAction`), recopiée caractère pour caractère pour
// les centres logistiques et le compte rendu, et une QUATRIÈME dans le bouton
// d'avis. Quatre formes pour une seule idée : « une ligne qui ouvre un écran ».
//
// Le commentaire de Profil.jsx disait déjà, à propos de deux d'entre elles :
// « une copie finit toujours par diverger ». C'était juste, et la divergence
// avait déjà eu lieu — les cartes isolées portaient une bordure et une ombre
// propres, les portes cousues non. Le même écran affichait donc deux styles de
// ligne selon l'endroit où l'œil tombait.
//
// Un composant, une forme. Les deux écrans consomment, aucun ne redéfinit.
//
// CE QUE CE FICHIER NE FAIT PAS
// -----------------------------
// Il ne décide rien : ni quelles entrées afficher, ni lesquelles l'abonnement
// ouvre. C'est de la mise en forme. Le tri des portes ouvertes et fermées est
// une décision produit, elle reste dans les écrans.
// =============================================================================

import React from "react";
import { C, APP } from "../lib/theme.jsx";

/**
 * UN GROUPE DE RÉGLAGES — un conteneur, pas un titre flottant.
 *
 * Les entrées y sont cousues par des filets ; le conteneur porte les arrondis.
 * On VOIT le groupe au lieu de le lire.
 *
 * Un groupe rassemble au moins DEUX réglages. Un titre de section pour un item
 * unique n'organise rien : il double la hauteur sans rien apprendre. Cette
 * règle est vérifiée par un test, pas laissée à la vigilance.
 */
export function Groupe({ titre, aide, children }) {
  return (
    <section style={{ marginTop: 22 }}>
      {titre && (
        <div style={{ fontSize: 11, fontWeight: 800, color: C.muet,
                      letterSpacing: ".06em", textTransform: "uppercase",
                      margin: "0 2px 7px" }}>
          {titre}
        </div>
      )}
      {aide && (
        <div style={{ fontSize: 11.5, color: C.fantome, lineHeight: 1.45,
                      margin: "-4px 2px 8px" }}>{aide}</div>
      )}
      <div style={{ border: `1px solid ${C.bord}`, borderRadius: APP.rayon,
                    overflow: "hidden", background: C.blanc,
                    boxShadow: "0 1px 3px rgba(15,23,42,.05)" }}>
        {children}
      </div>
    </section>
  );
}

/**
 * UNE ENTRÉE — une ligne qui ouvre un écran.
 *
 * `premier` supprime le filet du haut : sinon il doublerait la bordure du
 * conteneur.
 *
 * La classe `reglage-entree` porte les états (survol, enfoncement, focus
 * clavier). Ils ne peuvent PAS vivre dans le style inline — un style inline ne
 * connaît ni `:hover` ni `:focus-visible`. C'est précisément pour cela que
 * ces lignes n'avaient aucun retour au geste jusqu'ici : la règle globale
 * `button:hover { filter: brightness() }` n'éclaire rien sur un fond
 * transparent.
 */
export function Entree({ icone, titre, resume, badge, actif, onClick, premier,
                         ton }) {
  return (
    <button onClick={onClick} className="reglage-entree" style={{
      display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
      padding: "13px 14px", border: "none",
      borderTop: premier ? "none" : `1px solid ${C.doux || C.bord}`,
      background: "transparent", cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 19, lineHeight: 1 }}>{icone}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700,
                       color: ton === "danger" ? C.rouge : C.encre }}>
          {titre}
        </span>
        {resume && (
          <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                         marginTop: 2, lineHeight: 1.4 }}>{resume}</span>
        )}
        {badge && (
          <span style={{ display: "inline-block", marginTop: 6, fontSize: 10.5,
                         fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                         background: actif ? C.bleuClair : C.doux,
                         color: actif ? C.bleu : C.fantome }}>{badge}</span>
        )}
      </span>
      <span className="reglage-chevron"
            style={{ color: C.fantome, fontSize: 18, lineHeight: 1.2 }}>›</span>
    </button>
  );
}

/**
 * DES ONGLETS SEGMENTÉS.
 *
 * `aria-selected` n'est pas décoratif : c'est lui que la feuille de style lit
 * pour ne réagir au survol QUE sur l'onglet inactif — survoler l'onglet déjà
 * choisi ne doit rien promettre. Il sert en même temps aux lecteurs d'écran,
 * qui n'avaient jusqu'ici aucun moyen de savoir quel onglet était actif : la
 * distinction était purement colorée.
 */
export function OngletsSegmentes({ onglets, actif, choisir }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 8, margin: "0 16px 12px" }}>
      {onglets.map(([cle, lib]) => {
        const estActif = actif === cle;
        return (
          <button key={cle} role="tab" aria-selected={estActif}
            className="onglet-segment" onClick={() => choisir(cle)} style={{
              flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
              fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${estActif ? C.bleu : C.bord}`,
              background: estActif ? C.bleuClair : C.blanc,
              color: estActif ? C.bleu : C.muet }}>{lib}</button>
        );
      })}
    </div>
  );
}

/**
 * UN BANDEAU TEINTÉ — avertir, refuser, confirmer, informer.
 *
 * Les six familles de teinte suivent le mode nuit (jetons `teinte*` / `filet*`
 * / `encre*`). Écrites en dur, elles posaient un pavé lumineux sur le fond
 * sombre et leur texte foncé y devenait illisible.
 */
export function Bandeau({ ton = "neutre", children, style }) {
  const t = {
    ambre: [C.teinteAmbre, C.filetAmbre, C.encreAmbre],
    rouge: [C.teinteRouge, C.filetRouge, C.encreRouge],
    vert: [C.teinteVerte, C.filetVert, C.encreVert],
    bleu: [C.teinteBleue, C.filetBleu, C.encreBleu],
    violet: [C.teinteViolette, C.filetViolet, C.encreViolet],
    neutre: [C.teinteNeutre, C.filetNeutre, C.encreNeutre],
  }[ton] || [C.teinteNeutre, C.filetNeutre, C.encreNeutre];
  return (
    <div style={{ background: t[0], border: `1px solid ${t[1]}`, color: t[2],
                  borderRadius: 10, padding: "10px 12px", fontSize: 12.5,
                  lineHeight: 1.5, ...style }}>
      {children}
    </div>
  );
}
