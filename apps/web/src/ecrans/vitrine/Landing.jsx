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

import React from "react";
import {
  PLANS, plan, module, prixPeriode, gainSurPrecedent, modulesAVenir,
  planDisponible, REMISE_ANNUELLE_PCT, ESSAI_JOURS, ESSAI_PLAN,
} from "@domaine/commercial/plans.js";
import { V, MONO, NavPublique, PiedPublic, Etiquette } from "./theme-vitrine.jsx";

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

export default function Landing({ aller }) {
  return (
    <div className="vitrine" style={{ minHeight: "100vh", display: "flex",
      flexDirection: "column", background: V.ivoire, color: V.encre }}>
      <NavPublique page="accueil" aller={aller} sombre />

      {/* ── HERO — la nuit du chargement ─────────────────────────────────── */}
      <section style={{ background:
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
              <button className="v-btn v-btn-fantome" onClick={() => aller("client")}>
                Je déménage
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

      {/* ── LES TROIS PORTES ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", width: "100%",
                        padding: "clamp(40px, 6vw, 70px) 20px 10px" }}>
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
          <Etiquette numero="006 colis" libelle="tout est compté" />
          <h2 className="v-display" style={{ fontSize: "clamp(26px, 3.6vw, 40px)",
                                             margin: "14px 0 0" }}>
            Tout le métier, dans l'ordre du métier.
          </h2>
          <p style={{ fontSize: 15, color: V.muet, lineHeight: 1.6, margin: "12px 0 0" }}>
            Chaque module reprend là où le précédent s'arrête. Ce que vous saisissez
            une fois — barème, équipe, textes — se retrouve partout, sans ressaisie.
          </p>
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 30,
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(270px, 100%), 1fr))" }}>
          {MODULES.map((m) => (
            <article key={m.n} className="v-carte v-carte-hover" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center",
                            justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                               color: V.route }}>{m.n}/006</span>
                <span aria-hidden="true" style={{ height: 4, width: 42,
                        borderRadius: 2, background: V.sangleClair }} />
              </div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, margin: "10px 0 6px",
                           letterSpacing: "-.01em" }}>{m.t}</h3>
              <p style={{ fontSize: 13.5, color: V.muet, lineHeight: 1.55, margin: 0 }}>
                {m.d}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── PRIX — une offre, un chiffre ─────────────────────────────────── */}
      <section style={{ background: "#fff", borderTop: `1px solid ${V.bord}`,
                        borderBottom: `1px solid ${V.bord}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto",
                      padding: "clamp(44px, 6vw, 70px) 20px", display: "grid",
                      gap: 36, alignItems: "center",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          <div>
            <Etiquette numero="3 offres" libelle="vous montez quand vous grandissez" />
            <h2 className="v-display" style={{ fontSize: "clamp(26px, 3.6vw, 40px)",
                                               margin: "14px 0 0" }}>
              Une offre par taille d'entreprise.
            </h2>
            <p style={{ fontSize: 15, color: V.muet, lineHeight: 1.6,
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
                                     color: V.encre }}>
                  <span style={{ color: V.route, fontWeight: 800 }}>✓</span>{x}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: "grid", gap: 14,
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(230px, 100%), 1fr))",
                        gridColumn: "1 / -1" }}>
            {PLANS.map((p) => {
              const ouverte = planDisponible(p.cle);
              const gains = gainSurPrecedent(p.cle).filter((c) => module(c)?.livre);
              const aVenir = modulesAVenir(p.cle);
              const vedette = p.recommande && ouverte;
              return (
                <div key={p.cle} className="v-carte" style={{ padding: 22,
                  borderWidth: vedette ? 2 : 1,
                  borderColor: vedette ? V.route : undefined,
                  borderStyle: ouverte ? "solid" : "dashed",
                  opacity: ouverte ? 1 : .74,
                  boxShadow: vedette ? "0 24px 60px rgba(37,99,235,.16)" : undefined }}>

                  <div style={{ display: "flex", alignItems: "baseline",
                                justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600,
                      letterSpacing: ".1em", color: V.muet,
                      textTransform: "uppercase" }}>{p.nom}</span>
                    {vedette && (
                      <span style={{ fontSize: 10.5, fontWeight: 700,
                        color: V.route, background: "#EFF6FF", borderRadius: 999,
                        padding: "2px 8px" }}>le plus choisi</span>
                    )}
                    {!ouverte && (
                      <span style={{ fontSize: 10.5, fontWeight: 700,
                        color: V.muet, background: "#F1F5F9", borderRadius: 999,
                        padding: "2px 8px" }}>bientôt</span>
                    )}
                  </div>

                  <div style={{ margin: "12px 0 2px" }}>
                    <span className="v-display" style={{ fontSize: 38 }}>
                      {Math.round(p.prix_centimes / 100)} €
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: V.muet }}>
                    HTVA / mois · {p.utilisateurs ?? "sans limite d'"}
                    {p.utilisateurs ? ` utilisateur${p.utilisateurs > 1 ? "s" : ""}` : "utilisateurs"}
                  </div>
                  <div style={{ fontSize: 13, color: V.encre, marginTop: 10,
                                lineHeight: 1.5, fontWeight: 600 }}>
                    {p.promesse}
                  </div>
                  <div style={{ fontSize: 12, color: V.muet, marginTop: 4,
                                lineHeight: 1.5 }}>
                    {p.pour}
                  </div>

                  <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none",
                               display: "grid", gap: 6 }}>
                    {PLANS.indexOf(p) === 0 ? (
                      <li style={{ fontSize: 12.5, color: V.encre, display: "flex", gap: 8 }}>
                        <span style={{ color: V.route, fontWeight: 800 }}>✓</span>
                        Dossiers, relevé, devis, offre, planning, terrain,
                        véhicules et facturation
                      </li>
                    ) : (
                      <li style={{ fontSize: 11.5, color: V.muet, marginBottom: 2 }}>
                        Tout {PLANS[PLANS.indexOf(p) - 1].nom}, plus :
                      </li>
                    )}
                    {gains.map((c) => (
                      <li key={c} style={{ fontSize: 12.5, color: V.encre,
                                           display: "flex", gap: 8 }}>
                        <span style={{ color: V.route, fontWeight: 800 }}>✓</span>
                        {module(c).titre}
                      </li>
                    ))}
                    {aVenir.map((c) => (
                      <li key={c} style={{ fontSize: 12, color: V.brume,
                                           display: "flex", gap: 8 }}>
                        <span>◦</span>{module(c).titre}
                      </li>
                    ))}
                  </ul>

                  {ouverte ? (
                    <button className={vedette ? "v-btn v-btn-plein" : "v-btn v-btn-blanc"}
                            style={{ width: "100%", marginTop: 18 }}
                            onClick={() => aller("societe")}>
                      {`Essayer ${ESSAI_JOURS} jours`}
                    </button>
                  ) : (
                    <div style={{ fontSize: 11.5, color: V.muet, marginTop: 18,
                                  lineHeight: 1.5 }}>
                      {plan(p.cle).verrou_motif}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── APPEL FINAL ──────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", width: "100%",
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

      <PiedPublic aller={aller} />
    </div>
  );
}

function Porte({ etiquette, titre, texte, action, onClick, pleine = false }) {
  return (
    <article className="v-carte v-carte-hover"
             style={{ padding: 22, display: "flex", flexDirection: "column",
                      borderWidth: pleine ? 2 : 1,
                      borderColor: pleine ? V.route : V.bord }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
                     letterSpacing: ".12em", color: pleine ? V.route : V.sangle }}>
        {etiquette}
      </span>
      <h3 style={{ fontSize: 19, fontWeight: 800, margin: "8px 0 6px",
                   letterSpacing: "-.01em" }}>{titre}</h3>
      <p style={{ fontSize: 13.5, color: V.muet, lineHeight: 1.55,
                  margin: "0 0 16px", flex: 1 }}>{texte}</p>
      <button onClick={onClick}
              className={`v-btn ${pleine ? "v-btn-plein" : "v-btn-blanc"}`}
              style={{ width: "100%", padding: "12px 18px", fontSize: 14 }}>
        {action}
      </button>
    </article>
  );
}
