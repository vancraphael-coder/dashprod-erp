import test from "node:test";
import assert from "node:assert/strict";
import {
  MODELES_MAIL_DEFAUT, EXEMPLE_MAIL, remplirJetons, mailsEffectifs, mailEffectif,
  ecrireMailPerso, ecrireMailSurMesure, supprimerMailSurMesure,
} from "../src/communication/mails.js";

test("le socle couvre les envois d'une entreprise de déménagement", () => {
  const cles = MODELES_MAIL_DEFAUT.map((m) => m.cle);
  for (const attendu of ["envoi_devis", "confirmation_demenagement", "envoi_facture",
                          "rappel_paiement", "remerciement"]) {
    assert.ok(cles.includes(attendu), `modèle manquant : ${attendu}`);
  }
  for (const m of MODELES_MAIL_DEFAUT) {
    assert.ok(m.objet && m.corps, `${m.cle} incomplet`);
  }
});

test("les jetons se remplissent, les inconnus restent visibles", () => {
  const t = remplirJetons("Bonjour {famille}, montant {montant}, ref {inconnu}", EXEMPLE_MAIL);
  assert.match(t, /Bonjour Dupont/);
  assert.match(t, /montant 1 210,00 €/);
  assert.match(t, /\{inconnu\}/, "un jeton sans valeur reste tel quel");
});

test("sans personnalisation, l'effectif = le socle", () => {
  const eff = mailsEffectifs({});
  assert.equal(eff.length, MODELES_MAIL_DEFAUT.length);
  assert.ok(eff.every((m) => m.origine === "livre"));
  assert.ok(eff.every((m) => !m.personnalise));
});

test("réécrire un modèle livré prime sur le défaut", () => {
  let s = ecrireMailPerso({}, "envoi_devis",
    { objet: "Mon objet à moi", corps: "Mon corps." });
  const m = mailEffectif(s, "envoi_devis");
  assert.equal(m.objet, "Mon objet à moi");
  assert.equal(m.personnalise, true);
});

test("remettre le texte par défaut efface la surcharge", () => {
  const def = MODELES_MAIL_DEFAUT.find((m) => m.cle === "remerciement");
  let s = ecrireMailPerso({}, "remerciement", { objet: "X", corps: "Y" });
  assert.ok(s.mails.perso.remerciement);
  s = ecrireMailPerso(s, "remerciement", { objet: def.objet, corps: def.corps });
  assert.equal(s.mails, undefined, "plus aucune surcharge, le bloc s'efface");
});

test("créer un modèle sur mesure lui donne une clé stable", () => {
  const { stockes, cle } = ecrireMailSurMesure({}, {
    titre: "Rappel garde-meuble", objet: "Votre box", corps: "Bonjour…" });
  assert.match(cle, /^perso_/);
  const eff = mailsEffectifs(stockes);
  const mien = eff.find((m) => m.cle === cle);
  assert.equal(mien.origine, "sur_mesure");
  assert.equal(mien.titre, "Rappel garde-meuble");
});

test("deux modèles sur mesure de même titre ne s'écrasent pas", () => {
  let { stockes, cle: c1 } = ecrireMailSurMesure({}, { titre: "Note", corps: "un" });
  const r2 = ecrireMailSurMesure(stockes, { titre: "Note", corps: "deux" });
  assert.notEqual(c1, r2.cle);
  assert.equal(mailsEffectifs(r2.stockes).filter((m) => m.origine === "sur_mesure").length, 2);
});

test("modifier un modèle sur mesure existant le met à jour, sans doublon", () => {
  let { stockes, cle } = ecrireMailSurMesure({}, { titre: "A", corps: "v1" });
  const r = ecrireMailSurMesure(stockes, { cle, titre: "A", corps: "v2" });
  const surMesure = mailsEffectifs(r.stockes).filter((m) => m.origine === "sur_mesure");
  assert.equal(surMesure.length, 1);
  assert.equal(surMesure[0].corps, "v2");
});

test("un modèle sur mesure se supprime, un modèle livré ne disparaît pas", () => {
  let { stockes, cle } = ecrireMailSurMesure({}, { titre: "Jetable", corps: "x" });
  stockes = supprimerMailSurMesure(stockes, cle);
  assert.equal(mailsEffectifs(stockes).filter((m) => m.origine === "sur_mesure").length, 0);
  // les livrés sont toujours là
  assert.equal(mailsEffectifs(stockes).length, MODELES_MAIL_DEFAUT.length);
});

test("personnalisations et modèles propres coexistent", () => {
  let s = ecrireMailPerso({}, "envoi_devis", { objet: "O", corps: "C" });
  s = ecrireMailSurMesure(s, { titre: "Sur mesure", corps: "z" }).stockes;
  const eff = mailsEffectifs(s);
  assert.equal(eff.filter((m) => m.personnalise).length, 1);
  assert.equal(eff.filter((m) => m.origine === "sur_mesure").length, 1);
  assert.equal(eff.length, MODELES_MAIL_DEFAUT.length + 1);
});
