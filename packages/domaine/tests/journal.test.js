// Tests — lisibilité du journal d'enregistrements.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FAMILLES, familleDe, phraseEvenement, parJour, filtrerParFamille,
} from "../src/noyau/journal.js";

const E = (type, details = {}, quand = "2026-08-03T10:00:00Z") =>
  ({ type, details, quand });

test("chaque famille a un libellé lisible", () => {
  for (const f of FAMILLES) {
    assert.ok(f.libelle && f.libelle.length > 2);
    assert.ok(f.motif instanceof RegExp);
  }
});

test("les événements se rangent dans la bonne famille", () => {
  assert.equal(familleDe("Facture.Emise"), "argent");
  assert.equal(familleDe("Paiement.Cree"), "argent");
  assert.equal(familleDe("Dossier.Modifie"), "dossier");
  assert.equal(familleDe("Affaire.Confirme"), "dossier");
  assert.equal(familleDe("Membre.Affecte"), "planning");
  assert.equal(familleDe("Chantier.Termine"), "planning");
  assert.equal(familleDe("Membre.CapaciteAccordee"), "equipe");
  assert.equal(familleDe("Decision.Notee"), "decision");
});

test("un type inconnu ne casse rien", () => {
  assert.equal(familleDe("Truc.Machin"), "autre");
  assert.equal(familleDe(null), "autre");
});

// — Phrases —
test("une décision rend le texte écrit par l'humain, tel quel", () => {
  const p = phraseEvenement(E("Decision.Notee",
    { texte: "  On accepte malgré la marge faible  " }));
  assert.equal(p, "On accepte malgré la marge faible");
});

test("une modification dit QUELS champs ont bougé, en français", () => {
  assert.equal(phraseEvenement(E("Dossier.Modifie", { champs: ["heure_souhaitee"] })),
               "Dossier modifié — heure");
  assert.equal(phraseEvenement(E("Client.Modifie", { champs: ["tva_num"] })),
               "Client modifié — numéro de TVA");
});

test("plusieurs champs se résument sans noyer la ligne", () => {
  const p = phraseEvenement(E("Dossier.Modifie",
    { champs: ["date_souhaitee", "heure_souhaitee", "equipe", "camions"] }));
  assert.match(p, /date/);
  assert.match(p, /2 autres/, "au-delà de deux, on compte");
});

test("deux champs se lisent avec « et »", () => {
  const p = phraseEvenement(E("Dossier.Modifie", { champs: ["etat", "equipe"] }));
  assert.equal(p, "Dossier modifié — état et équipe");
});

test("les actes métier ont leur phrase", () => {
  assert.equal(phraseEvenement(E("Facture.Emise", { numero: "2026-000016" })),
               "Facture 2026-000016 émise");
  assert.equal(phraseEvenement(E("Chantier.Termine")), "Chantier clôturé");
  assert.equal(phraseEvenement(E("Offre.SigneeParClient", { signataire: "Jean Dupont" })),
               "Offre signée en ligne par Jean Dupont");
  assert.match(phraseEvenement(E("Membre.CapaciteAccordee",
    { capacite: "cloturer_chantier" })), /cloturer_chantier/);
});

test("les transitions d'état se lisent en français", () => {
  assert.equal(phraseEvenement(E("Affaire.Confirme")), "Dossier confirmé");
  assert.equal(phraseEvenement(E("Affaire.En_cours")), "Dossier démarré");
  assert.equal(phraseEvenement(E("Affaire.Envoye")), "Dossier envoyé au client");
});

test("un type imprévu reste lisible, jamais brut avec des points", () => {
  const p = phraseEvenement(E("Nouveau.Truc_Bidule"));
  assert.equal(p.includes("."), false);
  assert.equal(p.includes("_"), false);
});

// — Regroupement et filtre —
test("les entrées se regroupent par jour, du plus récent au plus ancien", () => {
  const j = parJour([
    E("Facture.Emise", {}, "2026-08-01T09:00:00Z"),
    E("Chantier.Termine", {}, "2026-08-03T18:00:00Z"),
    E("Dossier.Modifie", { champs: ["etat"] }, "2026-08-03T09:00:00Z"),
  ]);
  assert.equal(j.length, 2);
  assert.equal(j[0][0], "2026-08-03");
  assert.equal(j[0][1].length, 2);
  assert.equal(j[1][0], "2026-08-01");
});

test("une entrée sans date est ignorée plutôt que rangée n'importe où", () => {
  assert.equal(parJour([{ type: "X" }]).length, 0);
});

test("le filtre par famille ne réordonne rien", () => {
  const liste = [E("Facture.Emise"), E("Membre.Affecte"), E("Paiement.Cree")];
  const argent = filtrerParFamille(liste, "argent");
  assert.equal(argent.length, 2);
  assert.equal(argent[0].type, "Facture.Emise");
  assert.equal(filtrerParFamille(liste, "tout").length, 3);
  assert.equal(filtrerParFamille(liste).length, 3);
});
