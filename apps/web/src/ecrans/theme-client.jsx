// =============================================================================
// THÈME DE L'ESPACE CLIENT — « le convoi à l'aube »
//
// Direction. Un déménagement commence avant le jour : le camion charge dans le
// noir, les phares balaient l'asphalte, et on arrive chez soi quand le soleil
// se lève. L'espace client emprunte cette lumière-là — fond nuit, halo ambré
// des phares, violet d'avant-aube — au lieu du blanc administratif habituel.
// Le client ne consulte pas un dossier : il suit son convoi.
//
// Palette (6 valeurs nommées) :
//   nuit      #070B18  le fond, avant le lever du jour
//   asphalte  #121A2B  la surface des cartes, la route
//   ligne     #26324A  le marquage au sol (bordures)
//   phare     #FFB627  l'ambre des phares — LE seul accent vif
//   aube      #A78BFA  le violet d'avant-aube (secondaire, jamais dominant)
//   menthe    #34D399  ce qui est fait, validé, arrivé
//
// Typographie. Display : la pile système en 800/900, corps large et
// interlettrage resserré — la personnalité vient de l'échelle, pas d'une police
// décorative. Utilitaire : la mono du produit (FC) pour les intitulés, les
// numéros de caisse, les compteurs — la langue des bordereaux et des plaques.
//
// Signature. La LIGNE DE ROUTE (composant LigneRoute) : une route verticale où
// chaque station est un état réel du dossier, avec le camion positionné à
// l'étape en cours. La numérotation y est légitime : c'est une vraie séquence.
//
// Ce fichier réexporte C et S avec les MÊMES CLÉS que le thème du bureau, si
// bien que toutes les pages de l'espace client basculent d'un coup sans être
// réécrites une à une.
// =============================================================================

import React from "react";

export const FS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FC = "'Fira Code', ui-monospace, SFMono-Regular, monospace";

const T = {
  nuit: "#070B18",
  asphalte: "#121A2B",
  asphalteHaut: "#182339",
  ligne: "#26324A",
  phare: "#FFB627",
  phareChaud: "#FF9E1B",
  aube: "#A78BFA",
  menthe: "#34D399",
  brume: "#8E9BB3",
  clair: "#EEF2F8",
  alerte: "#FB7185",
};

export const CT = T;   // accès direct aux jetons nommés

/** Mêmes clés que le thème bureau, valeurs de nuit. */
export const C = {
  fond: T.nuit,
  blanc: T.asphalte,       // « surface » : ici, l'asphalte
  encre: T.clair,
  muet: T.brume,
  fantome: "#5A6580",
  bord: T.ligne,
  doux: "#1B2436",
  bleu: T.phare,           // l'accent du produit devient l'ambre des phares
  bleuClair: "rgba(255,182,39,.14)",
  bleuFonce: T.phareChaud,
  vert: T.menthe,
  ambre: T.phare,
  rouge: T.alerte,
  violet: T.aube,
};

export const S = {
  page: {
    minHeight: "100vh", background: T.nuit, fontFamily: FS,
    maxWidth: 560, margin: "0 auto", paddingBottom: 96, color: T.clair,
  },
  entete: {
    padding: "18px 18px 12px",
    borderBottom: `1px solid ${T.ligne}`,
  },
  titre: {
    fontSize: 24, fontWeight: 800, color: T.clair, fontFamily: FS,
    letterSpacing: "-.02em", lineHeight: 1.15,
  },
  carte: {
    background: `linear-gradient(180deg, ${T.asphalteHaut}, ${T.asphalte})`,
    borderRadius: 18, padding: 18, margin: "0 16px 14px",
    border: `1px solid ${T.ligne}`,
    boxShadow: "0 18px 40px -28px rgba(0,0,0,.9)",
  },
  label: {
    display: "block", fontSize: 10, fontWeight: 700, color: T.brume,
    textTransform: "uppercase", letterSpacing: ".14em", fontFamily: FC,
    marginTop: 14, marginBottom: 6,
  },
  input: {
    width: "100%", boxSizing: "border-box", padding: "12px 13px",
    border: `1px solid ${T.ligne}`, borderRadius: 12, fontSize: 14,
    minHeight: 46, background: "#0D1424", fontFamily: FS, color: T.clair,
    outline: "none",
  },
  boutonPlein: {
    width: "100%", padding: "14px", border: "none", borderRadius: 13,
    background: `linear-gradient(135deg, ${T.phare}, ${T.phareChaud})`,
    color: "#12151F", fontSize: 14.5, fontWeight: 800, cursor: "pointer",
    fontFamily: FS, letterSpacing: "-.01em",
    boxShadow: "0 12px 30px -12px rgba(255,182,39,.65)",
  },
  boutonLien: {
    background: "none", border: "none", color: T.phare, fontSize: 13,
    fontWeight: 700, cursor: "pointer", padding: 6, fontFamily: FS,
  },
  map: {
    width: "100%", height: 150, borderRadius: 14, border: `1px solid ${T.ligne}`,
    filter: "grayscale(.4) brightness(.75) contrast(1.1)",
  },
};

