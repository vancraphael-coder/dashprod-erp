// =============================================================================
// LA CARTE DU PRODUIT — générée depuis le registre, donc incapable de mentir.
//
// À QUOI ELLE SERT. Le registre sait qui voit quoi, offre par offre, posture
// par posture. Mais il est en JavaScript : illisible pour celui qui doit
// VÉRIFIER. Cette carte rend le registre regardable — c'est l'outil qui permet
// de me contredire.
//
// ELLE N'EST PAS UNE DOCUMENTATION. Une documentation se périme. Celle-ci se
// régénère à chaque exécution depuis les mêmes fichiers que les tests. Si elle
// affiche quelque chose de faux, c'est le registre qui est faux — et c'est
// exactement ce qu'on veut pouvoir constater.
//
// Usage :  node packages/domaine/outils/carte-produit.mjs > carte.html
// =============================================================================

import { ECRANS, ecransParEtat, routeDeLEcran } from "../src/produit/ecrans.js";
import { POSTURES, posturesDeLOffre, ancrageDeLOffre } from "../src/produit/postures.js";
import { REGLAGES, reglage } from "../src/produit/reglages-portee.js";
import { REFERENTIEL_OFFRES, offreReferentiel } from "../src/commercial/referentiel-offres.js";
import { naturesDuMenu } from "../src/commercial/natures.js";
import { SECTEURS, secteurDeLOffre } from "../src/produit/secteurs.js";
import { verrousDuModule } from "../src/produit/verrous-offre.js";

