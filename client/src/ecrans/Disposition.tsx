// Disposition commune une fois connecté : contenu + barre de navigation en bas (usage au pouce).
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { api, ErreurApi } from "../api.js";

type Etat = "verification" | "connecte" | "erreur";

export function Disposition() {
  const naviguer = useNavigate();
  const [etat, setEtat] = useState<Etat>("verification");

  useEffect(() => {
    let actif = true;
    api
      .get<{ identifiant: string }>("/api/moi")
      .then(() => actif && setEtat("connecte"))
      .catch((e: unknown) => {
        if (!actif) return;
        if (e instanceof ErreurApi && e.statut === 401) void naviguer("/connexion", { replace: true });
        else setEtat("erreur");
      });
    return () => {
      actif = false;
    };
  }, [naviguer]);

  if (etat === "verification") return <p className="page statut">Chargement…</p>;
  if (etat === "erreur") {
    return <p className="page statut statut--erreur">Serveur injoignable. Vérifiez qu'il est démarré.</p>;
  }

  return (
    <div className="disposition">
      <div className="disposition__contenu">
        <Outlet />
      </div>
      <nav className="navigation" aria-label="Navigation principale">
        <NavLink to="/" end className="navigation__lien">
          Articles
        </NavLink>
        <NavLink to="/reglages" className="navigation__lien">
          Réglages
        </NavLink>
      </nav>
    </div>
  );
}
