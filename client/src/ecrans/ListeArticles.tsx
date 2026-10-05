// Liste simple des articles (lot 1) : la plus récente en premier. Filtres, recherche et tri : lot 4.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type ResumeArticle } from "../api.js";
import { formatEuros } from "../outils/montants.js";
import { formatReference, LIBELLES_STATUT } from "../statuts.js";

export function ListeArticles() {
  const [articles, setArticles] = useState<ResumeArticle[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .get<ResumeArticle[]>("/api/articles")
      .then((liste) => actif && setArticles(liste))
      .catch((e: unknown) => actif && setErreur(e instanceof Error ? e.message : "Chargement impossible."));
    return () => {
      actif = false;
    };
  }, []);

  return (
    <main className="page">
      <h1>Articles</h1>
      <Link to="/articles/nouveau" className="bouton bouton--principal">
        + Nouvel article
      </Link>
      {erreur && <p className="message message--erreur">{erreur}</p>}
      {articles === null && !erreur && <p className="statut">Chargement…</p>}
      {articles?.length === 0 && <p className="vide">Aucun article pour l'instant.</p>}
      <ul className="liste">
        {articles?.map((a) => (
          <li key={a.id}>
            <Link to={`/articles/${a.id}`} className="carte-article">
              <span className="carte-article__ligne">
                <span className="reference">{formatReference(a.reference)}</span>
                <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
              </span>
              <span className="carte-article__nom">{a.nom ?? "(sans nom)"}</span>
              <span className="carte-article__prix">
                {a.prixAffiche === null ? "Prix affiché : —" : `Prix affiché : ${formatEuros(a.prixAffiche)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
