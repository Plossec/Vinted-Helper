// Tâche « Offres reçues » (#150, ADR-0076) dans l'écran « À faire » : offres reçues à valider en mode manuel
// (contre-offre à afficher) ; « Appliquer » les confie à l'extension (→ « En attente de l'extension »).
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type OffreRecueLigne } from "../api.js";
import { formatDate } from "../utilitaires/dates.js";
import { formatEuros } from "../utilitaires/montants.js";
import { formatReference } from "../statuts.js";

export function OffresRecues({ onChangement }: { onChangement: () => void }) {
  const [lignes, setLignes] = useState<OffreRecueLigne[] | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(
    () =>
      api
        .get<OffreRecueLigne[]>("/api/taches/offres-recues")
        .then((l) => {
          setLignes(l);
          setRetour(null);
        })
        .catch((e: unknown) =>
          setRetour({ ok: false, texte: e instanceof Error ? e.message : "Chargement impossible." }),
        ),
    [],
  );
  useEffect(() => {
    void charger();
  }, [charger]);

  const basculer = (id: string) =>
    setCoches((c) => {
      const suivant = new Set(c);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  async function agir(action: () => Promise<string>) {
    setEnvoi(true);
    setRetour(null);
    try {
      setRetour({ ok: true, texte: await action() });
      setCoches(new Set());
    } catch (e) {
      setRetour({ ok: false, texte: e instanceof Error ? e.message : "Action impossible." });
    } finally {
      setEnvoi(false);
      await charger();
      onChangement();
    }
  }

  if (lignes === null)
    return retour ? (
      <p className="message message--erreur" role="alert">
        {retour.texte}
      </p>
    ) : null;
  if (lignes.length === 0 && !retour) return null;

  return (
    <>
      {retour && (
        <p
          className={retour.ok ? "message message--ok" : "message message--erreur"}
          role={retour.ok ? "status" : "alert"}
        >
          {retour.texte}
        </p>
      )}
      <section className="a-faire__section a-faire__section--a-traiter">
        <h2>
          Offres reçues : à valider <span className="pastille">{lignes.length}</span>
        </h2>
        <ul className="cases">
          {lignes.map((l) => (
            <li key={l.id}>
              <label>
                <input type="checkbox" checked={coches.has(l.id)} onChange={() => basculer(l.id)} />{" "}
                <span>
                  <Link to={`/articles/${l.articleId}`}>
                    {formatReference(l.reference)} {l.nom ?? "(sans nom)"}
                  </Link>
                  <br />
                  <span className="secondaire">
                    Offre reçue {formatEuros(l.prixOffre)} le {formatDate(l.depuis)}
                    {l.prixContreOffre !== null ? ` — contre-offre à ${formatEuros(l.prixContreOffre)}` : ""}
                    {l.message ? ` — ${l.message}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button type="button" className="bouton" onClick={() => setCoches(new Set(lignes.map((a) => a.id)))}>
            Tout cocher
          </button>
          <button
            type="button"
            className="bouton bouton--principal"
            disabled={envoi || coches.size === 0}
            onClick={() =>
              void agir(async () => {
                const r = await api.post<{ nombre: number }>("/api/taches/offres-recues/appliquer", {
                  ids: [...coches],
                });
                return `${r.nombre} offre(s) envoyée(s) à l'extension.`;
              })
            }
          >
            Appliquer ({coches.size})
          </button>
        </div>
      </section>
    </>
  );
}
