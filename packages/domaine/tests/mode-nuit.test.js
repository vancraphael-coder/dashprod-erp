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

test("aucun FOND bleu clair en dur (il ignore le mode nuit lui aussi)", () => {
  // Le test précédent ne cherchait que le blanc. Un fond `#E7EFFC` sur un
  // onglet sélectionné passait donc au travers — et restait bleu pâle sur le
  // fond nuit. Trouvé dans Profil.jsx. Le jeton `C.bleuClair` suit le mode.
  const fautes = [];
  const BLEU_DUR = /background(?:Color)?:\s*["'](#E7EFFC|#EEF2F8|#EFF4FC|#E8F0FE|#DBEAFE)["']/i;
  for (const f of fichiersJsx(ECRANS)) {
    const src = readFileSync(f, "utf8");
    src.split("\n").forEach((ligne, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) return;
      if (BLEU_DUR.test(ligne)) fautes.push(`${f.replace(RACINE, "")}:${i + 1}`);
    });
  }
  assert.deepEqual(fautes, [],
    "fond bleu clair en dur (utiliser C.bleuClair) :\n" + fautes.join("\n"));
});

/* ── Les TEINTES d'alerte : fonds, filets et encres (lot 34) ─────────────── */

test("aucune TEINTE d'alerte en dur : ni fond, ni filet, ni encre", () => {
  // CE QUE CE TEST AJOUTE AUX DEUX PRÉCÉDENTS.
  //
  // Ils ne surveillaient que le blanc et cinq bleus. Six familles de teintes
  // passaient donc au travers : l'ambre d'un avertissement (#FFFBEB), le rouge
  // d'un refus (#FEF2F2), le vert d'une confirmation (#ECFDF5), le bleu d'une
  // information (#EFF6FF), le violet, le gris. 54 occurrences sur 25 écrans.
  // En mode nuit, chaque bandeau d'alerte devenait la chose la plus lumineuse
  // de l'écran.
  //
  // ET SURTOUT : ce test ne se limite PAS au fond. Corriger les seuls fonds
  // fut une régression en soi — le fond virait au sombre, l'encre restait
  // foncée, et le texte devenait illisible. Un bandeau est un TRIPLET (fond,
  // filet, encre) ; en surveiller un seul terme garantit de casser les autres.
  //
  // CE QUI CASSE SANS LUI : un écran ajouté demain repose un `#FFFBEB` en dur,
  // personne ne le voit en mode clair, et le mode nuit se redégrade écran par
  // écran — exactement l'histoire des 54 occurrences.
  const INTERDITS = {
    "#FFFBEB": "C.teinteAmbre", "#FEF2F2": "C.teinteRouge",
    "#ECFDF5": "C.teinteVerte", "#EFF6FF": "C.teinteBleue",
    "#F5F3FF": "C.teinteViolette", "#F8FAFC": "C.teinteNeutre",
    "#EEF2FF": "C.teinteIndigo", "#FDF2F8": "C.teinteRose",
    "#FDE68A": "C.filetAmbre", "#FECACA": "C.filetRouge",
    "#A7F3D0": "C.filetVert", "#BFDBFE": "C.filetBleu",
    "#DDD6FE": "C.filetViolet", "#E2E8F0": "C.filetNeutre",
    "#92400E": "C.encreAmbre", "#78350F": "C.encreAmbre", "#B45309": "C.encreAmbre",
    "#991B1B": "C.encreRouge", "#065F46": "C.encreVert", "#15803D": "C.encreVert",
    "#1E40AF": "C.encreBleu", "#1E3A8A": "C.encreBleu",
    "#5B21B6": "C.encreViolet", "#3730A3": "C.encreIndigo", "#9D174D": "C.encreRose",
  };
  const fautes = [];
  for (const f of fichiersJsx(ECRANS)) {
    const src = readFileSync(f, "utf8");
    src.split("\n").forEach((ligne, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) return;      // commentaire
      for (const [hexa, jeton] of Object.entries(INTERDITS)) {
        // La teinte doit être ENTRE GUILLEMETS pour compter. Ce n'est pas un
        // détail de syntaxe : les écrans qui ouvrent une fenêtre d'impression
        // y écrivent une feuille CSS en clair (`background:#EFF6FF;`, sans
        // guillemets). Un document imprimé est blanc dans les deux modes —
        // c'est l'exception déjà admise pour FactureDoc et ReleveDoc. Viser le
        // hexa quoted ne retient que le style JSX, qui est le vrai sujet.
        if (new RegExp('"' + hexa + '"', "i").test(ligne)) {
          fautes.push(`${f.replace(RACINE, "")}:${i + 1} → ${jeton}`);
        }
      }
    });
  }
  assert.deepEqual(fautes, [],
    "teinte d'alerte en dur (elle ignore le mode nuit) :\n" + fautes.join("\n"));
});
