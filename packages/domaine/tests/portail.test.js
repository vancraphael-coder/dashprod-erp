// Tests — accès client au portail. La sécurité est le sujet, pas l'ergonomie.
import test from "node:test";
import assert from "node:assert/strict";
import {
  genererCode, formater, normaliser, formeValide, etatAcces, essaisRestants,
  expirationDefaut, assainir, ESSAIS_MAX, CHAMPS_INTERDITS,
} from "../src/portail/acces.js";

// Générateur déterministe pour les tests uniquement.
const faux = (() => { let i = 0; return (max) => (i++ * 7) % max; })();

test("le code fait 12 caractères utiles, présentés en 3 groupes", () => {
  const code = genererCode(faux);
  assert.match(code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(normaliser(code).length, 12);
});

test("l'alphabet exclut les caractères confondables", () => {
  const code = normaliser(genererCode(faux));
  for (const interdit of ["O", "0", "I", "1", "L", "U", "V"]) {
    assert.equal(code.includes(interdit), false, `${interdit} ne doit pas apparaître`);
  }
});

test("les confusions de saisie sont rattrapées", () => {
  // Un client qui tape O au lieu de zéro, ou I au lieu de 1, doit entrer.
  assert.equal(normaliser("abcd-efgh-jkmn"), "ABCDEFGHJKMN");
  assert.equal(normaliser("ABCD EFGH JKMN"), "ABCDEFGHJKMN");
});

test("une forme invalide est rejetée avant toute requête", () => {
  assert.equal(formeValide("ABCD-EFGH-JKMN"), true);
  assert.equal(formeValide("TROP-COURT"), false);
  assert.equal(formeValide(""), false);
  assert.equal(formeValide(null), false);
});

test("REFUS de générer un code sans générateur sécurisé", () => {
  // globalThis.crypto est un accesseur en lecture seule sous Node : on le
  // remplace proprement, sinon l'assignation est silencieusement ignorée et
  // le test ne prouve rien.
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto",
      { value: undefined, configurable: true });
    assert.throws(() => genererCode(), /devinable/);
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
  }
});

test("le générateur réel produit des codes tous différents", () => {
  const vus = new Set();
  for (let i = 0; i < 200; i++) vus.add(genererCode());
  assert.equal(vus.size, 200, "aucune collision sur 200 tirages");
});

// ── Ouverture de la porte ──────────────────────────────────────────────────
test("un code inconnu n'ouvre pas", () => {
  assert.equal(etatAcces(null).ouvert, false);
  assert.equal(etatAcces(undefined).motif, "INCONNU");
});

test("un accès valide ouvre", () => {
  const e = etatAcces({ essais_rates: 0, expire_le: expirationDefaut() });
  assert.equal(e.ouvert, true);
});

test("un accès révoqué n'ouvre plus, même avec le bon code", () => {
  const e = etatAcces({ revoque_le: "2026-07-01T00:00:00Z", essais_rates: 0 });
  assert.equal(e.ouvert, false);
  assert.equal(e.motif, "REVOQUE");
});

test("le verrouillage tombe après le nombre d'essais prévu", () => {
  assert.equal(etatAcces({ essais_rates: ESSAIS_MAX - 1 }).ouvert, true);
  const bloque = etatAcces({ essais_rates: ESSAIS_MAX });
  assert.equal(bloque.ouvert, false);
  assert.equal(bloque.motif, "VERROUILLE");
});

test("essaisRestants prévient avant le blocage", () => {
  assert.equal(essaisRestants({ essais_rates: 6 }), 2);
  assert.equal(essaisRestants({ essais_rates: 99 }), 0);
});

test("un code expiré n'ouvre pas", () => {
  const e = etatAcces({ essais_rates: 0, expire_le: "2020-01-01T00:00:00Z" });
  assert.equal(e.ouvert, false);
  assert.equal(e.motif, "EXPIRE");
});

test("chaque refus porte un message lisible par le client", () => {
  for (const acces of [null, { revoque_le: "2026-01-01" },
                       { essais_rates: ESSAIS_MAX },
                       { expire_le: "2020-01-01T00:00:00Z" }]) {
    const e = etatAcces(acces);
    assert.equal(e.ouvert, false);
    assert.ok(e.message && e.message.length > 15, `message manquant : ${e.motif}`);
  }
});

// ── Fuite de données ───────────────────────────────────────────────────────
test("assainir retire les champs interdits, même imbriqués", () => {
  const sale = { reference: "D-1", notes_commerciales: "client difficile",
    marge_centimes: 50000, dossier: { client_nom: "X", couts: { total: 1 } },
    lignes: [{ libelle: "A", taux_horaire: 18 }] };
  const propre = assainir(sale);
  assert.equal(propre.reference, "D-1");
  assert.equal("notes_commerciales" in propre, false);
  assert.equal("marge_centimes" in propre, false);
  assert.equal("couts" in propre.dossier, false);
  assert.equal("taux_horaire" in propre.lignes[0], false);
  assert.equal(propre.dossier.client_nom, "X");
});

test("aucun champ interdit ne doit jamais atteindre un client", () => {
  for (const champ of CHAMPS_INTERDITS) {
    const propre = assainir({ [champ]: "secret", garde: "ok" });
    assert.equal(champ in propre, false, `${champ} a fuité`);
    assert.equal(propre.garde, "ok");
  }
});
