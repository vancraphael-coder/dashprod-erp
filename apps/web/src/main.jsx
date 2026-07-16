// =============================================================================
// Point d'entrée — routage des écrans (S9) + barre de navigation.
// Flux d'accès (T3) : base branchée sans session → Connexion ; session sans
// invitation → Non invité ; sinon l'app. Base absente → mode démonstration.
// Navigation : barre en bas (Dossiers · Planning · Équipe · Compte) sur les
// écrans racine ; les écrans d'un dossier reviennent au Dossier (hub).
// =============================================================================

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { sessionCourante, configPresente, deconnecter } from "./lib/supabase.js";
import { modeDonnees, reclamerInvitation, monProfil } from "./lib/adaptateur.js";
import { C } from "./lib/theme.jsx";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";
import NonInvite from "./ecrans/NonInvite.jsx";
import ListeAffaires from "./ecrans/ListeAffaires.jsx";
import { creerDossierVide } from "./lib/adaptateur.js";
import Terrain from "./ecrans/Terrain.jsx";
import TerrainOutils from "./ecrans/TerrainOutils.jsx";
import TerrainProfil from "./ecrans/TerrainProfil.jsx";
import Configuration from "./ecrans/Configuration.jsx";
import Dossier from "./ecrans/Dossier.jsx";
import Releve from "./ecrans/Releve.jsx";
import Devis from "./ecrans/Devis.jsx";
import Offre from "./ecrans/Offre.jsx";
import Facture from "./ecrans/Facture.jsx";
import Mail from "./ecrans/Mail.jsx";
import Materiel from "./ecrans/Materiel.jsx";
import Planning from "./ecrans/Planning.jsx";
import Ressources from "./ecrans/Ressources.jsx";

function BandeauDemo({ versDiagnostic }) {
  if (modeDonnees() !== "demo") return null;
  return (
    <div style={{ background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600,
                  textAlign: "center", padding: "7px 10px" }}>
      Mode démonstration — base non branchée, données locales.{" "}
      <button onClick={versDiagnostic} style={{ background: "none", border: "none",
        color: "#fff", textDecoration: "underline", cursor: "pointer",
        fontSize: 12, fontWeight: 700 }}>Diagnostic</button>
    </div>
  );
}

/** Barre de navigation inférieure — écrans racine uniquement. */
function BarreNav({ actif, aller, peutGererEquipe }) {
  const items = [
    ["liste", "📁", "Dossiers"],
    ["planning", "📅", "Planning"],
    ...(peutGererEquipe ? [["equipe", "🚛", "Ressources"]] : []),
    ["compte", "⚙️", "Compte"],
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
      display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
      maxWidth: 520, margin: "0 auto",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {items.map(([cle, icone, lib]) => (
        <button key={cle} onClick={() => aller(cle)} style={{
          flex: 1, padding: "9px 4px 7px", border: "none", background: "none",
          cursor: "pointer", color: actif === cle ? C.bleu : C.muet,
        }}>
          <div style={{ fontSize: 18 }}>{icone}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700 }}>{lib}</div>
        </button>
      ))}
    </div>
  );
}

/** Écran Compte — identité, déconnexion, diagnostic. */
function Compte({ profil, versDiagnostic, versConfiguration, peutConfigurer }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 90px",
                  fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.encre, marginBottom: 14 }}>Compte</div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 16,
                    boxShadow: "0 2px 10px rgba(15,23,42,.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
          {profil?.nom || "—"}
        </div>
        <div style={{ fontSize: 13, color: C.muet }}>{profil?.email || ""}</div>
        {profil?.capacites && (
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
            {profil.capacites.length} capacités actives
          </div>
        )}
      </div>
      {(peutConfigurer || modeDonnees() === "demo") && versConfiguration && (
        <button onClick={versConfiguration} style={{
          display: "block", width: "100%", marginTop: 14, padding: 13,
          border: `1.5px solid ${C.bord}`, borderRadius: 11, background: "#fff",
          color: C.encre, fontSize: 14, fontWeight: 700, cursor: "pointer",
          textAlign: "left" }}>
          ⚙️ Configuration des prix
        </button>
      )}
      <button onClick={versDiagnostic} style={{ background: "none", border: "none",
        color: C.bleu, fontSize: 13, fontWeight: 600, cursor: "pointer",
        padding: "14px 2px 4px" }}>
        Diagnostic de branchement
      </button>
      {modeDonnees() === "reel" && (
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
          style={{ display: "block", width: "100%", marginTop: 14, padding: 13,
            border: "1.5px solid #FECACA", borderRadius: 11, background: "#FEF2F2",
            color: "#991B1B", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Se déconnecter
        </button>
      )}
    </div>
  );
}

/**
 * Sous-application TERRAIN — sa propre coquille et sa barre de navigation
 * dédiée (Chantiers / Outils / Compte). Aucun accès aux écrans bureau : le
 * cloisonnement est structurel, pas une option d'affichage.
 *
 * Accès modulaire : un membre terrain qui possède valider_intake peut ouvrir
 * un dossier et renseigner contact → relevé → matériel ; la sauvegarde se fait
 * et le bureau reprend au devis. Sans cette capacité, ces écrans n'existent pas
 * pour lui (l'onglet ne s'affiche pas).
 */
