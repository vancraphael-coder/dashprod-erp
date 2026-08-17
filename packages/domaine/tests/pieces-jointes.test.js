// =============================================================================
// Pièces jointes — ce qui peut voyager, et ce qui ne peut pas.
//
// Le fait de départ : `mailto:` ne transporte pas de fichier (RFC 6068). On
// ne le contourne pas en prétendant le contraire — on envoie des LIENS, et on
// dit clairement ce qui reste à joindre à la main.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  piecesDuMail, piecesAvecLien, piecesSansLien, blocLiens, corpsAvecLiens,
  avertissement,
} from "../src/communication/pieces-jointes.js";

test("l'offre porte deux pièces, la facture une seule", () => {
  const o = piecesDuMail({ offre: "https://x/o", conditions: "https://x/c" }, "offre");
  assert.deepEqual(o.map((p) => p.cle), ["offre", "conditions"]);
  const f = piecesDuMail({ facture: "https://x/f" }, "facture");
  assert.deepEqual(f.map((p) => p.cle), ["facture"]);
});

test("une pièce sans lien est listée, pas effacée", () => {
  // La faire disparaître ferait oublier de la joindre.
  const p = piecesDuMail({ offre: "https://x/o" }, "offre");
  assert.equal(p.length, 2);
  assert.equal(piecesAvecLien(p).length, 1);
  assert.equal(piecesSansLien(p)[0].cle, "conditions");
});

test("le bloc de liens est du TEXTE BRUT", () => {
  // Le corps part par mailto, qui ne transporte pas de HTML.
  const p = piecesDuMail({ offre: "https://x/o", conditions: "https://x/c" }, "offre");
  const b = blocLiens(p);
  assert.equal(b.includes("<"), false, "aucune balise ne doit apparaître");
  assert.ok(b.includes("https://x/o"));
  assert.ok(b.includes("https://x/c"));
});

test("aucun lien : aucun bloc", () => {
  // Un titre « Vos documents » suivi de rien ferait mauvais effet chez le client.
  assert.equal(blocLiens(piecesDuMail({}, "offre")), "");
  assert.equal(blocLiens([]), "");
});

test("la validité des liens est annoncée quand on la connaît", () => {
  const p = piecesDuMail({ offre: "https://x/o" }, "offre");
  assert.match(blocLiens(p, { validiteJours: 30 }), /30 jours/);
  assert.equal(/jours/.test(blocLiens(p)), false);
});

test("insérer deux fois n'insère qu'une fois", () => {
  // Un double clic sur « insérer les liens » est vite arrivé.
  const p = piecesDuMail({ offre: "https://x/o" }, "offre");
  const une = corpsAvecLiens("Bonjour,", p);
  const deux = corpsAvecLiens(une, p);
  assert.equal(une, deux);
  assert.equal((deux.match(/https:\/\/x\/o/g) || []).length, 1);
});

test("un corps vide reste utilisable", () => {
  const p = piecesDuMail({ offre: "https://x/o" }, "offre");
  assert.ok(corpsAvecLiens(null, p).includes("https://x/o"));
  assert.equal(corpsAvecLiens(null, []), "");
});

/* ── Ce qu'on dit à l'utilisateur ───────────────────────────────────────── */

test("tout est en lien : on rassure, sans mentir sur la cause", () => {
  const p = piecesDuMail({ offre: "https://x/o", conditions: "https://x/c" }, "offre");
  const a = avertissement(p);
  assert.equal(a.ton, "ok");
  assert.match(a.message, /liens/i);
  // La cause est dite : ce n'est pas une panne de Dashprod.
  assert.match(a.message, /ne peut pas en porter/i);
});

test("rien en lien : on nomme ce qui reste à joindre", () => {
  const a = avertissement(piecesDuMail({}, "offre"));
  assert.equal(a.ton, "attention");
  assert.match(a.message, /Votre offre/);
  assert.match(a.message, /Conditions générales/);
});

test("cas mixte : on dit les deux", () => {
  const a = avertissement(piecesDuMail({ offre: "https://x/o" }, "offre"));
  assert.equal(a.ton, "attention");
  assert.match(a.message, /liens sont insérés/i);
  assert.match(a.message, /Conditions générales/);
});

test("aucune pièce : aucun message", () => {
  const a = avertissement([]);
  assert.equal(a.message, null);
});

/* ── Le câblage ─────────────────────────────────────────────────────────── */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ICI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ICI, "../../../apps/web/src");
const lire = (p) => fs.readFileSync(path.join(WEB, p), "utf8");

test("l'insertion des liens est un choix, pas un automatisme", () => {
  // On n'ajoute pas d'URL au message de quelqu'un sans le lui demander.
  const src = lire("ecrans/Mail.jsx");
  assert.ok(src.includes("useState(false)") && src.includes("avecLiens"),
    "la case doit être décochée par défaut");
  assert.ok(src.includes("corpsAvecLiens("));
});

test("la cause est nommée à l'écran, pas seulement en commentaire", () => {
  // Sans la cause, le bureau croit à une panne de Dashprod et cherche un
  // réglage qui n'existe pas.
  // Le message vient du DOMAINE (avertissement), l'écran ne fait que
  // l'afficher — une phrase recopiée dans l'écran divergerait du module.
  const src = lire("ecrans/Mail.jsx");
  assert.ok(src.includes("avisPieces.message"),
    "l'écran doit afficher le message du domaine");
  // On normalise les espaces : le JSX coupe les phrases sur plusieurs lignes,
  // et tester la mise en forme plutôt que le sens rendrait ce test fragile.
  const plat = src.replace(/\s+/g, " ");
  assert.ok(/ne transporte pas de fichier/.test(plat),
    "la case à cocher doit expliquer la cause, pas seulement la conséquence");
});

test("aucun lien d'offre n'est reconstruit depuis un accès existant", () => {
  // On ne conserve que l'INDICE du code, jamais le code complet : c'est ce
  // qui rend la signature opposable. Reconstruire le lien le trahirait.
  const src = lire("ecrans/Mail.jsx");
  assert.equal(src.includes("acces?.url"), false,
    "un accès actif ne porte pas d'URL et ne doit pas prétendre en avoir");
});

test("le raccourci boîte mail retient le choix sur l'appareil", () => {
  const src = lire("composants/RaccourciBoite.jsx");
  assert.ok(src.includes("localStorage"),
    "c'est une préférence de poste, pas une donnée d'entreprise");
  // Une URL sans schéma ouvrirait une page blanche de Dashprod.
  assert.ok(/\^https\?:\\\/\\\//.test(src) || src.includes("https?:\\/\\/"),
    "l'URL personnalisée doit être préfixée si le schéma manque");
  assert.ok(lire("ecrans/Conversations.jsx").includes("RaccourciBoite"));
});
