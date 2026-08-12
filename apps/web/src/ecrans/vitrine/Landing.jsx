// =============================================================================
// Landing publique — la vitrine de Dashprod.
//
// Trois publics arrivent sur la même page, et chacun doit trouver SA porte en
// dix secondes :
//   1. le patron de déménagement qui découvre       → « Créer ma société »
//   2. le déménageur déjà client                    → « Se connecter »
//   3. le particulier qui déménage                  → « Mon déménagement »
//
// Le fil visuel : l'étiquette de colis. Le produit numérote les colis
// (001/025, manifeste export) ; la page numérote ses sections pareil. Ce n'est
// pas décoratif — ce métier EST une séquence de colis numérotés.
// =============================================================================

import React, { useState, useEffect } from "react";
import {
  PLANS, plan, module, prixPeriode, gainSurPrecedent, modulesAVenir,
  planDisponible, REMISE_ANNUELLE_PCT, ESSAI_JOURS, ESSAI_PLAN,
} from "@domaine/commercial/plans.js";
import { V, MONO, NavPublique, PiedPublic, Etiquette } from "./theme-vitrine.jsx";
import { avisPublics } from "../../lib/adaptateur.js";
import CommandeReseau from "./CommandeReseau.jsx";
import VariateurNav from "./VariateurNav.jsx";
import CarteAbonnement from "./CarteAbonnement.jsx";
import PanneauVerre from "./PanneauVerre.jsx";

/** Le socle, dit en clair (plutôt qu'une liste de clés techniques). */
const SOCLE_LISIBLE = [
  "Dossiers et relevé", "Devis et offre", "Planning et terrain",
  "Véhicules", "Facturation",
];

/** Les sections que le variateur permet d'atteindre (avis seulement si dispo). */
function SECTIONS_NAV(avecAvis) {
  const base = [
    { id: "accueil", label: "Accueil", icone: "accueil" },
    { id: "produit", label: "Produit", icone: "produit" },
    { id: "commander", label: "Commander", icone: "commander" },
    { id: "tarifs", label: "Tarifs", icone: "tarifs" },
  ];
  if (avecAvis) base.push({ id: "avis", label: "Avis", icone: "avis" });
  base.push({ id: "contact", label: "Contact", icone: "contact" });
  return base;
}

const MODULES = [
  { n: "001", t: "Relevé & devis", d: "Le relevé pièce par pièce devient un chiffrage : barème, suppléments, marge visible. L'offre part le jour même." },
  { n: "002", t: "Signature en ligne", d: "Le client lit l'offre et les conditions, recopie « Lu et approuvé », signe. Horodaté, opposable, sans papier." },
  { n: "003", t: "Planning d'équipe", d: "Missions, congés, fermetures et jours fériés sur le même calendrier. Les conflits se voient avant d'arriver." },
  { n: "004", t: "Chantier", d: "Heures pointées, photos, relevé signé. Ce qui se passe sur le terrain remonte tout seul au bureau." },
  { n: "005", t: "Facturation & Peppol", d: "Facture conforme, communication structurée, envoi électronique B2B sur le réseau Peppol. Obligatoire depuis 2026 — déjà prêt." },
  { n: "006", t: "Export international", d: "Inventaire numéroté colis par colis, liste de colisage douanière, poids taxable maritime et aérien calculés juste." },
];

const CHIFFRES = [
  ["1 saisie", "vos infos d'entreprise, reprises partout"],
  ["0 papier", "offres signées et factures, en ligne"],
  ["7 ans", "vos factures conservées, loi belge"],
];