function AppTerrain({ profil }) {
  const [ecran, setEcran] = useState("chantiers");
  const [route, setRoute] = useState(null); // {ecran, affaireId} pour les écrans dossier
  const caps = profil?.capacites || [];
  const peutSaisir = caps.includes("valider_intake") || caps.includes("creer_affaire")
    || caps.includes("signaler_materiel");

  const retourChantiers = () => { setRoute(null); setEcran("chantiers"); };
  const nav = {
    dossier: (id) => setRoute({ ecran: "dossier", affaireId: id }),
    releve: (id) => setRoute({ ecran: "releve", affaireId: id }),
    materiel: (id) => setRoute({ ecran: "materiel", affaireId: id }),
  };

  // Écrans dossier en mode terrain (sans prix ni devis).
  if (route) {
    let vue = null;
    if (route.ecran === "dossier") {
      vue = <Dossier affaireId={route.affaireId} retour={retourChantiers}
                     versReleve={nav.releve} versMateriel={nav.materiel}
                     versDevis={() => {}} versOffre={() => {}} versFacture={() => {}}
                     versMail={() => {}} modeTerrain />;
    } else if (route.ecran === "releve") {
      vue = <Releve affaireId={route.affaireId} retour={() => nav.dossier(route.affaireId)}
                    versDevis={() => {}} />;
    } else if (route.ecran === "materiel") {
      vue = <Materiel affaireId={route.affaireId} retour={() => nav.dossier(route.affaireId)} />;
    }
    return <div>{vue}</div>;
  }

  const items = [
    ["chantiers", "🏗️", "Chantiers"],
    ["outils", "➕", "Outils"],
    ["profil", "👤", "Profil"],
  ];
  return (
    <div>
      {ecran === "chantiers" && <Terrain profil={profil}
        peutSaisir={peutSaisir} versDossier={nav.dossier} />}
      {ecran === "outils" && <TerrainOutils peutSaisir={peutSaisir} versDossier={nav.dossier} />}
      {ecran === "profil" && <TerrainProfil profil={profil} />}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
        maxWidth: 520, margin: "0 auto",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {items.map(([cle, icone, lib]) => (
          <button key={cle} onClick={() => setEcran(cle)} style={{
            flex: 1, padding: "9px 4px 7px", border: "none", background: "none",
            cursor: "pointer", color: ecran === cle ? C.bleu : C.muet,
          }}>
            <div style={{ fontSize: 18 }}>{icone}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700 }}>{lib}</div>
          </button>
        ))}
      </div>
    </div>
  );
}


/**
 * Sous-navigation du DOSSIER : barre fixe en bas, visible dans les sept écrans
 * du parcours (dossier, relevé, matériel, devis, offre, mail, facture). Fini
 * les pages isolées : on circule d'une section à l'autre en un tap, comme dans
 * le modèle validé. Les sections non pertinentes (offre avant chiffrage…)
 * restent affichées mais atténuées — la géographie de l'app ne bouge jamais.
 */
