import test from "node:test";
import assert from "node:assert/strict";
import {
  PERIODES, periode, TYPES_ZONE, volumeZone, surfaceExploitable,
  montantPeriodeZone, trancheBox, montantPeriodeBox, prorata, echeances,
  lireBareme, montantEcheance, MODES_BAREME,
  tauxOccupation,
} from "../src/stocks/stockage.js";

test("periode : durée connue, et repli sûr sur le mensuel", () => {
  assert.equal(periode("trimestriel").mois, 3);
  assert.equal(periode("annuel").mois, 12);
  assert.equal(periode("n'importe quoi").cle, "mensuel");
});

test("volumeZone : surface × hauteur, sans multiplier par les niveaux", () => {
  // 20 m² sur 3 m de haut = 60 m³, que la zone ait des étages ou non :
  // les rayonnages se partagent la hauteur, ils ne la créent pas.
  const sol = { type: "sol", surface_m2: 20, hauteur_m: 3 };
  const etages = { type: "sol_etages", surface_m2: 20, hauteur_m: 3, niveaux: 3 };
  assert.equal(volumeZone(sol), 60);
  assert.equal(volumeZone(etages), 60);
});

test("volumeZone : données manquantes → 0, pas de NaN", () => {
  assert.equal(volumeZone({ surface_m2: 20 }), 0);
  assert.equal(volumeZone(null), 0);
});

test("surfaceExploitable : les étages multiplient la surface de pose", () => {
  assert.equal(surfaceExploitable({ type: "sol", surface_m2: 20 }), 20);
  assert.equal(surfaceExploitable({ type: "sol_etages", surface_m2: 20, niveaux: 3 }), 60);
  // niveaux absent ou absurde : on retombe sur un seul niveau
  assert.equal(surfaceExploitable({ type: "sol_etages", surface_m2: 20 }), 20);
});

test("montantPeriodeZone : le tarif négocié s'applique tel quel", () => {
  assert.equal(montantPeriodeZone({ tarif_centimes: 25000 }), 25000);
  assert.equal(montantPeriodeZone({ tarif_centimes: 0 }), 0);
  assert.equal(montantPeriodeZone({}), 0);
});

const BAREME = [
  { jusqua_m3: 5, prix_mensuel_centimes: 4500 },
  { jusqua_m3: 10, prix_mensuel_centimes: 7500 },
  { jusqua_m3: 20, prix_mensuel_centimes: 12000 },
];

test("trancheBox : on retient la première tranche qui couvre le volume", () => {
  assert.equal(trancheBox(BAREME, 3).prix_mensuel_centimes, 4500);
  assert.equal(trancheBox(BAREME, 5).prix_mensuel_centimes, 4500, "la borne est incluse");
  assert.equal(trancheBox(BAREME, 5.5).prix_mensuel_centimes, 7500);
  assert.equal(trancheBox(BAREME, 20).prix_mensuel_centimes, 12000);
  assert.equal(trancheBox(BAREME, 25), null, "au-delà du barème : rien");
});

test("trancheBox : un barème en désordre donne le même résultat", () => {
  const desordre = [...BAREME].reverse();
  assert.equal(trancheBox(desordre, 3).prix_mensuel_centimes, 4500);
  assert.equal(trancheBox(desordre, 12).prix_mensuel_centimes, 12000);
});

test("montantPeriodeBox : le prix suit la période", () => {
  assert.equal(montantPeriodeBox(BAREME, 8, "mensuel").centimes, 7500);
  assert.equal(montantPeriodeBox(BAREME, 8, "trimestriel").centimes, 22500);
  assert.equal(montantPeriodeBox(BAREME, 8, "annuel").centimes, 90000);
});

test("montantPeriodeBox : hors barème → 0 ET signalé", () => {
  const r = montantPeriodeBox(BAREME, 40);
  assert.equal(r.centimes, 0);
  assert.equal(r.hors_bareme, true, "on signale plutôt que d'inventer un prix");
});

test("prorata : un mois entamé se facture au jour", () => {
  assert.equal(prorata(3000, 15, 30), 1500);
  assert.equal(prorata(3000, 30, 30), 3000);
  assert.equal(prorata(3000, 0, 30), 0);
  assert.equal(prorata(3000, 45, 30), 3000, "jamais plus qu'une période pleine");
  assert.equal(prorata(3000, 10, 0), 0, "pas de division par zéro");
});

