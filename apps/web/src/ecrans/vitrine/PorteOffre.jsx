// =============================================================================
// PORTE D'OFFRE — une page par offre, qui fait TRAVERSER le produit.
//
// CE QU'ELLE REMPLACE. La landing empilait des cartes de prix : un nom, un
// montant, une liste de cases. Un visiteur ne se demande pas combien de
// modules il achète, il se demande « il se passe quoi, chez moi, du premier
// appel jusqu'à l'argent sur le compte ». Cette page répond à ça, dans
// l'ordre où les choses arrivent, en nommant l'écran de chaque étape — c'est
// ce qui rend la promesse vérifiable plutôt que publicitaire.
//
// TROIS RÈGLES TENUES ICI.
//   · Le prix, les seuils et le statut viennent du référentiel. Aucun chiffre
//     n'est écrit dans ce fichier : c'est exactement ainsi que les deux
//     catalogues avaient divergé.
//   · Une offre non souscriptible ne propose JAMAIS de souscrire. Elle dit
//     « bientôt », explique pourquoi, et propose d'être prévenu.
//   · Ce que l'offre ne couvre PAS est affiché aussi haut que ce qu'elle
//     couvre. Une offre dont on ignore les limites se vend une fois et se
//     rembourse ensuite.
// =============================================================================

import React from "react";
import { V, DISPLAY, MONO, NavPublique, PiedPublic } from "./theme-vitrine.jsx";
import { offreReferentiel } from "@domaine/commercial/referentiel-offres.js";
import { parcoursOffre, ecransOffre } from "@domaine/commercial/parcours-offres.js";
import { REMISE_ANNUELLE_PCT } from "@domaine/commercial/plans.js";

