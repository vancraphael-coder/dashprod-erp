// Tests — Relevé volumétrique : calcul de volume et suggestion de composition.
// Critique : le volume nourrit la suggestion d'équipe/camions et la crédibilité
// du chiffrage. Aligné sur la table VOL validée (roovers-mobile.jsx).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  volumeUnitaire, volumeTotal, suggererComposition, grouperParPiece, PIECES, articlesADemonter,
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

test("articlesADemonter ne retient que les articles marqués", () => {
  const inv = [
    { nom: "Armoire 3p", quantite: 1, demont: true },
    { nom: "Canapé 3pl", quantite: 1 },
    { nom: "Lit 160", quantite: 2, demont: true },
  ];
  assert.deepEqual(articlesADemonter(inv), [
    { nom: "Armoire 3p", quantite: 1 },
    { nom: "Lit 160", quantite: 2 },
  ]);
});

test("articlesADemonter tolère un inventaire vide ou absent", () => {
  assert.deepEqual(articlesADemonter([]), []);
  assert.deepEqual(articlesADemonter(undefined), []);
});

// — Démontage et remontage : deux réalités distinctes (LOT 2) —
import { articlesARemonter, articlesAvecRemarque }
  from "../src/releve/volumetrie.js";

test("démonter et remonter sont indépendants", () => {
  const inv = [
    { nom: "Armoire", quantite: 1, demont: true, remont: true },
    // Part au garde-meuble : démontée, jamais remontée.
    { nom: "Bibliothèque", quantite: 1, demont: true },
    // Livrée en pièces détachées : remontée sans avoir été démontée.
    { nom: "Lit neuf", quantite: 1, remont: true },
    { nom: "Table basse", quantite: 1 },
  ];
  assert.deepEqual(articlesADemonter(inv).map((x) => x.nom),
                   ["Armoire", "Bibliothèque"]);
  assert.deepEqual(articlesARemonter(inv).map((x) => x.nom),
                   ["Armoire", "Lit neuf"]);
});

test("un inventaire vide ou absent ne casse rien", () => {
  assert.deepEqual(articlesARemonter([]), []);
  assert.deepEqual(articlesARemonter(null), []);
  assert.deepEqual(articlesAvecRemarque(undefined), []);
});

test("les remarques du métreur remontent, nettoyées", () => {
  const inv = [
    { nom: "Piano", piece: "Salon", remarque: "  Accès par la fenêtre  " },
    { nom: "Canapé", piece: "Salon", remarque: "   " },
    { nom: "Table", piece: "Cuisine" },
  ];
  const r = articlesAvecRemarque(inv);
  assert.equal(r.length, 1, "une remarque vide n'en est pas une");
  assert.equal(r[0].remarque, "Accès par la fenêtre");
  assert.equal(r[0].piece, "Salon");
});

test("la quantité par défaut vaut 1", () => {
  assert.equal(articlesARemonter([{ nom: "X", remont: true }])[0].quantite, 1);
});

/* ── Quantité ZÉRO : un zéro voulu n'est pas une absence ────────────────── */

test("un article à quantité 0 ne compte pas de volume", () => {
  // Trouvé à la visite de la mécanique. `it.quantite || 1` traitait 0 comme
  // une absence : un métreur qui met 0 pour retirer un meuble du calcul
  // GONFLAIT silencieusement le volume, donc le prix. Même famille que le
  // `Number(null) === 0` qui avait mis la TVA à zéro en production.
  assert.equal(volumeTotal([{ nom: "Canapé 3 places", quantite: 0 }]), 0,
    "quantité 0 = pas de volume");
  // Une quantité absente, elle, vaut bien 1 (l'article est là, non compté).
  assert.equal(volumeTotal([{ nom: "Canapé 3 places" }]),
    volumeUnitaire("Canapé 3 places"),
    "quantité absente = 1 article");
  assert.equal(volumeTotal([{ nom: "Canapé 3 places", quantite: 2 }]),
    volumeUnitaire("Canapé 3 places") * 2);
});

test("un article à quantité 0 ne figure pas dans les listes à démonter", () => {
  // Même raison : une ligne à zéro n'est pas un meuble à démonter.
  const liste = articlesADemonter([
    { nom: "Armoire", quantite: 0, demonter: true },
    { nom: "Lit", quantite: 1, demonter: true },
  ]);
  assert.equal(liste.some((x) => x.nom === "Armoire"), false,
    "une ligne à zéro ne part pas au chantier");
});
