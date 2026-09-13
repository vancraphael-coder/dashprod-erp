// =============================================================================
// LE TEMPS D'UN CHANTIER SE DÉCOMPOSE.
//
// CE QUI CASSE SANS CES TESTS : l'oubli systématique du trajet. Estimer « une
// journée » pour un chantier à 80 km oublie 1 h 47 de route aller-retour —
// et l'oubli n'est pas aléatoire, il porte toujours sur le même poste, parce
// que c'est le seul temps où personne ne travaille.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  VITESSE_ROUTE_KMH, PAS_FACTURATION_MINUTES, minutesDeRoute, minutesDeLEtape,
  enHeuresMinutes, formaterDuree, detailTemps, heuresFacturables,
  allerRetourSimple, lignesLisibles,
} from "../src/chiffrage/temps-chantier.js";

test("la convention de calcul est 90 km/h, et elle est nommée", () => {
  // Ce n'est ni une vitesse réelle ni une promesse : c'est une hypothèse de
  // calcul. Un chiffre dont on ignore l'hypothèse ne se discute pas.
  assert.equal(VITESSE_ROUTE_KMH, 90);
  assert.equal(minutesDeRoute(90), 60);
  assert.equal(minutesDeRoute(45), 30);
  assert.equal(minutesDeRoute(0), 0);
});

test("les kilomètres deviennent des heures et des minutes", () => {
  assert.equal(minutesDeRoute(80), 53);
  assert.deepEqual(enHeuresMinutes(53), { heures: 0, minutes: 53 });
  assert.deepEqual(enHeuresMinutes(107), { heures: 1, minutes: 47 });
  assert.equal(formaterDuree(107), "1 h 47");
  assert.equal(formaterDuree(53), "53 min");
  assert.equal(formaterDuree(120), "2 h");
});

test("une convention différente donne un autre temps", () => {
  // Une entreprise de centre-ville n'a pas la convention d'une entreprise
  // d'autoroute. La vitesse est un réglage, pas une constante du code.
  assert.equal(minutesDeRoute(45, 60), 45);
  assert.equal(minutesDeRoute(45, 30), 90);
  // Vitesse nulle : on ne divise pas par zéro, on rend zéro.
  assert.equal(minutesDeRoute(45, 0), 0);
});

test("une étape dit une seule chose", () => {
  assert.equal(minutesDeLEtape({ type: "route", km: 45 }), 30);
  assert.equal(minutesDeLEtape({ type: "chargement", heures: 1, minutes: 30 }), 90);
  assert.equal(minutesDeLEtape({ type: "dechargement", heures: 2 }), 120);
  assert.equal(minutesDeLEtape({ type: "attente", minutes: 20 }), 20);
  // Un type inconnu ne contribue pas — mieux vaut zéro qu'un temps inventé.
  assert.equal(minutesDeLEtape({ type: "cafe", heures: 1 }), 0);
  assert.equal(minutesDeLEtape(null), 0);
});

test("LE CAS RÉEL — un chantier à 80 km, décomposé", () => {
  const etapes = allerRetourSimple({
    kmDepotChargement: 12, kmChargementLivraison: 80,
    chargementHeures: 2, dechargementHeures: 1, dechargementMinutes: 30,
  });
  const d = detailTemps(etapes);

  // Route : 12 km → 8 min, 80 km → 53 min, 92 km de retour → 61 min = 122.
  // L'arrondi se fait PAR ÉTAPE, pas sur le total : c'est ce qui garantit que
  // la somme des durées affichées égale le total affiché. Arrondir le total
  // donnerait 123 et un devis qui ne se vérifie pas à la calculette.
  assert.equal(d.km_total, 184);
  assert.equal(d.par_type.route, 122);
  assert.equal(d.par_type.chargement, 120);
  assert.equal(d.par_type.dechargement, 90);
  assert.equal(d.minutes_total, 332);
  assert.equal(formaterDuree(d.minutes_total), "5 h 32");
  // Et la somme des lignes fait bien le total.
  assert.equal(d.lignes.reduce((s, l) => s + l.minutes, 0), d.minutes_total);

  // Estimé de tête, ce chantier aurait été annoncé à 3 h 30 de manutention.
  // Les 2 h 02 de route sont exactement ce qu'on oublie.
});

