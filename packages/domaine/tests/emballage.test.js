// Tests — Matériel d'emballage (E/U/R). Nouvelle règle : util. = enl. − rep.
// Le chef compte ce qu'il rapporte (repris) ; l'utilisé se déduit. Le seul
// écart possible est de reprendre plus qu'on a sorti (saisie incohérente).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RACINE_APP = join(RACINE, "apps", "web", "src");
const RACINE_DOM = join(RACINE, "packages", "domaine", "src");

import {
  CATALOGUE_EMBALLAGE, resumeEmballage, fournituresOffre, valoriserEmballage,
} from "../src/stocks/emballage.js";
import { utiliseCalcule } from "../src/stocks/stock.js";

test("utiliseCalcule : util. = enl. − rep., jamais négatif", () => {
  assert.equal(utiliseCalcule(30, 10), 20);
  assert.equal(utiliseCalcule(5, 5), 0);
  assert.equal(utiliseCalcule(3, 10), 0, "reprendre plus que sorti ne donne pas un négatif");
  assert.equal(utiliseCalcule(0, 0), 0);
});

test("resumeEmballage : util. se déduit de enl. − rep.", () => {
  const r = resumeEmballage({ std: { e: 30, r: 10 } });
  const std = r.lignes.find((l) => l.cle === "std");
  assert.equal(std.u, 20, "20 utilisés = 30 sortis − 10 repris");
  assert.equal(std.coherent, true);
  assert.equal(std.ecart, 0);
  assert.equal(r.totalUtilise, 20);
});

test("resumeEmballage : tout repris → rien d'utilisé, cohérent", () => {
  const r = resumeEmballage({ std: { e: 30, r: 30 } });
  const std = r.lignes.find((l) => l.cle === "std");
  assert.equal(std.u, 0);
  assert.deepEqual(r.ecarts, []);
});

test("resumeEmballage : reprendre plus que sorti → écart signalé", () => {
  const r = resumeEmballage({ std: { e: 10, r: 15 } });
  assert.equal(r.ecarts.length, 1);
  assert.equal(r.ecarts[0].ecart, 5);
  assert.equal(r.ecarts[0].nom, "Carton standard");
});

test("resumeEmballage : rien de sorti → pas d'écart fantôme", () => {
  const r = resumeEmballage({});
  assert.deepEqual(r.ecarts, []);
  assert.equal(r.totalUtilise, 0);
  assert.equal(r.lignes.length, CATALOGUE_EMBALLAGE.length);
});

test("fournituresOffre : l'utilisé (déduit) alimente l'offre, pluriel accordé", () => {
  const f = fournituresOffre({
    std: { e: 30, r: 10 },     // 20 utilisés
    livre: { e: 5, r: 4 },     // 1 utilisé
    tape: { e: 3, r: 3 },      // 0 utilisé → absent
  });
  assert.deepEqual(f, ["20 cartons standard", "1 carton livre"]);
});

test("fournituresOffre : tout repris → liste vide", () => {
  assert.deepEqual(fournituresOffre({ std: { e: 10, r: 10 } }), []);
  assert.deepEqual(fournituresOffre(null), []);
});

test("valoriserEmballage : dénomination + coût + montant du consommé", () => {
  const fournitures = [
    { cle: "std", nom: "Carton standard", unite: "pièce", cout_centimes: 150 },
    { cle: "livre", nom: "Carton livre", unite: "pièce", cout_centimes: 180 },
  ];
  const r = valoriserEmballage({ std: { e: 30, r: 10 }, livre: { e: 5, r: 5 } }, fournitures);
  assert.equal(r.lignes.length, 1, "seul le consommé > 0 est valorisé");
  assert.equal(r.lignes[0].nom, "Carton standard");
  assert.equal(r.lignes[0].quantite, 20);
  assert.equal(r.lignes[0].cout_unitaire_centimes, 150);
  assert.equal(r.lignes[0].montant_centimes, 3000);
  assert.equal(r.total_centimes, 3000);
});

