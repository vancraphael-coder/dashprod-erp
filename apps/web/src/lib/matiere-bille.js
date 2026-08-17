// =============================================================================
// LA MATIÈRE DE LA BILLE — une seule recette, à toutes les tailles.
//
// La bille de la carte d'abonnement était belle ; celles de l'application
// étaient des ronds colorés. Quatre écarts, tous ici corrigés :
//
//   1. LA COULEUR. L'huile de la carte va du bleu à l'AMBRE et revient au
//      bleu : deux teintes, donc une irisation. Les billes de l'app faisaient
//      teinte → même teinte plus sombre → teinte : un dégradé monochrome, qui
//      ne dit qu'« ombre », jamais « verre ». D'où `contre` : chaque ton porte
//      sa CONTRE-LUMIÈRE, froide sur les tons chauds, chaude sur les froids.
//
//   2. L'ANGLE. `135 + x * 90` ignorait y : la lumière ne pouvait pas venir
//      d'en bas. C'est `atan2` qui donne un vrai angle — il est calculé une
//      fois par la carte (`--carte-angle`), et hérité ici.
//
//   3. LA MATIÈRE. Opacité .95 : de la peinture. Le verre est translucide et
//      trouble ce qu'il y a derrière (`backdrop-filter`) — mais seulement s'il
//      y a quelque chose derrière. Sur un fond blanc de jour, un verre
//      transparent ne montre rien : la bille est alors PEINTE. La surface
//      décide, par `--bille-corps` / `--bille-huile` / `--bille-flou`.
//
//   4. LA PROFONDEUR. Aucun relief réel : ni perspective, ni Z. La bille porte
//      donc sa propre perspective — au même rapport que la carte (900 / 84 ≈
//      10 fois le diamètre) — pour que le signe flotte VRAIMENT au-dessus du
//      verre au lieu d'être décalé à plat. Sa perspective est à elle : un
//      simple `div` intermédiaire aplatirait celle de la carte.
//
// TOUT est exprimé en fraction de `--b`, le diamètre. Une bille de 14 px et
// une de 84 px sont alors le MÊME objet à deux échelles — c'est la condition
// pour qu'une puce ait la même matière qu'une vedette, et c'est exactement ce
// qui manquait.
//
// Pourquoi une feuille de style et non des styles en ligne : les variables du
// champ de lumière (`--carte-angle`, `--carte-nx`, `--carte-ny`) sont écrites
// sur la carte par UN écouteur, et héritées. En CSS, la bille les lit sans un
// seul rendu React — c'est ce qui rend le suivi gratuit même quand un écran en
// affiche cinquante.
// =============================================================================

const ID = "matiere-bille";

/** Les teintes. Chacune dit une chose, et une seule. */
export const TONS = Object.freeze({
  //        a = la lumière      b = la teinte      ombre = le creux    contre = l'irisation
  bleu:   { a: "96,165,250",  b: "37,99,235",   ombre: "23,60,150",   contre: "217,119,6" },
  vert:   { a: "74,222,161",  b: "5,150,105",   ombre: "4,95,68",     contre: "217,119,6" },
  gris:   { a: "163,177,196", b: "100,116,139", ombre: "51,65,85",    contre: "217,119,6" },
  orange: { a: "253,164,90",  b: "234,88,12",   ombre: "154,52,8",    contre: "37,99,235" },
  rouge:  { a: "250,140,140", b: "220,38,38",   ombre: "145,25,25",   contre: "37,99,235" },
  ambre:  { a: "251,180,40",  b: "217,119,6",   ombre: "133,60,5",    contre: "37,99,235" },
});

/** Les tailles, nommées plutôt que chiffrées : un badge ne « fait pas 18px ». */
export const TAILLES = Object.freeze({
  puce: 14,      // dans une ligne de texte, un état
  jeton: 22,     // à côté d'un titre
  bouton: 44,    // une action qu'on touche
  vedette: 84,   // le geste central d'une carte
});

