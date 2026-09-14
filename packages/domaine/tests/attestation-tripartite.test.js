// =============================================================================
// TROIS SORTIES, ET LA TROISIÈME DOIT DIRE CE QU'ELLE NE CERTIFIE PAS.
//
// CE QUI CASSE SANS CES TESTS :
//
//   · une ATTESTATION QUI EN PROMET TROP. Un document qui ne dit pas ce qu'il
//     ne certifie pas sera lu comme certifiant tout — et c'est l'exploitant de
//     la plateforme qui répondra de la lecture qu'on en fait.
//   · une FUITE PAR LE DOCUMENT. L'attestation est destinée à sortir des deux
//     organisations : elle ne doit contenir ni prix convenu, ni client final,
//     ni adresse.
//   · des DOCUMENTS QUI SE CONTREDISENT. Trois pièces construites depuis trois
//     lectures des mêmes faits finissent par ne plus dire la même chose, et une
//     contradiction entre nos propres documents est indéfendable.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  CERTIFIE, NON_CERTIFIE, vuePartie, attestationCommune, troisSorties,
} from "../src/conformite/attestation-tripartite.js";

const DONNEUR = "org-roovers";
const PRESTA = "org-vancutsem";

const ENGAGEMENT = {
  id: "eng-1", org_donneur: DONNEUR, org_prestataire: PRESTA,
  nom_donneur: "Déménagements Roovers", nom_prestataire: "Raphaël Van Cutsem",
  date_prestation: "2026-09-20", nature: "Manutention 4 h",
  ville: "Jodoigne", prix_htva_centimes: 18000,
  // Données qui ne doivent PAS ressortir de l'attestation commune.
  adresse_complete: "Rue du Moulin 14", contact_sur_place: "Mme Dupont",
};

const PREUVES = [
  { rang: 1, type: "photo_avant", empreinte: "a".repeat(64),
    au: "2026-09-20T08:05:00Z", par_org: PRESTA },
  { rang: 2, type: "signature", empreinte: "b".repeat(64),
    au: "2026-09-20T12:30:00Z", par_org: PRESTA },
  { rang: 3, type: "reserve", libelle: "Rayure sur le chambranle",
    empreinte: "c".repeat(64), au: "2026-09-21T09:00:00Z", par_org: DONNEUR },
];

const EVENEMENTS = [
  { rang: 1, type: "proposee", au: "2026-09-13T10:00:00Z", par_org: DONNEUR,
    empreinte: "1".repeat(64) },
  { rang: 2, type: "acceptee", au: "2026-09-13T18:00:00Z", par_org: PRESTA,
    empreinte: "2".repeat(64) },
];

test("chaque partie distingue ce qu'elle a déposé de ce qu'elle a reçu", () => {
  // « J'ai pris ces photos » et « on m'a transmis ces photos » ne se
  // défendent pas de la même façon. Les mélanger affaiblirait les deux.
  const p = vuePartie({ engagement: ENGAGEMENT, preuves: PREUVES, moi: PRESTA });
  assert.equal(p.role, "prestataire");
  assert.deepEqual(p.deposees_par_moi.map((l) => l.rang), [1, 2]);
  assert.deepEqual(p.deposees_par_l_autre.map((l) => l.rang), [3]);

  const d = vuePartie({ engagement: ENGAGEMENT, preuves: PREUVES, moi: DONNEUR });
  assert.equal(d.role, "donneur_ordre");
  assert.deepEqual(d.deposees_par_moi.map((l) => l.rang), [3]);
  assert.deepEqual(d.deposees_par_l_autre.map((l) => l.rang), [1, 2]);
});

