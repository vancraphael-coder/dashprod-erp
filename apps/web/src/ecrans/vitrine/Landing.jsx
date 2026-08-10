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

const MATRIX_CSS = `
.vitrine-dashprod {
  --dp-bg:#050608;
  --dp-panel:rgba(255,255,255,.055);
  --dp-line:rgba(255,255,255,.12);
  --dp-text:#f5f5f7;
  --dp-muted:rgba(255,255,255,.58);
  --dp-cyan:#00f2fe;
  --dp-green:#00ff87;
  --dp-gold:#d9b36c;
  background:
    radial-gradient(900px 500px at 80% -5%, rgba(0,242,254,.10), transparent 60%),
    radial-gradient(700px 450px at 5% 35%, rgba(112,0,255,.06), transparent 60%),
    var(--dp-bg) !important;
  color:var(--dp-text) !important;
}
.vitrine-dashprod .dp-nav {
  background:rgba(5,6,8,.72) !important;
  border-bottom:1px solid rgba(255,255,255,.08);
  backdrop-filter:blur(20px);
}
.vitrine-dashprod .dp-hero {
  background:
    radial-gradient(900px 500px at 72% 5%,rgba(0,242,254,.12),transparent 60%),
    radial-gradient(700px 450px at 5% 95%,rgba(112,0,255,.09),transparent 60%),
    #050608 !important;
}
.vitrine-dashprod .dp-kicker {
  display:inline-flex;align-items:center;gap:8px;
  font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;color:#9afaff;
  background:rgba(0,242,254,.08);border:1px solid rgba(0,242,254,.24);
  padding:7px 12px;border-radius:999px;
}
.vitrine-dashprod .dp-kicker:before {
  content:"";width:6px;height:6px;border-radius:50%;
  background:var(--dp-green);box-shadow:0 0 10px var(--dp-green);
}
.vitrine-dashprod .dp-display {
  font-family:${MONO};letter-spacing:-.055em;
}
.vitrine-dashprod .dp-copy {color:rgba(255,255,255,.68) !important}
.vitrine-dashprod .dp-btn {
  border-radius:999px !important;
  transition:.25s ease !important;
}
.vitrine-dashprod .dp-btn:hover {transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.3)}
.vitrine-dashprod .dp-glass {
  border:1px solid rgba(255,255,255,.12);
  border-top-color:rgba(255,255,255,.30);
  border-left-color:rgba(255,255,255,.20);
  background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.01));
  border-radius:28px;
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  box-shadow:0 30px 60px rgba(0,0,0,.65),inset 0 1px rgba(255,255,255,.18);
}
.vitrine-dashprod .dp-workflow {
  display:grid;grid-template-columns:repeat(6,1fr);gap:10px;
}
.vitrine-dashprod .dp-step {
  min-height:160px;padding:18px;border-radius:22px;
  border:1px solid rgba(255,255,255,.10);
  background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.012));
  transition:.3s;position:relative;overflow:hidden;
}
.vitrine-dashprod .dp-step:hover {transform:translateY(-5px);border-color:rgba(0,242,254,.3)}
.vitrine-dashprod .dp-step-no {font-family:${MONO};font-size:11px;color:var(--dp-cyan)}
.vitrine-dashprod .dp-step h3 {font-size:16px;margin-top:48px;color:#fff}
.vitrine-dashprod .dp-step p {font-size:12px;line-height:1.5;color:var(--dp-muted);margin-top:6px}
.vitrine-dashprod .dp-pricing {
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;
}
.vitrine-dashprod .dp-price-scene {perspective:1200px;padding:12px}
.vitrine-dashprod .dp-price-card {
  --rot-x:0deg;--rot-y:0deg;--glow-x:50%;--glow-y:50%;--oil-angle:135deg;--shift-x:0px;--shift-y:0px;
  min-height:530px;padding:2rem 1.5rem;border-radius:32px;position:relative;
  background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.01));
  border:1px solid rgba(255,255,255,.12);
  border-top-color:rgba(255,255,255,.30);border-left-color:rgba(255,255,255,.20);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  transform:rotateX(var(--rot-x)) rotateY(var(--rot-y));
  transform-style:preserve-3d;will-change:transform;
  box-shadow:0 30px 60px rgba(0,0,0,.8),inset 0 1px rgba(255,255,255,.2);
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;
  transition:transform .1s cubic-bezier(.1,1,.1,1);overflow:hidden;
}
.vitrine-dashprod .dp-price-card:before {
  content:"";position:absolute;inset:0;border-radius:32px;pointer-events:none;z-index:1;
  background:radial-gradient(600px circle at var(--glow-x) var(--glow-y),rgba(0,242,254,.12),transparent 40%);
}
.vitrine-dashprod .dp-badge {
  font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--dp-cyan);background:rgba(0,242,254,.10);
  border:1px solid rgba(0,242,254,.25);padding:5px 13px;border-radius:20px;
  transform:translateZ(20px);z-index:2;
}
.vitrine-dashprod .dp-plan-head {text-align:center;transform:translateZ(25px);z-index:2}
.vitrine-dashprod .dp-plan-head h3 {font-size:21px;font-weight:600;color:#fff;margin:10px 0 0}
.vitrine-dashprod .dp-plan-price {font-size:32px;font-weight:700;color:#fff;margin-top:3px}
.vitrine-dashprod .dp-plan-price span {font-size:12px;font-weight:400;color:rgba(255,255,255,.5)}
.vitrine-dashprod .dp-bubble {
  position:relative;width:80px;height:80px;transform:translateZ(40px);
  transform-style:preserve-3d;z-index:10;margin:18px 0;cursor:pointer;
}
.vitrine-dashprod .dp-sphere {
  position:absolute;inset:0;border-radius:50%;
  background:linear-gradient(var(--oil-angle),rgba(0,242,254,.4),rgba(112,0,255,.3) 35%,rgba(255,0,128,.35) 70%,rgba(0,242,254,.3));
  border:1px solid rgba(255,255,255,.5);
  box-shadow:inset 0 0 15px rgba(255,255,255,.4),inset 8px 8px 20px rgba(0,242,254,.3),inset -8px -8px 20px rgba(255,0,128,.25),0 15px 30px rgba(0,0,0,.5);
  backdrop-filter:blur(4px);transition:.4s cubic-bezier(.34,1.56,.64,1);
}
.vitrine-dashprod .dp-bubble:hover .dp-sphere,.vitrine-dashprod .dp-price-card.is-open .dp-sphere {
  transform:scale(1.08);border-color:rgba(255,255,255,.8);box-shadow:inset 0 0 20px rgba(255,255,255,.6),0 0 25px rgba(0,242,254,.4);
}
.vitrine-dashprod .dp-specular {position:absolute;top:7%;left:14%;width:72%;height:36%;border-radius:50%;background:linear-gradient(to bottom,rgba(255,255,255,.75),transparent);pointer-events:none;transform:translateZ(5px)}
.vitrine-dashprod .dp-bubble-icon {position:absolute;inset:0;display:flex;justify-content:center;align-items:center;transform:translate3d(var(--shift-x),var(--shift-y),15px);z-index:4}
.vitrine-dashprod .dp-chevron {width:24px;height:24px;color:#fff;stroke-width:2.5;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6));transition:.5s cubic-bezier(.34,1.56,.64,1)}
.vitrine-dashprod .dp-price-card.is-open .dp-chevron {transform:rotate(-180deg) scale(1.15)}
.vitrine-dashprod .dp-expandable {width:100%;display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.16,1,.3,1);z-index:2;transform:translateZ(25px)}
.vitrine-dashprod .dp-features {overflow:hidden;opacity:0;transform:translateY(6px);transition:.4s;list-style:none;display:flex;flex-direction:column;gap:9px;font-size:13px;color:rgba(255,255,255,.75)}
.vitrine-dashprod .dp-features li:before {content:"✓";color:var(--dp-cyan);font-weight:bold;margin-right:8px}
.vitrine-dashprod .dp-price-card.is-open .dp-expandable {grid-template-rows:1fr}
.vitrine-dashprod .dp-price-card.is-open .dp-features {opacity:1;transform:none;padding:8px 0}
.vitrine-dashprod .dp-price-cta {
  width:100%;padding:13px;border-radius:999px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.2);color:#fff;font-size:14px;font-weight:600;
  cursor:pointer;transform:translateZ(20px);transition:.3s;z-index:2;margin-top:16px;
}
.vitrine-dashprod .dp-price-cta:hover {background:#fff;color:#000;box-shadow:0 0 25px rgba(255,255,255,.3)}
.vitrine-dashprod .dp-price-card.recommended {border-color:rgba(0,242,254,.32);box-shadow:0 30px 70px rgba(0,242,254,.08),inset 0 1px rgba(255,255,255,.2)}
.vitrine-dashprod .dp-route {
  display:grid;grid-template-columns:repeat(7,1fr);align-items:center;gap:5px;margin-top:25px;
}
.vitrine-dashprod .dp-route span {height:4px;border-radius:99px;background:rgba(255,255,255,.1)}
.vitrine-dashprod .dp-route span.on {background:linear-gradient(90deg,var(--dp-cyan),#fff)}
.vitrine-dashprod .dp-terminal {
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#030405;border:1px solid rgba(255,255,255,.10);
  border-radius:20px;padding:18px;color:#b7c0c7;font-size:11px;line-height:1.9;
}
.vitrine-dashprod .dp-terminal .cyan{color:#8cf3ff}.vitrine-dashprod .dp-terminal .green{color:#69f2aa}.vitrine-dashprod .dp-terminal .gold{color:#e6c37d}
@media(max-width:900px){
  .vitrine-dashprod .dp-workflow{grid-template-columns:repeat(2,1fr)}
  .vitrine-dashprod .dp-pricing{grid-template-columns:1fr}
}
@media(max-width:560px){
  .vitrine-dashprod .dp-workflow{grid-template-columns:1fr}
  .vitrine-dashprod .dp-price-scene{padding:8px 0}
}
`;


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
    <div className="vitrine vitrine-dashprod" style={{ minHeight: "100vh", display: "flex",
      flexDirection: "column", background: V.ivoire, color: V.encre }}>
      <style>{MATRIX_CSS}</style>
      <NavPublique page="accueil" aller={aller} sombre />

      {/* ── HERO — la nuit du chargement ─────────────────────────────────── */}
      <section className="dp-hero" style={{ background:
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

      {/* ── FLUX OPÉRATIONNEL ───────────────────────────────────────────── */}
      <section style={{ background:"#050608", color:"#fff", padding:"clamp(44px,6vw,78px) 20px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto" }}>
          <div className="dp-kicker">Le circuit Dashprod</div>
          <h2 className="dp-display" style={{fontSize:"clamp(28px,4vw,46px)",margin:"14px 0 10px"}}>
            Une saisie. Tout le circuit.
          </h2>
          <p className="dp-copy" style={{maxWidth:"62ch",fontSize:15,lineHeight:1.6}}>
            Le devis devient dossier. Le dossier devient planning. Le chantier devient preuve.
            La preuve devient facture. Rien ne repart dans Excel.
          </p>
          <div className="dp-route">
            {["Demande","Devis","Signature","Planning","Chantier","Facture","Paiement"].map((x,i)=>
              <React.Fragment key={x}>
                <span className={i<6 ? "on" : "on"} />
              </React.Fragment>
            )}
          </div>
          <div className="dp-workflow" style={{marginTop:22}}>
            {[
              ["001","CRM","Client et demande"],
              ["002","Devis","Chiffrage et marge"],
              ["003","Signature","Offre validée"],
              ["004","Planning","Équipe + camion"],
              ["005","Chantier","Heures + photos"],
              ["006","Facture","Peppol + paiement"]
            ].map(([n,t,d])=>(
              <article className="dp-step" key={n}>
                <div className="dp-step-no">{n}/006</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
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
            <article key={m.n} className="v-carte v-carte-hover dp-glass" style={{ padding: 20 }}>
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

      {/* ── PRIX — cartes matrice 3D ───────────────────────────────────── */}
      <section style={{background:"#050608", color:"#fff", padding:"clamp(55px,7vw,90px) 20px"}}>
        <div style={{maxWidth:1080,margin:"0 auto"}}>
          <div style={{maxWidth:620}}>
            <div className="dp-kicker">3 offres · une raison d'évoluer</div>
            <h2 className="dp-display" style={{fontSize:"clamp(28px,4vw,46px)",margin:"14px 0 10px"}}>
              L'ERP grandit avec votre entreprise.
            </h2>
            <p className="dp-copy" style={{fontSize:15,lineHeight:1.6}}>
              Pas de catalogue illisible. Chaque niveau répond à un besoin concret.
              Cliquez sur la bulle pour voir ce qui est inclus.
            </p>
          </div>

          <div className="dp-pricing" style={{marginTop:34}}>
            <MatrixPlan
              planKey="starter"
              badge="Essentiel"
              name="Starter"
              price="180€"
              promise="Sortir du papier"
              features={["2 utilisateurs inclus","CRM et dossiers clients","Demandes centralisées","Base opérationnelle"]}
              action="Commencer"
              aller={aller}
            />
            <MatrixPlan
              planKey="regular"
              badge="Recommandé"
              name="Regular"
              price="360€"
              promise="Piloter l'entreprise"
              features={["5 utilisateurs inclus","Devis et signature en ligne","Planning et équipes terrain","Facturation + Peppol","Inventaire simple"]}
              action="Demander un accès"
              aller={aller}
              recommended
            />
            <MatrixPlan
              planKey="pro"
              badge="Échelle"
              name="Pro"
              price="720€"
              promise="Changer d'échelle"
              features={["Utilisateurs illimités","Coût utilisateur dégressif","Multi-équipes","Opérations internationales","Fonctionnalités avancées"]}
              action="Parler à Dashprod"
              aller={aller}
            />
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

      <SectionAvis orgId={orgId} />

      <PiedPublic aller={aller} />
    </div>
  );
}


function MatrixPlan({planKey,badge,name,price,promise,features,action,aller,recommended=false}) {
  const [open,setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const maxTilt = 14, depthOffset = 10;
    const move = (e) => {
      const r = card.getBoundingClientRect();
      const x=e.clientX-r.left, y=e.clientY-r.top;
      const xn=(x/r.width)*2-1, yn=(y/r.height)*2-1;
      card.style.setProperty("--rot-x",`${(-yn*maxTilt).toFixed(2)}deg`);
      card.style.setProperty("--rot-y",`${(xn*maxTilt).toFixed(2)}deg`);
      card.style.setProperty("--glow-x",`${x}px`);
      card.style.setProperty("--glow-y",`${y}px`);
      card.style.setProperty("--oil-angle",`${(Math.atan2(yn,xn)*180/Math.PI+90).toFixed(1)}deg`);
      card.style.setProperty("--shift-x",`${(Math.sin(xn*Math.PI/2)*depthOffset).toFixed(1)}px`);
      card.style.setProperty("--shift-y",`${(Math.sin(yn*Math.PI/2)*depthOffset).toFixed(1)}px`);
    };
    const leave = () => {
      ["--rot-x","--rot-y"].forEach(v=>card.style.setProperty(v,"0deg"));
      card.style.setProperty("--oil-angle","135deg");
      card.style.setProperty("--shift-x","0px");
      card.style.setProperty("--shift-y","0px");
    };
    card.addEventListener("mousemove",move);
    card.addEventListener("mouseleave",leave);
    return () => { card.removeEventListener("mousemove",move); card.removeEventListener("mouseleave",leave); };
  },[]);

  return (
    <div className="dp-price-scene">
      <article ref={ref} className={`dp-price-card ${recommended ? "recommended" : ""} ${open ? "is-open" : ""}`}>
        <div className="dp-badge">{badge}</div>
        <div className="dp-plan-head">
          <h3>{name}</h3>
          <div className="dp-plan-price">{price} <span>/mois HTVA</span></div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.55)",marginTop:6}}>{promise}</div>
        </div>

        <div className="dp-bubble" role="button" tabIndex={0} aria-label={`Afficher les fonctionnalités ${name}`}
             onClick={()=>setOpen(v=>!v)}
             onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setOpen(v=>!v)}}}>
          <div className="dp-sphere"/>
          <div className="dp-specular"/>
          <div className="dp-bubble-icon">
            <svg className="dp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div className="dp-expandable">
          <ul className="dp-features">
            {features.map(f=><li key={f}>{f}</li>)}
          </ul>
        </div>

        <button className="dp-price-cta" onClick={()=>aller("societe")}>{action}</button>
      </article>
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
    <section style={{ background: "#fff", borderTop: `1px solid ${V.bord}`,
                      padding: "clamp(44px, 6vw, 76px) 20px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 34, letterSpacing: 2, color: "#F59E0B" }}>
          {"★".repeat(pleines)}{"☆".repeat(5 - pleines)}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: V.encre, marginTop: 6 }}>
          {moyenne.toFixed(1)} / 5
          <span style={{ fontWeight: 500, color: V.muet, fontSize: 14 }}>
            {" "}· {data.total} avis
          </span>
        </div>
        <div style={{ display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
                      gap: 16, marginTop: 28, textAlign: "left" }}>
          {(data.avis || []).slice(0, 6).map((a, i) => (
            <div key={i} style={{ border: `1px solid ${V.bord}`, borderRadius: 14,
                                  padding: "16px 18px", background: V.ivoire }}>
              <div style={{ color: "#F59E0B", fontSize: 15 }}>
                {"★".repeat(a.note)}{"☆".repeat(5 - a.note)}
              </div>
              <p style={{ fontSize: 13.5, color: V.encre, lineHeight: 1.5,
                          margin: "8px 0 0" }}>« {a.commentaire} »</p>
            </div>
          ))}
        </div>
      </div>
    </section>
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