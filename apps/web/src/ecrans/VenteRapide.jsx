// =============================================================================
// VENTE RAPIDE — vendre des fournitures en quelques gestes, comptoir ou livrée.
//
// Un écran court : des lignes (nom, prix, TVA, quantité), un total en direct, un
// interrupteur livraison. On valide → une facture est émise (numéro, échéance,
// communication de la vague 1). Le calcul est PUR (lot E : ligneVente /
// composerVente) ; l'écran ne fait qu'assembler et envoyer.
// =============================================================================

import React, { useState, useEffect, useMemo } from "react";
import { composerVente } from "@domaine/stocks/vente-fournitures.js";
import { catalogueArticles, venteRapide } from "../lib/adaptateur.js";
import { C, S, euros } from "../lib/theme.jsx";

// Une ligne d'écran : article libre ou repris du catalogue.
const ligneVide = () => ({ nom: "", prix: "", tva: 21, quantite: 1 });

export default function VenteRapide({ retour, versFacture }) {
  const [client, setClient] = useState("");
  const [lignes, setLignes] = useState([ligneVide()]);
  const [avecLivraison, setAvecLivraison] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [dateLiv, setDateLiv] = useState("");
  const [catalogue, setCatalogue] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { catalogueArticles().then(setCatalogue).catch(() => setCatalogue([])); }, []);

  // Les lignes valides, calculées par le domaine (centimes + TVA). Une ligne
  // incomplète est simplement ignorée du total, pas facturée. L'aperçu de TVA
  // est LOCAL et indicatif (le calcul légal se fait à l'émission) : on somme
  // par ligne selon son taux, sans passer par le moteur pays.
  const { lignesFacture, apercu } = useMemo(() => {
    const panier = lignes.map((l) => ({
      article: { nom: l.nom, prix_unitaire: Number(String(l.prix).replace(",", ".")), tva_pct: l.tva },
      quantite: l.quantite,
    }));
    const { lignes: lf } = composerVente(panier);
    let base = 0; let tva = 0;
    for (const l of lf) {
      base += l.montant_htva_centimes;
      tva += Math.round(l.montant_htva_centimes * (Number(l.tva_pct) || 0) / 100);
    }
    return { lignesFacture: lf, apercu: { base_centimes: base, tva_centimes: tva,
             total_tvac_centimes: base + tva } };
  }, [lignes]);

  function maj(i, champ, valeur) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [champ]: valeur } : l)));
  }
  function ajouterLigne() { setLignes((ls) => [...ls, ligneVide()]); }
  function retirerLigne(i) { setLignes((ls) => ls.filter((_, j) => j !== i)); }
  function prendreDuCatalogue(i, articleId) {
    const a = catalogue.find((x) => x.id === articleId);
    if (!a) return;
    maj(i, "nom", a.nom);
    setLignes((ls) => ls.map((l, j) => (j === i
      ? { ...l, nom: a.nom, prix: String(a.prix_unitaire), tva: Number(a.tva_pct) } : l)));
  }

  async function valider() {
    setErreur(null);
    if (lignesFacture.length === 0) { setErreur("Ajoutez au moins un article (nom, prix)."); return; }
    setEnCours(true);
    try {
      const res = await venteRapide({
        clientNom: client.trim() || "Client comptoir",
        lignes: lignesFacture,
        livraison: avecLivraison ? { adresse: adresse.trim(), date: dateLiv } : null,
      });
      if (versFacture) versFacture(res.affaireId);
      else retour && retour();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  const total = apercu?.total_tvac_centimes ?? 0;

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        {retour && (
          <button onClick={retour} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: C.muet }}>←</button>
        )}
        <div style={{ fontSize: 18, fontWeight: 800, color: C.encre }}>Vente rapide</div>
      </div>

      {/* Client */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Client</label>
        <input style={S.input} value={client} onChange={(e) => setClient(e.target.value)}
          placeholder="Nom du client (ou laisser vide : comptoir)" />
      </div>

      {/* Livraison — absorbée dans l'UX : un interrupteur, et les champs
          n'apparaissent que si on livre. */}
      <div style={S.carte}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAvecLivraison(false)}
            style={pastille(!avecLivraison)}>Au comptoir</button>
          <button onClick={() => setAvecLivraison(true)}
            style={pastille(avecLivraison)}>Avec livraison</button>
        </div>
        {avecLivraison && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <input style={S.input} value={adresse} onChange={(e) => setAdresse(e.target.value)}
              placeholder="Adresse de livraison" />
            <input style={S.input} type="date" value={dateLiv}
              onChange={(e) => setDateLiv(e.target.value)} />
          </div>
        )}
      </div>

      {/* Les articles */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Articles</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lignes.map((l, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6,
                borderBottom: `1px solid ${C.bord}`, paddingBottom: 10 }}>
              {catalogue.length > 0 && (
                <select style={{ ...S.input, padding: "8px 10px" }}
                  value=""
                  onChange={(e) => prendreDuCatalogue(i, e.target.value)}>
                  <option value="">— reprendre un article du catalogue —</option>
                  {catalogue.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom} ({euros(Math.round(a.prix_unitaire * 100))})</option>
                  ))}
                </select>
              )}
              <input style={S.input} value={l.nom} onChange={(e) => maj(i, "nom", e.target.value)}
                placeholder="Nom de l'article (ex. Carton 60L)" />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ ...S.input, flex: 2 }} value={l.prix} inputMode="decimal"
                  onChange={(e) => maj(i, "prix", e.target.value)} placeholder="Prix € HTVA" />
                <select style={{ ...S.input, flex: 1, padding: "8px 6px" }} value={l.tva}
                  onChange={(e) => maj(i, "tva", Number(e.target.value))}>
                  <option value={21}>21 %</option>
                  <option value={12}>12 %</option>
                  <option value={6}>6 %</option>
                  <option value={0}>0 %</option>
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => maj(i, "quantite", Math.max(1, l.quantite - 1))}
                    style={pasQte}>−</button>
                  <span style={{ minWidth: 22, textAlign: "center", fontWeight: 700 }}>{l.quantite}</span>
                  <button onClick={() => maj(i, "quantite", l.quantite + 1)} style={pasQte}>+</button>
                </div>
                {lignes.length > 1 && (
                  <button onClick={() => retirerLigne(i)} style={{ ...pasQte, color: C.rouge }}>×</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={ajouterLigne} style={{ marginTop: 10, background: "none",
          border: `1px dashed ${C.bord}`, borderRadius: 9, padding: "9px",
          width: "100%", cursor: "pointer", color: C.bleu, fontWeight: 700, fontSize: 13 }}>
          + Ajouter un article
        </button>
      </div>

      {/* Total en direct */}
      <div style={S.carte}>
        <Ligne l="Total HTVA" v={euros(apercu?.base_centimes ?? 0)} />
        <Ligne l="TVA" v={euros(apercu?.tva_centimes ?? 0)} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
          paddingTop: 8, borderTop: `1px solid ${C.bord}` }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>Total TVAC</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.encre }}>{euros(total)}</span>
        </div>
      </div>

      {erreur && <div style={{ margin: "0 16px 10px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}

      <div style={{ margin: "0 16px" }}>
        <button style={{ ...S.boutonPlein, opacity: lignesFacture.length && !enCours ? 1 : 0.5 }}
          disabled={!lignesFacture.length || enCours} onClick={valider}>
          {enCours ? "Émission…" : "Créer la vente et facturer"}
        </button>
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8, textAlign: "center" }}>
          La facture est émise avec son numéro légal, son échéance et sa communication.
        </div>
      </div>
    </div>
  );
}

function Ligne({ l, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13,
      color: C.muet, padding: "3px 0" }}>
      <span>{l}</span><span style={{ fontWeight: 700, color: C.encre }}>{v}</span>
    </div>
  );
}

function pastille(actif) {
  return {
    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
    border: `1px solid ${actif ? C.encre : C.bord}`,
    background: actif ? C.encre : "transparent",
    color: actif ? "#fff" : C.muet, fontWeight: 700, fontSize: 13,
  };
}
const pasQte = {
  width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.bord}`,
  background: "transparent", cursor: "pointer", fontSize: 16, color: C.encre,
  lineHeight: 1, padding: 0,
};