test("valoriserEmballage : article sans prix au catalogue → coût 0", () => {
  const r = valoriserEmballage({ x: { e: 4, r: 0 } }, []);
  assert.equal(r.lignes[0].quantite, 4);
  assert.equal(r.lignes[0].cout_unitaire_centimes, 0);
  assert.equal(r.total_centimes, 0);
});

/* ── Les fournitures NE SONT PAS sur le devis ni sur la facture (lot 34) ─── */

test("aucune ligne de fourniture n'entre dans les lignes de facture", () => {
  // DÉCISION DE RAPHAËL, redite deux fois : vendre un carton n'est pas prester
  // une manutention. Une facture de prestation n'est pas le document d'une
  // vente de biens ; les fournitures font l'objet d'une vente séparée.
  //
  // Elles y ont été poussées pendant un temps (`lignesFacturePour` appelait
  // `lignesFournitures`). Ce test verrouille le retrait.
  //
  // CE QUI CASSE SANS LUI : quelqu'un relit le commentaire « les fournitures
  // sont une vente distincte, on les pose en lignes propres » — qui décrivait
  // l'ancien état — et les rebranche de bonne foi. Le client reçoit alors une
  // facture de prestation contenant une vente de biens, valorisée au surplus à
  // son PRIX D'ACHAT.
  const src = readFileSync(
    join(RACINE_APP, "lib", "adaptateur.js"), "utf8");
  const debut = src.indexOf("export async function lignesFacturePour");
  assert.ok(debut > 0, "la fonction doit exister");
  // Les COMMENTAIRES sont retirés avant analyse : le commentaire qui explique
  // le retrait cite les noms des fonctions retirées, et un test qui lirait le
  // commentaire déclarerait une faute là où il y a une explication. C'est le
  // même durcissement qu'`imports-ecrans.test.js` a déjà subi.
  const corps = src.slice(debut, src.indexOf("\n}", debut))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.equal(corps.includes("lignesFournitures"), false,
    "lignesFacturePour ne doit plus appeler lignesFournitures");
  assert.equal(corps.includes("valoriserEmballage"), false,
    "ni valoriser l'emballage par un autre chemin");
});

test("lignesFournitures reste disponible, et dit qu'elle valorise au COÛT", () => {
  // On la CONSERVE : elle porte la qualification correcte (vente_biens) et la
  // dénomination ligne à ligne — c'est la brique du futur document de vente.
  // Mais elle valorise au `cout_centimes` du catalogue, pas au prix client.
  // Les prix client des cartons existent (écran Barème, section « Matériel
  // facturé ») et ne sont lus par personne : la rebrancher telle quelle ferait
  // facturer les fournitures à leur prix d'achat.
  const src = readFileSync(
    join(RACINE_DOM, "releve", "rubriques-offre.js"), "utf8");
  assert.match(src, /N'ALIMENTE NI LE DEVIS NI LA FACTURE/,
    "l'avertissement doit rester en tête de la fonction");
  assert.match(src, /COÛT/,
    "le défaut de valorisation doit être écrit, pas seulement connu");
});

/* ── Source unique : coût ET prix client sur le même article (31/08/2026) ─── */

import { valoriserVenteEmballage } from "../src/stocks/emballage.js";
import { normaliserArticle } from "../src/stocks/catalogues.js";

test("un article de fourniture porte coût, prix client ET TVA", () => {
  const a = normaliserArticle({ nom: "Carton", cout_centimes: 150,
    prix_client_centimes: 250, tva_pct: 6 });
  assert.equal(a.cout_centimes, 150);
  assert.equal(a.prix_client_centimes, 250);
  assert.equal(a.tva_pct, 6);
});

test("prix client absent → 0 (à saisir), TVA absente → 21 par défaut", () => {
  const a = normaliserArticle({ nom: "X", cout_centimes: 100 });
  assert.equal(a.prix_client_centimes, 0);
  assert.equal(a.tva_pct, 21);
});

