// Icônes de la barre de navigation (issue #103) : SVG du projet, trait de la couleur du texte, aucune dépendance.
import type { ReactNode } from "react";

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Liste cochée : l'écran « À faire » (#191). */
export const IconeAFaire = () => (
  <Icone>
    <path d="m4 6 1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" />
    <path d="M11 6h9M11 12h9M11 18h9" />
  </Icone>
);

/** T-shirt : les articles. */
export const IconeArticles = () => (
  <Icone>
    <path d="M8.5 3 3 5.5l1.5 4.5 2.5-1V21h10V9l2.5 1L21 5.5 15.5 3a3.5 3.5 0 0 1-7 0z" />
  </Icone>
);

/** Panier : la saisie terrain (achats en vide-grenier). */
export const IconeTerrain = () => (
  <Icone>
    <path d="M4 9h16l-1.6 11H5.6z" />
    <path d="M8.5 9 12 3.5 15.5 9" />
    <path d="M12 12.5v4M10 14.5h4" />
  </Icone>
);

/** Histogramme : le tableau de bord. */
export const IconeTableau = () => (
  <Icone>
    <path d="M4 20h16" />
    <path d="M7 16v-5M12 16V6M17 16v-8" />
  </Icone>
);

/** Curseurs : les réglages. */
export const IconeReglages = () => (
  <Icone>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Icone>
);