export default function Landing({ aller, orgId }) {
  return (
    <div className="vitrine" style={{ minHeight: "100vh", display: "flex",
      flexDirection: "column", background: V.nuit, color: "#fff" }}>
      <NavPublique page="accueil" aller={aller} sombre />

      {/* Variateur rotatif : boussole de page, rangée en bas à droite.
          Masquée sous 1100px — au pouce, la nav classique reprend la main. */}
      <VariateurNav sections={SECTIONS_NAV(Boolean(orgId))} />


      {/* ── HERO — la nuit du chargement ─────────────────────────────────── */}
      <section id="accueil" style={{ background:
        `radial-gradient(1100px 500px at 75% -10%, rgba(37,99,235,.28), transparent 60%),
         radial-gradient(700px 400px at 10% 110%, rgba(217,119,6,.14), transparent 55%),
         ${V.nuit}`, color: "#fff" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto",
                      padding: "clamp(56px, 9vw, 110px) 20px clamp(48px, 7vw, 90px)",
                      display: "grid", gap: 44, alignItems: "center",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
          <div className="v-lever">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                          fontFamily: MONO, fontSize: 12, fontWeight: 600,
                          color: V.ciel, background: "rgba(37,99,235,.18)",
                          border: "1px solid rgba(147,197,253,.25)",
                          padding: "6px 12px", borderRadius: 999 }}>
              L'ERP des déménageurs · Belgique
            </div>
            <h1 className="v-display" style={{ fontSize: "clamp(34px, 5.2vw, 58px)",
                                               margin: "18px 0 0", color: "#fff" }}>
              Chaque déménagement,<br />
              du premier appel<br />
              à la facture payée.
            </h1>
            <p style={{ fontSize: "clamp(15px, 1.6vw, 17.5px)", lineHeight: 1.6,
                        color: "rgba(255,255,255,.78)", maxWidth: "46ch",
                        margin: "18px 0 0" }}>
              Devis, signature en ligne, planning, chantier, facturation Peppol.
              Un seul outil, pensé pour le déménagement — pas adapté à la va-vite.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <button className="v-btn v-btn-plein" onClick={() => aller("societe")}>
                Créer ma société →
              </button>
              <button className="v-btn v-btn-fantome"
                onClick={() => document.getElementById("commander")?.scrollIntoView({ behavior: "smooth" })}>
                Commander mon déménagement
              </button>
            </div>
            <div style={{ marginTop: 26, display: "flex", gap: 26, flexWrap: "wrap" }}>
              {CHIFFRES.map(([k, l]) => (
                <div key={k}>
                  <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)",
                                maxWidth: "20ch", lineHeight: 1.45 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* L'étiquette de colisage — la signature de la page. */}
          <div className="v-lever-2" aria-hidden="true"
               style={{ justifySelf: "center", width: "min(360px, 100%)" }}>
            <div style={{ background: V.nuitDouce, borderRadius: 20,
                          border: `1px solid ${V.bordNuit}`, padding: 22,
                          transform: "rotate(-1.2deg)",
                          boxShadow: "0 30px 70px rgba(0,0,0,.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: V.brume,
                               letterSpacing: ".08em" }}>LISTE DE COLISAGE</span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700,
                               color: "#fff", background: V.sangle,
                               padding: "3px 9px", borderRadius: 6 }}>EXPORT</span>
              </div>
              {[["001/025", "Salon — buffet chêne, 95 kg"],
                ["002/025", "Salon — cartons livres × 6"],
                ["014/025", "Cuisine — vaisselle, fragile"],
                ["025/025", "Cave — atelier, outillage"]].map(([n, l], i) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 12,
                       padding: "10px 2px",
                       borderTop: i ? `1px solid ${V.bordNuit}` : "none" }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700,
                                 color: V.routeVif }}>{n}</span>
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)" }}>{l}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, paddingTop: 12,
                            borderTop: `1px dashed ${V.bordNuit}`,
                            display: "flex", justifyContent: "space-between",
                            fontFamily: MONO, fontSize: 12 }}>
                <span style={{ color: V.brume }}>38,2 m³ · 2 140 kg</span>
                <span style={{ color: "#fff", fontWeight: 700 }}>✓ Douane OK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMANDER SON DÉMÉNAGEMENT SUR LE RÉSEAU ─────────────────────── */}
      <section id="commander" style={{
        background: "linear-gradient(180deg, #0B1220, #111C33)", color: "#fff",
        padding: "clamp(44px, 6vw, 80px) 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto 26px", textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
                        letterSpacing: ".16em", color: "#FFB627",
                        textTransform: "uppercase" }}>
            Un seul formulaire · tout le réseau
          </div>
          <h2 className="v-display" style={{ fontSize: "clamp(26px, 3.6vw, 40px)",
                                             margin: "10px 0 8px" }}>
            Commandez votre déménagement.
          </h2>
          <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Décrivez votre projet une fois. Il part à tous les déménageurs
            inscrits, qui vous recontactent. Sans compte, sans engagement.
          </p>
        </div>
        <CommandeReseau aller={aller} />
      </section>

      <section id="produit" style={{ maxWidth: 1080, margin: "0 auto", width: "100%",
                        padding: "clamp(52px, 6vw, 80px) 20px 10px" }}>
        <div style={{ display: "grid", gap: 16,
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" }}>
          <Porte
            etiquette="PORTE A" titre="Créer ma société"
            texte="Votre entreprise de déménagement sur Dashprod : base vierge, vos barèmes, vos équipes. Opérationnel aujourd'hui."
            action="Découvrir l'offre" onClick={() => aller("societe")} pleine />
          <Porte
            etiquette="PORTE B" titre="J'ai déjà un compte"
            texte="Votre société est sur Dashprod. Reprenez là où vous vous êtes arrêté : dossiers, planning, factures."
            action="Se connecter" onClick={() => aller("connexion")} />
          <Porte
            etiquette="PORTE C" titre="Je déménage"
            texte="Votre déménageur travaille avec Dashprod ? Suivez votre dossier, vos meubles, vos offres et vos factures."
            action="Accéder à mon déménagement" onClick={() => aller("client")} />
        </div>
      </section>

      {/* ── LES MODULES, numérotés comme des colis ───────────────────────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", width: "100%",
                        padding: "clamp(44px, 6vw, 70px) 20px" }}>
        <div style={{ maxWidth: 560 }}>
          <Etiquette numero="006 colis" libelle="tout est compté" sombre />
          <h2 className="v-display" style={{ fontSize: "clamp(26px, 3.6vw, 40px)",
                                             margin: "14px 0 0" }}>
            Tout le métier, dans l'ordre du métier.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.62)", lineHeight: 1.6,
                      margin: "12px 0 0" }}>
            Chaque module reprend là où le précédent s'arrête. Ce que vous saisissez
            une fois — barème, équipe, textes — se retrouve partout, sans ressaisie.
          </p>
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 30,
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(270px, 100%), 1fr))" }}>
          {MODULES.map((m) => (
            <PanneauVerre key={m.n} padding={20}>
              <div style={{ display: "flex", alignItems: "center",
                            justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                               color: "#60A5FA" }}>{m.n}/006</span>
                <span aria-hidden="true" style={{ height: 4, width: 42,
                        borderRadius: 2, background: "rgba(217,119,6,.55)" }} />
              </div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, margin: "10px 0 6px",
                           letterSpacing: "-.01em", color: "#fff" }}>{m.t}</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.62)",
                          lineHeight: 1.55, margin: 0 }}>
                {m.d}
              </p>
            </PanneauVerre>
          ))}
        </div>
      </section>

      {/* ── PRIX — une offre, un chiffre ─────────────────────────────────── */}
      <section id="tarifs" style={{
        background: `radial-gradient(900px 420px at 80% -10%, rgba(37,99,235,.28), transparent 60%),
                     radial-gradient(600px 340px at 5% 100%, rgba(217,119,6,.12), transparent 55%),
                     ${V.nuit}`,
        color: "#fff",
        backgroundImage: undefined }}>
        <div style={{ maxWidth: 1080, margin: "0 auto",
                      padding: "clamp(44px, 6vw, 70px) 20px", display: "grid",
                      gap: 36, alignItems: "center",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          <div>
            <Etiquette numero="3 offres" libelle="vous montez quand vous grandissez" sombre />
            <h2 className="v-display" style={{ fontSize: "clamp(26px, 3.6vw, 40px)",
                                               margin: "14px 0 0", color: "#fff" }}>
              Une offre par taille d'entreprise.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.66)", lineHeight: 1.6,
                        margin: "12px 0 0", maxWidth: "48ch" }}>
              Un prix par entreprise, pas par utilisateur. Vous changez d'offre
              quand votre équipe grandit — et vos données vous suivent : rien
              n'est jamais supprimé si vous redescendez.
            </p>
            <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none",
                         display: "grid", gap: 9 }}>
              {[`${ESSAI_JOURS} jours d'essai, sans carte bancaire`,
                `Mensuel sans engagement, ou annuel remisé de ${REMISE_ANNUELLE_PCT} %`,
                "Vos données cloisonnées, hébergées en Europe",
                "Exportables à tout moment, même après résiliation"].map((x) => (
                <li key={x} style={{ display: "flex", gap: 10, fontSize: 14,
                                     color: "rgba(255,255,255,.82)" }}>
                  <span style={{ color: "#60A5FA", fontWeight: 800 }}>✓</span>{x}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: "grid", gap: 18,
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
                        gridColumn: "1 / -1" }}>
            {PLANS.map((p, i) => {
              const ouverte = planDisponible(p.cle);
              const gains = gainSurPrecedent(p.cle)
                .filter((c) => module(c)?.livre)
                .map((c) => ({ cle: c, titre: module(c).titre }));
              const aVenir = modulesAVenir(p.cle)
                .map((c) => ({ cle: c, titre: module(c).titre }));
              return (
                <CarteAbonnement key={p.cle}
                  plan={p}
                  vedette={p.recommande && ouverte}
                  ouverte={ouverte}
                  gains={gains}
                  aVenir={aVenir}
                  socle={i === 0 ? SOCLE_LISIBLE : null}
                  heritage={i === 0 ? null : PLANS[i - 1].nom}
                  essaiJours={ESSAI_JOURS}
                  verrouMotif={plan(p.cle).verrou_motif}
                  onSouscrire={() => aller("societe")} />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── APPEL FINAL ──────────────────────────────────────────────────── */}
      <section id="contact" style={{ maxWidth: 1080, margin: "0 auto", width: "100%",
                        padding: "clamp(44px, 6vw, 76px) 20px", textAlign: "center" }}>
        <h2 className="v-display" style={{ fontSize: "clamp(24px, 3.4vw, 38px)", margin: 0 }}>
          Le prochain camion part avec Dashprod.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center",
                      marginTop: 24, flexWrap: "wrap" }}>
          <button className="v-btn v-btn-plein" onClick={() => aller("societe")}>
            Créer ma société
          </button>
          <button className="v-btn v-btn-blanc" onClick={() => aller("connexion")}>
            Se connecter
          </button>
        </div>
      </section>

      <SectionAvis orgId={orgId} />

      <PiedPublic aller={aller} />
    </div>
  );
}

