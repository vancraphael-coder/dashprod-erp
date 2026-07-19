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
import { C, Icone, gardeModifs, Confirmation } from "./lib/theme.jsx";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";
import NonInvite from "./ecrans/NonInvite.jsx";
import ListeAffaires from "./ecrans/ListeAffaires.jsx";
import { creerDossierVide } from "./lib/adaptateur.js";
import Terrain from "./ecrans/Terrain.jsx";
import TerrainProfil from "./ecrans/TerrainProfil.jsx";
import Bareme from "./ecrans/Bareme.jsx";
import Cout from "./ecrans/Cout.jsx";
import Archivage from "./ecrans/Archivage.jsx";
import Textes from "./ecrans/Textes.jsx";
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
    ["liste", "dossiers", "Dossiers"],
    ["planning", "planning", "Planning"],
    ...(peutGererEquipe ? [["equipe", "ressources", "Ressources"]] : []),
    ["compte", "compte", "Compte"],
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
      display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
      maxWidth: 520, margin: "0 auto",
      paddingBottom: "env(safe-area-inset-bottom)",
      boxShadow: "0 -4px 16px -8px rgba(15,23,42,.10)",
    }}>
      {items.map(([cle, icone, lib]) => {
        const estActif = actif === cle;
        return (
          <button key={cle} onClick={() => aller(cle)} style={{
            flex: 1, padding: "9px 4px 7px", border: "none", background: "none",
            cursor: "pointer",
          }}>
            <Icone nom={icone} taille={21} couleur={estActif ? C.vert : C.bleu} />
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2,
                          color: estActif ? C.vert : C.muet }}>{lib}</div>
          </button>
        );
      })}
    </div>
  );
}

