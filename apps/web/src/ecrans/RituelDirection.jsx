// =============================================================================
// RITUEL DE DIRECTION — trois décisions, pas un tableau de bord.
//
// CE QU'IL NE CONTIENT PAS, et c'est délibéré : aucun chiffre d'affaires,
// aucune moyenne, aucun graphique. Un patron qui ouvre l'app veut savoir ce
// qu'il doit décider aujourd'hui. « 12 400 € facturés ce mois » n'appelle
// aucune décision — c'est du réconfort ou de l'angoisse, pas de
// l'information.
//
// LES TROIS BLOCS, dans l'ordre de ce qui coûte le plus cher à ignorer :
//
//   1. LE TRAVAIL FAIT NON FACTURÉ. De l'argent qui dort, et personne ne le
//      voit passer — c'est le seul poste qu'on peut encaisser aujourd'hui
//      sans vendre quoi que ce soit.
//   2. CE QUI RESTE DÛ, avec l'ANCIENNETÉ. 500 € vieux de 90 jours n'est pas
//      le même problème que 5 000 € émis hier. Le montant sans l'âge ne dit
//      pas quoi faire.
//   3. LES CHANTIERS NON COUVERTS. Le seul des trois qui se règle le jour
//      même, et le seul qui devient impossible à régler si on le voit trop
//      tard.
//
// IL SE TERMINE. Quand les trois blocs sont vides, l'écran le dit et il n'y a
// rien à faire. C'est la seule preuve que l'app a fait son travail.
// =============================================================================

import React, { useEffect, useState } from "react";
import { rituelDirection } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const euros = (c) => `${Math.round((c || 0) / 100).toLocaleString("fr-BE")} €`;

const jour = (iso) => (iso
  ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-BE",
    { weekday: "short", day: "numeric", month: "short" })
  : "—");

