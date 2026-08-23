// =============================================================================
// LES CARTES MÉTIER — le catalogue, l'effectif vendu, et le tri.
//
// Trois sujets, un seul fichier, parce qu'ils tiennent au même défaut : la
// carte d'une mission ne savait pas ce qu'on avait VENDU. Elle comparait
// l'équipe à une constante du code et triait les gens dans l'ordre de la base.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  CARTES_METIER, carteMetier, cartesDeNature, cartePrincipale,
  effectifAttendu, origineEffectif, trierMembres, trierVehicules,
} from "../src/metiers/cartes.js";
import {
  EXIGENCES, exigence, effectifRequis, etatAffectation, resumeEffectif,
} from "../src/planning/affectation.js";
import { NATURES } from "../src/commercial/natures.js";

/* ── Le catalogue ────────────────────────────────────────────────────────── */

test("chaque carte est complète : sans quoi elle s'affiche muette", () => {
  for (const c of CARTES_METIER) {
    assert.ok(c.cle && c.titre && c.role, `carte incomplète : ${c.cle}`);
    assert.ok(Array.isArray(c.natures) && c.natures.length > 0,
      `${c.cle} n'est rattachée à aucune nature — elle n'apparaîtrait nulle part`);
    assert.ok(c.effectif?.plancher >= 1, `${c.cle} : plancher d'effectif absent`);
    assert.ok(c.vehicule?.besoin, `${c.cle} : besoin de véhicule non dit`);
    assert.ok(c.note, `${c.cle} : la règle du métier doit être dite à l'écran`);
  }
});

test("toute nature qui passe par le planning a une carte principale", () => {
  // CE QUI CASSE SANS CE TEST : une nature ajoutée à `NATURES` avec
  // `planning: true` mais oubliée dans le catalogue donne un dossier SANS
  // aucune carte de date. Le travail est vendu et rien ne peut être planifié —
  // et ça ne se voit qu'en ouvrant un dossier de cette nature.
  for (const n of NATURES) {
    if (!n.etapes?.planning) continue;
    assert.ok(cartePrincipale(n.cle),
      `la nature « ${n.cle} » passe par le planning mais n'a pas de carte principale`);
  }
});

test("une nature n'a jamais DEUX cartes principales", () => {
  // Deux travaux « principaux » sur un dossier, c'est deux prix et deux
  // équipes pour une seule vente.
  for (const n of NATURES) {
    const principales = cartesDeNature(n.cle).filter((c) => c.role === "principale");
    assert.ok(principales.length <= 1,
      `${n.cle} : ${principales.length} cartes principales`);
  }
});

test("les cartes sortent dans l'ordre du parcours réel", () => {
  // Le travail vendu d'abord, l'optionnel ensuite. L'inverse ferait commencer
  // un dossier par une visite facultative.
  const cles = cartesDeNature("demenagement").map((c) => c.cle);
  assert.equal(cles[0], "demenagement");
  assert.deepEqual(cles, ["demenagement", "visite", "emballage"]);
});

test("un lift n'a ni visite ni emballage", () => {
  // La règle « un lift n'a pas de relevé » vivait dans `natures.js`. Elle doit
  // tenir ici aussi, sinon le dossier d'un lift proposerait d'emballer.
  assert.deepEqual(cartesDeNature("lift").map((c) => c.cle), ["lift"]);
  assert.deepEqual(cartesDeNature("sous_traitance").map((c) => c.cle), ["sous_traitance"]);
});

test("une nature de location n'a aucune carte : elle ne passe pas au planning", () => {
  for (const cle of ["boxe", "zone"]) {
    assert.deepEqual(cartesDeNature(cle), []);
  }
});

test("carteMetier rend null plutôt que d'inventer un défaut", () => {
  // Un repli silencieux sur « déménagement » ferait exiger un camion pour un
  // métier futur qui n'en a pas besoin.
  assert.equal(carteMetier("archivage_2027"), null);
});

/* ── EXIGENCES dérivé, plus recopié ──────────────────────────────────────── */

