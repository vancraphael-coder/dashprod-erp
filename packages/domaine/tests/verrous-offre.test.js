// =============================================================================
// LE GÉNÉRATEUR DE VERROUS REPRODUIT CE QUI TOURNE DÉJÀ.
//
// POURQUOI CE TEST EST LE PLUS IMPORTANT DU LOT. Le verrou d'offre est le seul
// endroit de Dashprod où une faute d'inattention produit une FUITE
// SILENCIEUSE plutôt qu'un test rouge : une condition oubliée dans une
// politique RLS n'échoue pas, elle OUVRE.
//
// À dix secteurs, ce seront plus de cent politiques. On ne peut pas les écrire
// à la main. Mais on ne peut pas non plus faire confiance à un générateur
// parce qu'il est bien écrit — il faut qu'il REPRODUISE les douze politiques
// qui tournent en production aujourd'hui.
//
// Le relevé ci-dessous est copié de `pg_policies` le 14/09/2026. Si le
// générateur cesse de le reproduire, l'arbre casse et personne ne génère cent
// politiques sur un modèle qui a dérivé.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  VERROUS_OFFRE, FORMES, conditionSql, verrouSql, verrousDuModule,
  modulesVerrouilles, incoherences,
} from "../src/produit/verrous-offre.js";

/**
 * Relevé de `pg_policies` en production, 14/09/2026. Format normalisé par
 * PostgreSQL (parenthèses ajoutées, casts `::text` explicités) — on compare
 * donc les COMPOSANTS, pas le texte brut.
 */
const EN_BASE = [
  ["centres_logistiques", "centres_org", "SELECT",
   "((org_id = jwt_org()) AND peut_voir_centre(id) AND org_a_module('multi_depots'::text))"],
  ["donnees_paie", "paie_capacite", "SELECT",
   "((org_id = jwt_org()) AND acteur_a_capacite('voir_paie'::text) AND org_a_module('paie'::text))"],
  ["donnees_paie", "paie_ecriture", "ALL",
   "((org_id = jwt_org()) AND acteur_a_capacite('voir_paie'::text) AND org_a_module('paie'::text))"],
  ["paie_periodes", "paie_periodes_ecriture", "ALL",
   "((org_id = jwt_org()) AND acteur_a_capacite('voir_paie'::text) AND org_a_module('paie'::text))"],
  ["paie_periodes", "paie_periodes_lecture", "SELECT",
   "((org_id = jwt_org()) AND acteur_a_capacite('voir_paie'::text) AND org_a_module('paie'::text))"],
  ["stock_boxes", "stock_boxes_org", "SELECT",
   "((org_id = jwt_org()) AND peut_voir_centre(centre_id) AND org_a_module('stockage_3d'::text))"],
  ["stock_contrat_lignes", "stock_lignes_org", "SELECT",
   "((EXISTS ( SELECT 1 FROM stock_contrats c WHERE ((c.id = stock_contrat_lignes.contrat_id) AND (c.org_id = jwt_org()) AND peut_voir_centre(c.centre_id)))) AND org_a_module('stockage_3d'::text))"],
  ["stock_contrats", "stock_contrats_org", "SELECT",
   "((org_id = jwt_org()) AND peut_voir_centre(centre_id) AND org_a_module('stockage_3d'::text))"],
  ["stock_echeances", "stock_echeances_tenant", "ALL",
   "((org_id = jwt_org()) AND org_a_module('stockage_3d'::text))"],
  ["stock_zones", "stock_zones_org", "SELECT",
   "((org_id = jwt_org()) AND peut_voir_centre(centre_id) AND org_a_module('stockage_3d'::text))"],
  ["transmissions", "transmissions_ecriture", "ALL",
   "((org_id = jwt_org()) AND acteur_a_capacite('emettre_facture'::text) AND org_a_module('peppol'::text))"],
  ["transmissions", "transmissions_lecture", "SELECT",
   "((org_id = jwt_org()) AND org_a_module('peppol'::text))"],
];

test("aucune incohérence de déclaration", () => {
  // Un verrou mal déclaré ne se voit pas à l'exécution : il ouvre.
  assert.deepEqual(incoherences(), []);
});

test("FIDÉLITÉ — la déclaration couvre exactement les politiques en base", () => {
  const declares = VERROUS_OFFRE
    .map((v) => `${v.table}|${v.politique}|${v.cmd}`)
    .sort();
  const enBase = EN_BASE.map(([t, p, c]) => `${t}|${p}|${c}`).sort();
  assert.deepEqual(declares, enBase,
    "la déclaration et la base ne portent plus les mêmes verrous");
});