export default function RituelDirection({ ouvrirDossier, versFacture, versPlanning }) {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    rituelDirection()
      .then(setD)
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setD(null); });
  }, []);

  if (!d && !erreur) return null;

  const rienAFaire = d && d.aFacturer.nb === 0 && d.impayes.nb === 0
    && d.nonCouverts.nb === 0;
  // ZÉRO A DEUX CAUSES OPPOSÉES. « Tout est réglé » est une bonne nouvelle ;
  // « il n'y a rien » est un démarrage. Afficher le premier message dans le
  // second cas est un mensonge, et ça se lit comme un bug : un patron qui sait
  // qu'il a des chantiers la semaine prochaine et lit « tout est couvert »
  // cesse de croire l'écran.
  const demarrage = d && rienAFaire
    && d.volume.dossiersActifs === 0 && d.volume.facturesEmises === 0;

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        <div style={S.titre}>Aujourd'hui</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {rienAFaire
            ? "Rien ne vous attend."
            : "Ce qui ne peut pas se décider sans vous."}
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {demarrage && (
        <div style={S.carte}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
            Rien à décider : il n'y a pas encore de dossier.
          </div>
          <div style={{ fontSize: 12.5, color: C.muet, marginTop: 5,
                        lineHeight: 1.55 }}>
            Cet écran se remplit tout seul au fur et à mesure. Il vous
            montrera trois choses : les chantiers faits qu'il reste à
            facturer, ce que vos clients vous doivent et depuis combien de
            temps, et les chantiers des deux prochaines semaines sans équipe.
          </div>
        </div>
      )}

      {rienAFaire && !demarrage && (
        <div style={{ ...S.carte, background: C.teinteVerte,
                      border: `1px solid ${C.filetVert}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.encreVert }}>
            Tout est facturé, tout est encaissé, tout est couvert.
          </div>
          <div style={{ fontSize: 12.5, color: C.encreVert, marginTop: 5,
                        lineHeight: 1.5 }}>
            {d.volume.missions14j > 0
              ? `${d.volume.missions14j} chantier${d.volume.missions14j > 1 ? "s" : ""} dans les deux prochaines semaines, tous avec une équipe.`
              : "Aucun chantier planifié dans les deux prochaines semaines."}
          </div>
        </div>
      )}

      {d && d.aFacturer.nb > 0 && (
        <Bloc titre="À facturer"
              chiffre={`${d.aFacturer.nb} chantier${d.aFacturer.nb > 1 ? "s" : ""}`}
              sousTitre="Le travail est fait, la facture n'est pas partie."
              ton="ambre">
          {d.aFacturer.lignes.map((l) => (
            <Ligne key={l.id} onClick={() => ouvrirDossier && ouvrirDossier(l.id)}
                   gauche={l.client || "Client sans nom"}
                   droite={l.cloture_le ? `clos ${jour(l.cloture_le)}` : "à clore"} />
          ))}
        </Bloc>
      )}

      {d && d.impayes.nb > 0 && (
        <Bloc titre="Reste dû"
              chiffre={euros(d.impayes.totalCentimes)}
              sousTitre={d.impayes.joursMax > 0
                ? `Le plus ancien attend depuis ${d.impayes.joursMax} jours.`
                : "Émis récemment."}
              ton={d.impayes.joursMax > 60 ? "rouge" : "neutre"}>
          {d.impayes.lignes.map((l) => (
            <Ligne key={l.affaire_id}
                   onClick={() => ouvrirDossier && ouvrirDossier(l.affaire_id)}
                   gauche={l.client || "Client sans nom"}
                   droite={`${euros(l.solde)} · ${l.jours} j`}
                   alerte={l.jours > 60} />
          ))}
        </Bloc>
      )}

      {d && d.nonCouverts.nb > 0 && (
        <Bloc titre="Personne dessus"
              chiffre={`${d.nonCouverts.nb} chantier${d.nonCouverts.nb > 1 ? "s" : ""}`}
              sousTitre="Dans les quatorze prochains jours, sans équipe affectée."
              ton="rouge">
          {d.nonCouverts.lignes.map((l) => (
            <Ligne key={l.id} onClick={() => versPlanning && versPlanning()}
                   gauche={`${jour(l.date)} — ${l.client || "sans client"}`}
                   droite={l.type || ""} alerte />
          ))}
        </Bloc>
      )}
    </div>
  );
}

/**
 * Un bloc = un chiffre + une phrase qui dit quoi en faire + les lignes.
 *
 * Le chiffre seul ne suffit pas : « 5 » ne dit rien. « 5 chantiers, le travail
 * est fait, la facture n'est pas partie » dit quoi faire.
 */
function Bloc({ titre, chiffre, sousTitre, ton = "neutre", children }) {
  const tons = {
    ambre: [C.teinteAmbre, C.filetAmbre, C.encreAmbre],
    rouge: [C.teinteRouge, C.filetRouge, C.encreRouge],
    neutre: [C.blanc, C.bord, C.encre],
  };
  const [bg, filet, encre] = tons[ton] || tons.neutre;
  return (
    <div style={{ ...S.carte, background: bg, border: `1px solid ${filet}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: encre, opacity: 0.75,
                    textTransform: "uppercase", letterSpacing: ".04em" }}>
        {titre}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: encre, marginTop: 2 }}>
        {chiffre}
      </div>
      <div style={{ fontSize: 12.5, color: encre, opacity: 0.8, marginTop: 2,
                    lineHeight: 1.5 }}>
        {sousTitre}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Ligne({ gauche, droite, onClick, alerte = false }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      style={{ display: "flex", width: "100%", gap: 10, alignItems: "baseline",
               padding: "8px 0", background: "none", border: "none",
               borderTop: `1px solid rgba(0,0,0,.07)`, textAlign: "left",
               fontFamily: "inherit", cursor: onClick ? "pointer" : "default" }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600,
                     color: C.encre }}>{gauche}</span>
      <span style={{ fontSize: 12.5, flexShrink: 0,
                     fontWeight: alerte ? 700 : 400,
                     color: alerte ? C.encreRouge : C.muet }}>{droite}</span>
    </button>
  );
}
