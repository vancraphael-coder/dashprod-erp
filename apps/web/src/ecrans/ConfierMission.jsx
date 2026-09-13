// =============================================================================
// CONFIER UNE MISSION — le côté donneur d'ordre.
//
// CE QUE CET ÉCRAN NE FAIT PAS. Il ne consulte pas les paramètres du
// prestataire, ni son planning, ni ses autres missions. Il lit deux tables
// publiables — la vitrine et les tarifs publiés — et rien d'autre. Le
// cloisonnement n'est pas contourné pour cet écran : il n'a simplement pas
// besoin de l'être.
//
// LE PRIX NE SE SAISIT PAS. On choisit un tarif que le prestataire a publié,
// et la commande recopie le montant. L'écran n'envoie aucun prix : pouvoir le
// taper permettrait d'imposer un tarif que personne n'a affiché.
//
// L'ADRESSE RESTE DE NOTRE CÔTÉ. Elle est saisie ici, rangée dans notre
// rattachement privé, et ne franchit la cloison qu'au moment où le prestataire
// accepte. Ce n'est pas de la pudeur : avant l'accord, le prestataire n'a
// aucune raison de connaître le domicile de notre client — et en cas de refus,
// il ne l'aura jamais eue.
//
// TROIS ÉTAPES, DANS L'ORDRE OÙ ON PENSE. Qui, puis quoi, puis on envoie. Pas
// un formulaire de douze champs : on choisit une personne avant de décrire une
// mission, comme on décroche le téléphone avant de parler.
// =============================================================================

import React, { useEffect, useState } from "react";
import { annuairePrestataires, tarifsDuPrestataire, proposerEngagement }
  from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const euros = (c) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

const UNITES = {
  heure: "de l'heure", demi_journee: "la demi-journée",
  journee: "la journée", forfait: "forfait",
};

