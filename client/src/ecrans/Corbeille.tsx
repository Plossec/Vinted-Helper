// Corbeille (§5.11) : articles supprimés, restaurables 30 jours, puis supprimés définitivement. Plusieurs articles
// cochés se restaurent d'un coup (#286).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type ArticleSupprime, type BilanCorbeille, urlVignette } from "../api.js";
import { formatDateHeure } from "../utilitaires/dates.js";
import { formatReference } from "../statuts.js";
import { confirmer } from "../composants/Dialogue.js";

export function Corbeille() {
  const [articles, setArticles] = useState<ArticleSupprime[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const charger = () =>
    api
      .get<ArticleSupprime[]>("/api/corbeille")
      .then((liste) => {
        setArticles(liste);
        // Seules restent cochées les cases d'articles encore dans la corbeille (#341).
        const presents = new Set(liste.map((a) => a.id));
        setCoches((c) => new Set([...c].filter((id) => presents.has(id))));
      })
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  useEffect(() => {
    void charger();
  }, []);

  const basculer = (id: string) =>
    setCoches((c) => {
      const suivant = new Set(c);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  async function restaurerCoches() {
    setMessage(null);
    try {
      const r = await api.post<BilanCorbeille>("/api/corbeille/restauration", { ids: [...coches] });
      setCoches(new Set());
      setMessage(`${r.traites} article${r.traites > 1 ? "s" : ""} restauré${r.traites > 1 ? "s" : ""}.`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Restauration impossible.");
    }
  }

  async function agir(promesse: Promise<unknown>) {
    setMessage(null);
    try {
      await promesse;
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    }
  }

  return (
    <main className="page">
      <Link to="/articles" className="lien-retour">
        <span aria-hidden="true">←</span> Articles
      </Link>
      <h1>Corbeille</h1>
      <p className="secondaire">
        Les articles supprimés n'entrent dans aucun calcul. Ils sont restaurables pendant 30 jours, puis supprimés
        définitivement avec leurs photos. Leur numéro de référence n'est jamais réattribué.
      </p>
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      {message && (
        <p className="message message--ok" role="status">
          {message}
        </p>
      )}
      {articles?.length === 0 && <p className="vide">La corbeille est vide.</p>}
      {articles && articles.length > 1 && (
        <p className="section actions">
          <button
            type="button"
            className="bouton"
            onClick={() => setCoches(coches.size === articles.length ? new Set() : new Set(articles.map((a) => a.id)))}
          >
            {coches.size === articles.length ? "Tout décocher" : "Tout cocher"}
          </button>
        </p>
      )}
      <ul className="liste">
        {articles?.map((a) => (
          <li key={a.id} className="carte-article carte-article--photo">
            <input
              type="checkbox"
              aria-label={`Sélectionner ${formatReference(a.reference)}`}
              checked={coches.has(a.id)}
              onChange={() => basculer(a.id)}
            />
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
                  aria-label={`Restaurer ${formatReference(a.reference)}`}
                  onClick={() => void agir(api.post(`/api/corbeille/${a.id}/restauration`))}
                >
                  Restaurer
                </button>
                <button
                  type="button"
                  className="bouton bouton--danger"
                  aria-label={`Supprimer définitivement ${formatReference(a.reference)}`}
                  onClick={() => {
                    void confirmer("Supprimer définitivement cet article et ses photos ? C'est irréversible.", {
                      action: "Supprimer définitivement",
                      danger: true,
                    }).then((ok) => {
                      if (ok) void agir(api.delete(`/api/corbeille/${a.id}`));
                    });
                  }}
                >
                  Supprimer définitivement
                </button>
              </span>
            </span>
          </li>
        ))}
      </ul>
      {coches.size > 0 && (
        <div className="selection-barre">
          <button type="button" className="bouton bouton--principal" onClick={() => void restaurerCoches()}>
            Restaurer ({coches.size})
          </button>
          <button type="button" className="bouton" onClick={() => setCoches(new Set())}>
            Annuler
          </button>
        </div>
      )}
    </main>
  );
}
