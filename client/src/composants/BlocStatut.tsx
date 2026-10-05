// Statut de l'article : boutons des passages autorisés (fournis par le serveur), date modifiable,
// prix affiché demandé pour « En ligne », historique avec dates corrigeables (§4.2, §4.4).
import { useState } from "react";
import { api, type Article } from "../api.js";
import { depuisChampDateHeure, formatDateHeure, versChampDateHeure } from "../outils/dates.js";
import { centimesVersSaisie, lireMontant } from "../outils/montants.js";
import { ACTIONS_STATUT, LIBELLES_STATUT, type Statut } from "../statuts.js";

interface Props {
  article: Article;
  onMiseAJour: (article: Article) => void;
}

export function BlocStatut({ article, onMiseAJour }: Props) {
  const [choix, setChoix] = useState<Statut | null>(null);
  const [date, setDate] = useState("");
  const [prix, setPrix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [correction, setCorrection] = useState<{ id: string; date: string } | null>(null);

  function preparer(vers: Statut) {
    setChoix(vers);
    setDate(versChampDateHeure(new Date()));
    setPrix(centimesVersSaisie(article.prixAffiche));
    setErreur(null);
  }

  async function confirmer() {
    if (choix === null) return;
    const dateIso = depuisChampDateHeure(date);
    if (dateIso === null) {
      setErreur("Indiquez une date et une heure valides.");
      return;
    }
    let prixAffiche: number | null = null;
    if (choix === "en_ligne") {
      const montant = lireMontant(prix);
      if (montant === null || montant === "invalide" || montant <= 0) {
        setErreur("Indiquez le prix affiché sur Vinted (ex. 12,00).");
        return;
      }
      prixAffiche = montant;
    }
    try {
      const misAJour = await api.post<Article>(`/api/articles/${article.id}/statut`, {
        vers: choix,
        date: dateIso,
        ...(prixAffiche === null ? {} : { prixAffiche }),
      });
      setChoix(null);
      onMiseAJour(misAJour);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Changement impossible.");
    }
  }

  async function enregistrerCorrection() {
    if (correction === null) return;
    const dateIso = depuisChampDateHeure(correction.date);
    if (dateIso === null) {
      setErreur("Indiquez une date et une heure valides.");
      return;
    }
    try {
      await api.put(`/api/historique-statuts/${correction.id}`, { date: dateIso });
      setCorrection(null);
      setErreur(null);
      onMiseAJour(await api.get<Article>(`/api/articles/${article.id}`));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Correction impossible.");
    }
  }

  return (
    <section className="section">
      <h2>
        Statut : <span className={`badge badge--${article.statut}`}>{LIBELLES_STATUT[article.statut]}</span>
      </h2>

      {choix === null ? (
        <div className="actions">
          {article.transitionsPossibles.map((vers) => (
            <button key={vers} type="button" className="bouton" onClick={() => preparer(vers)}>
              {ACTIONS_STATUT[vers]}
            </button>
          ))}
        </div>
      ) : (
        <div className="encadre">
          <p>
            Passer à <strong>{LIBELLES_STATUT[choix]}</strong>
          </p>
          <label className="champ">
            <span>Date et heure du changement</span>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {choix === "en_ligne" && (
            <label className="champ">
              <span>Prix affiché sur Vinted (€) *</span>
              <input inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="12,00" />
            </label>
          )}
          <div className="actions">
            <button type="button" className="bouton bouton--principal" onClick={() => void confirmer()}>
              Confirmer
            </button>
            <button type="button" className="bouton" onClick={() => setChoix(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}

      <h3>Historique</h3>
      <ul className="historique">
        {[...article.historiqueStatuts].reverse().map((h) => (
          <li key={h.id}>
            {correction?.id === h.id ? (
              <span className="historique__correction">
                <input
                  type="datetime-local"
                  value={correction.date}
                  onChange={(e) => setCorrection({ id: h.id, date: e.target.value })}
                />
                <button type="button" className="bouton bouton--principal" onClick={() => void enregistrerCorrection()}>
                  OK
                </button>
                <button type="button" className="bouton" onClick={() => setCorrection(null)}>
                  Annuler
                </button>
              </span>
            ) : (
              <>
                <span>
                  {h.de === null ? "Création" : `${LIBELLES_STATUT[h.de]} → ${LIBELLES_STATUT[h.vers]}`}
                  <span className="secondaire"> — {formatDateHeure(h.date)}</span>
                </span>
                <button
                  type="button"
                  className="lien"
                  onClick={() => setCorrection({ id: h.id, date: versChampDateHeure(new Date(h.date)) })}
                >
                  Corriger la date
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
