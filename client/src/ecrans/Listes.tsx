// Marques et lieux (§5.4) : recherche, renommage, fusion de deux valeurs (ex. « Levis » + « Levi's »).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api, type TypeListe } from "../api.js";
import { normaliser } from "../outils/recherche.js";

interface Valeur {
  id: string;
  nom: string;
  nombreArticles: number;
}

type Action =
  { type: "renommer"; valeur: Valeur; nom: string } | { type: "fusionner"; valeur: Valeur; cibleId: string };

export function Listes() {
  const [type, setType] = useState<TypeListe>("marques");
  const [valeurs, setValeurs] = useState<Valeur[] | null>(null);
  const [filtre, setFiltre] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  const charger = (t: TypeListe) =>
    api
      .get<Valeur[]>(`/api/referentiels/${t}`)
      .then(setValeurs)
      .catch((e: unknown) => setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Erreur" }));

  useEffect(() => {
    void charger(type);
  }, [type]);

  function changerType(t: TypeListe) {
    setValeurs(null);
    setAction(null);
    setType(t);
  }

  const visibles = useMemo(
    () => (valeurs ?? []).filter((v) => normaliser(v.nom).includes(normaliser(filtre.trim()))),
    [valeurs, filtre],
  );

  async function valider() {
    if (action === null) return;
    try {
      if (action.type === "renommer") {
        await api.put(`/api/referentiels/${type}/${action.valeur.id}`, { nom: action.nom });
        setMessage({ type: "ok", texte: `Renommé en « ${action.nom.trim()} ».` });
      } else {
        const cible = valeurs?.find((v) => v.id === action.cibleId);
        if (!cible) return setMessage({ type: "erreur", texte: "Choisissez la valeur à conserver." });
        if (
          !window.confirm(
            `Fusionner « ${action.valeur.nom} » dans « ${cible.nom} » ? Les articles passeront sur « ${cible.nom} ».`,
          )
        )
          return;
        await api.post(`/api/referentiels/${type}/${action.valeur.id}/fusion`, { cibleId: cible.id });
        setMessage({ type: "ok", texte: `« ${action.valeur.nom} » fusionné dans « ${cible.nom} ».` });
      }
      setAction(null);
      await charger(type);
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Action impossible." });
    }
  }

  return (
    <main className="page">
      <Link to="/reglages" className="lien-retour">
        ← Réglages
      </Link>
      <h1>Marques et lieux</h1>
      <div className="actions">
        {(["marques", "lieux"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={t === type ? "bouton bouton--principal" : "bouton"}
            onClick={() => changerType(t)}
          >
            {t === "marques" ? "Marques" : "Lieux"}
          </button>
        ))}
      </div>
      <input
        className="section"
        type="search"
        aria-label="Chercher"
        placeholder="Chercher…"
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
      />
      {message && (
        <p className={`message message--${message.type}`} role="status">
          {message.texte}
        </p>
      )}
      <ul className="historique">
        {visibles.map((v) => (
          <li key={v.id}>
            {action?.valeur.id === v.id ? (
              <span className="historique__correction">
                {action.type === "renommer" ? (
                  <input
                    aria-label="Nouveau nom"
                    value={action.nom}
                    onChange={(e) => setAction({ ...action, nom: e.target.value })}
                  />
                ) : (
                  <select
                    aria-label="Valeur conservée"
                    value={action.cibleId}
                    onChange={(e) => setAction({ ...action, cibleId: e.target.value })}
                  >
                    <option value="">Fusionner dans…</option>
                    {(valeurs ?? [])
                      .filter((c) => c.id !== v.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                  </select>
                )}
                <button type="button" className="bouton bouton--principal" onClick={() => void valider()}>
                  OK
                </button>
                <button type="button" className="bouton" onClick={() => setAction(null)}>
                  Annuler
                </button>
              </span>
            ) : (
              <>
                <span>
                  {v.nom}{" "}
                  <span className="secondaire">
                    — {v.nombreArticles} article{v.nombreArticles > 1 ? "s" : ""}
                  </span>
                </span>
                <span>
                  <button
                    type="button"
                    className="lien"
                    onClick={() => setAction({ type: "renommer", valeur: v, nom: v.nom })}
                  >
                    Renommer
                  </button>{" "}
                  <button
                    type="button"
                    className="lien"
                    onClick={() => setAction({ type: "fusionner", valeur: v, cibleId: "" })}
                  >
                    Fusionner
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      {valeurs === null && <p className="statut">Chargement…</p>}
    </main>
  );
}
