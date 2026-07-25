// Tests — rétention RGPD : les deux horloges, et l'interdit de purger le fiscal.
import test from "node:test";
import assert from "node:assert/strict";
import {
  statutOperationnel, statutFiscal, planPurge,
  RETENTION_OPERATIONNELLE_MOIS, RETENTION_FISCALE_ANNEES,
  CHAMPS_PURGE_OPERATIONNELLE, CONSERVER_TOUJOURS,
} from "../src/rgpd/retention.js";

const LE = (iso) => new Date(`${iso}T12:00:00Z`);

test("un dossier non archivé n'est JAMAIS purgeable, même vieux", () => {
  const s = statutOperationnel({ archive_le: null }, LE("2030-01-01"));
  assert.equal(s.purgeable, false);
  assert.match(s.motif, /actif/);
});

test("l'inventaire devient purgeable après le délai opérationnel", () => {
  const aff = { archive_le: "2025-01-01" };
  // 11 mois après : pas encore.
  assert.equal(statutOperationnel(aff, LE("2025-12-01")).purgeable, false);
  // 12 mois après : oui.
  assert.equal(statutOperationnel(aff, LE("2026-01-02")).purgeable, true);
});

test("l'échéance opérationnelle est calculée et annoncée", () => {
  const s = statutOperationnel({ archive_le: "2025-01-01" }, LE("2025-06-01"));
  assert.equal(s.echeance, "2026-01-01");
  assert.ok(s.jours_restants > 0);
});

test("une facture reste intouchable pendant tout le délai fiscal", () => {
  const f = { date_emission: "2025-07-01" };
  assert.equal(statutFiscal(f, LE("2030-01-01")).purgeable, false);
  assert.equal(statutFiscal(f, LE("2032-07-02")).purgeable, true);
});

test("les deux délais sont bien distincts", () => {
  assert.notEqual(RETENTION_OPERATIONNELLE_MOIS / 12, RETENTION_FISCALE_ANNEES);
  // À 2 ans après archivage : l'inventaire est purgeable, la facture non.
  const maintenant = LE("2027-02-01");
  assert.equal(statutOperationnel({ archive_le: "2025-01-01" }, maintenant).purgeable, true);
  assert.equal(statutFiscal({ date_emission: "2025-01-01" }, maintenant).purgeable, false);
});

test("la facture ne figure JAMAIS dans les champs à purger côté opérationnel", () => {
  for (const champ of CHAMPS_PURGE_OPERATIONNELLE) {
    assert.equal(champ.startsWith("factures"), false, `${champ} ne doit pas être purgé ici`);
  }
  // Les champs purgés sont bien l'inventaire et les adresses de chantier.
  assert.ok(CHAMPS_PURGE_OPERATIONNELLE.includes("affaires.releve"));
});

test("le journal d'audit est toujours conservé", () => {
  assert.ok(CONSERVER_TOUJOURS.includes("evenements"));
});

test("le délai de rétention est paramétrable (certains dossiers, litige plus long)", () => {
  const aff = { archive_le: "2025-01-01" };
  // Avec 24 mois de rétention, pas encore purgeable à 18 mois.
  assert.equal(statutOperationnel(aff, LE("2026-07-01"), 24).purgeable, false);
  assert.equal(statutOperationnel(aff, LE("2027-02-01"), 24).purgeable, true);
});

test("planPurge résume ce qui est purgeable maintenant", () => {
  const affaires = [
    { id: "a", archive_le: "2020-01-01" },  // très vieux → purgeable
    { id: "b", archive_le: "2025-01-01" },  // récent → non
    { id: "c", archive_le: null },          // actif → non
  ];
  const p = planPurge(affaires, LE("2025-06-01"));
  assert.equal(p.total, 3);
  assert.equal(p.purgeables, 1);
  assert.equal(p.lignes.find((l) => l.affaire_id === "a").purgeable, true);
});

test("une date d'archivage illisible ne provoque pas de purge accidentelle", () => {
  const s = statutOperationnel({ archive_le: "pas-une-date" }, LE("2030-01-01"));
  assert.equal(s.purgeable, false, "en cas de doute, on ne purge pas");
});
