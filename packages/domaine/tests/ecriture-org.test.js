// =============================================================================
// LE CHEMIN D'ÉCRITURE — une table sans défaut `org_id` est INÉCRIVABLE.
//
// LE BUG QUI A COÛTÉ TROIS LOTS
// -----------------------------
// Les tables historiques portent `org_id uuid not null default jwt_org()`. Six
// tables créées à la suite ont eu le `not null` mais PAS le défaut.
//
// Le front insère `{jour, nom}` sans `org_id` — c'est correct : l'organisation
// vient de la session, jamais du navigateur. Mais sans défaut, l'insertion
// viole la contrainte et échoue. Résultat vécu : « rien ne change à l'écran »,
// alors que le code applicatif, le domaine et le déploiement étaient corrects.
// La porte d'écriture était murée.
//
// POURQUOI LE ROLLBACK N'AVAIT RIEN VU
// ------------------------------------
// Les blocs de vérification fournissaient EUX-MÊMES l'org_id
// (`insert into … (org_id, …) values (v_org, …)`). Ils prouvaient la structure,
// pas le chemin réel. **Une migration doit être exercée telle que
// l'application l'utilise**, pas telle qu'il est commode de la tester.
//
// Ce test lit les migrations : toute table portant `org_id not null` doit
// déclarer son défaut.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)),
                        "..", "..", "..", "supabase", "migrations");

/** Les tables déclarées avec `org_id … not null` dans une migration. */
function tablesAvecOrgNotNull(sql) {
  const trouvees = [];
  // `create table [if not exists] [public.]<nom> ( … )`
  const re = /create table(?:\s+if not exists)?\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi;
  for (const m of sql.matchAll(re)) {
    const [, nom, corps] = m;
    const ligne = corps.split("\n").find((l) => /^\s*org_id\s/i.test(l));
    if (!ligne) continue;
    if (!/not null/i.test(ligne)) continue;
    trouvees.push({ nom, ligne, aDefaut: /default\s+jwt_org\(\)/i.test(ligne) });
  }
  return trouvees;
}

test("toute table NOUVELLE à org_id NOT NULL déclare son défaut", () => {
  // PORTÉE ASSUMÉE : ce test ne regarde que les migrations à partir de 0138 —
  // celles écrites intégralement ici. Les plus anciennes sont des stubs de
  // référence (le SQL a été appliqué en direct) : leur fichier ne porte pas
  // l'historique réel, et la base fait foi sur elles (hiérarchie des sources,
  // rang 1). Prétendre les vérifier depuis les fichiers produirait un test
  // faux — pire qu'un test absent.
  //
  // Ce qu'il garantit : la RÉCIDIVE est impossible. Toute nouvelle table à
  // `org_id not null` devra porter `default jwt_org()`, à la création ou par
  // un `alter` dans la même série.
  const fichiers = readdirSync(MIGRATIONS)
    .filter((x) => x.endsWith(".sql") && Number(x.slice(0, 4)) >= 138);
  const tout = fichiers.map((f) => readFileSync(join(MIGRATIONS, f), "utf8")).join("\n");
  const rattrapees = new Set(
    [...tout.matchAll(/alter table\s+(?:public\.)?(\w+)[\s\S]{0,160}?alter column\s+org_id\s+set default\s+jwt_org\(\)/gi)]
      .map((m) => m[1]));

  const fautes = [];
  for (const f of fichiers) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8");
    for (const t of tablesAvecOrgNotNull(sql)) {
      if (!t.aDefaut && !rattrapees.has(t.nom)) fautes.push(`${f} → ${t.nom}`);
    }
  }
  assert.deepEqual(fautes, [],
    "table(s) inécrivable(s) depuis l'app — ajouter `default jwt_org()` :\n"
    + fautes.join("\n"));
});

test("le correctif 0143 couvre les six tables touchées", () => {
  // Trace explicite : ces six-là ont été livrées cassées. Le fichier de
  // migration doit garder la liste, pour qu'on sache quoi vérifier en base.
  const sql = readFileSync(join(MIGRATIONS, "0143_org_id_par_defaut.sql"), "utf8");
  for (const t of ["notes_atelier", "factures_fournisseur", "peppol_evenements",
                   "equipes_jour", "modeles_equipe", "notes_planning"]) {
    assert.ok(sql.includes(t), `${t} doit figurer dans le correctif`);
  }
});

test("la leçon est écrite : éprouver COMME l'application, pas comme il est commode", () => {
  // Les blocs de vérification fournissaient eux-mêmes l'org_id. Ils
  // validaient la structure et rataient le chemin réel.
  const sql = readFileSync(join(MIGRATIONS, "0143_org_id_par_defaut.sql"), "utf8");
  assert.match(sql, /prouvaient la STRUCTURE|jamais le chemin réel/i,
    "la migration doit consigner pourquoi le rollback n'avait rien vu");
});