function SectionAvis({ orgId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let actif = true;
    if (!orgId) { setData(null); return; }
    avisPublics(orgId).then((d) => { if (actif) setData(d); }).catch(() => {});
    return () => { actif = false; };
  }, [orgId]);

  if (!orgId || !data || !data.total) return null;
  const moyenne = Number(data.moyenne) || 0;
  const pleines = Math.round(moyenne);

  return (
    <section id="avis" style={{ borderTop: "1px solid rgba(255,255,255,.08)",
                      padding: "clamp(44px, 6vw, 76px) 20px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 34, letterSpacing: 2, color: "#F59E0B" }}>
          {"★".repeat(pleines)}{"☆".repeat(5 - pleines)}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 6 }}>
          {moyenne.toFixed(1)} / 5
          <span style={{ fontWeight: 500, color: "rgba(255,255,255,.55)", fontSize: 14 }}>
            {" "}· {data.total} avis
          </span>
        </div>
        <div style={{ display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
                      gap: 16, marginTop: 28, textAlign: "left" }}>
          {(data.avis || []).slice(0, 6).map((a, i) => (
            <PanneauVerre key={i} padding={18} accent="245,158,11">
              <div style={{ color: "#F59E0B", fontSize: 15 }}>
                {"★".repeat(a.note)}{"☆".repeat(5 - a.note)}
              </div>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.82)",
                          lineHeight: 1.5, margin: "8px 0 0" }}>« {a.commentaire} »</p>
            </PanneauVerre>
          ))}
        </div>
      </div>
    </section>
  );
}

