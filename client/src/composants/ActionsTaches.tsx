// Actions des tâches automatisées (#147) : liste à valider (mode manuel, écran « À faire ») et journal (écran
// « Publication Vinted »). Les actions sont prévues par le serveur et exécutées une à une par l'extension Chrome.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { type ActionVinted, api } from "../api.js";
import { formatDateHeure } from "../outils/dates.js";
import { formatEuros } from "../outils/montants.js";
import { formatReference } from "../statuts.js";

interface Actions {
  aValider: ActionVinted[];
  journal: ActionVinted[];
}

const ETATS: Record<ActionVinted["etat"], string> = {
  a_valider: "À valider",
  en_attente: "En attente de l'extension",
  en_cours: "En cours",
  faite: "Faite",
  essai: "Essai réussi",
  erreur: "Erreur",
  refusee: "Refusée",
  annulee: "Annulée",
};

/** Classe de l'étiquette, partagée avec la file de publication. */
const CLASSES: Partial<Record<ActionVinted["etat"], string>> = {
  faite: "publie",
  essai: "essai",
  erreur: "erreur",
  refusee: "annule",
  annulee: "annule",
};

/** « Baisse 11,00 € → 10,00 € » ou « Republication (11,00 €) ». */
export const libelleAction = (a: ActionVinted) =>
  a.type === "baisse" && a.prixApres !== null
    ? `Baisse ${formatEuros(a.prixAvant)} → ${formatEuros(a.prixApres)}`
    : `Republication (${formatEuros(a.prixAvant)})`;

function useActions() {
  const [actions, setActions] = useState<Actions | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(
    () =>
      api
        .get<Actions>("/api/taches/actions")
        .then((a) => {
          setActions(a);
          setErreur(null);
        })
        .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible.")),
    [],
  );
  useEffect(() => {
    void charger();
  }, [charger]);
  return { actions, erreur, charger };
}

/** Mode manuel : cocher les baisses et republications prévues, puis « Appliquer » (ou « Refuser »). */
export function ActionsAValider({ onChangement }: { onChangement: () => void }) {
  const { actions, erreur, charger } = useActions();
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<string | null>(null);
  const liste = actions?.aValider ?? [];
  if (liste.length === 0 && !retour) return erreur ? <p className="message message--erreur">{erreur}</p> : null;

  const basculer = (id: string) =>
    setCoches((c) => {
      const suivant = new Set(c);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  async function valider(appliquer: boolean) {
    setEnvoi(true);
    try {
      const r = await api.post<{ nombre: number }>(`/api/taches/actions/${appliquer ? "appliquer" : "refuser"}`, {
        ids: [...coches],
      });
      setRetour(
        appliquer
          ? `${r.nombre} action(s) envoyée(s) à l'extension.`
          : `${r.nombre} action(s) refusée(s) : l'article reste tel quel.`,
      );
      setCoches(new Set());
    } catch (e) {
      setRetour(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setEnvoi(false);
      await charger();
      onChangement();
    }
  }

  return (
    <section className="a-faire__section a-faire__section--a-traiter">
      <h2>
        Articles dormants : à valider <span className="pastille">{liste.length}</span>
      </h2>
      {retour && <p className="message message--ok">{retour}</p>}
      {liste.length > 0 && (
        <>
          <ul className="cases">
            {liste.map((a) => (
              <li key={a.id}>
                <label>
                  <input type="checkbox" checked={coches.has(a.id)} onChange={() => basculer(a.id)} />{" "}
                  <span>
                    <Link to={`/articles/${a.articleId}`}>
                      {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
                    </Link>
                    <br />
                    <span className="secondaire">
                      {libelleAction(a)}
                      {a.essai ? " — essai" : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" className="bouton" onClick={() => setCoches(new Set(liste.map((a) => a.id)))}>
              Tout cocher
            </button>
            <button
              type="button"
              className="bouton bouton--principal"
              disabled={envoi || coches.size === 0}
              onClick={() => void valider(true)}
            >
              Appliquer ({coches.size})
            </button>
            <button
              type="button"
              className="bouton"
              disabled={envoi || coches.size === 0}
              onClick={() => void valider(false)}
            >
              Refuser
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** Journal des dernières actions et de leur résultat. */
export function JournalActions() {
  const { actions, erreur } = useActions();
  return (
    <section className="section">
      <h2>Tâches automatiques</h2>
      {erreur && <p className="message message--erreur">{erreur}</p>}
      {actions && actions.journal.length === 0 && <p className="vide">Aucune action pour l'instant.</p>}
      <ul className="historique">
        {actions?.journal.map((a) => (
          <li key={a.id}>
            <span>
              <Link to={`/articles/${a.articleId}`}>
                {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
              </Link>{" "}
              <span className={`etiquette-publication etiquette-publication--${CLASSES[a.etat] ?? a.etat}`}>
                {ETATS[a.etat]}
                {a.essai && a.etat !== "essai" ? " (essai)" : ""}
              </span>
              <br />
              <span className="secondaire">
                {libelleAction(a)} — prévue le {formatDateHeure(a.creeLe)}
                {a.message ? ` — ${a.message}` : ""}
              </span>
              {a.url && (
                <>
                  {" "}
                  <a href={a.url} target="_blank" rel="noreferrer">
                    Voir l'annonce ↗
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