const euros = (c) => (c / 100).toLocaleString("fr-BE",
  { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function PorteOffre({ code, aller }) {
  const offre = offreReferentiel(code);
  const p = parcoursOffre(code);

  // Une offre inconnue ne renvoie pas une page vide : elle ramène au
  // catalogue. Un lien périmé partagé par mail arrive ici.
  if (!offre || !p) {
    return (
      <div style={{ background: V.nuit, minHeight: "100vh", color: "#fff" }}>
        <NavPublique page="offre" aller={aller} sombre />
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "80px 20px" }}>
          <h1 className="v-display" style={{ fontSize: 26, margin: 0 }}>
            Cette offre n'existe pas.
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
            Elle a peut-être changé de nom, ou n'a jamais été publiée.
          </p>
          <button className="v-btn v-btn-plein" onClick={() => aller("accueil")}>
            Voir toutes les offres
          </button>
        </div>
        <PiedPublic aller={aller} />
      </div>
    );
  }

  const ouverte = offre.souscriptible;
  const gratuite = offre.prix_base_centimes === 0;
  const ecrans = ecransOffre(code);

  return (
    <div style={{ background: V.nuit, minHeight: "100vh", color: "#fff" }}>
      <NavPublique page="offre" aller={aller} sombre />

      {/* ── EN-TÊTE : qui c'est pour, ce que ça coûte, où ça en est ──────── */}
      <header style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 8px" }}>
        <button onClick={() => aller("accueil")}
          style={{ background: "none", border: "none", cursor: "pointer",
                   color: "rgba(255,255,255,.55)", fontSize: 12.5,
                   padding: 0, marginBottom: 20 }}>
          ← Toutes les offres
        </button>

        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .7,
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,.45)" }}>
          {offre.secteur || "Offre déménageur"}
        </div>

        <h1 className="v-display" style={{ fontFamily: DISPLAY, fontSize: 40,
                                           margin: "8px 0 0", lineHeight: 1.1 }}>
          {offre.libelle}
        </h1>

        <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5,
                    margin: "14px 0 0", maxWidth: "44ch",
                    color: "rgba(255,255,255,.88)" }}>
          {p.accroche}
        </p>

        {/* Le prix vient du référentiel — jamais d'un littéral. */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 9,
                      marginTop: 26, flexWrap: "wrap" }}>
          <span className="v-display" style={{ fontSize: 34, fontWeight: 800,
                                               color: gratuite ? "#60A5FA" : "#fff" }}>
            {gratuite ? "Gratuit" : euros(offre.prix_base_centimes)}
          </span>
          {!gratuite && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
              HTVA {offre.unite}
            </span>
          )}
          {!ouverte && (
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .4,
                           textTransform: "uppercase", padding: "5px 10px",
                           borderRadius: 999, background: "rgba(217,119,6,.22)",
                           color: "#FCD34D",
                           border: "1px solid rgba(217,119,6,.4)" }}>
              Bientôt
            </span>
          )}
        </div>

        <Seuils offre={offre} />
      </header>

      {/* ── LE VOYAGE ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "36px 20px 0" }}>
        <h2 className="v-display" style={{ fontSize: 22, margin: "0 0 6px" }}>
          Ce qui se passe, dans l'ordre
        </h2>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.55)",
                    margin: "0 0 26px", maxWidth: "58ch", lineHeight: 1.6 }}>
          Chaque étape se passe dans un écran précis. C'est ce qui vous permet
          de vérifier la promesse au lieu de la croire.
        </p>

        <ol style={{ listStyle: "none", margin: 0, padding: 0,
                     display: "grid", gap: 2 }}>
          {p.parcours.map((e, i) => (
            <li key={e.etape + i} style={{ display: "flex", gap: 16 }}>
              {/* Le fil : ce qui donne la sensation d'un trajet, pas d'une liste. */}
              <div style={{ display: "flex", flexDirection: "column",
                            alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: 999,
                               display: "grid", placeItems: "center",
                               fontSize: 12.5, fontWeight: 800,
                               fontFamily: MONO,
                               background: "rgba(37,99,235,.22)",
                               border: "1px solid rgba(96,165,250,.45)",
                               color: "#93C5FD" }}>
                  {i + 1}
                </span>
                {i < p.parcours.length - 1 && (
                  <span style={{ flex: 1, width: 1, minHeight: 26,
                                 background: "rgba(255,255,255,.13)" }} />
                )}
              </div>

              <div style={{ paddingBottom: 26, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "#fff" }}>
                  {e.etape}
                </div>
                <p style={{ margin: "5px 0 0", fontSize: 13.5, lineHeight: 1.6,
                            color: "rgba(255,255,255,.68)", maxWidth: "56ch" }}>
                  {e.texte}
                </p>
                <div style={{ marginTop: 8, fontSize: 11, fontFamily: MONO,
                              color: "rgba(255,255,255,.42)" }}>
                  écran · {e.ecran}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── LES ÉCRANS, DÉRIVÉS DU PARCOURS ──────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "10px 20px 0" }}>
        <h2 className="v-display" style={{ fontSize: 20, margin: "0 0 14px" }}>
          Les {ecrans.length} écrans que vous utiliserez
        </h2>
        <div style={{ display: "grid", gap: 10,
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(230px,100%),1fr))" }}>
          {ecrans.map((e) => (
            <div key={e.nom} style={{ padding: "13px 15px", borderRadius: 13,
                                      background: "rgba(255,255,255,.045)",
                                      border: "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.nom}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.58)",
                            marginTop: 3, lineHeight: 1.5 }}>{e.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CE QUE L'OFFRE NE FAIT PAS ───────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "34px 20px 0" }}>
        <div style={{ padding: "20px 22px", borderRadius: 16,
                      background: "rgba(217,119,6,.09)",
                      border: "1px solid rgba(217,119,6,.28)" }}>
          <h2 className="v-display" style={{ fontSize: 18, margin: "0 0 4px",
                                             color: "#FCD34D" }}>
            Ce que cette offre ne fait pas
          </h2>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)",
                      margin: "0 0 12px", lineHeight: 1.55 }}>
            Autant le savoir avant. Une offre dont on découvre les limites
            après coup ne se garde pas.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none",
                       display: "grid", gap: 8 }}>
            {(p.pas_inclus || []).map((x) => (
              <li key={x} style={{ display: "flex", gap: 9, fontSize: 13.5,
                                   lineHeight: 1.55,
                                   color: "rgba(255,255,255,.8)" }}>
                <span style={{ color: "#FCD34D", fontWeight: 800 }}>—</span>{x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── L'APPEL ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto",
                        padding: "38px 20px 70px" }}>
        {ouverte ? (
          <div>
            <button className="v-btn v-btn-plein"
                    onClick={() => aller("societe")}>
              Commencer avec {offre.libelle}
            </button>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)",
                        marginTop: 12, lineHeight: 1.6, maxWidth: "56ch" }}>
              Paiement annuel : {REMISE_ANNUELLE_PCT} % de remise.
              {offre.prix_membre_supp_centimes != null && (
                ` Au-delà de ${offre.membres_inclus} utilisateur`
                + `${offre.membres_inclus > 1 ? "s" : ""}, chaque accès `
                + `supplémentaire est à `
                + `${Math.round(offre.prix_membre_supp_centimes / 100)} € HTVA `
                + `par mois.`)}
            </p>
          </div>
        ) : (
          <div>
            {/* On n'écrit JAMAIS « souscrire » sur un parcours inexistant. */}
            <button className="v-btn v-btn-plein" onClick={() => aller("accueil")}>
              Être prévenu au lancement
            </button>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)",
                        marginTop: 12, lineHeight: 1.6, maxWidth: "60ch" }}>
              Cette offre n'ouvre pas encore. Nous n'ouvrons une offre que
              lorsque son parcours fonctionne de bout en bout — le trajet
              ci-dessus décrit ce qui est en construction, pas ce qui est déjà
              vendu.
            </p>
          </div>
        )}
      </section>

      <PiedPublic aller={aller} />
    </div>
  );
}

/**
 * Les seuils, dits en toutes lettres. « Sans limite » était faux et vendeur :
 * une offre comprend un nombre d'accès, au-delà ils se facturent ou un
 * plafond dur s'applique.
 */
function Seuils({ offre }) {
  const lignes = [];
  if (offre.membres_inclus > 0) {
    lignes.push(`${offre.membres_inclus} accès inclus`);
  }
  if (offre.membres_limite != null) {
    lignes.push(`plafond dur à ${offre.membres_limite}`);
  } else if (offre.prix_membre_supp_centimes != null) {
    lignes.push(`puis ${Math.round(offre.prix_membre_supp_centimes / 100)} €`
              + " par accès");
  }
  if (offre.centres_inclus > 0) {
    lignes.push(`${offre.centres_inclus} centre logistique inclus`);
  }
  if (lignes.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
      {lignes.map((l) => (
        <span key={l} style={{ fontSize: 11.5, padding: "5px 10px",
          borderRadius: 999, background: "rgba(255,255,255,.07)",
          color: "rgba(255,255,255,.75)",
          border: "1px solid rgba(255,255,255,.1)" }}>{l}</span>
      ))}
    </div>
  );
}
