// Disposition commune une fois connecté : contenu + barre de navigation en bas (usage au pouce).
// Sans réseau, l'application reste utilisable (saisie terrain mise en attente, §2.2).
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { api, ErreurApi } from "../api.js";
import { BandeauFile } from "../composants/BandeauFile.js";
import { demarrerFile, envoyerMaintenant } from "../hors-ligne/index.js";
import { mettreAJour, useNouvelleVersion } from "../pwa.js";

type Etat = "verification" | "connecte" | "hors-ligne";

export function Disposition() {
  const naviguer = useNavigate();
  const [etat, setEtat] = useState<Etat>("verification");
  const nouvelleVersion = useNouvelleVersion();

  useEffect(() => {
    demarrerFile();
    let actif = true;
    const verifier = () =>
      api
        .get<{ identifiant: string }>("/api/moi")
        .then(() => {
          if (!actif) return;
          setEtat("connecte");
          void envoyerMaintenant(); // après une reconnexion : envoie ce qui attendait
        })
        .catch((e: unknown) => {
          if (!actif) return;
          if (e instanceof ErreurApi && e.statut === 401) void naviguer("/connexion", { replace: true });
          else setEtat("hors-ligne");
        });
    void verifier();
    // Retour du réseau : on revérifie (le bandeau « Hors ligne » disparaît).
    window.addEventListener("online", verifier);
    window.addEventListener("file-envoyee", verifier);
    return () => {
      actif = false;
      window.removeEventListener("online", verifier);
      window.removeEventListener("file-envoyee", verifier);
    };
  }, [naviguer]);

  if (etat === "verification") return <p className="page statut">Chargement…</p>;

  return (
    <div className="disposition">
      {nouvelleVersion && (
        <p className="bandeau bandeau--version">
          Nouvelle version disponible —{" "}
          <button className="lien" type="button" onClick={mettreAJour}>
            Mettre à jour
          </button>
        </p>
      )}
      {etat === "hors-ligne" && (
        <p className="bandeau bandeau--hors-ligne">
          Hors ligne (ou serveur injoignable) : la saisie terrain reste possible, elle sera envoyée plus tard.
        </p>
      )}
      <BandeauFile />
      <div className="disposition__contenu">
        <Outlet />
      </div>
      <nav className="navigation" aria-label="Navigation principale">
        <NavLink to="/" end className="navigation__lien">
          Articles
        </NavLink>
        <NavLink to="/terrain" className="navigation__lien navigation__lien--terrain">
          Terrain
        </NavLink>
        <NavLink to="/tableau" className="navigation__lien">
          Tableau
        </NavLink>
        <NavLink to="/reglages" className="navigation__lien">
          Réglages
        </NavLink>
      </nav>
    </div>
  );
}
