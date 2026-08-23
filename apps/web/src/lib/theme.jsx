// =============================================================================
// Thème — langage visuel partagé des écrans.
// Source : design system de l'app validée (Réf. 2, annexe F : chaque couleur a
// un sens fixe, identique partout). Un seul endroit pour les couleurs et les
// badges : les écrans consomment, ne redéfinissent jamais.
// =============================================================================

import React from "react";
import { lireApparence, jetons, matiereCarte, fondPage, rgbAccent, couleurUtilite }
  from "./apparence.js";
import { installerCartesVives } from "./cartes-vives.js";
import { matiereSurface } from "./matiere-bille.js";

// Le réglage d'apparence choisi par la personne (mode, accent, matière). Il est
// lu UNE fois au chargement : les styles étant en ligne, un changement à chaud
// demande un rechargement — c'est ce que fait l'écran Apparence.
export const APP = lireApparence();

export const C = jetons(APP);

// Le fond du document suit le mode : sinon, en nuit, la page flotte dans un
// halo blanc de part et d'autre de la colonne.
if (typeof document !== "undefined") {
  document.documentElement.style.background = APP.mode === "nuit" ? "#070B18" : "#F4F7FE";
  document.documentElement.style.colorScheme = APP.mode === "nuit" ? "dark" : "light";
}

// Relief 3D et lueur au curseur sur toutes les cartes, en un seul écouteur.
installerCartesVives(APP.relief !== false, rgbAccent(APP.accent),
                     APP.matiere === "verre");

// La matière de la BILLE suit la surface, et c'est la même règle que §3.5 : de
// nuit ou en « verre », il y a quelque chose derrière elle — elle est
// translucide et le trouble. De jour sur blanc, un verre transparent ne montre
// rien : elle est peinte. Une seule opacité pour les deux modes donnerait soit
// un pavé opaque de nuit, soit un lavis pâle de jour.
if (typeof document !== "undefined") {
  const m = matiereSurface(APP.mode === "nuit" || APP.matiere === "verre");
  for (const [cle, val] of Object.entries(m)) {
    document.documentElement.style.setProperty(cle, val);
  }
  // Les surfaces d'interaction, en variables : la feuille de style plus bas ne
  // peut pas lire `C`, et l'accent est réglable par la personne. Un survol
  // écrit en dur trahirait la couleur choisie dès qu'elle n'est plus bleue.
  // L'opacité diffère selon le mode : sur un fond sombre, un voile trop léger
  // ne se voit pas ; sur un fond blanc, le même voile tache.
  const rgbA = rgbAccent(APP.accent);
  const nuit = APP.mode === "nuit";
  document.documentElement.style.setProperty("--dp-accent", `rgb(${rgbA})`);
  document.documentElement.style.setProperty("--dp-survol",
    nuit ? `rgba(${rgbA}, .13)` : `rgba(${rgbA}, .055)`);
  document.documentElement.style.setProperty("--dp-enfonce",
    nuit ? `rgba(${rgbA}, .22)` : `rgba(${rgbA}, .11)`);
}

// Typographie du modèle validé (roovers-mobile) : Fira Sans pour le texte,
// Fira Code pour les libellés techniques et les montants. Injectées une fois.
export const FS = "'Fira Sans', system-ui, sans-serif";
export const FC = "'Fira Code', ui-monospace, monospace";
if (typeof document !== "undefined" && !document.getElementById("polices-roovers")) {
  const l = document.createElement("link");
  l.id = "polices-roovers"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600;700;800&family=Fira+Code:wght@500;700&display=swap";
  document.head.appendChild(l);
}

