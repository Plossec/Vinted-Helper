import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Connexion } from "./ecrans/Connexion.js";
import { Disposition } from "./ecrans/Disposition.js";
import { ErreurAffichage } from "./ecrans/ErreurAffichage.js";
import { FicheArticle } from "./ecrans/FicheArticle.js";
import { ListeArticles } from "./ecrans/ListeArticles.js";
import { Corbeille } from "./ecrans/Corbeille.js";
import { FicheVente } from "./ecrans/FicheVente.js";
import { Listes } from "./ecrans/Listes.js";
import { FraisDivers } from "./ecrans/FraisDivers.js";
import { Reglages } from "./ecrans/Reglages.js";
import { FicheSortie, ListeSorties } from "./ecrans/Sorties.js";
import { Terrain } from "./ecrans/Terrain.js";
import { enregistrerServiceWorker } from "./pwa.js";
import { appliquerPreferenceTheme, lirePreferenceTheme } from "./theme.js";
import "./styles.css";

const routeur = createBrowserRouter([
  { path: "/connexion", element: <Connexion />, errorElement: <ErreurAffichage /> },
  {
    element: <Disposition />,
    errorElement: <ErreurAffichage />,
    children: [
      {
        // Erreur dans un écran : message à la place de l'écran, la navigation reste disponible.
        errorElement: <ErreurAffichage />,
        children: [
          { index: true, element: <ListeArticles /> },
          { path: "articles/nouveau", element: <FicheArticle /> },
          { path: "articles/:id", element: <FicheArticle /> },
          { path: "terrain", element: <Terrain /> },
          // Écrans plus lourds chargés à la demande (#131) ; gardés sur le téléphone par le service worker.
          {
            path: "tableau",
            lazy: async () => ({ Component: (await import("./ecrans/TableauDeBord.js")).TableauDeBord }),
          },
          { path: "sorties", element: <ListeSorties /> },
          { path: "sorties/:id", element: <FicheSortie /> },
          { path: "ventes/:id", element: <FicheVente /> },
          { path: "frais", element: <FraisDivers /> },
          { path: "corbeille", element: <Corbeille /> },
          { path: "listes", element: <Listes /> },
          {
            path: "publication",
            lazy: async () => ({ Component: (await import("./ecrans/PublicationVinted.js")).PublicationVinted }),
          },
          { path: "reglages", element: <Reglages /> },
        ],
      },
    ],
  },
]);

const racine = document.getElementById("racine");
if (racine === null) throw new Error("Élément #racine introuvable dans index.html");

appliquerPreferenceTheme(lirePreferenceTheme());
enregistrerServiceWorker();

createRoot(racine).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
);
