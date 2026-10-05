// Réglages : version, changement du mot de passe, déconnexion.
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, type Sante } from "../api.js";

export function Reglages() {
  const naviguer = useNavigate();
  const [version, setVersion] = useState<string | null>(null);
  const [identifiant, setIdentifiant] = useState<string | null>(null);
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .get<Sante>("/api/sante")
      .then((s) => actif && setVersion(s.version))
      .catch(() => undefined);
    api
      .get<{ identifiant: string }>("/api/moi")
      .then((m) => actif && setIdentifiant(m.identifiant))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);

  async function changerMotDePasse(evenement: FormEvent) {
    evenement.preventDefault();
    if (nouveau !== confirmation) {
      setMessage({ type: "erreur", texte: "Les deux saisies du nouveau mot de passe sont différentes." });
      return;
    }
    try {
      await api.put("/api/moi/mot-de-passe", { ancien, nouveau });
      setAncien("");
      setNouveau("");
      setConfirmation("");
      setMessage({ type: "ok", texte: "Mot de passe modifié. Vos autres appareils ont été déconnectés." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Modification impossible." });
    }
  }

  async function seDeconnecter() {
    await api.post("/api/deconnexion").catch(() => undefined);
    void naviguer("/connexion", { replace: true });
  }

  return (
    <main className="page">
      <h1>Réglages</h1>

      <section className="section">
        <p>
          Connecté en tant que <strong>{identifiant ?? "…"}</strong>
        </p>
        <p className="secondaire">Vinted Helper — version {version ?? "…"}</p>
      </section>

      <section className="section">
        <h2>Changer le mot de passe</h2>
        <form className="formulaire" onSubmit={(e) => void changerMotDePasse(e)}>
          <label className="champ">
            <span>Mot de passe actuel</span>
            <input
              type="password"
              value={ancien}
              onChange={(e) => setAncien(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="champ">
            <span>Nouveau mot de passe (8 caractères minimum)</span>
            <input
              type="password"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="champ">
            <span>Confirmer le nouveau mot de passe</span>
            <input
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {message && (
            <p className={`message message--${message.type}`} role="status">
              {message.texte}
            </p>
          )}
          <button className="bouton bouton--principal" type="submit">
            Enregistrer le nouveau mot de passe
          </button>
        </form>
      </section>

      <section className="section">
        <button className="bouton" type="button" onClick={() => void seDeconnecter()}>
          Se déconnecter
        </button>
      </section>
    </main>
  );
}