const SECTIONS_DOSSIER = [
  ["dossier", "📇", "Dossier"],
  ["releve", "📦", "Relevé"],
  ["materiel", "🧰", "Matériel"],
  ["devis", "💶", "Devis"],
  ["offre", "✍️", "Offre"],
  ["mail", "✉️", "Mail"],
  ["facture", "🧾", "Facture"],
];
function SousNavDossier({ actif, aller }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
      display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
      maxWidth: 520, margin: "0 auto", overflowX: "auto",
      paddingBottom: "env(safe-area-inset-bottom)",
      boxShadow: "0 -4px 16px -8px rgba(15,23,42,.12)",
    }}>
      {SECTIONS_DOSSIER.map(([cle, icone, lib]) => (
        <button key={cle} onClick={() => aller(cle)} style={{
          flex: "1 0 62px", padding: "8px 2px 6px", border: "none",
          background: "none", cursor: "pointer",
          color: actif === cle ? C.bleu : C.muet,
          borderTop: actif === cle ? `2px solid ${C.bleu}` : "2px solid transparent",
        }}>
          <div style={{ fontSize: 17 }}>{icone}</div>
          <div style={{ fontSize: 9.5, fontWeight: 700 }}>{lib}</div>
        </button>
      ))}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [nonInvite, setNonInvite] = useState(null);
  const [charge, setCharge] = useState(false);
  const [route, setRoute] = useState({ ecran: "liste", affaireId: null });

  useEffect(() => {
    sessionCourante().then(async (s) => {
      setSession(s);
      if (s && modeDonnees() === "reel") {
        try {
          await reclamerInvitation();
          const p = await monProfil();
          if (!p) setNonInvite(s.user?.email || "cet email");
          else setProfil(p);
        } catch (e) {
          setNonInvite(s.user?.email || "cet email");
        }
      }
      setCharge(true);
    });
  }, []);

  if (!charge) return null;
  if (configPresente && !session) {
    return <Connexion onConnecte={() => window.location.reload()} />;
  }
  if (configPresente && nonInvite) {
    return <NonInvite email={nonInvite} />;
  }

  const capacites = profil?.capacites || [];
  const peutGererEquipe = modeDonnees() === "demo" || capacites.includes("gerer_referentiels");
  const peutVoirPrix = modeDonnees() === "demo" || capacites.includes("voir_prix");

  // Routage terrain : un membre qui n'a AUCUNE capacité bureau (ni voir_prix,
  // ni créer une affaire, ni gérer le planning) est un pur profil terrain — il
  // ne voit QUE ses chantiers, sans prix. Le cloisonnement est réel (RLS), pas
  // du CSS. La direction et le bureau gardent l'app complète.
  const capacitesBureau = ["voir_prix", "creer_affaire", "gerer_planning", "emettre_facture"];
  const estTerrain = modeDonnees() === "reel"
    && !capacitesBureau.some((c) => capacites.includes(c));

  if (estTerrain) {
    return <AppTerrain profil={profil} />;
  }

  const nav = {
    liste: () => setRoute({ ecran: "liste", affaireId: null }),
    nouvelle: async () => { const id = await creerDossierVide(); setRoute({ ecran: "dossier", affaireId: id }); },
    dossier: (id) => setRoute({ ecran: "dossier", affaireId: id }),
    releve: (id) => setRoute({ ecran: "releve", affaireId: id }),
    devis: (id) => setRoute({ ecran: "devis", affaireId: id }),
    offre: (id) => setRoute({ ecran: "offre", affaireId: id }),
    facture: (id) => setRoute({ ecran: "facture", affaireId: id }),
    mail: (id) => setRoute({ ecran: "mail", affaireId: id }),
    materiel: (id) => setRoute({ ecran: "materiel", affaireId: id }),
    planning: () => setRoute({ ecran: "planning", affaireId: null }),
    equipe: () => setRoute({ ecran: "equipe", affaireId: null }),
    compte: () => setRoute({ ecran: "compte", affaireId: null }),
    diagnostic: () => setRoute({ ecran: "diagnostic", affaireId: null }),
  };
  const retourDossier = () => nav.dossier(route.affaireId);

  const RACINES = ["liste", "planning", "equipe", "compte"];
  let ecran;
  if (route.ecran === "diagnostic") {
    ecran = (
      <div>
        <Diagnostic />
        <div style={{ textAlign: "center", marginTop: -40, paddingBottom: 30 }}>
          <button onClick={nav.liste} style={{ background: "none", border: "none",
            color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ← Retour aux dossiers
          </button>
        </div>
      </div>
    );
  } else if (route.ecran === "compte") {
    ecran = <Compte profil={profil} versDiagnostic={nav.diagnostic} versConfiguration={nav.configuration} peutConfigurer={peutGererEquipe} />;
  } else if (route.ecran === "equipe") {
    ecran = <Ressources />;
  } else if (route.ecran === "planning") {
    ecran = <Planning ouvrirDossier={nav.dossier} />;
  } else if (route.ecran === "dossier") {
    ecran = <Dossier affaireId={route.affaireId} retour={nav.liste}
                     versReleve={nav.releve} versDevis={nav.devis}
                     versOffre={nav.offre} versFacture={nav.facture} versMail={nav.mail}
                     versMateriel={nav.materiel} />;
  } else if (route.ecran === "releve") {
    ecran = <Releve affaireId={route.affaireId} retour={retourDossier} versDevis={nav.devis} />;
  } else if (route.ecran === "devis") {
    ecran = <Devis affaireId={route.affaireId} retour={retourDossier}
                   versOffre={nav.offre} versReleve={nav.releve}
                   peutVoirPrix={peutVoirPrix} />;
  } else if (route.ecran === "offre") {
    ecran = <Offre affaireId={route.affaireId} retour={retourDossier} />;
  } else if (route.ecran === "configuration") {
    ecran = <Configuration retour={() => nav.compte()} />;
  } else if (route.ecran === "materiel") {
    ecran = <Materiel affaireId={route.affaireId} retour={retourDossier} />;
  } else if (route.ecran === "mail") {
    ecran = <Mail affaireId={route.affaireId} retour={retourDossier} versOffre={nav.offre} />;
  } else if (route.ecran === "facture") {
    ecran = <Facture affaireId={route.affaireId} retour={retourDossier} />;
  } else {
    ecran = <ListeAffaires ouvrirAffaire={nav.dossier} nouvelleAffaire={nav.nouvelle} />;
  }

  return (
    <div>
      <BandeauDemo versDiagnostic={nav.diagnostic} />
      {ecran}
      {RACINES.includes(route.ecran) && (
        <BarreNav actif={route.ecran} aller={(cle) => nav[cle]()}
                  peutGererEquipe={peutGererEquipe} />
      )}
      {SECTIONS_DOSSIER.some(([cle]) => cle === route.ecran) && route.affaireId && (
        <SousNavDossier actif={route.ecran}
          aller={(cle) => setRoute({ ecran: cle, affaireId: route.affaireId })} />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