test("echeances : une par période, jusqu'au butoir", () => {
  const e = echeances(
    { debut: "2026-01-15", periode: "trimestriel", montant_centimes: 30000 },
    "2026-12-31");
  assert.deepEqual(e.map((x) => x.date),
    ["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
  assert.equal(e[0].centimes, 30000);
});

test("echeances : la fin du contrat arrête le compteur", () => {
  const e = echeances(
    { debut: "2026-01-01", fin: "2026-03-31", periode: "mensuel", montant_centimes: 5000 },
    "2026-12-31");
  assert.equal(e.length, 3);
});

test("echeances : une date invalide ne produit rien plutôt que de planter", () => {
  assert.deepEqual(echeances({ debut: "pas une date", periode: "mensuel" }, "2026-12-31"), []);
  assert.deepEqual(echeances({ debut: "2026-01-01" }, "date invalide"), []);
});

test("tauxOccupation : ce qui est pris, ce qui reste", () => {
  const r = tauxOccupation([{ occupe: true }, { occupe: true }, { occupe: false },
                            { occupe: false }]);
  assert.equal(r.total, 4);
  assert.equal(r.occupes, 2);
  assert.equal(r.libres, 2);
  assert.equal(r.taux, 50);
  assert.equal(tauxOccupation([]).taux, 0, "un dépôt vide n'est pas une division par zéro");
});

/* ── Le mode « au m³ exact » (ajouté, pas substitué) ─────────────────────── */

const EXACT = { mode: "exact", prix_m3_mensuel_centimes: 900,
                minimum_mensuel_centimes: 3500, tranches: [] };

test("les barèmes DÉJÀ EN BASE, simples tableaux, continuent de fonctionner", () => {
  // Le vrai risque du lot : `parametres_prix.stockage_boxes` est un TABLEAU en
  // production. Ne pas savoir le relire aurait mis à zéro le prix de tous les
  // boxes loués, sans un seul message d'erreur.
  assert.equal(lireBareme(BAREME).mode, "tranches");
  assert.deepEqual(lireBareme(BAREME).tranches, BAREME);
  assert.equal(montantPeriodeBox(BAREME, 8, "mensuel").centimes, 7500);
  // Et un barème absent ne prétend rien savoir.
  assert.equal(montantPeriodeBox(null, 8).hors_bareme, true);
});

test("au m³ exact : le prix suit le volume réel, sans effet de seuil", () => {
  // C'est tout l'intérêt : 5,2 m³ ne saute pas à la tranche des 10 m³.
  const r = montantPeriodeBox(EXACT, 5.2, "mensuel");
  assert.equal(r.centimes, 4680, "5,2 × 9,00 €");
  assert.equal(r.mode, "exact");
  assert.equal(r.hors_bareme, false);
  assert.equal(r.minimum_applique, false);
});

test("au m³ exact : le minimum est MENSUEL, puis multiplié par la période", () => {
  // Posé sur le total d'un contrat annuel, un minimum de 35 € ne vaudrait plus
  // rien : il doit protéger chaque mois.
  const petit = montantPeriodeBox(EXACT, 2, "mensuel");
  assert.equal(petit.centimes, 3500, "1 800 c relevés au minimum de 3 500 c");
  assert.equal(petit.minimum_applique, true);
  assert.equal(montantPeriodeBox(EXACT, 2, "annuel").centimes, 3500 * 12);
  assert.equal(montantPeriodeBox(EXACT, 5.2, "trimestriel").centimes, 4680 * 3);
});

test("au m³ exact : sans prix au m³ ou sans volume, on SIGNALE, on n'invente pas", () => {
  // `Number(null) === 0` ferait ici facturer 0 € en silence — le piège payé
  // six fois dans ce projet.
  const sansPrix = montantPeriodeBox({ mode: "exact" }, 5);
  assert.equal(sansPrix.hors_bareme, true);
  assert.equal(sansPrix.centimes, 0);
  const sansVolume = montantPeriodeBox(EXACT, null);
  assert.equal(sansVolume.hors_bareme, true, "un volume inconnu n'est pas un volume nul");
  assert.equal(montantPeriodeBox(EXACT, 0).hors_bareme, true);
});

test("au m³ exact : deux boxes se cumulent toujours, et la ligne dit son calcul", () => {
  const r = montantEcheance({
    nature: "box", periode: "mensuel",
    boxes: [{ id: 1, numero: "A1", volume_m3: 5.2 },
            { id: 2, numero: "A2", volume_m3: 4 }],
  }, EXACT);
  assert.equal(r.centimes, 4680 + 3600, "deux emplacements loués, deux prix");
  assert.match(r.lignes[0].libelle, /9\.00 €\/m³/,
    "le client doit pouvoir refaire le calcul lui-même");
  assert.match(r.lignes[1].libelle, /9\.00 €\/m³/);
});

test("changer de mode ne touche pas aux ZONES : elles restent au forfait", () => {
  // Le forfait porte sur le contrat entier — c'est un modèle de prix distinct,
  // pas une variante du box.
  const r = montantEcheance({ nature: "zone", tarif_centimes: 25000,
                              zones: [{ nom: "A" }, { nom: "B" }] }, EXACT);
  assert.equal(r.centimes, 25000, "une seconde zone ne double pas un forfait");
});
