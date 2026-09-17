/**
 * CHARGEMENT — le temps qu'un écran arrive.
 *
 * Les écrans ne sont plus tous dans le premier fichier téléchargé : chacun
 * arrive au moment où on l'ouvre (React.lazy). Entre le clic et l'écran, il
 * reste donc un instant — quelques dizaines de millisecondes en bureau, plus
 * long sur un chantier en réseau faible.
 *
 * Cet instant doit se voir SANS sauter : pas de spinner qui tourne dans le
 * vide, pas de texte qui déplace la mise en page. Une barre fine qui progresse
 * en haut, et rien d'autre. La barre n'apparaît qu'après 180 ms : en dessous,
 * l'écran est déjà là et un clignotement coûterait plus que l'attente.
 *
 * Le composant ne dépend ni du thème ni d'une session : il est monté AVANT que
 * quoi que ce soit d'autre existe (cf. la racine de main.jsx), donc il ne peut
 * lire aucun jeton de couleur. D'où les valeurs en dur, et elles seules.
 */
import React from "react";

export default function Chargement({ delai = 180 }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), delai);
    return () => clearTimeout(t);
  }, [delai]);

  if (!visible) return null;

  return (
    <div role="status" aria-label="Chargement de l'écran"
         style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2,
                  zIndex: 60, overflow: "hidden", background: "transparent" }}>
      <div style={{ height: "100%", width: "40%", borderRadius: 2,
                    background: "linear-gradient(90deg,"
                              + "rgba(37,99,235,0) 0%,"
                              + "rgba(37,99,235,.9) 50%,"
                              + "rgba(37,99,235,0) 100%)",
                    animation: "dpChargement 1.1s ease-in-out infinite" }} />
      <style>{`@keyframes dpChargement{
        0%{transform:translateX(-100%)}
        100%{transform:translateX(350%)}
      }`}</style>
    </div>
  );
}
