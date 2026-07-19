// Tests — Brief équipe & itinéraire. Critique : format validé sur le terrain
// (WhatsApp) et URL Maps multi-arrêts — l'ordre des arrêts EST l'itinéraire.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  briefMission, urlItineraire, urlWhatsApp, emailOffre, urlMailto,
} from "../src/communication/brief.js";

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
  organisation: "Déménagements Test",
  iban: "BE00 0000 0000 0000",
  signature: "Prénom — 00 000 00 00",
};

test("briefMission : format complet du modèle", () => {
  const b = briefMission(BASE);
  // L'en-tête reprend l'organisation passée en paramètre, jamais une constante.
  assert.match(b, /DÉMÉNAGEMENTS TEST/);
  assert.match(b, /vendredi 17 juillet — 08:00/);
  assert.match(b, /Marco \(chef\), Yassine/);
  assert.match(b, /Rue A 1, Wavre \(étage 2, ascenseur\)/);
  assert.match(b, /1× Armoire 3p \(démontage\)/);
  assert.match(b, /Virement BE00/);
  assert.match(b, /Prénom — 00/);
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

test("urlItineraire : part du dépôt, passe par les chantiers, revient au dépôt", () => {
  const DEPOT = "Rue de Test 1, 1000 Bruxelles";
  const u = urlItineraire(
    [{ adresse: "A" }, { adresse: "B" }],
    [{ adresse: "C" }],
    DEPOT
  );
  // Départ et retour = dépôt du tenant ; A, B, C sont des waypoints ordonnés.
  assert.match(u, /origin=Rue/);
  assert.match(u, /destination=Rue/);
  assert.match(u, /waypoints=A\|B\|C/);
});

test("urlItineraire : compose rue + CP + ville quand les champs séparés existent", () => {
  const u = urlItineraire(
    [{ adresse: "Rue X 1", code_postal: "1300", ville: "Wavre" }], []
  );
  assert.match(u, /Rue%20X%201%2C%201300%20Wavre/);
});

test("urlItineraire : null si aucun chantier (rien à router)", () => {
  assert.equal(urlItineraire([], []), null);
});

test("urlWhatsApp encode le texte", () => {
  assert.match(urlWhatsApp("é &"), /wa\.me\/\?text=%C3%A9%20%26/);
});

// --- Email d'offre -------------------------------------------------------------

test("emailOffre : salutation par nom de famille, montant horaire, validité", () => {
  const m = emailOffre({
    client: { nom: "Jean Dupont", email: "j@d.be" },
    charges: [{ adresse: "Rue A 1" }], decharges: [{ adresse: "Rue B 2" }],
    formule: "tarifaire", heures: 6, nbDemenageurs: 3, tvacCentimes: 114950,
    date: "2026-07-17", heure: "08:00",
    organisation: { nom: "Déménagements Roovers", tel: "0455/17.16.79" },
  });
  assert.match(m.corps, /^Bonjour Dupont,/);
  assert.match(m.corps, /6 h avec 3 déménageurs/);
  assert.match(m.corps, /valable 10 jours ouvrables/);
  assert.match(m.corps, /vendredi 17 juillet — arrivée 08:00/);
  assert.match(m.objet, /Offre de prix — Déménagements Roovers — Jean Dupont/);
  assert.equal(m.a, "j@d.be");
});

test("emailOffre : segment 'signé' conditionnel et forfait", () => {
  const signe = emailOffre({ client: { nom: "X" }, signee: true,
    formule: "forfait", tvacCentimes: 242000 });
  assert.match(signe.corps, /revêtue de votre bon pour accord signé/);
  assert.match(signe.corps, /Montant forfaitaire/);
  const non = emailOffre({ client: { nom: "X" }, formule: "forfait", tvacCentimes: 1 });
  assert.ok(!non.corps.includes("bon pour accord"));
});

test("urlMailto encode destinataire, objet et corps", () => {
  const u = urlMailto({ a: "a@b.be", objet: "Été", corps: "ligne 1\nligne 2" });
  assert.match(u, /^mailto:a%40b\.be\?subject=%C3%89t%C3%A9&body=ligne%201%0Aligne%202$/);
});

test("emailOffre : les modèles du bureau remplacent les textes par défaut", () => {
  const m = emailOffre({
    client: { nom: "Marie Dupont", email: "m@d.be" },
    organisation: { nom: "Roovers", tel: "010" },
    tvacCentimes: 100000, heures: 6, nbDemenageurs: 3,
    textes: {
      objet: "Votre déménagement — {organisation}",
      salutation: "Chère Madame, cher Monsieur {famille},",
      signataire: "Le bureau",
      validite: "Valable {validite} jours.",
      validite_jours: 30,
      pied: "TVA BE0478363616",
    },
  });
  assert.equal(m.objet, "Votre déménagement — Roovers");
  assert.ok(m.corps.startsWith("Chère Madame, cher Monsieur Dupont,"));
  assert.ok(m.corps.includes("Valable 30 jours."));
  assert.ok(m.corps.includes("Le bureau"));
  assert.ok(!m.corps.includes("Raphaël Van Cutsem"));
  assert.ok(m.corps.trimEnd().endsWith("TVA BE0478363616"));
});

test("emailOffre : un modèle partiel ne casse pas le reste", () => {
  const m = emailOffre({
    client: { nom: "X" }, tvacCentimes: 1, formule: "forfait",
    textes: { salutation: "Salut {famille} !" },
  });
  assert.ok(m.corps.startsWith("Salut X !"));
  assert.ok(m.corps.includes("Bien à vous,"));      // défaut conservé
  assert.ok(m.corps.includes("Kilométrage offert")); // défaut conservé
});

test("brief : aucune identité d'entreprise codée en dur", () => {
  // Garde-fou multi-tenant : sans paramètre organisation, le brief ne doit
  // nommer AUCUNE entreprise (AUDIT_REAL.md §5).
  const b = briefMission({ date: "2026-07-17" });
  assert.doesNotMatch(b, /ROOVERS/i);
  assert.equal(urlItineraire([{ adresse: "A" }], [{ adresse: "B" }])
    .includes("Jodoigne"), false);
});