test("L'ATTESTATION DIT CE QU'ELLE NE CERTIFIE PAS", () => {
  const a = attestationCommune({
    engagement: ENGAGEMENT, preuves: PREUVES, evenements: EVENEMENTS });

  assert.ok(a.ne_certifie_pas.length >= 4);
  // Les quatre limites qui comptent, nommément.
  const texte = a.ne_certifie_pas.join(" | ");
  assert.match(texte, /correctement exécutée/);
  assert.match(texte, /représentent ce qu'elles prétendent/);
  assert.match(texte, /identité réelle/);
  assert.match(texte, /bien-fondé d'une réclamation/);

  // Et la mention figure SUR le document : une limite rangée dans des
  // conditions générales que personne ne rouvre ne protège personne.
  assert.match(a.mention, /tiers d'enregistrement/);
  assert.match(a.mention, /ne préjuge d'aucun litige/);
  assert.deepEqual([...NON_CERTIFIE], a.ne_certifie_pas);
  assert.deepEqual([...CERTIFIE], a.certifie);
});

test("l'attestation ne fait sortir AUCUNE donnée commerciale ni personnelle", () => {
  // Elle est destinée à quitter les deux organisations.
  const a = attestationCommune({
    engagement: ENGAGEMENT, preuves: PREUVES, evenements: EVENEMENTS });
  const brut = JSON.stringify(a);

  assert.ok(!brut.includes("18000"), "le prix convenu ne sort pas");
  assert.ok(!brut.includes("Rue du Moulin"), "l'adresse ne sort pas");
  assert.ok(!brut.includes("Dupont"), "le contact sur place ne sort pas");
  // En revanche les deux parties sont nommées : sans elles, l'attestation ne
  // prouve rien d'utile.
  assert.ok(brut.includes("Déménagements Roovers"));
  assert.ok(brut.includes("Raphaël Van Cutsem"));
  // Et les empreintes sont là : c'est tout l'objet du document.
  assert.equal(a.pieces.length, 3);
  assert.equal(a.pieces[0].empreinte_sha256, "a".repeat(64));
});

test("une chaîne ROMPUE se dit, l'attestation ne se refuse pas", () => {
  // L'intégrité est un fait vérifiable, pas une opinion. Refuser d'émettre
  // priverait les parties du constat au moment où elles en ont le plus besoin.
  const ok = attestationCommune({
    engagement: ENGAGEMENT, evenements: EVENEMENTS,
    chaine: { ok: true, maillons: 2 } });
  assert.deepEqual(ok.integrite, { verifiee: true, maillons: 2 });

  const rompue = attestationCommune({
    engagement: ENGAGEMENT, evenements: EVENEMENTS,
    chaine: { ok: false, rang_rompu: 2 } });
  assert.equal(rompue.integrite.verifiee, false);
  assert.equal(rompue.integrite.rang_rompu, 2);
  assert.ok(rompue.titre);
});

test("les trois sorties viennent d'une SEULE lecture des faits", () => {
  // Trois pièces construites depuis trois lectures finiraient par se
  // contredire, et une contradiction entre nos propres documents est
  // indéfendable.
  const t = troisSorties({
    engagement: ENGAGEMENT, preuves: PREUVES, evenements: EVENEMENTS });

  assert.equal(t.prestataire.role, "prestataire");
  assert.equal(t.donneur_ordre.role, "donneur_ordre");
  assert.ok(t.commune.titre);

  // Le même nombre de pièces partout : c'est le point de contrôle.
  assert.equal(t.prestataire.total, PREUVES.length);
  assert.equal(t.donneur_ordre.total, PREUVES.length);
  assert.equal(t.commune.pieces.length, PREUVES.length);

  // Et la répartition est le miroir exacte de l'une à l'autre.
  assert.deepEqual(
    t.prestataire.deposees_par_moi.map((l) => l.rang),
    t.donneur_ordre.deposees_par_l_autre.map((l) => l.rang));
});

test("les pièces sont ordonnées par rang, quel que soit l'ordre reçu", () => {
  // Un constat où les horodatages ne suivent pas l'ordre des rangs se lit
  // comme une manipulation.
  const a = attestationCommune({
    engagement: ENGAGEMENT, preuves: [...PREUVES].reverse(),
    evenements: [...EVENEMENTS].reverse() });
  assert.deepEqual(a.pieces.map((p) => p.rang), [1, 2, 3]);
  assert.deepEqual(a.etapes.map((e) => e.rang), [1, 2]);
});

test("les entrées absentes ne fabriquent pas de constat", () => {
  const a = attestationCommune({});
  assert.equal(a.pieces.length, 0);
  assert.equal(a.etapes.length, 0);
  assert.equal(a.engagement.reference, null);
  // Les limites, elles, figurent TOUJOURS : c'est ce qui protège.
  assert.ok(a.ne_certifie_pas.length >= 4);
  assert.ok(a.mention.length > 100);
});
