import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Connexion } from "./ecrans/Connexion.js";
import { Disposition } from "./ecrans/Disposition.js";
import { FicheArticle } from "./ecrans/FicheArticle.js";
import { ListeArticles } from "./ecrans/ListeArticles.js";
import { Reglages } from "./ecrans/Reglages.js";
import "./styles.css";

const routeur = createBrowserRouter([
  { path: "/connexion", element: <Connexion /> },
  {
    element: <Disposition />,
    children: [
      { index: true, element: <ListeArticles /> },
      { path: "articles/nouveau", element: <FicheArticle /> },
      { path: "articles/:id", element: <FicheArticle /> },
      { path: "reglages", element: <Reglages /> },
    ],
  },
]);

const racine = document.getElementById("racine");
if (racine === null) throw new Error("Élément #racine introuvable dans index.html");

createRoot(racine).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
);
