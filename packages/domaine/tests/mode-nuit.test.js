// =============================================================================
// LE MODE NUIT — aucun fond clair EN DUR dans les écrans d'application.
//
// Un `background: "#fff"` (ou un bleu clair littéral) ne suit pas le thème : il
// reste blanc quand toute l'app passe en sombre, et pose un pavé lumineux sur
// le fond nuit. Le jeton `C.blanc` / `C.bleuClair`, lui, vire au sombre. Ce
// test interdit le fond clair en dur là où le mode nuit doit s'appliquer.
//
// EXCEPTIONS légitimes, exclues :
//   · la vitrine (`ecrans/vitrine/`) : identité propre, fond clair assumé ;
//   · les DOCUMENTS (Devis, Facture, Contrat, Relevé…) : un devis PDF est blanc
//     dans les deux modes, c'est voulu ;
//   · le TEXTE blanc sur une couleur pleine (`color: "#fff"`) : légitime, il
//     est posé sur un aplat coloré, il doit rester blanc partout ;
//   · les fonds NAVY volontaires de l'app terrain (bandeaux sombres) ;
//   · les molettes/graphiques autonomes qui ne consomment pas le thème.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ECRANS = join(RACINE, "apps", "web", "src", "ecrans");

// Documents et écrans à l'identité propre : fond clair assumé dans les 2 modes.
const HORS_SUJET = new Set([
  "FactureDoc.jsx", "ReleveDoc.jsx", "Devis.jsx", "Contrat.jsx", "FactureRecap.jsx",
  "CertificatSignature.jsx", "Offre.jsx",   // documents imprimables : blancs voulus
  "Connexion.jsx", "Inscription.jsx",       // pages d'auth : thème vitrine (V.*)
  "Diagnostic.jsx",          // page technique autonome
  "MolettesCouleur.jsx",     // molette graphique, hors thème
  "theme-client.jsx",        // définition de palette, pas un écran
]);

function fichiersJsx(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === "vitrine") continue;              // identité propre
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersJsx(p));
    else if (p.endsWith(".jsx") && !HORS_SUJET.has(basename(p))) out.push(p);
  }
  return out;
}

test("aucun FOND clair en dur dans les écrans d'app (il ignorerait le mode nuit)", () => {
  const fautes = [];
  // `background:` (ou backgroundColor) suivi d'un blanc littéral. On ne vise
  // QUE les fonds : `color: "#fff"` (texte) est autorisé.
  const FOND_BLANC = /background(?:Color)?:\s*["'](#fff|#ffffff|#FFF|#FFFFFF|white)["']/;
  for (const f of fichiersJsx(ECRANS)) {
    const src = readFileSync(f, "utf8");
    src.split("\n").forEach((ligne, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) return;   // commentaire
      if (FOND_BLANC.test(ligne)) {
        fautes.push(`${f.replace(RACINE, "")}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(fautes, [],
    "fond blanc en dur (utiliser C.blanc, qui suit le mode nuit) :\n"
    + fautes.join("\n"));
});