test("FIDÉLITÉ — chaque condition générée porte les mêmes composants", () => {
  // On compare les COMPOSANTS et non le texte : PostgreSQL normalise le sien
  // (parenthèses, casts `::text`). Ce qui doit correspondre, c'est le sens.
  for (const [table, politique, , qual] of EN_BASE) {
    const v = VERROUS_OFFRE.find(
      (x) => x.table === table && x.politique === politique);
    assert.ok(v, `${table}.${politique} absent de la déclaration`);
    const genere = conditionSql(v);

    // Le module, toujours.
    assert.ok(qual.includes(`org_a_module('${v.module}'`),
      `${politique} : module ${v.module} absent du relevé`);
    assert.ok(genere.includes(`org_a_module('${v.module}')`),
      `${politique} : module absent du généré`);

    // Le cloisonnement, sous une forme ou l'autre.
    assert.ok(qual.includes("org_id = jwt_org()"),
      `${politique} : cloisonnement absent du relevé`);
    assert.ok(genere.includes("org_id = jwt_org()"),
      `${politique} : cloisonnement absent du généré`);

    // La capacité, si le relevé en porte une.
    const capBase = qual.match(/acteur_a_capacite\('([a-z_]+)'/);
    if (capBase) {
      assert.equal(v.capacite, capBase[1],
        `${politique} : capacité déclarée ≠ base`);
      assert.ok(genere.includes(`acteur_a_capacite('${capBase[1]}')`));
    } else {
      assert.ok(!genere.includes("acteur_a_capacite"),
        `${politique} : capacité générée alors que la base n'en a pas`);
    }

    // Le périmètre de centre, si le relevé en porte un.
    const centreBase = qual.match(/peut_voir_centre\(([a-z_.]+)\)/);
    if (centreBase) {
      assert.ok(genere.includes("peut_voir_centre("),
        `${politique} : périmètre de centre absent du généré`);
    } else {
      assert.ok(!genere.includes("peut_voir_centre"),
        `${politique} : périmètre de centre généré alors que la base n'en a pas`);
    }

    // La forme « parent » et elle seule s'appuie sur un EXISTS.
    assert.equal(qual.includes("EXISTS"), v.forme === "parent",
      `${politique} : forme parent et EXISTS ne concordent pas`);
  }
});

test("une politique ALL porte TOUJOURS un `with check`", () => {
  // Un `using` sans `with check` ne filtre que la lecture des lignes
  // existantes : l'écriture reste libre. L'oubli est classique et silencieux.
  for (const v of VERROUS_OFFRE) {
    const sql = verrouSql(v);
    if (v.cmd === "ALL") {
      assert.match(sql, /with check \(/,
        `${v.politique} est ALL sans with check`);
      // Et la condition d'écriture est la MÊME que celle de lecture : une
      // écriture plus permissive que la lecture permettrait d'écrire des
      // lignes qu'on ne pourrait pas relire.
      const c = conditionSql(v);
      assert.equal(sql.split(c).length - 1, 2,
        `${v.politique} : using et with check diffèrent`);
    } else {
      assert.ok(!sql.includes("with check"));
    }
  }
});

test("on REMPLACE une politique, on ne l'ajoute jamais", () => {
  // En RLS, deux politiques permissives sur la même commande s'additionnent
  // par OU. Ajouter sans remplacer OUVRIRAIT au lieu de fermer — c'est la
  // faute la plus coûteuse possible ici.
  for (const v of VERROUS_OFFRE) {
    assert.match(verrouSql(v),
      new RegExp(`^drop policy if exists ${v.politique} on public\\.${v.table};`),
      `${v.politique} ne commence pas par un drop`);
  }
});

test("les modules verrouillés sont ceux qui ferment des tables", () => {
  assert.deepEqual(modulesVerrouilles(),
    ["multi_depots", "paie", "peppol", "stockage_3d"]);
  assert.equal(verrousDuModule("stockage_3d").length, 5);
  assert.equal(verrousDuModule("paie").length, 4);
  // Un module inconnu ne rend rien, il ne lève pas : ajouter un module sans
  // verrou est un choix (tous n'ont pas de table à eux), pas une erreur.
  assert.deepEqual(verrousDuModule("crm"), []);
});

test("les quatre formes sont fermées", () => {
  // Une cinquième forme doit être discutée, pas glissée. C'est la régularité
  // des formes qui rend la génération possible.
  assert.deepEqual([...FORMES], ["tenant", "capacite", "centre", "parent"]);
  for (const v of VERROUS_OFFRE) assert.ok(FORMES.includes(v.forme));
  assert.throws(() => conditionSql({ forme: "bricolage", module: "x" }),
    /forme de verrou inconnue/);
});
