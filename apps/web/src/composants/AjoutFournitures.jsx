// =============================================================================
// AJOUT DE FOURNITURES À UNE FACTURE (remarque R12, version « jointe »).
//
// Sur la facture d'un déménagement, on peut JOINDRE des fournitures (cartons,
// emballage) au PRIX CLIENT — au lieu d'en faire une facture séparée (ça, c'est
// la vente rapide du « + »). Réutilise le domaine du lot E (composerVente) : une
// ligne incomplète est ignorée, un taux de TVA suit chaque ligne.
//
// Le composant est « contrôlé » : il remonte les lignes prêtes à l'appelant, qui
// les ajoute à celles de la facture avant émission.
// =============================================================================

import React, { useState, useEffect, useMemo } from "react";
import { composerVente } from "@domaine/stocks/vente-fournitures.js";
import { catalogueArticles } from "../lib/adaptateur.js";
import { C, S, euros } from "../lib/theme.jsx";

const ligneVide = () => ({ nom: "", prix: "", tva: 21, quantite: 1 });

export default function AjoutFournitures({ onLignes }) {
  const [ouvert, setOuvert] = useState(false);
  const [lignes, setLignes] = useState([ligneVide()]);
  const [catalogue, setCatalogue] = useState([]);

  useEffect(() => {
    if (ouvert && catalogue.length === 0) {
      catalogueArticles().then(setCatalogue).catch(() => setCatalogue([]));
    }
  }, [ouvert]);

  const lignesFacture = useMemo(() => {
    const panier = lignes.map((l) => ({
      article: { nom: l.nom, prix_unitaire: Number(String(l.prix).replace(",", ".")), tva_pct: l.tva },
      quantite: l.quantite,
    }));
    return composerVente(panier).lignes;
  }, [lignes]);

  // On remonte les lignes prêtes dès qu'elles changent.
  useEffect(() => { onLignes && onLignes(lignesFacture); }, [lignesFacture]);

  function maj(i, champ, valeur) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [champ]: valeur } : l)));
  }
  function prendre(i, id) {
    const a = catalogue.find((x) => x.id === id);
    if (!a) return;
    setLignes((ls) => ls.map((l, j) => (j === i
      ? { ...l, nom: a.nom, prix: String(a.prix_unitaire), tva: Number(a.tva_pct) } : l)));
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{
        width: "100%", marginTop: 8, background: "none",
        border: `1px dashed ${C.bord}`, borderRadius: 9, padding: "10px",
        cursor: "pointer", color: C.bleu, fontWeight: 700, fontSize: 13 }}>
        + Joindre des fournitures à cette facture
      </button>
    );
  }

  const total = lignesFacture.reduce((s, l) => s + l.montant_htva_centimes, 0);

  return (
    <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
        Fournitures jointes
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {catalogue.length > 0 && (
              <select style={{ ...S.input, padding: "7px 10px" }} value=""
                onChange={(e) => prendre(i, e.target.value)}>
                <option value="">— catalogue —</option>
                {catalogue.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            )}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <input style={{ ...S.input, flex: 2 }} value={l.nom}
                onChange={(e) => maj(i, "nom", e.target.value)} placeholder="Fourniture" />
              <input style={{ ...S.input, flex: 1 }} value={l.prix} inputMode="decimal"
                onChange={(e) => maj(i, "prix", e.target.value)} placeholder="€ HTVA" />
              <select style={{ ...S.input, width: 62, padding: "8px 4px" }} value={l.tva}
                onChange={(e) => maj(i, "tva", Number(e.target.value))}>
                <option value={21}>21%</option><option value={12}>12%</option>
                <option value={6}>6%</option><option value={0}>0%</option>
              </select>
              <input style={{ ...S.input, width: 46 }} type="number" min="1" value={l.quantite}
                onChange={(e) => maj(i, "quantite", Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setLignes((ls) => [...ls, ligneVide()])} style={{
        marginTop: 8, background: "none", border: "none", color: C.bleu,
        fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>
        + une fourniture
      </button>
      {total > 0 && (
        <div style={{ fontSize: 12, color: C.muet, marginTop: 6 }}>
          Fournitures ajoutées : <b style={{ color: C.encre }}>{euros(total)}</b> HTVA
        </div>
      )}
    </div>
  );
}
