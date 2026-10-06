// Annonce (§5.2, §5.5) : titre et description, générés par Gemini ou saisis, enregistrés, modifiables, à copier.
// Secours si Gemini est indisponible : « Copier le prompt » pour une IA gratuite (Claude.ai, ChatGPT, Gemini).
import { useState } from "react";
import { api, type Article, ErreurApi } from "../api.js";

async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}

export function BlocAnnonce({ article, onMiseAJour }: { article: Article; onMiseAJour: (a: Article) => void }) {
  const [titre, setTitre] = useState(article.titreAnnonce ?? "");
  const [description, setDescription] = useState(article.descriptionAnnonce ?? "");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [secours, setSecours] = useState(false);

  async function generer() {
    if ((titre || description) && !window.confirm("Remplacer le titre et la description actuels ?")) return;
    setEnCours(true);
    setMessage(null);
    try {
      const a = await api.post<Article>(`/api/articles/${article.id}/annonce/generation`);
      setTitre(a.titreAnnonce ?? "");
      setDescription(a.descriptionAnnonce ?? "");
      onMiseAJour(a);
      setSecours(false);
      setMessage({ type: "ok", texte: "Annonce générée et enregistrée. Relisez-la avant de la publier." });
    } catch (e) {
      setSecours(e instanceof ErreurApi && e.statut >= 500);
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Génération impossible." });
    } finally {
      setEnCours(false);
    }
  }

  async function enregistrer() {
    try {
      onMiseAJour(await api.put<Article>(`/api/articles/${article.id}/annonce`, { titre, description }));
      setMessage({ type: "ok", texte: "Annonce enregistrée." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    }
  }

  async function copierPrompt() {
    try {
      const { prompt } = await api.get<{ prompt: string }>(`/api/articles/${article.id}/annonce/prompt`);
      const ok = await copier(prompt);
      setMessage(
        ok
          ? {
              type: "ok",
              texte:
                "Prompt copié : collez-le dans Claude.ai, ChatGPT ou Gemini avec les photos, puis recopiez le résultat ici.",
            }
          : { type: "erreur", texte: "Copie impossible sur cet appareil." },
      );
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Prompt indisponible." });
    }
  }

  return (
    <section className="section">
      <h2>Annonce</h2>
      <div className="formulaire">
        <label className="champ">
          <span>Titre ({titre.length}/60)</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={100} />
        </label>
        <label className="champ">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} />
        </label>
        {message && (
          <p className={`message message--${message.type}`} role={message.type === "erreur" ? "alert" : "status"}>
            {message.texte}
          </p>
        )}
        <div className="actions">
          <button type="button" className="bouton bouton--principal" disabled={enCours} onClick={() => void generer()}>
            {enCours ? "Génération…" : "✨ Générer l'annonce"}
          </button>
          <button type="button" className="bouton" onClick={() => void enregistrer()}>
            Enregistrer
          </button>
          <button
            type="button"
            className="bouton"
            onClick={() =>
              void copier(`${titre}\n\n${description}`).then((ok) =>
                setMessage(
                  ok ? { type: "ok", texte: "Annonce copiée." } : { type: "erreur", texte: "Copie impossible." },
                ),
              )
            }
          >
            Copier
          </button>
          <button
            type="button"
            className={secours ? "bouton bouton--principal" : "bouton"}
            onClick={() => void copierPrompt()}
          >
            Copier le prompt
          </button>
        </div>
      </div>
    </section>
  );
}
