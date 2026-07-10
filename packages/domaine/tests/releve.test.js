// Tests — Relevé volumétrique : calcul de volume et suggestion de composition.
// Critique : le volume nourrit la suggestion d'équipe/camions et la crédibilité
// du chiffrage. Aligné sur la table VOL validée (roovers-mobile.jsx).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  volumeUnitaire, volumeTotal, suggererComposition, grouperParPiece, PIECES,
} from "../src/releve/volumetrie.js";

test("volumeUnitaire résout les volumes de référence", () => {
  assert.equal(volumeUnitaire("piano"), 1.5);
  assert.equal(volumeUnitaire("Frigo"), 0.6);       // insensible à la casse
  assert.equal(volumeUnitaire("canapé 3pl"), 1.2);  // préfixe → "canapé 3"
  assert.equal(volumeUnitaire("objet inconnu"), 0.3); // défaut
});

test("volumeUnitaire choisit le préfixe le plus spécifique", () => {
  // "armoire 2 portes" doit matcher "armoire 2" (1.2), pas "armoire" (1.4)
  assert.equal(volumeUnitaire("armoire 2 portes"), 1.2);
});

test("volumeTotal somme quantités et volumes", () => {
  const inv = [
    { nom: "Piano", quantite: 1 },        // 1.5
    { nom: "Canapé 3pl", quantite: 1 },   // 1.2
    { nom: "Chaise", quantite: 4 },       // 4 × 0.15 = 0.6
  ];
  assert.equal(volumeTotal(inv), 3.3);
});

test("volumeTotal : un volume explicite prime sur la référence", () => {
  // Piano démonté/spécial ajusté à 2.0 à la main
  assert.equal(volumeTotal([{ nom: "Piano", quantite: 1, vol: 2.0 }]), 2.0);
});

test("suggererComposition dérive camions et déménageurs du volume", () => {
  // 20 m³ → 2 camions (ceil 20/12), 3 déménageurs (ceil 20/8, borné)
  assert.deepEqual(suggererComposition(20), { camions: 2, demenageurs: 3 });
});

test("suggererComposition respecte les bornes (min 2 dém., min 1 camion)", () => {
  assert.deepEqual(suggererComposition(3), { camions: 1, demenageurs: 2 });
  // gros volume borné à 6 déménageurs
  assert.equal(suggererComposition(100).demenageurs, 6);
});

test("grouperParPiece regroupe et sous-totalise", () => {
  const inv = [
    { nom: "Canapé 3pl", piece: "Salon", quantite: 1 },
    { nom: "TV", piece: "Salon", quantite: 1 },
    { nom: "Lit 160", piece: "Chambre", quantite: 1 },
  ];
  const g = grouperParPiece(inv);
  const salon = g.find((x) => x.piece === "Salon");
  assert.equal(salon.articles.length, 2);
  assert.equal(salon.volume, 1.4); // 1.2 + 0.2
});

test("le catalogue de pièces est stable", () => {
  assert.ok(PIECES.includes("Salon"));
  assert.ok(PIECES.includes("Cave/Garage"));
  assert.equal(PIECES.length, 7);
});