/** Intitulé en mono — la langue des bordereaux. */
export function Eyebrow({ children, couleur = T.brume }) {
  return (
    <div style={{ fontFamily: FC, fontSize: 10, fontWeight: 700, color: couleur,
                  textTransform: "uppercase", letterSpacing: ".16em" }}>
      {children}
    </div>
  );
}

// ── LA SIGNATURE : la ligne de route ─────────────────────────────────────────

/** Les stations réelles du parcours, dans l'ordre où le client les vit. */
export const STATIONS = [
  { cle: "devis", titre: "Offre reçue" },
  { cle: "confirme", titre: "Déménagement confirmé" },
  { cle: "planifie", titre: "Équipe et camion réservés" },
  { cle: "en_cours", titre: "Jour du déménagement" },
  { cle: "effectue", titre: "Arrivé chez vous" },
];

/** Position du convoi selon l'état du dossier. */
export function etapeCourante(etat) {
  const i = STATIONS.findIndex((s) => s.cle === etat);
  if (i >= 0) return i;
  if (etat === "clos") return STATIONS.length - 1;
  return 0;
}

/**
 * LIGNE DE ROUTE — l'élément signature de l'espace client.
 * Une route verticale : le trajet déjà parcouru est éclairé en ambre, le reste
 * dort dans la nuit, et le camion marque l'endroit exact où en est le convoi.
 */
export function LigneRoute({ etat }) {
  const courante = etapeCourante(etat);
  return (
    <div style={{ position: "relative", padding: "4px 0 0 26px" }}>
      {/* la route */}
      <div aria-hidden style={{
        position: "absolute", left: 8, top: 10, bottom: 10, width: 2,
        background: `linear-gradient(180deg, ${T.phare} 0%, ${T.phare} ${
          (courante / (STATIONS.length - 1)) * 100}%, ${T.ligne} ${
          (courante / (STATIONS.length - 1)) * 100}%, ${T.ligne} 100%)`,
        borderRadius: 2,
      }} />

      {STATIONS.map((s, i) => {
        const faite = i < courante;
        const ici = i === courante;
        return (
          <div key={s.cle} style={{ position: "relative", padding: "0 0 18px" }}>
            <div aria-hidden style={{
              position: "absolute", left: -22, top: 2,
              width: ici ? 16 : 10, height: ici ? 16 : 10, borderRadius: 999,
              marginLeft: ici ? -3 : 0,
              background: ici ? T.phare : faite ? T.phare : T.asphalte,
              border: `2px solid ${faite || ici ? T.phare : T.ligne}`,
              boxShadow: ici ? `0 0 0 6px rgba(255,182,39,.16), 0 0 24px 2px rgba(255,182,39,.5)` : "none",
            }} />
            <div style={{
              fontSize: 13.5, fontWeight: ici ? 800 : 600,
              color: ici ? T.clair : faite ? "#B7C2D6" : T.brume,
              letterSpacing: ici ? "-.01em" : 0,
            }}>
              {s.titre}
            </div>
            {ici && (
              <div style={{ fontFamily: FC, fontSize: 10.5, color: T.phare,
                            letterSpacing: ".1em", marginTop: 3 }}>
                VOUS ÊTES ICI
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compteur avant le jour J. Le chiffre est énorme : c'est la seule information
 * que le client cherche vraiment en ouvrant l'application.
 */
export function Compteur({ date }) {
  if (!date) return null;
  const jour = new Date(date + "T00:00:00");
  if (Number.isNaN(jour.getTime())) return null;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const jours = Math.round((jour - auj) / 86400000);

  const mot = jours > 1 ? "jours avant le départ"
    : jours === 1 ? "jour avant le départ"
    : jours === 0 ? "c'est aujourd'hui"
    : "depuis votre déménagement";
  const valeur = jours === 0 ? "J" : Math.abs(jours);

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14 }}>
      <div style={{
        fontSize: 68, fontWeight: 900, lineHeight: .85, letterSpacing: "-.05em",
        color: T.phare, textShadow: "0 0 40px rgba(255,182,39,.35)",
        fontVariantNumeric: "tabular-nums",
      }}>{valeur}</div>
      <div style={{ fontSize: 13, color: T.brume, fontWeight: 600, paddingBottom: 6 }}>
        {mot}
      </div>
    </div>
  );
}

/** Halo de phares derrière l'en-tête — l'atmosphère, sans animation gratuite. */
export function HaloPhares() {
  return (
    <div aria-hidden style={{
      position: "absolute", inset: "-40% -20% auto -20%", height: 340,
      background:
        `radial-gradient(60% 70% at 30% 0%, rgba(255,182,39,.20), transparent 70%),
         radial-gradient(50% 60% at 80% 10%, rgba(167,139,250,.18), transparent 70%)`,
      pointerEvents: "none",
    }} />
  );
}
