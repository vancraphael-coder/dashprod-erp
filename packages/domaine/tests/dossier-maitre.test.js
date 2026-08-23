// =============================================================================
// LE DOSSIER MAÎTRE — l'adaptateur documentaire.
//
// Il existe pour qu'une nouvelle session, une autre conversation ou un autre
// LLM reprenne le projet sans dériver. Sa valeur tient à une seule propriété :
// **il dit qui a raison quand deux sources se contredisent**.
//
// Ces tests le protègent de la dérive qui guette toute documentation : perdre
// sa hiérarchie, se contredire, ou se mettre à affirmer des choses que la base
// dément.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MAITRE = join(dirname(fileURLToPath(import.meta.url)),
                    "..", "..", "..", "docs", "maitre");
const lire = (f) => readFileSync(join(MAITRE, f), "utf8");

test("le dossier maître est complet et se lit dans un ordre", () => {
  // La numérotation N'EST PAS décorative : elle donne l'ordre de lecture à
  // quelqu'un qui arrive sans contexte.
  const attendus = ["00-DEMARRER-ICI.md", "10-DECISIONS-PRODUIT.md",
    "20-OUVERT.md", "30-REGLES-IA-EXTERNE.md", "40-METHODE.md", "50-ARCHIVE.md"];
  const presents = readdirSync(MAITRE).filter((f) => f.endsWith(".md")).sort();
  assert.deepEqual(presents, attendus.sort());
});

test("la hiérarchie des sources est énoncée, et la base arrive en premier", () => {
  // C'est LA raison d'être du dossier. Sans elle, un document de réflexion
  // vaut autant qu'un fait vérifié — et c'est ainsi qu'on dérive.
  const d = lire("00-DEMARRER-ICI.md");
  assert.match(d, /hiérarchie des sources/i);
  const iBase = d.indexOf("base de données");
  const iDepot = d.indexOf("dépôt");
  const iReste = d.indexOf("Matière à instruire");
  assert.ok(iBase > 0 && iDepot > iBase && iReste > iDepot,
    "base → dépôt → … → matière à instruire, dans cet ordre");
});

test("le démarrage dit ce qu'il ne faut PAS rouvrir", () => {
  // Une doc qui ne dit que ce qu'il faut faire laisse rediscuter le reste.
  const d = lire("00-DEMARRER-ICI.md");
  assert.match(d, /ne faut PAS rouvrir/i);
  // Insensible à la casse : c'est la PRÉSENCE de l'acquis qui compte, pas son
  // orthographe en début de phrase.
  const bas = d.toLowerCase();
  for (const acquis of ["typescript", "vite", "français"]) {
    assert.ok(bas.includes(acquis), `l'acquis « ${acquis} » doit être listé`);
  }
});

test("décidé et ouvert sont dans DEUX fichiers séparés", () => {
  // Les mélanger, c'est laisser croire qu'une décision est négociable ou
  // qu'une question ouverte est tranchée. C'est la confusion la plus coûteuse.
  const decide = lire("10-DECISIONS-PRODUIT.md");
  const ouvert = lire("20-OUVERT.md");
  assert.match(decide, /arrêtées|tranché/i);
  assert.match(ouvert, /n'est PAS tranché/i);
  assert.match(ouvert, /Ne décidez aucun de ces points seul/i);
});

test("les questions ouvertes disent QUEL professionnel trancher", () => {
  // « À valider par un professionnel » sans dire lequel n'aide personne.
  const o = lire("20-OUVERT.md");
  for (const qui of ["Conseiller TVA", "DPO", "Expert-comptable"]) {
    assert.ok(o.includes(qui), `${qui} doit être nommé`);
  }
});

test("les prix publiés figurent, et correspondent au barème appliqué", () => {
  // Le CADRAGE d'origine affirmait que les prix manquaient : c'était vrai en
  // août, faux après la migration 0140. Une doc qui garde une affirmation
  // périmée est pire qu'une doc absente.
  const d = lire("10-DECISIONS-PRODUIT.md");
  for (const v of ["180", "2 052", "360", "4 104", "720", "8 208", "148,20", "570"]) {
    assert.ok(d.includes(v), `le prix ${v} doit figurer`);
  }
});

test("la méthode consigne le piège du « la logique est juste mais rien n'arrive »", () => {
  // Bug vécu : lignesFournitures branché correctement, mais la colonne
  // manquait au select. Vérifier la logique ne suffit pas.
  const m = lire("40-METHODE.md");
  assert.match(m, /donnée arrive/i);
  assert.match(m, /ROLLBACK/, "l'exercice des migrations doit être rappelé");
});

test("l'archive se déclare NON normative", () => {
  // Sans cette mention, une idée gardée finit par être prise pour une décision.
  const a = lire("50-ARCHIVE.md");
  assert.match(a, /n'est pas normatif/i);
  assert.match(a, /rapproche un client|preuve avant l'extension/i,
    "le filtre de Raphaël doit être rappelé");
});