// LE DESIGN DES ZONES D'ÉCRITURE, en un seul endroit. Les styles étant en
// ligne, `S.input` ne peut pas porter de `:focus`, de `::placeholder` ni de
// `:hover` — un champ ne réagissait donc pas au clic : bordure inerte, aucun
// anneau, impossible de voir où l'on écrit. Un défaut qui touchait TOUS les
// champs de l'app. Cette feuille les corrige d'un coup, par sélecteur, sans
// toucher un seul écran.
if (typeof document !== "undefined" && !document.getElementById("champs-dashprod")) {
  const rgb = rgbAccent(APP.accent);
  const st = document.createElement("style");
  st.id = "champs-dashprod";
  st.textContent = `
    input, textarea, select {
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
      outline: none;
    }
    /* Le survol PRÉVIENT qu'un champ est cliquable ; le focus MONTRE où l'on
       écrit, avec un anneau à la couleur d'accent — pas le halo bleu par
       défaut du navigateur, qui ignore le thème et jure en mode nuit. */
    input:hover, textarea:hover, select:hover { border-color: rgba(${rgb}, .55); }
    input:focus, textarea:focus, select:focus {
      border-color: rgb(${rgb}) !important;
      box-shadow: 0 0 0 3px rgba(${rgb}, .18);
    }
    /* Le texte d'invite était de la même encre que la saisie : on ne
       distinguait pas un champ vide d'un champ rempli. Il s'efface au focus,
       pour ne pas gêner la frappe. */
    input::placeholder, textarea::placeholder { color: ${C.fantome}; opacity: 1; }
    input:focus::placeholder, textarea:focus::placeholder { opacity: .4; }
    /* Un champ désactivé doit AVOIR l'air désactivé, pas ramollir le texte. */
    input:disabled, textarea:disabled, select:disabled {
      opacity: .55; cursor: not-allowed;
    }
    /* LES BOUTONS, partout. Ils étaient inertes : aucun retour au survol, aucun
       anneau au focus clavier — c'est une grande part de l'impression
       d'incohérence. Ces règles s'appliquent à TOUT bouton, quel que soit son
       style inline, sans avoir à toucher les 391 boutons de l'app.
       On ne touche ni à la couleur ni à la forme (portées par le style inline) :
       seulement le RETOUR au geste. */
    button { transition: filter .14s ease, transform .1s ease, box-shadow .14s ease; }
    button:not(:disabled):hover { filter: brightness(1.04); }
    /* L'enfoncement : bref, net, universel — le bouton répond au clic. */
    button:not(:disabled):active { transform: translateY(1px) scale(.985); }
    /* Focus clavier UNIQUEMENT (pas au clic souris) : un anneau d'accent pour
       qui navigue au clavier, invisible pour qui clique. */
    button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(${rgb}, .35);
    }
    button:disabled { cursor: not-allowed; opacity: .55; }
    /* Le bouton DANGER se remplit au survol : contour au repos (il prévient),
       aplat rouge quand on s'apprête à cliquer (il confirme l'intention). */
    button[data-bouton="danger"]:not(:disabled):hover {
      background: ${C.rouge} !important; color: #fff !important;
    }
    /* Le SÉLECTEUR ROTATIF, posé bas droite comme la boussole de la vitrine.
       Discret au repos, net dès qu'on l'approche. Masqué sous 900px : au pouce,
       la barre d'onglets du bas reste la commande — le sélecteur est un
       repère de confort sur grand écran, pas une béquille. */
    .selecteur-rotatif-cadre {
      position: fixed; right: 18px; bottom: 74px; z-index: 40;
      padding: 6px; border-radius: 50%;
      background: radial-gradient(120% 120% at 50% 0%, rgba(16,28,54,.92), rgba(8,12,22,.94));
      border: 1px solid rgba(255,255,255,.07);
      box-shadow: 0 20px 50px -22px rgba(0,0,0,.85);
      opacity: .5; transform: scale(.9);
      transition: opacity .35s ease, transform .35s ease;
    }
    .selecteur-rotatif-cadre:hover, .selecteur-rotatif-cadre:focus-within {
      opacity: 1; transform: scale(1);
    }
    @media (max-width: 900px) { .selecteur-rotatif-cadre { display: none; } }
    @media (prefers-reduced-motion: reduce) {
      .selecteur-rotatif-cadre, .selecteur-rotatif-cadre * {
        transition-duration: .001ms !important;
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       LES LISTES DE RÉGLAGES (Compte, Paramètres).

       LE DÉFAUT : la règle universelle plus haut (survol = filtre de
       luminosité) ne produit RIEN sur un fond transparent — or les
       entrées de réglage sont justement transparentes (elles vivent dans leur
       groupe). Résultat : sur les deux écrans les plus denses de l'app, aucune
       ligne ne réagissait au survol. On croyait avoir des états ; on n'en avait
       pas. Un filtre de luminosité ne peut pas éclairer le néant : il faut
       poser une vraie surface.

       Ces règles vivent ici et non en style inline parce qu'un style inline ne
       porte ni :hover, ni :active, ni :focus-visible — c'est la raison d'être
       de cette feuille. */
    .reglage-entree {
      position: relative;
      transition: background .14s ease;
    }
    .reglage-entree:not(:disabled):hover { background: var(--dp-survol); }
    /* Le chevron avance d'un cheveu vers sa destination : le mouvement dit
       « ceci ouvre un écran », là où la couleur seule ne dit que « cliquable ». */
    .reglage-entree .reglage-chevron { transition: transform .16s ease, color .16s ease; }
    .reglage-entree:not(:disabled):hover .reglage-chevron {
      transform: translateX(3px); color: var(--dp-accent);
    }
    /* L'enfoncement global (translateY) déplacerait la ligne DANS son groupe et
       ferait bâiller le filet du dessous. Une ligne cousue s'enfonce en
       couleur, pas en position. */
    .reglage-entree:not(:disabled):active {
      transform: none; background: var(--dp-enfonce);
    }
    /* Le focus clavier doit rester DANS le groupe, qui masque son
       débordement : un anneau porté vers l'extérieur y serait rogné. On le
       rentre donc à l'intérieur. */
    .reglage-entree:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--dp-accent);
    }

    /* Les ONGLETS SEGMENTÉS (Outils & vêtements / Mes congés…). L'onglet
       inactif ne se distinguait de l'actif que par sa couleur : au survol,
       rien ne disait lequel on s'apprêtait à choisir. */
    .onglet-segment { transition: background .14s ease, border-color .14s ease, color .14s ease; }
    .onglet-segment[aria-selected="false"]:hover {
      background: var(--dp-survol); border-color: var(--dp-accent);
    }
    .onglet-segment:focus-visible {
      outline: none; box-shadow: 0 0 0 3px rgba(${rgb}, .35);
    }
  `;
  document.head.appendChild(st);
}