const e = (s) => String(s ?? "").replace(/[&<>"]/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const euros = (c) => (c == null ? "—" : `${(c / 100).toFixed(0)} €`);

/** Les écrans atteignables dans une offre : module porté ET posture présente. */
function ecransDeLOffre(code) {
  const o = offreReferentiel(code);
  const p = new Set(posturesDeLOffre(code).map((x) => x.cle));
  return ECRANS.filter((x) => !x.transverse
    && (x.module === null || o.modules.includes(x.module))
    && x.postures.some((q) => p.has(q)));
}

function reglagesDeLOffre(code) {
  const o = offreReferentiel(code);
  const p = new Set(posturesDeLOffre(code).map((x) => x.cle));
  return REGLAGES.filter((r) => (r.module === null || o.modules.includes(r.module))
    && r.postures.some((q) => p.has(q)));
}

const PASTILLE = {
  livre: ["#E1F5EE", "#0F6E56", "livré"],
  esquisse: ["#FAEEDA", "#854F0B", "esquisse"],
  manquant: ["#FCEBEB", "#A32D2D", "manquant"],
};

function pastille(etat) {
  const [bg, fg, txt] = PASTILLE[etat] || PASTILLE.manquant;
  return `<span class="p" style="background:${bg};color:${fg}">${txt}</span>`;
}

function blocOffre(o) {
  const postures = posturesDeLOffre(o.code);
  const ecrans = ecransDeLOffre(o.code);
  const regl = reglagesDeLOffre(o.code);
  const natures = naturesDuMenu(o.modules);
  const sect = secteurDeLOffre(o.code);
  const parEtat = (s) => ecrans.filter((x) => x.etat === s).length;

  const parPosture = postures.map((p) => {
    const siens = ecrans.filter((x) => x.postures.includes(p.cle));
    if (siens.length === 0) return "";
    const anc = ancrageDeLOffre(o.code);
    return `<div class="post">
      <div class="posth">${e(p.titre)}
        <span class="veut">${e(p.veut)}</span></div>
      <div class="ecr">${siens
        .sort((a, b) => a.cle.localeCompare(b.cle))
        .map((x) => `<span class="ec${x.cle === anc ? " anc" : ""}">${e(x.cle)}
          ${pastille(x.etat)}${x.capacite ? `<span class="cap">${e(x.capacite)}</span>` : ""}
          ${x.rituel ? '<span class="cap">rituel</span>' : ""}
          ${x.kpi ? '<span class="cap">kpi</span>' : ""}</span>`).join("")}
      </div></div>`;
  }).join("");

  const verrous = o.modules.flatMap((m) => verrousDuModule(m));

  return `<section class="off">
    <h2>${e(o.libelle)} <span class="code">${e(o.code)}</span>
      ${o.souscriptible
        ? '<span class="p" style="background:#E1F5EE;color:#0F6E56">vendable</span>'
        : `<span class="p" style="background:#FAEEDA;color:#854F0B">${e(o.statut)}</span>`}</h2>
    <div class="meta">
      <span><b>${euros(o.prix_base_centimes)}</b> HTVA ${e(o.unite)}</span>
      <span>secteur <b>${e(sect ? sect.titre : "—")}</b></span>
      ${o.secteur ? `<span>clientèle ${e(o.secteur)}</span>` : ""}
      <span>${o.membres_inclus} accès inclus${o.membres_limite != null
        ? `, plafond ${o.membres_limite}` : ", sans plafond"}</span>
      <span>ancrage <b>${e(routeDeLEcran(ancrageDeLOffre(o.code)) || "—")}</b></span>
    </div>
    <div class="chif">
      <span>${o.modules.length} modules</span>
      <span>${ecrans.length} écrans — ${parEtat("livre")} livrés,
        ${parEtat("esquisse")} esquisses, ${parEtat("manquant")} manquants</span>
      <span>${regl.filter((r) => r.etat === "livre").length}/${regl.length} réglages</span>
      <span>${verrous.length} verrous RLS</span>
      <span>crée : ${natures.length ? natures.map((n) => e(n.cle)).join(", ") : "rien"}</span>
    </div>
    ${parPosture}
    <div class="regl"><b>Réglages</b> ${regl
      .sort((a, b) => a.cle.localeCompare(b.cle))
      .map((r) => `<span class="ec">${e(r.cle)}${pastille(r.etat)}${
        r.legal ? '<span class="cap">légal</span>' : ""}</span>`).join("")}</div>
  </section>`;
}

function dette() {
  const livre = (c) => reglage(c)?.etat === "livre";
  return ECRANS
    .filter((x) => x.etat !== "manquant")
    .map((x) => [x.cle, x.reglages.filter((r) => !livre(r))])
    .filter(([, m]) => m.length > 0);
}

const d = dette();

const html = `<meta charset="utf-8"><title>Carte du produit — Dashprod</title>
<style>
:root{--i:#1c1c1a;--m:#6b6a65;--b:#e3e1d9;--s:#fbfaf7}
*{box-sizing:border-box}
body{margin:0;padding:20px 16px 60px;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--i);background:#fff;max-width:1100px;margin:0 auto}
h1{font-size:22px;font-weight:600;margin:0 0 4px}
h2{font-size:17px;font-weight:600;margin:0 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sub{color:var(--m);font-size:13px;margin:0 0 24px}
.off{border:1px solid var(--b);border-radius:12px;padding:16px;margin:0 0 16px;background:var(--s)}
.code{font:12px ui-monospace,monospace;color:var(--m);font-weight:400}
.meta,.chif{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--m);margin:0 0 8px}
.chif{padding:8px 0;border-top:1px solid var(--b);border-bottom:1px solid var(--b);margin-bottom:12px}
.post{margin:0 0 10px}
.posth{font-size:13.5px;font-weight:600;margin:0 0 4px}
.veut{font-weight:400;color:var(--m);font-size:12.5px;margin-left:6px}
.ecr{display:flex;gap:6px;flex-wrap:wrap}
.ec{display:inline-flex;align-items:center;gap:4px;font:12px ui-monospace,monospace;background:#fff;border:1px solid var(--b);border-radius:6px;padding:2px 6px}
.ec.anc{border-color:#1D9E75;border-width:2px}
.p{font:10.5px -apple-system,sans-serif;font-weight:600;border-radius:99px;padding:1px 6px}
.cap{font:10.5px -apple-system,sans-serif;color:#534AB7;background:#EEEDFE;border-radius:99px;padding:1px 6px}
.regl{margin-top:10px;padding-top:10px;border-top:1px solid var(--b);display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 24px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--b)}
th{font-weight:600;color:var(--m);font-size:12px}
.al{background:#FCEBEB;border:1px solid #F7C1C1;border-radius:10px;padding:12px 14px;font-size:13.5px;margin:0 0 24px}
</style>
<h1>Carte du produit</h1>
<p class="sub">Générée depuis le registre le ${new Date().toISOString().slice(0, 10)}.
Si quelque chose est faux ici, c'est le registre qui est faux — pas la carte.
Bordure verte = écran d'ancrage de l'offre.</p>

<table>
<tr><th>Axe</th><th>Compte</th></tr>
<tr><td>Offres publiées</td><td>${REFERENTIEL_OFFRES.length}
  (${REFERENTIEL_OFFRES.filter((o) => o.souscriptible).length} vendables)</td></tr>
<tr><td>Secteurs</td><td>${SECTEURS.length} — ${SECTEURS.map((s) => e(s.titre)).join(", ")}</td></tr>
<tr><td>Postures</td><td>${POSTURES.length}</td></tr>
<tr><td>Écrans déclarés</td><td>${ECRANS.length} — ${ecransParEtat("livre").length} livrés,
  ${ecransParEtat("esquisse").length} esquisses, ${ecransParEtat("manquant").length} manquants</td></tr>
<tr><td>Réglages</td><td>${REGLAGES.length} — ${REGLAGES.filter((r) => r.etat === "livre").length} livrés</td></tr>
</table>

${d.length > 0 ? `<div class="al"><b>Dette de paramétrage : ${d.length} écrans</b>
dépendent d'un réglage qui n'existe pas — ils portent donc leur configuration
en dur.<br>${d.map(([c, m]) => `${e(c)} → ${m.map(e).join(", ")}`).join("<br>")}</div>` : ""}

${REFERENTIEL_OFFRES
  .slice()
  .sort((a, b) => a.rang - b.rang)
  .map(blocOffre).join("")}
`;

process.stdout.write(html);
