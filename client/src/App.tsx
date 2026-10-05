// Lot 0 : page d'accueil minimale qui vérifie que l'application et la base fonctionnent.
import { useEffect, useState } from "react";

interface Sante {
  application: string;
  version: string;
  base: "connectée" | "indisponible";
}

type Etat = { type: "chargement" } | { type: "ok"; sante: Sante } | { type: "erreur" };

export function App() {
  const [etat, setEtat] = useState<Etat>({ type: "chargement" });

  useEffect(() => {
    let actif = true;
    fetch("/api/sante")
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        return (await reponse.json()) as Sante;
      })
      .then((sante) => actif && setEtat({ type: "ok", sante }))
      .catch(() => actif && setEtat({ type: "erreur" }));
    return () => {
      actif = false;
    };
  }, []);

  return (
    <main className="page">
      <h1>Vinted Helper</h1>
      {etat.type === "chargement" && <p className="statut">Connexion au serveur…</p>}
      {etat.type === "erreur" && (
        <p className="statut statut--erreur">Serveur injoignable. Vérifiez qu'il est démarré.</p>
      )}
      {etat.type === "ok" && (
        <>
          <p className="version">Version {etat.sante.version}</p>
          <p className={etat.sante.base === "connectée" ? "statut statut--ok" : "statut statut--erreur"}>
            Base de données {etat.sante.base}
          </p>
        </>
      )}
    </main>
  );
}