test("EXIGENCES découle du catalogue — une seule liste, plus trois", () => {
  // CE QUI CASSE SANS CE TEST : la table revient écrite à la main, et un
  // métier ajouté au catalogue s'affiche sans exigence — carte visible,
  // verdict muet.
  for (const c of CARTES_METIER) {
    const e = exigence(c.cle);
    assert.equal(e.titre, c.titre, `${c.cle} : titre désaccordé`);
    assert.equal(e.membres_min, c.effectif.plancher);
    assert.equal(e.vehicule, c.vehicule.besoin);
    assert.equal(e.categorie, c.vehicule.categorie);
    assert.equal(e.note, c.note);
  }
  assert.equal(Object.keys(EXIGENCES).length, CARTES_METIER.length);
});

/* ── L'effectif VENDU — le cœur du lot ───────────────────────────────────── */

test("le dénominateur suit le devis, pas une constante du code", () => {
  // LE DÉFAUT CORRIGÉ : `membres_min` valait 2 en dur, pendant que le prix
  // venait de BAREME_HORAIRE[nbDemenageurs] (2 à 6). Un dossier vendu à quatre
  // déménageurs passait au vert à deux — sous-staffé ET sous-facturé, sans
  // qu'aucun écran ne le dise.
  const carte = carteMetier("demenagement");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4 }), 4);
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 6 }), 6);
  assert.equal(origineEffectif(carte, { nbDemenageurs: 4 }), "devis");
});

test("sans devis, le plancher du métier rattrape — jamais zéro", () => {
  // `Number(null) === 0` déclarerait « aucune personne attendue » et rendrait
  // toute carte verte à vide. C'est le piège de coercition rencontré six fois
  // dans ce dépôt ; il est ici verrouillé.
  const carte = carteMetier("demenagement");
  for (const chiffrage of [{}, { nbDemenageurs: null }, { nbDemenageurs: 0 },
                           { nbDemenageurs: undefined }, { nbDemenageurs: "" },
                           { nbDemenageurs: NaN }]) {
    assert.equal(effectifAttendu(carte, chiffrage), 2,
      `repli manqué pour ${JSON.stringify(chiffrage)}`);
    assert.equal(origineEffectif(carte, chiffrage), "métier");
  }
});

test("un devis SOUS le plancher du métier ne fait pas descendre la carte", () => {
  // Un déménagement chiffré à une personne est un devis à revoir, pas une
  // consigne de terrain. Le plancher gagne, et l'origine le dit.
  const carte = carteMetier("demenagement");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 1 }), 2);
  assert.equal(origineEffectif(carte, { nbDemenageurs: 1 }), "métier");
});

test("une visite reste à une personne, quel que soit le devis", () => {
  // Son effectif ne vient pas du chiffrage : quatre déménageurs vendus ne font
  // pas passer quatre personnes estimer.
  const carte = carteMetier("visite");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4 }), 1);
  assert.equal(origineEffectif(carte, { nbDemenageurs: 4 }), "métier");
});

test("l'emballage a son propre effectif, distinct du déménagement", () => {
  // Un emballage se fait souvent à deux quand le camion part à quatre.
  const carte = carteMetier("emballage");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4, nbEmballeurs: 2 }), 2);
  // Sans effectif d'emballage propre, on ne reprend PAS celui du déménagement.
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4 }), 1);
});

test("le verdict d'affectation dit le nombre attendu ET son origine", () => {
  // « 4 attendus » sans motif passe pour une règle du logiciel, et on
  // corrigerait la carte au lieu du devis.
  const flotte = [{ id: "v1", categorie: "camion" }];
  const v = etatAffectation("demenagement",
    { membres: ["a", "b"], vehicules: ["v1"] }, flotte, { nbDemenageurs: 4 });
  assert.equal(v.etat, "partiel");
  assert.match(v.manques[0], /4 personnes attendues/);
  assert.match(v.manques[0], /effectif du devis/);
});