/**
 * Les fractions du diamètre. Elles viennent de la bille de la carte, mesurées :
 * 84 px de diamètre, `inset 0 0 15px` (18 %), `inset 6px 6px 18px` (7/7/21 %),
 * chevron de 22 px (52 %) décalé de 6 px (7 %) et posé à 15 px (18 %).
 * La parallaxe et le relevé ont été DOUBLÉS après essai : au rapport d'origine
 * le signe bougeait si peu qu'on ne voyait pas qu'il flottait.
 * Les changer, c'est changer la bille — pas l'adapter.
 */
export const FRACTIONS = Object.freeze({
  lueurInterne: 0.18, creuxDecalage: 0.07, creuxFlou: 0.21,
  ombrePortee: 0.30, ombreDecalage: 0.14, ombreRetrait: 0.09,
  signe: 0.52, parallaxe: 0.13, releve: 0.26, perspective: 10,
});

/**
 * Installe la feuille UNE fois. Appelée au chargement du composant Bille, donc
 * valable aussi bien dans l'app que dans la vitrine — qui n'a pas le même
 * thème et ne doit surtout pas importer celui de l'app.
 */
export function installerMatiereBille() {
  if (typeof document === "undefined") return;
  if (document.getElementById(ID)) return;

  const f = FRACTIONS;
  const style = document.createElement("style");
  style.id = ID;
  style.textContent = `
    .bille {
      position: relative;
      width: calc(var(--b) * 1px); height: calc(var(--b) * 1px);
      flex-shrink: 0; display: inline-block; vertical-align: middle;
      border: none; padding: 0; background: none;
      /* Sa propre perspective, au rapport de la carte d'origine. */
      perspective: calc(var(--b) * ${f.perspective}px);
      transform-style: preserve-3d;
    }
    .bille-corps {
      position: absolute; inset: 0; border-radius: 50%;
      /* La forme : la lumière tombe en haut à gauche, l'ombre fuit en bas. */
      /* Trois arrêts, pas deux : la teinte claire tient le haut-gauche, l'ombre
         creuse le bas-droit. Un dégradé qui n'assombrit qu'à la fin donne une
         gommette ; c'est l'écart entre les deux qui fait la sphère. */
      background: radial-gradient(circle at 32% 26%,
        rgba(var(--bille-a), var(--bille-corps, 1)) 0%,
        rgba(var(--bille-a), var(--bille-corps, 1)) 24%,
        rgba(var(--bille-b), var(--bille-corps, 1)) 74%,
        rgba(var(--bille-ombre), var(--bille-corps, 1)) 100%);
      border: 1px solid rgba(255,255,255,.4);
      box-shadow:
        inset 0 0 calc(var(--b) * ${f.lueurInterne}px) rgba(255,255,255,.30),
        inset calc(var(--b) * ${f.creuxDecalage}px) calc(var(--b) * ${f.creuxDecalage}px)
              calc(var(--b) * ${f.creuxFlou}px) rgba(var(--bille-b), .55),
        0 calc(var(--b) * ${f.ombreDecalage}px) calc(var(--b) * ${f.ombrePortee}px)
          calc(var(--b) * -${f.ombreRetrait}px) rgba(var(--bille-b), .55);
      backdrop-filter: var(--bille-flou, none);
      -webkit-backdrop-filter: var(--bille-flou, none);
      transition: transform .4s cubic-bezier(.34,1.56,.64,1);
    }
    .bille-actif .bille-corps { transform: scale(1.06); }
    /* Au survol elle enfle à peine — assez pour qu'on sente qu'elle répond,
       pas assez pour bousculer la ligne de texte qui l'entoure. Sur le
       conteneur et non le corps : le signe et le reflet suivent avec. */
    .bille:hover { transform: scale(1.09); }
    .bille { transition: transform .22s cubic-bezier(.34,1.4,.64,1); }
    .bille:hover .bille-corps {
      box-shadow:
        inset 0 0 calc(var(--b) * ${f.lueurInterne}px) rgba(255,255,255,.42),
        inset calc(var(--b) * ${f.creuxDecalage}px) calc(var(--b) * ${f.creuxDecalage}px)
              calc(var(--b) * ${f.creuxFlou}px) rgba(var(--bille-b), .62),
        0 calc(var(--b) * ${f.ombreDecalage}px) calc(var(--b) * ${f.ombrePortee}px)
          calc(var(--b) * -${f.ombreRetrait}px) rgba(var(--bille-b), .68);
    }
    /* L'huile : la contre-lumière balaie la bille selon l'angle de la carte.
       Transparente aux bords — sinon elle ferait un trou, pas un reflet. */
    .bille-huile {
      position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
      background: linear-gradient(var(--carte-angle, 135deg),
        rgba(var(--bille-contre), 0) 0%,
        rgba(var(--bille-contre), var(--bille-huile, .30)) 50%,
        rgba(var(--bille-contre), 0) 100%);
    }
    /* Le reflet spéculaire GLISSE à l'inverse du regard : c'est ce qu'un vrai
       verre fait, et c'est le détail qui trahit une sphère peinte. */
    .bille-reflet {
      position: absolute; pointer-events: none; border-radius: 50%;
      top: calc(8% - var(--carte-ny, 0) * 4%);
      left: calc(15% - var(--carte-nx, 0) * 6%);
      width: 70%; height: 35%;
      background: linear-gradient(to bottom, rgba(255,255,255,.65), transparent);
    }
    /* Le signe flotte au-dessus du verre : décalé ET relevé en Z. */
    .bille-signe {
      position: absolute; inset: 0; display: grid; place-items: center;
      transform:
        translate3d(calc(var(--carte-sx, 0) * var(--b) * ${f.parallaxe}px),
                    calc(var(--carte-sy, 0) * var(--b) * ${f.parallaxe}px),
                    calc(var(--b) * ${f.releve}px));
      transition: transform .12s ease-out;
    }
    .bille-signe svg {
      width: calc(var(--b) * ${f.signe}px); height: calc(var(--b) * ${f.signe}px);
      filter: drop-shadow(0 calc(var(--b) * .02px) calc(var(--b) * .07px) rgba(0,0,0,.55));
      transition: transform .5s cubic-bezier(.34,1.56,.64,1);
    }
    /* Le signe s'agite : il flotte au-dessus du verre, donc il bouge plus que
       la bille — c'est l'écart entre les deux qui donne la profondeur. Une
       parallaxe timide se lit comme un décalage, pas comme du relief. */
    .bille:hover .bille-signe svg { transform: scale(1.14); }
    .bille:hover .bille-reflet { opacity: .85; }
    .bille-actif .bille-pivote svg { transform: rotate(-180deg) scale(1.1); }

    /* Le plaisir n'est pas une condition : au doigt et en mouvement réduit, la
       bille garde sa matière mais cesse de bouger. */
    @media (prefers-reduced-motion: reduce) {
      .bille-corps, .bille-signe, .bille-signe svg { transition: none; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * La matière que porte une SURFACE (le fond de page, une carte de la vitrine).
 * De nuit ou en « verre », la bille est translucide et trouble ce qu'il y a
 * derrière ; de jour sur blanc, il n'y a rien derrière — elle est peinte.
 * @param {boolean} verre
 */
export function matiereSurface(verre) {
  // Première version trop fade : sur un fond clair, un corps à .97 se lavait
  // dans le blanc et l'huile à .30 ne se voyait plus qu'au survol. La bille
  // est une MASCOTTE — elle doit tenir seule, sans qu'on passe dessus.
  return verre
    ? { "--bille-corps": ".62", "--bille-huile": ".52", "--bille-flou": "blur(4px)" }
    : { "--bille-corps": "1", "--bille-huile": ".46", "--bille-flou": "none" };
}
