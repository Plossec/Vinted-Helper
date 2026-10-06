// Vinted sur la fiche : lien de l'annonce publiée, ou bouton « Publier sur Vinted » pour un article À publier.
import { useState } from "react";
import { Link } from "react-router";
import type { Article } from "../api.js";
import { demanderPublication, lireModeEssai } from "../publication.js";

export function BlocVinted({ article }: { article: Article }) {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  if (!article.urlVinted && article.statut !== "a_publier") return null;

  async function publier() {
    try {
      setMessage(await demanderPublication([article.id]));
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Demande impossible." });
    }
  }

  return (
    <section className="section">
      <h2>Vinted</h2>
      {article.urlVinted && (
        <p>
          <a href={article.urlVinted} target="_blank" rel="noreferrer">
            Voir l'annonce sur Vinted ↗
          </a>
        </p>
      )}
      {article.statut === "a_publier" && (
        <>
          <button type="button" className="bouton bouton--principal" onClick={() => void publier()}>
            Publier sur Vinted{lireModeEssai() ? " (essai)" : ""}
          </button>
          <p className="secondaire">
            Le programme du PC remplit l'annonce sur Vinted. Suivi : <Link to="/publication">Publication Vinted</Link>.
          </p>
        </>
      )}
      {message && (
        <p className={`message message--${message.ok ? "ok" : "erreur"} message--lignes`} role="status">
          {message.texte}
        </p>
      )}
    </section>
  );
}