test("une équipe au complet selon le devis passe au vert", () => {
  const flotte = [{ id: "v1", categorie: "camion" }];
  const v = etatAffectation("demenagement",
    { membres: ["a", "b", "c", "d"], vehicules: ["v1"] }, flotte,
    { nbDemenageurs: 4 });
  assert.equal(v.etat, "complet");
  assert.deepEqual(v.manques, []);
});

test("resumeEffectif rend la fraction lisible d'un coup d'œil", () => {
  assert.equal(
    resumeEffectif({ membres: ["a", "b"], vehicules: ["v"] }, "demenagement",
      { nbDemenageurs: 4 }),
    "2 membres / 4 · 1 véhicule");
  assert.equal(resumeEffectif({ membres: [] }, "visite", {}), "0 membre / 1");
});

test("effectifRequis reste utilisable sans chiffrage du tout", () => {
  // Les appelants d'avant ce lot n'en passent pas : ils doivent continuer de
  // fonctionner, sur le plancher.
  assert.deepEqual(effectifRequis("demenagement"), { nombre: 2, origine: "métier" });
});

/* ── Le tri des catalogues ───────────────────────────────────────────────── */

const GENS = [
  { id: "3", nom: "Zoé" }, { id: "1", nom: "émile" },
  { id: "2", nom: "Ana" }, { id: "4", nom: "Bob" },
];

test("les membres sortent dans un ordre STABLE, accents ignorés", () => {
  // CE QUI CASSE SANS CE TEST : `listerMembresSimples()` n'a aucun `order by`.
  // PostgREST rend alors les lignes dans l'ordre physique de la table — qui
  // change après une mise à jour. On coche une équipe en visant une position
  // mémorisée : un jeton qui bouge se coche à la place d'un autre, et l'erreur
  // ne se voit qu'au départ du camion.
  assert.deepEqual(trierMembres(GENS).map((m) => m.nom),
    ["Ana", "Bob", "émile", "Zoé"]);
  // Deux appels sur la même entrée rendent le même ordre.
  assert.deepEqual(trierMembres(GENS).map((m) => m.id),
    trierMembres(GENS).map((m) => m.id));
});

test("le tri ne modifie pas la liste reçue", () => {
  // Trier en place réordonnerait la liste du parent et ferait sauter les
  // jetons pendant qu'on clique.
  const avant = GENS.map((m) => m.id);
  trierMembres(GENS);
  assert.deepEqual(GENS.map((m) => m.id), avant);
});

test("les affectés remontent, les indisponibles descendent sans disparaître", () => {
  // On relit les affectés pour VÉRIFIER, pas pour les chercher. Et un
  // indisponible reste proposé : on signale, on n'interdit pas — le bureau
  // peut passer outre un congé.
  const r = trierMembres(GENS, {
    affectes: ["3"], estIndisponible: (id) => id === "2",
  });
  assert.equal(r[0].nom, "Zoé", "l'affecté est en tête");
  assert.equal(r[r.length - 1].nom, "Ana", "l'indisponible est en queue");
  assert.equal(r.length, GENS.length, "personne n'est retiré de la liste");
});

test("les véhicules se groupent par catégorie, chiffres lus comme des nombres", () => {
  // « Camion 10 » après « Camion 2 » : un tri texte les inverserait.
  const flotte = [
    { id: "a", nom: "Camion 10", categorie: "camion" },
    { id: "b", nom: "Camion 2", categorie: "camion" },
    { id: "c", nom: "Lift B", categorie: "lift" },
  ];
  assert.deepEqual(trierVehicules(flotte).map((v) => v.nom),
    ["Lift B", "Camion 2", "Camion 10"]);
});

test("les listes vides et les entrées bancales ne font pas tomber le tri", () => {
  // Un écran ne doit pas blanchir parce qu'un membre n'a pas de nom.
  assert.deepEqual(trierMembres(), []);
  assert.deepEqual(trierVehicules(null), []);
  assert.equal(trierMembres([{ id: "x" }, { id: "y", nom: "A" }]).length, 2);
});
