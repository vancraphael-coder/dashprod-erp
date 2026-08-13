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
import { modeDonnees, demoForceeActive, quitterDemoForcee, monAcces, reclamerInvitation, monProfil, mesSocietes, choisirSociete }
  from "./lib/adaptateur.js";
import { C, Icone, gardeModifs, Confirmation } from "./lib/theme.jsx";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";
import NonInvite from "./ecrans/NonInvite.jsx";
import Inscription from "./ecrans/Inscription.jsx";
import ListeAffaires from "./ecrans/ListeAffaires.jsx";
import { creerDossierVide } from "./lib/adaptateur.js";
import Terrain from "./ecrans/Terrain.jsx";
import TerrainProfil from "./ecrans/TerrainProfil.jsx";
import Bareme from "./ecrans/Bareme.jsx";
import Cout from "./ecrans/Cout.jsx";
import Archivage from "./ecrans/Archivage.jsx";
import TextesDossiers from "./ecrans/TextesDossiers.jsx";
import Parametres from "./ecrans/Parametres.jsx";
import Profil from "./ecrans/Profil.jsx";
import Landing from "./ecrans/vitrine/Landing.jsx";
import PorteSociete from "./ecrans/vitrine/PorteSociete.jsx";
import PorteClient from "./ecrans/vitrine/PorteClient.jsx";
import { CGU, Confidentialite as ConfidentialitePublique, MentionsLegales }
  from "./ecrans/vitrine/Legal.jsx";
import Bienvenue from "./ecrans/Bienvenue.jsx";
import EspaceClient from "./ecrans/EspaceClient.jsx";
import SignatureOffre from "./ecrans/SignatureOffre.jsx";
import { clientMoi, obtenirOrganisation } from "./lib/adaptateur.js";
import { identiteComplete } from "@domaine/organisation/identite.js";
import Dossier from "./ecrans/Dossier.jsx";
import Releve from "./ecrans/Releve.jsx";
import Devis from "./ecrans/Devis.jsx";
import Offre from "./ecrans/Offre.jsx";
import Facture from "./ecrans/Facture.jsx";
import Mail from "./ecrans/Mail.jsx";
import Journal from "./ecrans/Journal.jsx";
import RapportsDossier from "./ecrans/RapportsDossier.jsx";
import Materiel from "./ecrans/Materiel.jsx";
import Planning from "./ecrans/Planning.jsx";
import Conversations from "./ecrans/Conversations.jsx";
import Stockage from "./ecrans/Stockage.jsx";
import Centres from "./ecrans/Centres.jsx";
import RapportCentres from "./ecrans/RapportCentres.jsx";
import DemandesReseau from "./ecrans/DemandesReseau.jsx";
import Ressources from "./ecrans/Ressources.jsx";