/** États d'affaire → libellé + couleur (Réf. 2, annexe F). */
// ── Le CYCLE OPÉRATIONNEL : où en est le déménagement ────────────────────────
// « facture » et « paye » n'en font plus partie (0064) : l'argent a son propre
// cycle, dérivé des factures. Ils restent listés ici pour d'anciens dossiers.
export const ETATS_UI = {
  brouillon: { libelle: "Brouillon", couleur: couleurUtilite(APP, "etats", "brouillon") },
  devis:     { libelle: "Devis",     couleur: couleurUtilite(APP, "etats", "devis") },
  envoye:    { libelle: "Envoyé",    couleur: couleurUtilite(APP, "etats", "confirme") },
  confirme:  { libelle: "Confirmé",  couleur: couleurUtilite(APP, "etats", "confirme") },
  planifie:  { libelle: "Planifié",  couleur: couleurUtilite(APP, "etats", "planifie") },
  en_cours:  { libelle: "En cours",  couleur: couleurUtilite(APP, "etats", "en_cours") },
  effectue:  { libelle: "Effectué",  couleur: couleurUtilite(APP, "etats", "effectue") },
  facture:   { libelle: "Facturé",   couleur: couleurUtilite(APP, "etats", "effectue") },
  paye:      { libelle: "Payé",      couleur: couleurUtilite(APP, "etats", "effectue") },
  clos:      { libelle: "Clos",      couleur: couleurUtilite(APP, "etats", "clos") },
  reporte:   { libelle: "Reporté",   couleur: couleurUtilite(APP, "etats", "en_cours") },
  annule:    { libelle: "Annulé",    couleur: couleurUtilite(APP, "etats", "annule") },
};

/**
 * Couleur d'un TYPE DE TRAVAIL (déménagement, visite, emballage), réglable.
 * Le domaine garde sa couleur par défaut ; ici on applique le choix de l'app.
 */
export function couleurMission(type) {
  return couleurUtilite(APP, "missions", type);
}

/** Couleur d'un état de DISPONIBILITÉ au planning (congé, double, libre). */
export function couleurPlanning(cle) {
  return couleurUtilite(APP, "planning", cle);
}