test("coût et prix client valorisent les MÊMES quantités, différemment", () => {
  const four = [{ cle: "carton", nom: "Carton", unite: "pièce",
    cout_centimes: 150, prix_client_centimes: 250, tva_pct: 21 }];
  const emb = { carton: { e: 10, r: 2 } };          // 8 utilisés
  const cout = valoriserEmballage(emb, four).total_centimes;
  const vente = valoriserVenteEmballage(emb, four).total_centimes;
  assert.equal(cout, 1200);      // 8 × 150 (coût org)
  assert.equal(vente, 2000);     // 8 × 250 (prix client)
  // La marge est la différence — jamais mélangée.
  assert.equal(vente - cout, 800);
});

test("la valorisation client porte le taux de TVA de chaque article", () => {
  const four = [{ cle: "c", nom: "C", prix_client_centimes: 250, tva_pct: 6 }];
  const l = valoriserVenteEmballage({ c: { e: 4, r: 0 } }, four).lignes[0];
  assert.equal(l.tva_pct, 6);
  assert.equal(l.prix_unitaire_centimes, 250);
});

/* ── Le maillon Matériel → Facture : conso → lignes de facture ───────────── */

import { fournituresAFacturer } from "../src/stocks/emballage.js";

test("les fournitures consommées deviennent des lignes de facture au prix client", () => {
  const four = [
    { cle: "carton", nom: "Carton standard", unite: "pièce", cout_centimes: 150, prix_client_centimes: 250, tva_pct: 21 },
    { cle: "bulle", nom: "Papier bulle", unite: "rouleau", cout_centimes: 1200, prix_client_centimes: 1900, tva_pct: 6 },
  ];
  const emb = { carton: { e: 10, r: 2 }, bulle: { e: 1, r: 0 } };  // 8 cartons, 1 bulle
  const lignes = fournituresAFacturer(emb, four);
  assert.equal(lignes.length, 2);
  const carton = lignes.find((l) => l.libelle === "Carton standard");
  assert.equal(carton.type, "fourniture");
  assert.equal(carton.quantite, 8);
  assert.equal(carton.prix_unitaire_centimes, 250);        // PRIX CLIENT, pas coût
  assert.equal(carton.montant_htva_centimes, 2000);
  // Chaque ligne garde son taux (la bulle à 6 %).
  assert.equal(lignes.find((l) => l.libelle === "Papier bulle").tva_pct, 6);
});

test("rien de consommé → aucune ligne (on ne facture pas du vide)", () => {
  const four = [{ cle: "carton", nom: "Carton", prix_client_centimes: 250, tva_pct: 21 }];
  assert.equal(fournituresAFacturer({}, four).length, 0);
  assert.equal(fournituresAFacturer({ carton: { e: 5, r: 5 } }, four).length, 0); // tout rendu
});

/* ── Concordance : Matériel, Estimation, Calcul définitif, Facture ────────── */

test("les quatre stades lisent la MÊME valeur de fournitures (concordance)", () => {
  // Une seule source : valoriserVenteEmballage(emballage, catalogue). Estimation
  // et Calcul définitif affichent son total ; la Facture facture ses lignes.
  const four = [
    { cle: "carton", nom: "Carton", unite: "pièce", cout_centimes: 150, prix_client_centimes: 250, tva_pct: 21 },
    { cle: "bulle", nom: "Bulle", unite: "rouleau", cout_centimes: 1200, prix_client_centimes: 1900, tva_pct: 21 },
  ];
  const emb = { carton: { e: 10, r: 2 }, bulle: { e: 1, r: 0 } };  // 8 cartons + 1 bulle

  // Ce que voient Estimation et Calcul définitif :
  const montantAffiche = valoriserVenteEmballage(emb, four).total_centimes;
  // Ce que facture la Facture (somme des lignes) :
  const montantFacture = fournituresAFacturer(emb, four)
    .reduce((s, l) => s + l.montant_htva_centimes, 0);

  assert.equal(montantAffiche, 2000 + 1900);       // 8×250 + 1×1900
  assert.equal(montantFacture, montantAffiche);     // ils CONCORDENT
});
