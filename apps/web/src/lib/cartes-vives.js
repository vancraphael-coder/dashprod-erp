// =============================================================================
// CARTES VIVES — le relief 3D et la lumière emprisonnée, pour toute l'app.
//
// Les écrans posent déjà `style={S.carte}` à 154 endroits. Plutôt que de les
// reprendre un par un, S.carte porte une variable CSS marqueuse (--carte-vive).
// Ce module installe alors, UNE fois :
//   • une règle CSS qui donne à ces éléments la perspective, la transition et
//     la lueur (un dégradé radial piloté par deux variables) ;
//   • un seul écouteur de souris, cadencé par requestAnimationFrame, qui écrit
//     ces variables sur la carte survolée.
//
// Pourquoi la lueur passe par `background-image` et non par un pseudo-élément :
// un ::after en position absolue passerait au-dessus du contenu de la carte. Le
// dégradé se compose ici avec le fond, sous le texte, sans rien recouvrir.
//
// Sobriété : rien ne s'active au doigt (pointeur grossier) ni si la personne a
// demandé « mouvement réduit » — l'effet est un plaisir, pas une condition.
//
// LA CARTE EST LA SOURCE DE LUMIÈRE. Elle ne garde pas sa position de curseur
// pour elle : elle publie aussi l'ANGLE d'où vient la lumière et la position
// normalisée du regard. Les billes posées dessus n'ont donc plus à se
// surveiller elles-mêmes — une bille de 14 px qui écoute sa propre boîte ne
// mesure que du bruit, et c'est pour ça qu'elles étaient mortes. Une seule
// source, un seul écouteur, et tout ce qui est sur la carte s'éclaire
// ensemble : c'est cet accord qui se lit comme du relief.
//
// Ces variables sont héritées par les descendants — aucun câblage à faire côté
// composant, et une surface qui n'est pas une carte peut se déclarer champ de
// lumière avec `data-champ` (un item de menu, un panneau flottant).
// =============================================================================

const ID = "cartes-vives";
const INCLINAISON = 6;      // degrés — au-delà, un tableau de bord donne le tournis

/** Les surfaces qui éclairent ce qu'elles portent. */
const CHAMPS = '[style*="--carte-vive"], [data-champ]';

export function installerCartesVives(actif, accentRgb = "37,99,235", verre = false) {
  if (typeof document === "undefined") return;

  const ancienne = document.getElementById(ID);
  if (ancienne) ancienne.remove();
  if (!actif) return;

  const style = document.createElement("style");
  style.id = ID;
  style.textContent = `
    [style*="--carte-vive"] {
      position: relative;
      transform: perspective(900px)
                 rotateX(var(--carte-rx, 0deg))
                 rotateY(var(--carte-ry, 0deg));
      transform-style: preserve-3d;
      transition: transform .3s cubic-bezier(.1,1,.1,1), box-shadow .3s ease;
      background-image: radial-gradient(
        340px circle at var(--carte-mx, 50%) var(--carte-my, 50%),
        rgba(${accentRgb}, var(--carte-lueur, 0)), transparent 45%);
    }
    @media (hover: none), (pointer: coarse) {
      [style*="--carte-vive"] { transform: none; background-image: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      [style*="--carte-vive"] {
        transform: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Un seul écouteur pour toute l'app, cadencé sur le rafraîchissement écran.
  let enAttente = false;
  let dernier = null;

  const grossier = window.matchMedia?.("(pointer: coarse)").matches;
  const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (grossier || reduit) return;

  function surMouvement(e) {
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(() => {
      enAttente = false;
      const carte = e.target?.closest?.(CHAMPS);
      if (carte !== dernier && dernier) reposer(dernier);
      dernier = carte;
      if (!carte) return;

      const r = carte.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const nx = (x / r.width) * 2 - 1;
      const ny = (y / r.height) * 2 - 1;

      carte.style.setProperty("--carte-mx", `${x}px`);
      carte.style.setProperty("--carte-my", `${y}px`);
      carte.style.setProperty("--carte-rx", `${(-ny * INCLINAISON).toFixed(2)}deg`);
      carte.style.setProperty("--carte-ry", `${(nx * INCLINAISON).toFixed(2)}deg`);
      carte.style.setProperty("--carte-lueur", verre ? ".22" : ".13");

      // D'OÙ VIENT LA LUMIÈRE — un vrai angle, par atan2. Une approximation
      // linéaire sur x seul (l'ancien calcul de la bille) ne sait pas dire que
      // la lumière vient d'en bas : le reflet ne tourne jamais complètement.
      carte.style.setProperty("--carte-angle",
        `${(Math.atan2(ny, nx) * (180 / Math.PI) + 90).toFixed(1)}deg`);
      // Le regard, normalisé −1…1 : le reflet spéculaire glisse dessus.
      carte.style.setProperty("--carte-nx", nx.toFixed(3));
      carte.style.setProperty("--carte-ny", ny.toFixed(3));
      // Le même regard ADOUCI en sinus, comme la carte d'abonnement d'origine :
      // il ne bouge presque pas au centre et sature aux bords. Un décalage
      // linéaire donne un glissement mécanique — c'est cette courbe qui rend le
      // mouvement crédible. Calculé ici plutôt qu'en CSS : `sin()` en CSS
      // invaliderait toute la transformation là où il n'est pas connu.
      carte.style.setProperty("--carte-sx",
        Math.sin(nx * Math.PI / 2).toFixed(3));
      carte.style.setProperty("--carte-sy",
        Math.sin(ny * Math.PI / 2).toFixed(3));
    });
  }

  function reposer(carte) {
    carte.style.setProperty("--carte-rx", "0deg");
    carte.style.setProperty("--carte-ry", "0deg");
    carte.style.setProperty("--carte-lueur", "0");
    // Sans cette remise à zéro, la dernière carte survolée garderait sa lumière
    // figée de travers — une carte éclairée alors que le curseur est ailleurs.
    carte.style.setProperty("--carte-angle", "135deg");
    carte.style.setProperty("--carte-nx", "0");
    carte.style.setProperty("--carte-ny", "0");
    carte.style.setProperty("--carte-sx", "0");
    carte.style.setProperty("--carte-sy", "0");
  }

  document.addEventListener("mousemove", surMouvement, { passive: true });
  document.addEventListener("mouseleave", () => {
    if (dernier) { reposer(dernier); dernier = null; }
  }, { passive: true });
}
