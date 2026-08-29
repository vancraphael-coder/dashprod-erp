// =============================================================================
// LES PHOTOS DE CONSTAT — validation pure (type, taille, nombre).
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  typeImageAccepte, photoValide, placePourPhotos, trierPhotos,
  MAX_PHOTOS_CONSTAT, TAILLE_MAX_PHOTO,
} from "../src/operations/photos-constat.js";

test("seules les images sont acceptées", () => {
  assert.equal(typeImageAccepte("image/jpeg"), true);
  assert.equal(typeImageAccepte("IMAGE/PNG"), true, "tolère la casse");
  assert.equal(typeImageAccepte("application/pdf"), false);
  assert.equal(typeImageAccepte(""), false);
  assert.equal(typeImageAccepte(null), false);
});

test("une photo valide passe ; trop lourde ou vide échoue", () => {
  assert.equal(photoValide({ type: "image/jpeg", size: 2_000_000 }).ok, true);
  assert.equal(photoValide({ type: "image/png", size: TAILLE_MAX_PHOTO + 1 }).ok, false);
  assert.equal(photoValide({ type: "image/jpeg", size: 0 }).ok, false);
  assert.equal(photoValide({ type: "text/plain", size: 10 }).ok, false);
});

test("la limite de 6 photos par constat est tenue", () => {
  assert.equal(MAX_PHOTOS_CONSTAT, 6);
  // 4 déjà là, on en propose 4 → on en accepte 2, on en refuse 2.
  const p = placePourPhotos(4, 4);
  assert.equal(p.accepte, 2);
  assert.equal(p.refuse, 2);
  assert.match(p.message, /maximum/);
  // Rien de plus si c'est déjà plein.
  assert.equal(placePourPhotos(6, 3).accepte, 0);
  // De la place : tout passe.
  assert.equal(placePourPhotos(1, 2).message, null);
});

test("trierPhotos garde les valides, écarte le reste, respecte la limite", () => {
  const fichiers = [
    { name: "a.jpg", type: "image/jpeg", size: 1000 },
    { name: "b.pdf", type: "application/pdf", size: 1000 },   // rejeté (type)
    { name: "c.png", type: "image/png", size: 1000 },
    { name: "d.jpg", type: "image/jpeg", size: TAILLE_MAX_PHOTO + 1 }, // rejeté (taille)
  ];
  const r = trierPhotos(fichiers, 0);
  assert.deepEqual(r.retenues.map((f) => f.name), ["a.jpg", "c.png"]);
  assert.equal(r.rejets.length, 2);
});

test("trierPhotos borne à la place restante", () => {
  const fichiers = Array.from({ length: 5 }, (_, i) =>
    ({ name: `p${i}.jpg`, type: "image/jpeg", size: 1000 }));
  const r = trierPhotos(fichiers, 4);   // 4 déjà là → 2 places restantes
  assert.equal(r.retenues.length, 2);
  assert.match(r.message, /maximum/);
});

/* ── Affichable partout vs à convertir (le bug HEIC du 29/08) ────────────── */

import { typeAConvertir, TYPES_AFFICHABLES } from "../src/operations/photos-constat.js";

test("le HEIC est reconnu comme À CONVERTIR, pas affichable tel quel", () => {
  // LE bug réel : un HEIC stocké tel quel reste blanc sur Chrome/Android.
  assert.equal(typeAConvertir("image/heic"), true);
  assert.equal(typeAConvertir("image/heif"), true);
  assert.equal(typeAConvertir("IMAGE/HEIC"), true, "tolère la casse");
  // JPEG/PNG/WebP : affichables, rien à convertir.
  assert.equal(typeAConvertir("image/jpeg"), false);
  assert.equal(typeAConvertir("image/png"), false);
  assert.equal(typeAConvertir("image/webp"), false);
});

test("les formats affichables partout sont bien JPEG/PNG/WebP", () => {
  assert.deepEqual([...TYPES_AFFICHABLES], ["image/jpeg", "image/png", "image/webp"]);
  // Le HEIC n'y est PAS — c'est tout l'enjeu.
  assert.equal(TYPES_AFFICHABLES.includes("image/heic"), false);
});