// ── Le CYCLE DE FACTURATION : où en est l'argent ─────────────────────────────
// Dérivé en base par etat_facturation() — jamais stocké, donc jamais en
// contradiction avec les factures réelles.
export const ETATS_FACTURATION = {
  non_facture:        { libelle: "Non facturé",  couleur: C.fantome },
  facture:            { libelle: "Facturé",      couleur: C.ambre },
  partiellement_paye: { libelle: "Partiel",      couleur: C.ambre },
  paye:               { libelle: "Payé",         couleur: C.vert },
};

/**
 * Badge de facturation. Volontairement distinct du badge d'état : un dossier
 * a DEUX histoires — le déménagement et l'argent — et les confondre produisait
 * des affichages absurdes (« confirmé et payé »).
 */
export function BadgeFacturation({ etat, discret = false }) {
  const e = ETATS_FACTURATION[etat];
  if (!e || (discret && etat === "non_facture")) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: e.couleur,
      border: `1.5px solid ${e.couleur}`, background: "transparent",
      borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap",
    }}>{e.libelle}</span>
  );
}

/** Zones de marge → couleur (Réf. 2 : rouge / vert / indigo premium). */
export const ZONES_MARGE = {
  sous_cible: C.rouge,
  dans_cible: C.vert,
  premium: C.indigo,
};

export function Badge({ etat }) {
  const e = ETATS_UI[etat] || { libelle: etat, couleur: C.fantome };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: "#fff", background: e.couleur,
      borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap",
    }}>{e.libelle}</span>
  );
}

export function euros(centimes) {
  return (Math.round(centimes) / 100).toLocaleString("fr-BE", {
    style: "currency", currency: "EUR",
  });
}

