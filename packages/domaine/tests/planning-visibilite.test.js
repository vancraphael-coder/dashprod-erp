// Tests — quelles missions ont le droit d'apparaître au planning.
//
// Bug du 21/07/2026 : 5 missions sur 8 étaient des fantômes, dont deux
// FUTURES déjà annulées (30/07, 31/07). Trois motifs devaient être filtrés,
// pas un seul :
//   1. dossier archivé      (archive_le)
//   2. mission annulée      (etat = 'annulee')
//   3. dossier désisté      (affaire.etat = 'annule')
//
// La règle est verrouillée ici pour que bureau ET terrain restent d'accord :
// si le bureau annule, le terrain ne doit pas se déplacer.

import test from "node:test";
import assert from "node:assert/strict";

/** Règle unique, appliquée par listerMissions() et mesMissionsTerrain(). */
export function missionVisible(m, affaire) {
  if (!affaire) return false;
  if (affaire.archive_le) return false;
  if (affaire.etat === "annule") return false;
  if (m.etat === "annulee") return false;
  return true;
}

const actif = { archive_le: null, etat: "planifie" };

test("une mission planifiée sur un dossier actif est visible", () => {
  assert.equal(missionVisible({ etat: "planifiee" }, actif), true);
});

test("une mission effectuée reste visible (historique du mois)", () => {
  assert.equal(missionVisible({ etat: "effectuee" }, { archive_le: null, etat: "effectue" }), true);
});

test("une mission annulée disparaît, même dans le futur", () => {
  assert.equal(missionVisible({ etat: "annulee" }, actif), false);
});

test("un dossier désisté retire ses missions, même non archivé", () => {
  // C'est le cas qui manquait : archive_le est NULL sur un désistement.
  assert.equal(missionVisible({ etat: "planifiee" }, { archive_le: null, etat: "annule" }), false);
});

test("un dossier archivé retire ses missions", () => {
  assert.equal(missionVisible({ etat: "planifiee" },
    { archive_le: "2026-07-20T10:00:00Z", etat: "planifie" }), false);
});

test("filtrer sur l'archivage seul ne suffit pas", () => {
  // Reproduit exactement le faux correctif : le désistement passait au travers.
  const desiste = { archive_le: null, etat: "annule" };
  const filtreNaif = (m, a) => !a.archive_le;
  assert.equal(filtreNaif({ etat: "planifiee" }, desiste), true, "le filtre naïf laisse passer");
  assert.equal(missionVisible({ etat: "planifiee" }, desiste), false, "la vraie règle bloque");
});

test("une mission orpheline n'est jamais visible", () => {
  assert.equal(missionVisible({ etat: "planifiee" }, null), false);
});
