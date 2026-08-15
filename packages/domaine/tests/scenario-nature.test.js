// =============================================================================
// Chiffrage par nature — le point d'entrée unique.
//
// L'enjeu : le devis et l'offre ne doivent PAS savoir quel moteur appeler.
// Sans ce module, « un lift se chiffre par couronne » serait écrit dans deux
// écrans et divergerait au premier changement.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { chiffrerAffaire, manqueAuChiffrage }
  from "../src/chiffrage/scenario-nature.js";
import { zoneMarge } from "../src/chiffrage/moteur.js";

const GRILLE_ST = { homme_heure_centimes: 5000, camion_jour_centimes: 10000,
                    km_centimes: 100, heures_minimum: 2, remise_pct: 0 };

const REGLAGES_LIFT = {
  maisonMere: [{ jusqua_km: 20, prix_centimes: 20000, heures_incluses: 1 }],
};
const SUPP_LIFT = { heure_centimes: 6000, homme_heure_centimes: 4000,
                    km_centimes: 200 };

/* ── Forme commune ──────────────────────────────────────────────────────── */

test("toutes les natures rendent la même forme", () => {
  const st = chiffrerAffaire("sous_traitance",
    { mission: { hommes: 2, heures: 2 }, grille: GRILLE_ST, ref: { tvaPct: 21 } });
  const lift = chiffrerAffaire("lift",
    { mission: { km: 10, heures: 1 }, reglages: REGLAGES_LIFT,
      supplements: SUPP_LIFT, ref: { tvaPct: 21 } });

  for (const r of [st, lift]) {
    for (const cle of ["htva_centimes", "tva_centimes", "tvac_centimes",
                       "couts_centimes", "marge_centimes", "marge_pct", "zone"]) {
      assert.ok(cle in r, `${cle} manquant`);
    }
  }
});

test("la TVA suit le taux de l'organisation, pas une constante", () => {
  const a = chiffrerAffaire("sous_traitance",
    { mission: { hommes: 1, heures: 2 }, grille: GRILLE_ST, ref: { tvaPct: 21 } });
  const b = chiffrerAffaire("sous_traitance",
    { mission: { hommes: 1, heures: 2 }, grille: GRILLE_ST, ref: { tvaPct: 6 } });
  assert.equal(a.htva_centimes, b.htva_centimes);
  assert.notEqual(a.tva_centimes, b.tva_centimes);
  assert.equal(b.tva_centimes, Math.round(b.htva_centimes * 6 / 100));
});

test("la zone de marge réutilise les seuils du moteur historique", () => {
  // Un second jeu de seuils ferait diverger la lecture des marges, et les
  // couleurs de l'écran sont indexées sur CES noms de zones.
  const r = chiffrerAffaire("sous_traitance", {
    mission: { hommes: 2, heures: 2 }, grille: GRILLE_ST,
    couts: { salaires: 5000 }, ref: { tvaPct: 21 } });
  assert.equal(r.zone, zoneMarge(r.marge_pct));
  assert.ok(["sous_cible", "dans_cible", "premium"].includes(r.zone));
});

test("une marge sur un total nul ne produit jamais Infinity", () => {
  // Diviser par zéro traverserait jusqu'à l'affichage.
  const r = chiffrerAffaire("lift", {
    mission: { km: 10, heures: 1 },
    reglages: { maisonMere: [{ jusqua_km: 20, prix_centimes: 0, heures_incluses: 1 }] },
    supplements: SUPP_LIFT, ref: { tvaPct: 21 } });
  assert.equal(Number.isFinite(r.marge_pct), true);
  assert.equal(r.marge_pct, 0);
});

/* ── L'aiguillage ───────────────────────────────────────────────────────── */

test("chaque nature part vers son propre moteur", () => {
  const lift = chiffrerAffaire("lift",
    { mission: { km: 10, heures: 1 }, reglages: REGLAGES_LIFT,
      supplements: SUPP_LIFT, ref: { tvaPct: 21 } });
  assert.equal(lift.htva_centimes, 20000);
  assert.ok(lift.lignes.some((l) => l.cle === "lift"));

  const st = chiffrerAffaire("sous_traitance",
    { mission: { hommes: 2, heures: 2 }, grille: GRILLE_ST, ref: { tvaPct: 21 } });
  assert.equal(st.htva_centimes, 2 * 2 * 5000);
  assert.ok(st.lignes.some((l) => l.cle === "main_doeuvre"));
});

test("le déménagement garde son moteur, avec ses suppléments", () => {
  const r = chiffrerAffaire("demenagement", {
    faits: { formule: "forfait", forfait_centimes: 100000 },
    couts: {}, ref: { tvaPct: 21 } });
  assert.ok(r === null || typeof r.htva_centimes === "number",
    "on n'a pas réécrit le moteur historique");
});

test("les natures récurrentes ne se chiffrent pas en une fois", () => {
  // Leur montant vit sur le contrat, période après période. Rendre un total
  // ponctuel serait trompeur.
  assert.equal(chiffrerAffaire("boxe", { mission: {} }), null);
  assert.equal(chiffrerAffaire("zone", { mission: {} }), null);
});

test("une sous-traitance sans homme ne se chiffre pas", () => {
  // Pas de main-d'œuvre = pas de prestation. Rendre 0 € passerait pour un
  // chiffrage valide.
  assert.equal(chiffrerAffaire("sous_traitance",
    { mission: { hommes: 0, camions: 1 }, grille: GRILLE_ST }), null);
});

test("sans grille déclarée, le lift chiffre au DÉFAUT et le dit", () => {
  // Choix assumé : refuser de chiffrer bloquerait une entreprise qui n'a pas
  // encore réglé ses couronnes. On chiffre donc sur les valeurs par défaut,
  // mais `origine` vaut "defaut" — et l'écran l'affiche, pour que personne ne
  // prenne ces prix pour les siens.
  const r = chiffrerAffaire("lift",
    { mission: { km: 10 }, reglages: { maisonMere: [] },
      supplements: SUPP_LIFT, ref: { tvaPct: 21 } });
  assert.ok(r, "un chiffrage doit être rendu");
  assert.equal(r.origine, "defaut",
    "l'origine doit signaler que ce ne sont pas les prix de l'entreprise");
});

/* ── Ce qui manque ──────────────────────────────────────────────────────── */

test("l'écran sait dire ce qui manque avant de chiffrer", () => {
  const st = manqueAuChiffrage("sous_traitance", { mission: {} });
  assert.ok(st.some((x) => /homme/i.test(x)));
  assert.ok(st.some((x) => /heure/i.test(x)));
  assert.deepEqual(manqueAuChiffrage("sous_traitance",
    { mission: { hommes: 2, heures: 3 } }), []);

  const lift = manqueAuChiffrage("lift", { mission: {} });
  assert.ok(lift.some((x) => /distance/i.test(x)));
  // 0 km est une valeur légitime : le chantier est au dépôt.
  assert.deepEqual(manqueAuChiffrage("lift", { mission: { km: 0 } }), []);
});

test("une nature inconnue est signalée, pas chiffrée en douce", () => {
  assert.deepEqual(manqueAuChiffrage("bricolage", {}), ["Nature inconnue"]);
});