test("le retour au dépôt est compté, jamais présumé nul", () => {
  // C'est du temps payé, et c'est le premier oublié.
  const avec = detailTemps(allerRetourSimple({
    kmDepotChargement: 10, kmChargementLivraison: 50 }));
  assert.equal(avec.km_total, 120);          // 10 + 50 + 60 de retour

  // Retour connu et plus court (boucle) : on l'utilise tel quel.
  const boucle = detailTemps(allerRetourSimple({
    kmDepotChargement: 10, kmChargementLivraison: 50, kmLivraisonDepot: 45 }));
  assert.equal(boucle.km_total, 105);
});

test("les heures facturées s'arrondissent AU-DESSUS du quart d'heure", () => {
  // Arrondir en dessous fait perdre de l'argent à chaque chantier sans que ça
  // se voie : personne ne remarque huit minutes. Au-dessus, c'est visible,
  // donc discutable, donc honnête.
  assert.equal(PAS_FACTURATION_MINUTES, 15);
  // 333 min → 345 min → 5,75 h
  const etapes = allerRetourSimple({
    kmDepotChargement: 12, kmChargementLivraison: 80,
    chargementHeures: 2, dechargementHeures: 1, dechargementMinutes: 30 });
  assert.equal(heuresFacturables(etapes), 5.75);
  // Pile sur le pas : pas de quart d'heure ajouté pour rien.
  assert.equal(heuresFacturables([{ type: "chargement", heures: 2 }]), 2);
  assert.equal(heuresFacturables([{ type: "chargement", minutes: 61 }]), 1.25);
});

test("la majoration est EXPLICITE, jamais cachée dans la formule", () => {
  // Un coefficient invisible mentirait sur la nature du chiffre : le modèle
  // calcule un temps théorique, pas un temps de trajet réel.
  const etapes = [{ type: "route", km: 90 }];
  const sans = detailTemps(etapes);
  const avec = detailTemps(etapes, { majorationPct: 20 });
  assert.equal(sans.minutes_majoration, 0);
  assert.equal(sans.minutes_total, 60);
  assert.equal(avec.minutes_majoration, 12);
  assert.equal(avec.minutes_total, 72);
  // Et elle apparaît sur le devis, en clair.
  const l = lignesLisibles(etapes, { majorationPct: 20 });
  assert.equal(l.length, 2);
  assert.match(l[1].libelle, /Majoration 20 %/);
});

test("le devis se vérifie à la calculette", () => {
  // Un client doit pouvoir refaire le total. Chaque ligne porte sa distance et
  // sa durée ; la somme des durées fait le total.
  const etapes = allerRetourSimple({
    kmDepotChargement: 12, kmChargementLivraison: 80,
    chargementHeures: 2, dechargementHeures: 1, dechargementMinutes: 30 });
  const l = lignesLisibles(etapes);
  assert.equal(l.length, 5);
  assert.match(l[0].libelle, /Dépôt → chargement — 12 km/);
  assert.equal(l[0].duree, "8 min");
  assert.equal(l[1].libelle, "Chargement");
  assert.equal(l[1].duree, "2 h");
  assert.match(l[4].libelle, /Retour dépôt — 92 km/);
});

test("les entrées absurdes ne produisent pas de temps", () => {
  // Un devis ne doit pas se nourrir d'un NaN devenu zéro par accident, ni
  // d'un négatif devenu crédit d'heures.
  assert.equal(minutesDeRoute("abc"), 0);
  assert.equal(minutesDeRoute(-50), 0);
  assert.equal(minutesDeLEtape({ type: "chargement", heures: -3 }), 0);
  const d = detailTemps(null);
  assert.equal(d.minutes_total, 0);
  assert.equal(d.km_total, 0);
  assert.equal(heuresFacturables(undefined), 0);
});

test("le kilométrage total sort du même endroit que le temps", () => {
  // Le moteur facture aussi les kilomètres. Les recompter ailleurs, c'est
  // garantir qu'un jour les deux chiffres ne diront plus la même chose.
  const d = detailTemps([
    { type: "route", km: 12.4 },
    { type: "chargement", heures: 1 },
    { type: "route", km: 7.1 },
  ]);
  assert.equal(d.km_total, 19.5);
});