/** Styles de base réutilisés par tous les écrans. */
export const S = {
  page: { minHeight: "100vh", background: fondPage(APP, C), fontFamily: FS,
          maxWidth: 520, margin: "0 auto", paddingBottom: 96, color: C.encre },
  entete: { position: "sticky", top: 0, zIndex: 5,
            background: APP.mode === "nuit" ? "rgba(7,11,24,.88)" : "rgba(244,247,254,.92)",
            backdropFilter: "blur(8px)", padding: "16px 16px 10px",
            borderBottom: `1px solid ${C.bord}` },
  titre: { fontSize: 19, fontWeight: 800, color: C.encre, fontFamily: FS,
           letterSpacing: "-.01em" },
  carte: { borderRadius: APP.rayon, padding: 16, margin: "0 16px 12px",
           // Marqueur du moteur « cartes vives » (relief 3D + lueur au curseur).
           "--carte-vive": 1,
           ...matiereCarte(APP, C) },
  label: { display: "block", fontSize: 10.5, fontWeight: 700, color: C.muet,
           textTransform: "uppercase", letterSpacing: ".05em", fontFamily: FC,
           marginTop: 12, marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px",
           border: `1.5px solid ${C.bord}`, borderRadius: 10, fontSize: 14,
           minHeight: 46,
           background: APP.mode === "nuit" ? "#0D1424" : C.blanc,
           fontFamily: FS, color: C.encre },
  boutonPlein: { width: "100%", padding: "13px", border: "none", borderRadius: 11,
                 background: `linear-gradient(135deg, ${C.bleu}, ${C.bleuFonce})`,
                 color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                 fontFamily: FS, boxShadow: "0 4px 14px -4px rgba(37,99,235,.5)" },
  // Le VOCABULAIRE DE BOUTONS, en un seul endroit. Le thème n'offrait que
  // « plein » et « lien » : chaque écran réinventait donc le bouton secondaire
  // (25 fois) et le bouton danger (plus de 100 fois), avec des rayons de 8 à 14
  // au hasard. D'où l'incohérence visible. Ces styles nommés donnent la même
  // forme partout ; un écran qui a un besoin standard n'a plus à l'improviser.
  //
  // Secondaire : une action de second rang (Annuler, Retour), contour plutôt
  // que remplissage — elle ne doit pas rivaliser avec l'action principale.
  boutonSecondaire: { width: "100%", padding: "12px", borderRadius: 11,
                 border: `1.5px solid ${C.bord}`, background: C.blanc,
                 color: C.encre, fontSize: 14, fontWeight: 700, cursor: "pointer",
                 fontFamily: FS },
  // Danger : une action destructrice (Supprimer, Annuler un dossier). Le rouge
  // est un CONTOUR, pas un aplat : un gros bouton rouge plein crie, alors qu'on
  // veut prévenir, pas alarmer. Il devient plein au survol (voir la feuille CSS).
  boutonDanger: { width: "100%", padding: "12px", borderRadius: 11,
                 border: `1.5px solid ${C.rouge}`, background: "transparent",
                 color: C.rouge, fontSize: 14, fontWeight: 700, cursor: "pointer",
                 fontFamily: FS },
  // Puce : un petit bouton inline (un filtre, une étiquette cliquable). Rayon
  // pleinement arrondi, jamais les rayons intermédiaires qui traînaient.
  boutonPuce: { padding: "5px 11px", borderRadius: 999,
                 border: `1.5px solid ${C.bord}`, background: C.blanc,
                 color: C.muet, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                 fontFamily: FS },
  boutonLien: { background: "none", border: "none", color: C.bleu, fontSize: 13,
                fontWeight: 600, cursor: "pointer", padding: 6, fontFamily: FS },
  flottant: { position: "fixed", right: 18, bottom: 84, width: 56, height: 56,
              borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${C.bleu}, ${C.bleuFonce})`,
              color: "#fff", fontSize: 26, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 10px 24px -6px rgba(37,99,235,.55)" },
};

// ── Icônes de navigation (SVG sobres — trait fin, bleu, sélection verte) ──────
const TRACES = {
  dossiers: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  fiche: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 8h6 M9 12h6 M9 16h4",
  releve: "M21 8l-9-5-9 5 9 5 9-5z M3 8v8l9 5 9-5V8 M12 13v8",
  materiel: "M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M9 21V12h6v9",
  devis: "M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  offre: "M17 3l4 4L8 20H4v-4z M14 6l4 4",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3 7l9 6 9-6",
  facture: "M6 2h12v20l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",
  planning: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M16 3v4 M8 3v4 M4 11h16",
  ressources: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M15 3.13a4 4 0 0 1 0 7.75",
  compte: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
  boite: "M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5 M12 13v10",
  chantiers: "M2 20h20 M5 20V9l7-5 7 5v11 M9 20v-6h6v6",
  outils: "M12 5v14 M5 12h14",
  profil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
  heures: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 3",
};

/** Icône de navigation : trait fin, sobre. */
export function Icone({ nom, taille = 20, couleur = C.bleu }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none"
         stroke={couleur} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
         style={{ display: "block", margin: "0 auto" }}>
      {(TRACES[nom] || TRACES.fiche).split(" M").map((d, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + d} />
      ))}
    </svg>
  );
}

/**
 * Confirmation en deux temps, réutilisable partout (archiver, retirer,
 * modifications non sauvées) : deux boutons côte à côte — action (couleur
 * forte) / Annuler. Aucun window.confirm : tout reste dans le geste tactile.
 */
export function Confirmation({ question, action, couleur = C.rouge, onConfirmer, onAnnuler }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 11, background: "#fff",
                  border: `1.5px solid ${couleur}33`, marginTop: 8 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.encre, marginBottom: 8 }}>
        {question}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onConfirmer} style={{
          flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
          background: couleur, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FS,
        }}>{action}</button>
        <button onClick={onAnnuler} style={{
          flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
          border: `1.5px solid ${C.bord}`, background: "#fff",
          color: C.muet, fontSize: 13, fontWeight: 700, fontFamily: FS,
        }}>Annuler</button>
      </div>
    </div>
  );
}

// ── Garde de modifications non sauvées ───────────────────────────────────────
// Un écran d'édition s'enregistre ici (sale ? comment sauvegarder ?) ; toute
// navigation passe par demanderAvantDeQuitter : si des modifications sont en
// attente, l'utilisateur choisit Sauvegarder ou Annuler les modifications
// avant de partir — plus de perte par inadvertance.
export const gardeModifs = { sale: false, sauvegarder: null };

export function declarerModifs(sale, sauvegarder) {
  gardeModifs.sale = sale;
  gardeModifs.sauvegarder = sauvegarder || null;
}
