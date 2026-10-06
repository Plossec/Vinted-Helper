// Corbeille (§5.11) : articles supprimés, restaurables 30 jours, puis supprimés définitivement.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, urlVignette } from "../api.js";
import { formatDateHeure } from "../outils/dates.js";
import { formatReference } from "../statuts.js";

interface ArticleSupprime {
  id: string;
  reference: number;
  nom: string | null;
  supprimeLe: string;
  suppressionLe: string;
  vignette: string | null;
}

export function Corbeille() {
  const [articles, setArticles] = useState<ArticleSupprime[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = () =>
    api
      .get<ArticleSupprime[]>("/api/corbeille")
      .then(setArticles)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  useEffect(() => {
    void charger();
  }, []);

  async function agir(promesse: Promise<unknown>) {
    try {
      await promesse;
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    }
  }

  return (
    <main className="page">
      <Link to="/" className="lien-retour">
        ← Articles
      </Link>
      <h1>Corbeille</h1>
      <p className="secondaire">
        Les articles supprimés n'entrent dans aucun calcul. Ils sont restaurables pendant 30 jours, puis supprimés
        définitivement avec leurs photos. Leur numéro de référence n'est jamais réattribué.
      </p>
      {erreur && <p className="message message--erreur">{erreur}</p>}
      {articles?.length === 0 && <p className="vide">La corbeille est vide.</p>}
      <ul className="liste">
        {articles?.map((a) => (
          <li key={a.id} className="carte-article carte-article--photo">
            {a.vignette ? (
              <img className="vignette" src={urlVignette(a.vignette)} alt="" />
            ) : (
              <span className="vignette" />
            )}
            <span className="carte-article__texte">
              <span>
                <span className="reference">{formatReference(a.reference)}</span> {a.nom ?? "(sans nom)"}
              </span>
              <span className="carte-article__prix">
                Supprimé le {formatDateHeure(a.supprimeLe)} — définitivement le {formatDateHeure(a.suppressionLe)}
              </span>
              <span className="actions">
                <button
                  type="button"
                  className="bouton"
                  onClick={() => void agir(api.post(`/api/corbeille/${a.id}/restauration`))}
                >
                  Restaurer
                </button>
                <button
                  type="button"
                  className="bouton bouton--danger"
                  onClick={() => {
                    if (window.confirm("Supprimer définitivement cet article et ses photos ? C'est irréversible.")) {
                      void agir(api.delete(`/api/corbeille/${a.id}`));
                    }
                  }}
                >
                  Supprimer définitivement
                </button>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
