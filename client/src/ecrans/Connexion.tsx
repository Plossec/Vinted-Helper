// Écran de connexion (compte unique créé à l'installation : pas d'inscription).
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../api.js";

export function Connexion() {
  const naviguer = useNavigate();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function seConnecter(evenement: FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post("/api/connexion", { identifiant, motDePasse });
      void naviguer("/", { replace: true });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Connexion impossible.");
      setEnvoi(false);
    }
  }

  return (
    <main className="page page--connexion">
      <h1>Vinted Helper</h1>
      <form className="formulaire" onSubmit={(e) => void seConnecter(e)}>
        <label className="champ">
          <span>Identifiant</span>
          <input
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </label>
        <label className="champ">
          <span>Mot de passe</span>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {erreur && (
          <p className="message message--erreur" role="alert">
            {erreur}
          </p>
        )}
        <button className="bouton bouton--principal" type="submit" disabled={envoi}>
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
