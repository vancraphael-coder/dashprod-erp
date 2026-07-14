// Tests — Brief équipe & itinéraire. Critique : format validé sur le terrain
// (WhatsApp) et URL Maps multi-arrêts — l'ordre des arrêts EST l'itinéraire.

import { test } from "node:test";
import assert from "node:assert/strict";

import { briefMission, urlItineraire, urlWhatsApp } from "../src/communication/brief.js";

const BASE = {
  date: "2026-07-17", heure: "08:00",
  camions: [{ nom: "Iveco 1" }],
  equipe: [{ nom: "Marco", chef: true }, { nom: "Yassine" }],
  charges: [{ adresse: "Rue A 1, Wavre", etage: "2", ascenseur: true }],
  decharges: [{ adresse: "Rue B 2, Jodoigne" }],
  inventaire: [
    { nom: "Armoire 3p", quantite: 1, demont: true },
    { nom: "Canapé", quantite: 1 },
  ],
  remarques: "Rue étroite",
  iban: "BE73 3101 6268 5860",
  signature: "Raphaël — 0455/17.16.79",
};

test("briefMission : format complet du modèle", () => {
  const b = briefMission(BASE);
  assert.match(b, /DÉMÉNAGEMENTS ROOVERS/);
  assert.match(b, /vendredi 17 juillet — 08:00/);
  assert.match(b, /Marco \(chef\), Yassine/);
  assert.match(b, /Rue A 1, Wavre \(étage 2, ascenseur\)/);
  assert.match(b, /1× Armoire 3p \(démontage\)/);
  assert.match(b, /Virement BE73/);
  assert.match(b, /Raphaël — 0455/);
});

test("briefMission : adresses multiples numérotées, articles tronqués à 6", () => {
  const b = briefMission({
    ...BASE,
    charges: [{ adresse: "A" }, { adresse: "B" }],
    inventaire: Array.from({ length: 9 }, (_, i) => ({ nom: `M${i}`, quantite: 1 })),
  });
  assert.match(b, /1\. A/);
  assert.match(b, /2\. B/);
  assert.match(b, /… \+3 autres/);
});

test("briefMission : les blocs absents ne laissent pas de ligne vide", () => {
  const b = briefMission({ date: "2026-07-17" });
  assert.ok(!b.includes("🚚"));
  assert.ok(!b.includes("📦"));
  assert.ok(!b.split("\n").some((ligne) => ligne.trim() === ""));
});

test("urlItineraire : origin/destination/waypoints dans l'ordre des arrêts", () => {
  const u = urlItineraire(
    [{ adresse: "A" }, { adresse: "B" }],
    [{ adresse: "C" }]
  );
  assert.match(u, /origin=A/);
  assert.match(u, /destination=C/);
  assert.match(u, /waypoints=B/);
});

test("urlItineraire : null sous deux adresses (rien à tracer)", () => {
  assert.equal(urlItineraire([{ adresse: "A" }], []), null);
  assert.equal(urlItineraire([], []), null);
});

test("urlWhatsApp encode le texte", () => {
  assert.match(urlWhatsApp("é &"), /wa\.me\/\?text=%C3%A9%20%26/);
});