export default function ConfierMission({ affaireId, villeDefaut, cpDefaut, retour }) {
  const [zone, setZone] = useState("");
  const [annuaire, setAnnuaire] = useState(null);
  const [choisi, setChoisi] = useState(null);     // { orgId, nom, ... }
  const [tarifs, setTarifs] = useState([]);
  const [tarif, setTarif] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoye, setEnvoye] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [f, setF] = useState({
    date: "", heure: "", dureeMinutes: "", nature: "",
    ville: villeDefaut || "", codePostal: cpDefaut || "",
    adresse: "", contact: "",
  });
  const maj = (cle) => (e) => setF((x) => ({ ...x, [cle]: e.target.value }));

  useEffect(() => {
    annuairePrestataires(zone.trim() || null)
      .then(setAnnuaire)
      .catch((e) => { setErreur(e?.message || "Annuaire indisponible"); setAnnuaire([]); });
  }, [zone]);

  useEffect(() => {
    if (!choisi) { setTarifs([]); setTarif(null); return; }
    tarifsDuPrestataire(choisi.orgId)
      .then((l) => { setTarifs(l); setTarif(l.length === 1 ? l[0] : null); })
      .catch((e) => setErreur(e?.message || "Tarifs indisponibles"));
  }, [choisi]);

  const pret = choisi && tarif && f.date && f.nature.trim().length > 2
            && f.ville.trim() && f.codePostal.trim();

  async function envoyer() {
    setErreur(null);
    setEnCours(true);
    try {
      const r = await proposerEngagement({
        prestataireOrgId: choisi.orgId,
        tarifId: tarif.id,
        date: f.date,
        heure: f.heure || null,
        dureeMinutes: f.dureeMinutes ? Number(f.dureeMinutes) : null,
        nature: f.nature.trim(),
        ville: f.ville.trim(),
        codePostal: f.codePostal.trim(),
        adresse: f.adresse.trim() || null,
        contact: f.contact.trim() || null,
        affaireId: affaireId || null,
      });
      if (r?.ok === false) setErreur(r.motif);
      else setEnvoye({ nom: choisi.nom, prix: r.prix_htva_centimes, unite: r.unite });
    } catch (e) {
      setErreur(e?.message || "Proposition refusée");
    } finally {
      setEnCours(false);
    }
  }

  if (envoye) {
    return (
      <div style={S.page}>
        <div style={S.entete}>
          {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
          <div style={S.titre}>Proposition envoyée</div>
        </div>
        <div style={{ ...S.carte, background: C.teinteVerte,
                      border: `1px solid ${C.filetVert}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encreVert }}>
            {envoye.nom} a reçu votre demande.
          </div>
          <div style={{ fontSize: 12.5, color: C.encreVert, marginTop: 5,
                        lineHeight: 1.55 }}>
            {euros(envoye.prix)} HTVA {UNITES[envoye.unite] || envoye.unite}.
            Elle apparaît sur son écran d'arrivée, à confirmer. Vous verrez sa
            réponse dans le suivi.
          </div>
          <div style={{ fontSize: 11.5, color: C.encreVert, marginTop: 8,
                        lineHeight: 1.5 }}>
            L'adresse exacte ne lui sera transmise qu'après son acceptation.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
        <div style={S.titre}>Confier à un indépendant</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Vous ne voyez que ce qu'ils ont publié : nom, zone, tarifs.
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {/* ── 1. QUI ─────────────────────────────────────────────────────── */}
      <div style={S.carte}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet,
                      textTransform: "uppercase", letterSpacing: ".04em",
                      marginBottom: 10 }}>
          1 · Qui
        </div>

        {!choisi ? (
          <div>
            <label style={{ ...S.label, marginTop: 0 }}>Zone</label>
            <input style={{ ...S.input, marginTop: 0 }} value={zone}
                   placeholder="Brabant wallon" onChange={(e) => setZone(e.target.value)} />

            {annuaire === null ? null : annuaire.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 12,
                            lineHeight: 1.55 }}>
                Aucun indépendant n'a publié de tarif pour cette zone. Un
                prestataire n'apparaît ici qu'après avoir publié au moins un
                tarif — un profil sans prix ne servirait à rien.
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                {annuaire.map((p) => (
                  <button key={p.orgId} onClick={() => setChoisi(p)}
                    style={{ display: "block", width: "100%", textAlign: "left",
                             padding: "11px 13px", marginBottom: 8,
                             borderRadius: 11, cursor: "pointer",
                             border: `1.5px solid ${C.bord}`,
                             background: C.blanc, fontFamily: "inherit" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>
                      {p.nom}
                    </div>
                    <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
                      {p.zone} · à partir de {euros(p.prixMinHtvaCentimes)} HTVA
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: C.encre }}>
              {choisi.nom}
            </div>
            {choisi.presentation && (
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 3,
                            lineHeight: 1.5 }}>
                {choisi.presentation}
              </div>
            )}
            <button style={{ ...S.boutonLien, marginTop: 8, padding: 0 }}
                    onClick={() => setChoisi(null)}>
              Choisir quelqu'un d'autre
            </button>

            <label style={S.label}>Tarif</label>
            {tarifs.map((t) => (
              <button key={t.id} onClick={() => setTarif(t)}
                style={{ display: "block", width: "100%", textAlign: "left",
                         padding: "10px 12px", marginBottom: 6, borderRadius: 10,
                         cursor: "pointer", fontFamily: "inherit",
                         border: `1.5px solid ${tarif?.id === t.id ? C.encreVert : C.bord}`,
                         background: tarif?.id === t.id ? C.teinteVerte : C.blanc }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
                  {euros(t.prixHtvaCentimes)} HTVA {UNITES[t.unite] || t.unite}
                </span>
                <span style={{ fontSize: 12, color: C.muet }}> — {t.libelle}</span>
              </button>
            ))}
            {/* Le prix ne se tape pas : il est choisi parmi ce qui a été
                publié. C'est ce qui empêche d'imposer un montant. */}
            <div style={{ fontSize: 11, color: C.muet, marginTop: 4 }}>
              Le montant vient du tarif publié, il ne se modifie pas ici.
            </div>
          </div>
        )}
      </div>

      {/* ── 2. QUOI ────────────────────────────────────────────────────── */}
      {choisi && tarif && (
        <div style={S.carte}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet,
                        textTransform: "uppercase", letterSpacing: ".04em",
                        marginBottom: 10 }}>
            2 · Quoi
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...S.label, marginTop: 0 }}>Date</label>
              <input type="date" style={{ ...S.input, marginTop: 0 }}
                     value={f.date} onChange={maj("date")} />
            </div>
            <div style={{ width: 110 }}>
              <label style={{ ...S.label, marginTop: 0 }}>Heure</label>
              <input type="time" style={{ ...S.input, marginTop: 0 }}
                     value={f.heure} onChange={maj("heure")} />
            </div>
          </div>

          <label style={S.label}>Ce qu'il y a à faire</label>
          <input style={{ ...S.input, marginTop: 0 }} value={f.nature}
                 placeholder="Chargement 2e étage sans ascenseur, 4 h"
                 onChange={maj("nature")} />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Ville</label>
              <input style={{ ...S.input, marginTop: 0 }} value={f.ville}
                     onChange={maj("ville")} />
            </div>
            <div style={{ width: 110 }}>
              <label style={S.label}>Code postal</label>
              <input style={{ ...S.input, marginTop: 0 }} value={f.codePostal}
                     onChange={maj("codePostal")} />
            </div>
          </div>

          <label style={S.label}>Adresse exacte</label>
          <input style={{ ...S.input, marginTop: 0 }} value={f.adresse}
                 placeholder="Rue du Moulin 14" onChange={maj("adresse")} />
          <label style={S.label}>Contact sur place</label>
          <input style={{ ...S.input, marginTop: 0 }} value={f.contact}
                 placeholder="Mme Dupont 0470 00 00 00" onChange={maj("contact")} />
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6,
                        lineHeight: 1.5 }}>
            Ces deux champs restent chez vous. Ils ne sont transmis qu'au
            moment où le prestataire accepte — s'il refuse, il ne les aura
            jamais vus.
          </div>
        </div>
      )}

      {/* ── 3. ENVOYER ────────────────────────────────────────────────── */}
      {choisi && tarif && (
        <div style={{ padding: "0 16px 24px" }}>
          <button style={{ ...S.boutonPlein, opacity: pret && !enCours ? 1 : 0.5 }}
                  disabled={!pret || enCours} onClick={envoyer}>
            {enCours ? "Envoi…" : `Proposer à ${choisi.nom}`}
          </button>
        </div>
      )}
    </div>
  );
}
