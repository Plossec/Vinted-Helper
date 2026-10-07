// Vinted sur la fiche : lien de l'annonce (saisi à la main, issue #46, ou noté par le programme de publication),
// et bouton « Publier sur Vinted » pour un article À publier. L'application n'interroge jamais Vinted.
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { api, type Article } from "../api.js";
import { demanderPublication, lireModeEssai } from "../publication.js";

interface ReponseLien {
  article: Article;
  passeEnLigne: boolean;
  prixManquant: boolean;
}

export function BlocVinted({ article, onMiseAJour }: { article: Article; onMiseAJour: (a: Article) => void }) {
  const [lien, setLien] = useState(article.urlVinted ?? "");
  const [conversation, setConversation] = useState(article.urlConversation ?? "");
  /** Vendu (colis en cours ou fini) : le lien de la conversation avec l'acheteur est proposé (issue #48). */
  const vendu = ["a_expedier", "envoye", "finalise"].includes(article.statut) || article.urlConversation !== null;
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function publier() {
    try {
      setMessage(await demanderPublication([article.id]));
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Demande impossible." });
    }
  }

  async function enregistrer(url: string) {
    setEnCours(true);
    setMessage(null);
    try {
      const r = await api.put<ReponseLien>(`/api/articles/${article.id}/lien-vinted`, { url });
      onMiseAJour(r.article);
      setLien(r.article.urlVinted ?? "");
      setMessage({
        ok: true,
        texte:
          url.trim() === ""
            ? "Lien retiré."
            : r.passeEnLigne
              ? "Lien enregistré : l'article est passé En ligne."
              : r.prixManquant
                ? "Lien enregistré. Indiquez un prix affiché pour passer l'article En ligne."
                : "Lien enregistré.",
      });
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    } finally {
      setEnCours(false);
    }
  }

  async function enregistrerConversation(url: string) {
    setEnCours(true);
    setMessage(null);
    try {
      const a = await api.put<Article>(`/api/articles/${article.id}/lien-conversation`, { url });
      onMiseAJour(a);
      setConversation(a.urlConversation ?? "");
      setMessage({
        ok: true,
        texte: url.trim() === "" ? "Lien de la conversation retiré." : "Lien de la conversation enregistré.",
      });
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    } finally {
      setEnCours(false);
    }
  }

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    void enregistrer(lien);
  };

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
      <form className="formulaire" onSubmit={soumettre} noValidate>
        <label className="champ">
          <span>Lien de l'annonce Vinted</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://www.vinted.fr/items/…"
            value={lien}
            onChange={(e) => setLien(e.target.value)}
          />
        </label>
        <p className="secondaire">Dans Vinted : annonce → Partager → Copier le lien, puis collez-le ici.</p>
        <div className="actions">
          <button
            className="bouton"
            type="submit"
            disabled={enCours || lien.trim() === (article.urlVinted ?? "") || lien.trim() === ""}
          >
            Enregistrer le lien
          </button>
          {article.urlVinted && (
            <button className="bouton" type="button" disabled={enCours} onClick={() => void enregistrer("")}>
              Retirer le lien
            </button>
          )}
        </div>
      </form>
      {vendu && (
        <form
          className="formulaire section"
          onSubmit={(e) => {
            e.preventDefault();
            void enregistrerConversation(conversation);
          }}
          noValidate
        >
          {article.urlConversation && (
            <p>
              <a href={article.urlConversation} target="_blank" rel="noreferrer">
                💬 Ouvrir la conversation avec l'acheteur ↗
              </a>
            </p>
          )}
          <label className="champ">
            <span>Lien de la conversation Vinted</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://www.vinted.fr/inbox/…"
              value={conversation}
              onChange={(e) => setConversation(e.target.value)}
            />
          </label>
          <div className="actions">
            <button
              className="bouton"
              type="submit"
              disabled={
                enCours || conversation.trim() === "" || conversation.trim() === (article.urlConversation ?? "")
              }
            >
              Enregistrer la conversation
            </button>
            {article.urlConversation && (
              <button
                className="bouton"
                type="button"
                disabled={enCours}
                onClick={() => void enregistrerConversation("")}
              >
                Retirer
              </button>
            )}
          </div>
        </form>
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