function Porte({ etiquette, titre, texte, action, onClick, pleine = false }) {
  return (
    <PanneauVerre padding={22}
      style={pleine ? {
        background: "linear-gradient(145deg, rgba(59,130,246,.16) 0%, rgba(255,255,255,.02) 100%)",
        border: "1px solid rgba(147,197,253,.32)",
        borderTop: "1px solid rgba(191,219,254,.55)",
        boxShadow: "0 30px 62px -22px rgba(37,99,235,.5), inset 0 1px 0 rgba(255,255,255,.22)",
      } : {}}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
                     letterSpacing: ".12em",
                     color: pleine ? "#93C5FD" : "rgba(217,119,6,.9)" }}>
        {etiquette}
      </span>
      <h3 style={{ fontSize: 19, fontWeight: 800, margin: "8px 0 6px",
                   letterSpacing: "-.01em", color: "#fff" }}>{titre}</h3>
      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.62)", lineHeight: 1.55,
                  margin: "0 0 16px", flex: 1 }}>{texte}</p>
      <button onClick={onClick}
        style={{ width: "100%", padding: "12px 18px", fontSize: 14, fontWeight: 700,
                 borderRadius: 980, cursor: "pointer",
                 border: pleine ? "none" : "1px solid rgba(255,255,255,.18)",
                 background: pleine ? "#fff" : "rgba(255,255,255,.06)",
                 color: pleine ? V.route : "#fff",
                 boxShadow: pleine ? "0 10px 26px rgba(0,0,0,.34)" : "none" }}>
        {action}
      </button>
    </PanneauVerre>
  );
}