function BandeauDemo({ versDiagnostic }) {
  if (modeDonnees() !== "demo") return null;
  const forcee = demoForceeActive();
  return (
    <div style={{ background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600,
                  textAlign: "center", padding: "7px 10px" }}>
      Mode démonstration — base non branchée, données locales.{" "}
      {forcee ? (
        <button onClick={() => { quitterDemoForcee(); location.reload(); }}
          style={{ background: "none", border: "none", color: "#fff",
            textDecoration: "underline", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          Quitter la démo
        </button>
      ) : (
        <button onClick={versDiagnostic} style={{ background: "none", border: "none",
          color: "#fff", textDecoration: "underline", cursor: "pointer",
          fontSize: 12, fontWeight: 700 }}>Diagnostic</button>
      )}
    </div>
  );
}

/** Barre de navigation inférieure — écrans racine uniquement. */
function BarreNav({ actif, aller, peutGererEquipe, modules = [] }) {
  // Un module que l'abonnement n'ouvre pas n'apparaît PAS : pas de porte
  // fermée, pas de publicité déguisée dans la barre de navigation. La base
  // refuse de toute façon l'accès — ceci évite seulement le clic inutile.
  const a = (cle) => modules.includes(cle);
  const items = [
    ["liste", "dossiers", "Dossiers"],
    ["planning", "planning", "Planning"],
    ...(a("stockage_3d") ? [["stockage", "boite", "Stockage"]] : []),
    ["conversations", "mail", "Messages"],
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
      vue = <Releve affaireId={route.affaireId} retour={() => aller("dossier")} versDevis={noop}
                    modeTerrain={!edit} />;
    } else if (route.ecran === "materiel") {
      vue = <Materiel affaireId={route.affaireId} retour={() => aller("dossier")}
                      modeTerrain={!edit} />;
    } else if (route.ecran === "devis") {
      vue = <Devis affaireId={route.affaireId} retour={() => aller("dossier")}
                   versOffre={() => aller("offre")} versFacture={() => aller("facture")} />;
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

        {/* Consultation : gel des interactions, sauf le matériel (le chef y
            saisit le repris). Le relevé reste gelé DANS L'ENSEMBLE, mais son
            chevron réactive localement le pointeur (pointerEvents:auto) : le
            chef déroule pour lire une remarque, sans rien pouvoir modifier. */}
        <div style={(edit || route.ecran === "materiel")
                    ? undefined : { pointerEvents: "none" }}>{vue}</div>

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
    // L'agenda est le MÊME que celui du bureau : mêmes missions publiées,
    // mêmes congés, mêmes fériés, mêmes fermetures. Ce qui change, ce sont
    // les droits — le terrain regarde, il ne pilote pas.
    ["agenda", "planning", "Agenda"],
    ...(peutCreer ? [["nouveau", "outils", "Nouveau"]] : []),
    ["profil", "profil", "Profil"],
  ];
  return (
    <div>
      {ecran === "chantiers" && <Terrain profil={profil}
        versConsult={(id) => setRoute({ mode: "consult", ecran: "dossier", affaireId: id })} />}
      {ecran === "agenda" && (
        <Planning lectureSeule
          ouvrirDossier={(id) => setRoute({ mode: "consult", ecran: "dossier", affaireId: id })} />
      )}
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
  const [org, setOrg] = useState(null);
  // Vitrine publique : quatre pages adressables par ?page= (liens directs
  // partageables : /?page=societe, /?page=client, /?page=connexion).
  const [pagePublique, setPagePublique] = useState(() => {
    try {
      const p = new URLSearchParams(location.search).get("page");
      return ["societe", "client", "connexion", "cgu", "confidentialite", "mentions"].includes(p) ? p : "accueil";
    } catch { return "accueil"; }
  });
  const allerPublic = (page) => {
    setPagePublique(page);
    try {
      const url = new URL(location.href);
      if (page === "accueil") url.searchParams.delete("page");
      else url.searchParams.set("page", page);
      history.pushState({}, "", url);
      window.scrollTo({ top: 0 });
    } catch {}
  };
  // Boutons précédent/suivant du navigateur.
  useEffect(() => {
    const lire = () => {
      try {
        const p = new URLSearchParams(location.search).get("page");
        setPagePublique(["societe", "client", "connexion"].includes(p) ? p : "accueil");
      } catch {}
    };
    window.addEventListener("popstate", lire);
    return () => window.removeEventListener("popstate", lire);
  }, []);
  const [accueilVu, setAccueilVu] = useState(false);
  // Trois portes distinctes.
  //   signer   → signature d'une offre par code (avant connexion, ?signer=CODE)
  //   client   → espace client, après connexion Google, si l'e-mail est client
  //   (défaut) → application déménageur
  const [signer, setSigner] = useState(
    () => { try {
      const p = new URLSearchParams(location.search);
      return p.has("signer") ? (p.get("signer") || "") : null;
    } catch { return null; } });
  const [client, setClient] = useState(null);
  const [profil, setProfil] = useState(null);
  const [nonInvite, setNonInvite] = useState(null);
  // Plusieurs sociétés, aucun choix : le jeton ne porte AUCUNE organisation.
  // C'est voulu — deviner serait la pire des réponses (0081).
  const [aChoisir, setAChoisir] = useState(null);
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
          if (!p) {
            // Le jeton peut être sans organisation parce que la personne
            // appartient à PLUSIEURS sociétés et n'en a désigné aucune.
            const societes = await mesSocietes().catch(() => []);
            if (societes.length > 1) {
              setAChoisir(societes);
              setCharge(true);
              return;
            }
          }
          if (p) {
            // Déménageur : il a une organisation.
            setProfil(p);
            setOrg(await obtenirOrganisation().catch(() => ({})));
          } else {
            // Pas de profil déménageur. Est-ce un client ? On le décide en
            // base, sur l'e-mail authentifié — jamais dans l'interface.
            const c = await clientMoi().catch(() => null);
            if (c?.est_client) setClient(c);
            else setNonInvite(s.user?.email || "cet email");
          }
        } catch (e) {
          // Même en cas d'erreur profil, tenter la résolution client avant de
          // proposer la création de société (parcours payant à 360 €/mois).
          const c = await clientMoi().catch(() => null);
          if (c?.est_client) setClient(c);
          else setNonInvite(s.user?.email || "cet email");
        }
      }
      setCharge(true);
    });
  }, []);

  // Ce que l'abonnement ouvre, et si je suis maison mère ou centre.
  // IMPORTANT : ce hook doit rester AVANT tout return conditionnel. Placé
  // après, le nombre de hooks variait d'un rendu à l'autre — React refuse, et
  // l'application rendait un écran blanc.
  const [acces, setAcces] = useState(null);
  useEffect(() => {
    if (modeDonnees() !== "reel" || !org) return;
    monAcces().then(setAcces).catch(() => setAcces(null));
  }, [org]);

  if (!charge) return null;
  // Signature d'offre : accessible sans compte, c'est un lien ciblé.
  if (signer !== null) {
    return <SignatureOffre codeInitial={signer} retour={() => setSigner(null)} />;
  }
  if (configPresente && !session) {
    if (pagePublique === "societe") return <PorteSociete aller={allerPublic} />;
    if (pagePublique === "client") {
      return <PorteClient aller={allerPublic}
        onSigner={(code) => setSigner(code.replace(/-/g, ""))} />;
    }
    if (pagePublique === "connexion") {
      return <Connexion aller={allerPublic}
                        onConnecte={() => window.location.reload()} />;
    }
    if (pagePublique === "cgu") return <CGU aller={allerPublic} />;
    if (pagePublique === "confidentialite") return <ConfidentialitePublique aller={allerPublic} />;
    if (pagePublique === "mentions") return <MentionsLegales aller={allerPublic} />;
    return <Landing aller={allerPublic} />;
  }

  // Plusieurs sociétés : on demande laquelle, on ne choisit pas à sa place.
  if (configPresente && aChoisir) {
    return <ChoixSociete societes={aChoisir} />;
  }

  // Espace client : e-mail authentifié reconnu comme client. Priorité sur toute
  // proposition de création de société.
  if (configPresente && client) return <EspaceClient client={client} />;
  if (configPresente && nonInvite) {
    // Aucune organisation pour ce compte : ce n'est pas une impasse, c'est
    // l'entrée. Le déménageur crée sa société et démarre sur une base vierge.
    return <Inscription email={nonInvite}
      onCreee={() => window.location.reload()} />;
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

  // Accueil d'onboarding : organisation neuve dont l'identité n'est pas encore
  // prête à produire des documents. Affiché tant que l'admin ne l'a pas passé.
  const orgPrete = identiteComplete(org || {}).pretDocuments;
  if (modeDonnees() === "reel" && peutGererEquipe && org && !orgPrete && !accueilVu) {
    return <Bienvenue profil={profil}
      versIdentite={() => { setAccueilVu(true); setRoute({ ecran: "parametres", affaireId: null }); }}
      versApp={() => setAccueilVu(true)} />;
  }

  // Garde : navigation en attente tant que l'utilisateur n'a pas tranché
  // (sauvegarder / annuler les modifications).
  function naviguerAvecGarde(fn) {
    if (gardeModifs.sale) setGardeEnAttente(() => fn);
    else fn();
  }

  // Toute navigation passe par la garde — y compris les flèches « retour »
  // des sous-pages. Auparavant seule la barre d'onglets était protégée : on
  // pouvait donc perdre un relevé en cours en revenant au dossier. Envelopper
  // l'objet ENTIER évite d'avoir à y penser à chaque nouvel écran.
  const navBrute = {
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
    conversations: () => setRoute({ ecran: "conversations", affaireId: null }),
    stockage: () => setRoute({ ecran: "stockage", affaireId: null }),
    centres: () => setRoute({ ecran: "centres", affaireId: null }),
    rapport: () => setRoute({ ecran: "rapport", affaireId: null }),
    equipe: () => setRoute({ ecran: "equipe", affaireId: null }),
    compte: () => setRoute({ ecran: "compte", affaireId: null }),
    diagnostic: () => setRoute({ ecran: "diagnostic", affaireId: null }),
    demandes: () => setRoute({ ecran: "demandes", affaireId: null }),
    bareme: () => setRoute({ ecran: "bareme", affaireId: null }),
    cout: () => setRoute({ ecran: "cout", affaireId: null }),
    archivage: () => setRoute({ ecran: "archivage", affaireId: null }),
    textes: () => setRoute({ ecran: "textes", affaireId: null }),
    parametres: () => setRoute({ ecran: "parametres", affaireId: null }),
    journal: (id) => setRoute({ ecran: "journal", affaireId: id }),
    rapports: (id) => setRoute({ ecran: "rapports", affaireId: id }),
  };
  // Chaque entrée de nav est gardée, sans exception possible par oubli.
  const nav = Object.fromEntries(
    Object.entries(navBrute).map(([cle, fn]) =>
      [cle, (...args) => naviguerAvecGarde(() => fn(...args))]));
  const retourDossier = () => nav.dossier(route.affaireId);

  const RACINES = ["liste", "planning", "stockage", "conversations", "equipe", "compte"];
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
    ecran = <Profil profil={profil} versDiagnostic={nav.diagnostic}
      versParametres={nav.parametres} versDemandes={nav.demandes}
      versCentres={(acces?.modules || []).includes("multi_depots") ? nav.centres : null}
      versRapport={(acces?.modules || []).includes("multi_depots") ? nav.rapport : null}
      peutConfigurer={peutGererEquipe} />;
  } else if (route.ecran === "demandes") {
    ecran = <DemandesReseau />;
  } else if (route.ecran === "equipe") {
    ecran = <Ressources />;
  } else if (route.ecran === "planning") {
    ecran = <Planning ouvrirDossier={nav.dossier} />;
  } else if (route.ecran === "conversations") {
    ecran = <Conversations ouvrirDossier={nav.dossier} />;
  } else if (route.ecran === "stockage") {
    ecran = <Stockage retour={nav.liste} />;
  } else if (route.ecran === "centres") {
    ecran = <Centres retour={nav.compte} />;
  } else if (route.ecran === "rapport") {
    ecran = <RapportCentres retour={nav.compte} />;
  } else if (route.ecran === "dossier") {
    ecran = <Dossier affaireId={route.affaireId} retour={nav.liste}
                     versReleve={nav.releve} versDevis={nav.devis}
                     versOffre={nav.offre} versFacture={nav.facture} versMail={nav.mail}
                     versMateriel={nav.materiel} versJournal={nav.journal}
                     versRapports={nav.rapports} />;
  } else if (route.ecran === "rapports") {
    ecran = <RapportsDossier affaireId={route.affaireId} retour={retourDossier} />;
  } else if (route.ecran === "journal") {
    // Le journal d'un dossier : filtré sur lui, mais c'est le même écran.
    ecran = <Journal retour={retourDossier} affaireId={route.affaireId} />;
  } else if (route.ecran === "releve") {
    ecran = <Releve affaireId={route.affaireId} retour={retourDossier} versDevis={nav.devis} />;
  } else if (route.ecran === "devis") {
    ecran = <Devis affaireId={route.affaireId} retour={retourDossier}
                   versOffre={nav.offre} versReleve={nav.releve}
                   versFacture={nav.facture} peutVoirPrix={peutVoirPrix} />;
  } else if (route.ecran === "offre") {
    ecran = <Offre affaireId={route.affaireId} retour={retourDossier}
                   versMail={nav.mail} />;
  } else if (route.ecran === "parametres") {
    ecran = <Parametres retour={() => nav.compte()}
      versBareme={nav.bareme} versCout={nav.cout}
      versTextes={nav.textes} versArchivage={nav.archivage} />;
  } else if (route.ecran === "bareme") {
    ecran = <Bareme retour={() => nav.parametres()} />;
  } else if (route.ecran === "cout") {
    ecran = <Cout retour={() => nav.parametres()} />;
  } else if (route.ecran === "archivage") {
    ecran = <Archivage retour={() => nav.parametres()} />;
  } else if (route.ecran === "textes") {
    ecran = <TextesDossiers retour={() => nav.parametres()} />;
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
        <BarreNav actif={route.ecran} aller={(cle) => nav[cle]()} modules={acces?.modules || []}
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

/**
 * CHOIX DE LA SOCIÉTÉ — quand une même personne travaille pour plusieurs.
 *
 * Tant qu'aucune n'est désignée, le jeton n'en porte AUCUNE : rien n'est
 * lisible, et c'est la bonne réponse. Deviner (prendre « la première ») ferait
 * apparaître les données d'une société dans la session d'une autre — la seule
 * faute qui ne se rattrape pas.
 *
 * Le choix ne prend effet qu'après rafraîchissement du jeton : c'est lui, et
 * lui seul, que le RLS écoute.
 */
function ChoixSociete({ societes }) {
  const [enCours, setEnCours] = React.useState(null);
  const [erreur, setErreur] = React.useState(null);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5FB", display: "flex",
                  alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff",
                    borderRadius: 16, padding: 24,
                    boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
          Dans quelle société travaillez-vous&nbsp;?
        </div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.5 }}>
          Votre compte est rattaché à plusieurs sociétés. Vous n'en ouvrez
          qu'une à la fois — les données ne se croisent jamais.
        </div>
        <div style={{ marginTop: 16 }}>
          {societes.map((s) => (
            <button key={s.org_id} disabled={Boolean(enCours)}
              onClick={async () => {
                setEnCours(s.org_id); setErreur(null);
                try { await choisirSociete(s.org_id); window.location.reload(); }
                catch (e) { setErreur(e.message || "Impossible"); setEnCours(null); }
              }}
              style={{ display: "block", width: "100%", textAlign: "left",
                       marginTop: 8, padding: "13px 15px", borderRadius: 12,
                       border: "1.5px solid #E2E8F0", background: "#fff",
                       cursor: "pointer" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0F172A" }}>{s.nom}</div>
              {s.role_principal && (
                <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                  {s.role_principal.replace(/_/g, " ")}
                </div>
              )}
              {enCours === s.org_id && (
                <div style={{ fontSize: 11.5, color: "#2563EB", marginTop: 4 }}>
                  Ouverture…
                </div>
              )}
            </button>
          ))}
        </div>
        {erreur && (
          <div style={{ fontSize: 12.5, color: "#DC2626", marginTop: 10 }}>{erreur}</div>
        )}
      </div>
    </div>
  );
}
