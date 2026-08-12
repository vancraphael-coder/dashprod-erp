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
// =============================================================================

const ID = "cartes-vives";
const INCLINAISON = 6;      // degrés — au-delà, un tableau de bord donne le tournis

export function installerCartesVives(actif, accentRgb = "37,99,235") {
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
      const carte = e.target?.closest?.('[style*="--carte-vive"]');
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
      carte.style.setProperty("--carte-lueur", ".13");
    });
  }

  function reposer(carte) {
    carte.style.setProperty("--carte-rx", "0deg");
    carte.style.setProperty("--carte-ry", "0deg");
    carte.style.setProperty("--carte-lueur", "0");
  }

  document.addEventListener("mousemove", surMouvement, { passive: true });
  document.addEventListener("mouseleave", () => {
    if (dernier) { reposer(dernier); dernier = null; }
  }, { passive: true });
}
