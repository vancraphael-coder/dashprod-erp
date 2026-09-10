// =============================================================================
// LE CATALOGUE N'A QU'UNE SEULE SAISIE.
//
// CE QUI CASSE SANS CES TESTS : la divergence silencieuse. Deux catalogues
// portaient les mêmes chiffres — la table `offres` et les constantes du
// domaine — et se sont éloignés sans que rien ne l'annonce. Le test qui devait
// l'empêcher figeait une recopie datée de la migration 0075 : quand la
// décision a changé, il a verrouillé la version périmée au lieu de signaler
// l'écart.
//
// La parade n'est pas la vigilance, c'est de n'avoir qu'une seule saisie. Le
// référentiel est cette saisie ; le SQL de publication en est dérivé. Ces
// tests vérifient que la dérivation tient — et donc que le SQL n'a pas été
// retouché à la main.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  REFERENTIEL_OFFRES, STATUTS_OFFRE, offreReferentiel, paliersDemenageur,
  offresSectorielles,
} from "../src/commercial/referentiel-offres.js";
import { sqlPublication } from "../outils/publier-offres.mjs";
import { PLANS, OFFRES_SECTEURS, offreSouscriptible } from "../src/commercial/plans.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIGRATIONS = join(RACINE, "supabase", "migrations");

/**
 * La migration de publication la plus récente — reconnue à son CONTENU, pas à
 * son nom. Repérée par le nom, le test comparait le référentiel à une
 * publication périmée dès qu'une republication portait un autre intitulé.
 */
function migrationPublication() {
  const f = readdirSync(MIGRATIONS)
    .filter((n) => n.endsWith(".sql"))
    .filter((n) => readFileSync(join(MIGRATIONS, n), "utf8")
      .includes("insert into public.offres ("))
    .sort()
    .pop();
  assert.ok(f, "aucune migration de publication du catalogue");
  return { nom: f, src: readFileSync(join(MIGRATIONS, f), "utf8") };
}

test("le SQL publié est DÉRIVÉ du référentiel, pas écrit à la main", () => {
  const { nom, src } = migrationPublication();
  // La date de publication est lue dans la migration : c'est elle qui la
  // porte, le référentiel décrit seulement la version en vigueur.
  const date = src.match(/\('starter', '([^']+)'/)?.[1];
  assert.ok(date, `${nom} : date de publication introuvable`);

  const attendu = sqlPublication(date);
  assert.ok(src.includes(attendu),
    `${nom} ne contient pas le bloc dérivé du référentiel.\n`
    + "Régénérer par :\n"
    + `  node packages/domaine/outils/publier-offres.mjs ${date}\n`
    + "puis recoller le bloc. Ne pas corriger le SQL à la main.");
});

test("toute offre du référentiel est publiée, et rien d'autre", () => {
  const { src } = migrationPublication();
  for (const o of REFERENTIEL_OFFRES) {
    assert.ok(src.includes(`('${o.code}', '`),
      `${o.code} est au référentiel mais absent de la publication`);
  }
  const publies = [...src.matchAll(/^ {2}\('([a-z_]+)', '/gm)].map((m) => m[1]);
  assert.deepEqual([...publies].sort(),
    REFERENTIEL_OFFRES.map((o) => o.code).sort());
});

test("rien ne se vend avant d'exister", () => {
  // La règle est aussi une contrainte en base (0179). La tenir ici évite de
  // découvrir le refus au moment de la migration.
  for (const o of REFERENTIEL_OFFRES) {
    if (!o.souscriptible) continue;
    assert.ok(o.modules.length > 0,
      `${o.code} est souscriptible sans aucun module`);
    assert.ok(o.prix_base_centimes != null,
      `${o.code} est souscriptible sans prix publié`);
    assert.equal(o.statut, "disponible",
      `${o.code} est souscriptible mais son statut est « ${o.statut} »`);
  }
});

test("chaque offre porte un statut connu et un rang unique", () => {
  const rangs = new Set();
  for (const o of REFERENTIEL_OFFRES) {
    assert.ok(STATUTS_OFFRE.includes(o.statut), `statut inconnu : ${o.statut}`);
    assert.ok(!rangs.has(o.rang), `rang ${o.rang} en double (${o.code})`);
    rangs.add(o.rang);
  }
});

test("un seuil compris ne dépasse jamais son plafond dur", () => {
  for (const o of REFERENTIEL_OFFRES) {
    if (o.membres_limite != null) {
      assert.ok(o.membres_inclus <= o.membres_limite,
        `${o.code} : ${o.membres_inclus} membres compris pour un plafond de ${o.membres_limite}`);
    }
    if (o.centres_limite != null) {
      assert.ok(o.centres_inclus <= o.centres_limite,
        `${o.code} : ${o.centres_inclus} centres compris pour un plafond de ${o.centres_limite}`);
    }
  }
});

test("un dépassement possible a toujours un prix publié", () => {
  // Sans plafond dur, une équipe peut grandir sans fin : il faut savoir la
  // facturer. C'est la même contrainte qu'en base (`offres_prix_membre_requis`).
  for (const o of REFERENTIEL_OFFRES) {
    if (o.membres_limite == null) {
      assert.ok(o.prix_membre_supp_centimes != null,
        `${o.code} n'a pas de plafond de membres et pas de prix supplémentaire`);
    }
    if (o.centres_limite == null) {
      assert.ok(o.prix_centre_supp_centimes != null,
        `${o.code} n'a pas de plafond de centres et pas de prix supplémentaire`);
    }
  }
});

test("le domaine ne recopie aucun chiffre du référentiel", () => {
  // PLANS et OFFRES_SECTEURS sont dérivés : toute différence signifie qu'une
  // valeur a été réintroduite à la main quelque part.
  for (const p of PLANS) {
    const o = offreReferentiel(p.cle);
    assert.ok(o, `${p.cle} absent du référentiel`);
    assert.equal(p.prix_centimes, o.prix_base_centimes);
    assert.equal(p.membres_inclus, o.membres_inclus);
    assert.equal(p.membres_limite, o.membres_limite);
    assert.deepEqual([...p.modules], [...o.modules]);
    assert.equal(p.nom, o.libelle);
  }
  assert.equal(PLANS.length, paliersDemenageur().length);
  assert.equal(OFFRES_SECTEURS.length, offresSectorielles().length);
  for (const o of OFFRES_SECTEURS) {
    const r = offreReferentiel(o.cle);
    assert.equal(o.prix_centimes, r.prix_base_centimes);
    assert.equal(o.statut, r.statut);
    assert.equal(o.nom, r.libelle);
  }
});

test("offreSouscriptible répond pour TOUTE offre, palier ou secteur", () => {
  // Elle ne connaissait que les offres sectorielles : interrogée sur
  // « starter », elle répondait faux — l'offre principale du produit.
  assert.equal(offreSouscriptible("starter"), true);
  assert.equal(offreSouscriptible("pro"), true);
  assert.equal(offreSouscriptible("independant_manutention"), false);
  assert.equal(offreSouscriptible("logistique_mobilier"), false);
  assert.equal(offreSouscriptible("inexistant"), false);
});

test("chaque offre sectorielle a sa copie commerciale", () => {
  // Une offre publiée sans promesse s'afficherait vide sur la vitrine.
  for (const o of OFFRES_SECTEURS) {
    assert.ok(o.promesse, `${o.cle} sans promesse`);
    assert.ok(o.pour, `${o.cle} sans « pour qui »`);
    assert.ok((o.recurrents || []).length > 0, `${o.cle} sans récurrents`);
  }
});
