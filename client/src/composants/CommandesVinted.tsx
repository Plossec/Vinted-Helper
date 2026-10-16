// Tâche « Vérification vente finalisée » (#148) dans l'écran « À faire » : commandes terminées sur Vinted à valider
// (mode manuel), à rattacher à un article Envoyé, et montants crédités corrigés par celui de Vinted.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type CommandeVinted, type ResumeArticle } from "../api.js";
import { formatDate } from "../outils/dates.js";
import { formatEuros } from "../outils/montants.js";
import { formatReference } from "../statuts.js";

interface Commandes {
  aValider: CommandeVinted[];
  aRattacher: CommandeVinted[];
  montantsCorriges: CommandeVinted[];
}

/** « #0012 Jean, #0013 Pull » : articles du colis rattaché. */
function articlesDuColis(c: CommandeVinted) {
  return (c.vente?.articles ?? []).map((a, i) => (
    <span key={a.id}>
      {i > 0 ? ", " : ""}
      <Link to={`/articles/${a.id}`}>
        {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
      </Link>
    </span>
  ));
}

const montantVinted = (c: CommandeVinted) => (c.montant === null ? "montant non lu" : formatEuros(c.montant));

export function CommandesVinted({ onChangement }: { onChangement: () => void }) {
  const [commandes, setCommandes] = useState<Commandes | null>(null);
  const [envoyes, setEnvoyes] = useState<ResumeArticle[]>([]);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(
    () =>
      Promise.all([api.get<Commandes>("/api/taches/commandes"), api.get<ResumeArticle[]>("/api/articles")])
        .then(([c, articles]) => {
          setCommandes(c);
          setEnvoyes(articles.filter((a) => a.statut === "envoye"));
        })
        .catch((e: unknown) =>
          setRetour({ ok: false, texte: e instanceof Error ? e.message : "Chargement impossible." }),
        ),
    [],
  );
  useEffect(() => {
    void charger();
  }, [charger]);

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

  if (!commandes) return retour ? <p className="message message--erreur">{retour.texte}</p> : null;
  const { aValider, aRattacher, montantsCorriges } = commandes;
  if (aValider.length + aRattacher.length + montantsCorriges.length === 0 && !retour) return null;

  const basculer = (id: string) =>
    setCoches((c) => {
      const suivant = new Set(c);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  return (
    <>
      {retour && <p className={retour.ok ? "message message--ok" : "message message--erreur"}>{retour.texte}</p>}

      {aValider.length > 0 && (
        <section className="a-faire__section a-faire__section--a-traiter">
          <h2>
            Ventes finalisées sur Vinted : à valider <span className="pastille">{aValider.length}</span>
          </h2>
          <ul className="cases">
            {aValider.map((c) => (
              <li key={c.id}>
                <label>
                  <input type="checkbox" checked={coches.has(c.id)} onChange={() => basculer(c.id)} />{" "}
                  <span>
                    {articlesDuColis(c)}
                    <br />
                    <span className="secondaire">
                      Commande terminée le {formatDate(c.dateFin)} — {montantVinted(c)}
                      {c.montant !== null && c.vente?.montantCredite != null && c.montant !== c.vente.montantCredite
                        ? ` (application : ${formatEuros(c.vente.montantCredite)}, sera corrigé)`
                        : ""}
                      {c.message ? ` — ${c.message}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" className="bouton" onClick={() => setCoches(new Set(aValider.map((c) => c.id)))}>
              Tout cocher
            </button>
            <button
              type="button"
              className="bouton bouton--principal"
              disabled={envoi || coches.size === 0}
              onClick={() =>
                void agir(async () => {
                  const r = await api.post<{ nombre: number }>("/api/taches/commandes/appliquer", { ids: [...coches] });
                  return `${r.nombre} colis passé(s) « Finalisé ».`;
                })
              }
            >
              Finaliser ({coches.size})
            </button>
            <button
              type="button"
              className="bouton"
              disabled={envoi || coches.size === 0}
              onClick={() =>
                void agir(async () => {
                  const r = await api.post<{ nombre: number }>("/api/taches/commandes/ecarter", { ids: [...coches] });
                  return `${r.nombre} commande(s) refusée(s) : rien n'a changé.`;
                })
              }
            >
              Refuser
            </button>
          </div>
        </section>
      )}

      {aRattacher.length > 0 && (
        <section className="a-faire__section a-faire__section--a-traiter">
          <h2>
            Commandes Vinted à rattacher <span className="pastille">{aRattacher.length}</span>
          </h2>
          <ul className="a-faire__liste">
            {aRattacher.map((c) => (
              <li key={c.id} className="a-faire__ligne">
                <div className="a-faire__texte">
                  <span>
                    Commande terminée le {formatDate(c.dateFin)} — {montantVinted(c)} —{" "}
                    {c.annonces.map((n, i) => (
                      <span key={n}>
                        {i > 0 ? ", " : ""}
                        <a href={`https://www.vinted.fr/items/${n}`} target="_blank" rel="noreferrer">
                          annonce {n} ↗
                        </a>
                      </span>
                    ))}
                  </span>
                  {c.message && <span className="secondaire">{c.message}</span>}
                  <label className="champ">
                    <span>Article Envoyé correspondant</span>
                    <select
                      value={choix[c.id] ?? ""}
                      onChange={(e) => setChoix((x) => ({ ...x, [c.id]: e.target.value }))}
                    >
                      <option value="">Choisir…</option>
                      {envoyes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="a-faire__actions">
                  <button
                    type="button"
                    className="bouton"
                    disabled={envoi || !choix[c.id]}
                    onClick={() =>
                      void agir(async () => {
                        await api.post(`/api/taches/commandes/${c.id}/rattacher`, { articleId: choix[c.id] });
                        return "Commande rattachée : le colis est « Finalisé ».";
                      })
                    }
                  >
                    Rattacher
                  </button>
                  <button
                    type="button"
                    className="bouton"
                    disabled={envoi}
                    onClick={() =>
                      void agir(async () => {
                        await api.post("/api/taches/commandes/ecarter", { ids: [c.id] });
                        return "Commande ignorée.";
                      })
                    }
                  >
                    Ignorer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {montantsCorriges.length > 0 && (
        <section className="a-faire__section a-faire__section--info">
          <h2>
            Montants corrigés par Vinted <span className="pastille">{montantsCorriges.length}</span>
          </h2>
          <ul className="a-faire__liste">
            {montantsCorriges.map((c) => (
              <li key={c.id} className="a-faire__ligne">
                <div className="a-faire__texte">
                  <span>{articlesDuColis(c)}</span>
                  <span className="secondaire">
                    Montant crédité {formatEuros(c.montantAvant ?? 0)} → {montantVinted(c)} (lu sur Vinted, finalisé le{" "}
                    {formatDate(c.dateFin)})
                  </span>
                </div>
                <div className="a-faire__actions">
                  <button
                    type="button"
                    className="bouton"
                    disabled={envoi}
                    onClick={() =>
                      void agir(async () => {
                        await api.post(`/api/taches/commandes/${c.id}/vu`, {});
                        return "Vu.";
                      })
                    }
                  >
                    Vu
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