/** Écran Compte — identité, déconnexion, diagnostic. */
function Compte({ profil, versDiagnostic, versBareme, versCout, versArchivage, versTextes, peutConfigurer }) {
  const acces = peutConfigurer || modeDonnees() === "demo";
  const boutonPage = (onClick, icone, texte) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 10,
      padding: 14, border: `1.5px solid ${C.bord}`, borderRadius: 12, background: "#fff",
      color: C.encre, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 18 }}>{icone}</span>{texte}
      <span style={{ marginLeft: "auto", color: C.fantome }}>›</span>
    </button>
  );
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

      {acces && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muet, letterSpacing: ".05em",
            textTransform: "uppercase", margin: "18px 2px 2px" }}>Réglages</div>
          {versBareme && boutonPage(versBareme, "🏷️", "Barème (prix client)")}
          {versCout && boutonPage(versCout, "📉", "Coûts internes")}
          {versTextes && boutonPage(versTextes, "✉️", "Textes de l'offre")}
          {versArchivage && boutonPage(versArchivage, "🗂️", "Archivage")}
        </>
      )}

      <button onClick={versDiagnostic} style={{ background: "none", border: "none",
        color: C.bleu, fontSize: 13, fontWeight: 600, cursor: "pointer",
        padding: "18px 2px 4px" }}>
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
  // Parcours ouvert : {mode:"consult"|"edit", ecran, affaireId}
  const [route, setRoute] = useState(null);
  const caps = profil?.capacites || [];
  // Création complète (dossier → mail) : réservée aux habilités.
  const peutCreer = caps.includes("valider_intake") || caps.includes("creer_affaire");

  const SECTIONS_CONSULT = [
    ["dossier", "fiche", "Dossier"],
    ["releve", "releve", "Relevé"],
    ["materiel", "materiel", "Matériel"],
  ];
  const SECTIONS_EDIT = [
    ["dossier", "fiche", "Dossier"],
    ["releve", "releve", "Relevé"],
    ["materiel", "materiel", "Matériel"],
    ["devis", "devis", "Devis"],
    ["offre", "offre", "Offre"],
    ["mail", "mail", "Mail"],
  ];

  function fermer() { setRoute(null); setEcran("chantiers"); }

  async function ouvrirNouveau() {
    const id = await creerDossierVide();
    setRoute({ mode: "edit", ecran: "dossier", affaireId: id });
  }

  // ── Parcours ouvert (consultation ou création) ────────────────────────────
  if (route) {
    const edit = route.mode === "edit";
    const aller = (cle) => setRoute({ ...route, ecran: cle });
    const noop = () => {};
    let vue = null;
    if (route.ecran === "dossier") {
      vue = <Dossier affaireId={route.affaireId} retour={fermer}
                     versReleve={aller.bind(null, "releve")} versMateriel={aller.bind(null, "materiel")}
                     versDevis={noop} versOffre={noop} versFacture={noop} versMail={noop}
                     modeTerrain={!edit} />;
    } else if (route.ecran === "releve") {
      vue = <Releve affaireId={route.affaireId} retour={() => aller("dossier")} versDevis={noop} />;
    } else if (route.ecran === "materiel") {
      vue = <Materiel affaireId={route.affaireId} retour={() => aller("dossier")} />;
    } else if (route.ecran === "devis") {
      vue = <Devis affaireId={route.affaireId} retour={() => aller("dossier")}
                   versOffre={() => aller("offre")} />;
    } else if (route.ecran === "offre") {
      vue = <Offre affaireId={route.affaireId} retour={() => aller("dossier")} />;
    } else if (route.ecran === "mail") {
      vue = <Mail affaireId={route.affaireId} retour={() => aller("dossier")}
                  versOffre={() => aller("offre")} />;
    }

    const sections = edit ? SECTIONS_EDIT : SECTIONS_CONSULT;
    return (
      <div>
        {/* Bandeau : sortie + statut du mode */}
        <div style={{ position: "sticky", top: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: edit ? "#EFF6FF" : "#F8FAFC",
          borderBottom: `1px solid ${C.bord}`, padding: "9px 14px",
          maxWidth: 520, margin: "0 auto" }}>
          <button onClick={fermer} style={{ background: "none", border: "none",
            color: C.bleu, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ← Chantiers
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
            color: edit ? C.bleu : C.muet, textTransform: "uppercase" }}>
            {edit ? "Création" : "Consultation — lecture seule"}
          </span>
        </div>

        {/* Consultation : mêmes pages que le bureau, interactions gelées —
            seule la navigation (barre du bas) reste active. */}
        <div style={edit ? undefined : { pointerEvents: "none" }}>{vue}</div>

        {/* Sous-navigation du parcours */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
          maxWidth: 520, margin: "0 auto", overflowX: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 16px -8px rgba(15,23,42,.12)",
        }}>
          {sections.map(([cle, icone, lib]) => {
            const estActif = route.ecran === cle;
            return (
              <button key={cle} onClick={() => aller(cle)} style={{
                flex: "1 0 62px", padding: "8px 2px 6px", border: "none",
                background: "none", cursor: "pointer",
                borderTop: estActif ? `2px solid ${C.vert}` : "2px solid transparent",
              }}>
                <Icone nom={icone} taille={19} couleur={estActif ? C.vert : C.bleu} />
                <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2,
                              color: estActif ? C.vert : C.muet }}>{lib}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Coquille terrain : Chantiers / (Nouveau) / Profil ─────────────────────
  const items = [
    ["chantiers", "chantiers", "Chantiers"],
    ...(peutCreer ? [["nouveau", "outils", "Nouveau"]] : []),
    ["profil", "profil", "Profil"],
  ];
  return (
    <div>
      {ecran === "chantiers" && <Terrain profil={profil}
        versConsult={(id) => setRoute({ mode: "consult", ecran: "dossier", affaireId: id })} />}
      {ecran === "profil" && <TerrainProfil profil={profil} />}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
        maxWidth: 520, margin: "0 auto",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {items.map(([cle, icone, lib]) => {
          const estActif = ecran === cle;
          return (
            <button key={cle}
              onClick={() => cle === "nouveau" ? ouvrirNouveau() : setEcran(cle)}
              style={{
                flex: 1, padding: "9px 4px 7px", border: "none", background: "none",
                cursor: "pointer",
              }}>
              <Icone nom={icone} taille={21} couleur={estActif ? C.vert : C.bleu} />
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2,
                            color: estActif ? C.vert : C.muet }}>{lib}</div>
            </button>
          );
        })}
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
  ["dossier", "fiche", "Dossier"],
  ["releve", "releve", "Relevé"],
  ["materiel", "materiel", "Matériel"],
  ["devis", "devis", "Devis"],
  ["offre", "offre", "Offre"],
  ["mail", "mail", "Mail"],
  ["facture", "facture", "Facture"],
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
      {SECTIONS_DOSSIER.map(([cle, icone, lib]) => {
        const estActif = actif === cle;
        return (
          <button key={cle} onClick={() => aller(cle)} style={{
            flex: "1 0 62px", padding: "8px 2px 6px", border: "none",
            background: "none", cursor: "pointer",
            borderTop: estActif ? `2px solid ${C.vert}` : "2px solid transparent",
          }}>
            <Icone nom={icone} taille={19} couleur={estActif ? C.vert : C.bleu} />
            <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2,
                          color: estActif ? C.vert : C.muet }}>{lib}</div>
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [nonInvite, setNonInvite] = useState(null);
  const [charge, setCharge] = useState(false);
  const [route, setRoute] = useState({ ecran: "liste", affaireId: null });
  const [gardeEnAttente, setGardeEnAttente] = useState(null); // () => void — navigation différée

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

  // Garde : navigation en attente tant que l'utilisateur n'a pas tranché
  // (sauvegarder / annuler les modifications).
  function naviguerAvecGarde(fn) {
    if (gardeModifs.sale) setGardeEnAttente(() => fn);
    else fn();
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
    bareme: () => setRoute({ ecran: "bareme", affaireId: null }),
    cout: () => setRoute({ ecran: "cout", affaireId: null }),
    archivage: () => setRoute({ ecran: "archivage", affaireId: null }),
    textes: () => setRoute({ ecran: "textes", affaireId: null }),
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
    ecran = <Compte profil={profil} versDiagnostic={nav.diagnostic}
      versBareme={nav.bareme} versCout={nav.cout} versArchivage={nav.archivage}
      versTextes={nav.textes}
      peutConfigurer={peutGererEquipe} />;
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
  } else if (route.ecran === "bareme") {
    ecran = <Bareme retour={() => nav.compte()} />;
  } else if (route.ecran === "cout") {
    ecran = <Cout retour={() => nav.compte()} />;
  } else if (route.ecran === "archivage") {
    ecran = <Archivage retour={() => nav.compte()} />;
  } else if (route.ecran === "textes") {
    ecran = <Textes retour={() => nav.compte()} />;
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
          aller={(cle) => naviguerAvecGarde(() =>
            setRoute({ ecran: cle, affaireId: route.affaireId }))} />
      )}
      {gardeEnAttente && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(15,23,42,.45)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 18,
                        maxWidth: 340, width: "100%",
                        boxShadow: "0 24px 60px -12px rgba(15,23,42,.4)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
              Modifications non enregistrées
            </div>
            <div style={{ fontSize: 12.5, color: C.muet, margin: "6px 0 14px",
                          lineHeight: 1.5 }}>
              Vous avez des changements en attente sur cette page.
            </div>
            <button onClick={async () => {
              if (gardeModifs.sauvegarder) await gardeModifs.sauvegarder();
              gardeModifs.sale = false;
              const fn = gardeEnAttente; setGardeEnAttente(null); fn();
            }} style={{ width: "100%", padding: "12px", borderRadius: 11,
              border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700,
              background: `linear-gradient(135deg, ${C.bleu}, ${C.bleuFonce})`,
              color: "#fff", marginBottom: 8 }}>
              Sauvegarder et continuer
            </button>
            <button onClick={() => {
              gardeModifs.sale = false;
              const fn = gardeEnAttente; setGardeEnAttente(null); fn();
            }} style={{ width: "100%", padding: "12px", borderRadius: 11,
              cursor: "pointer", fontSize: 13.5, fontWeight: 700,
              border: `1.5px solid ${C.bord}`, background: "#fff",
              color: C.rouge, marginBottom: 8 }}>
              Annuler les modifications
            </button>
            <button onClick={() => setGardeEnAttente(null)}
              style={{ width: "100%", padding: "10px", borderRadius: 11,
                cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                border: "none", background: "none", color: C.muet }}>
              Rester sur la page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
