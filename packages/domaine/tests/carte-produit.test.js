import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUTIL = join(RACINE, "packages", "domaine", "outils", "carte-produit.mjs");

// La carte est l'outil de vérification : si elle ne se génère plus, on retombe
// à lire du JavaScript pour savoir qui voit quoi.
const html = execFileSync("node", [OUTIL], { encoding: "utf8", cwd: RACINE });

test("la carte se génère et couvre les huit offres", () => {
  for (const code of ["starter", "regular", "pro", "independant_manutention",
                      "donneur_ordre", "garde_meubles", "groupe_liftier",
                      "logistique_mobilier"]) {
    assert.ok(html.includes(code), `${code} absent de la carte`);
  }
});

test("la carte n'expose pas d'état hors vocabulaire", () => {
  const etats = [...html.matchAll(/class="p" style="background:#\w{6};color:#\w{6}">([^<]+)</g)]
    .map((m) => m[1].trim());
  for (const x of new Set(etats)) {
    assert.ok(["livré", "esquisse", "manquant", "vendable", "bientot", "etude"]
      .includes(x), `état inconnu affiché : ${x}`);
  }
});

test("la carte dit la dette de paramétrage", () => {
  // Le chiffre qui ne peut que descendre doit être visible sans lire un test.
  assert.match(html, /Dette de paramétrage : \d+ écrans/);
});

test("chaque offre affiche son ancrage", () => {
  const ancrages = [...html.matchAll(/ancrage <b>([^<]*)<\/b>/g)].map((m) => m[1]);
  assert.equal(ancrages.length, 8);
  for (const a of ancrages) assert.notEqual(a, "—", "offre sans ancrage résolu");
});
