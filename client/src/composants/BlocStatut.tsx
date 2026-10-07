// Statut de l'article : boutons des passages autorisés (fournis par le serveur), date modifiable, et pour chaque
// passage le formulaire adapté (§4.2 à §4.4, §5.6, §5.7) : prix affiché pour En ligne, vente (= colis) pour
// « Vendu », envoi / finalisation / annulation / retour appliqués à tout le colis, sortie du stock avec motif.
import { useState } from "react";
import {
  api,
  type Article,
  type CanalRevente,
  LIBELLES_CANAL,
  LIBELLES_MOTIF,
  type MotifSortie,
  type ReglagesUtilisateur,
  type ResumeArticle,
  type Vente,
} from "../api.js";
import { depuisChampDateHeure, formatDateHeure, versChampDateHeure } from "../outils/dates.js";
import { centimesVersSaisie, formatEuros, lireMontant } from "../outils/montants.js";
import { ACTIONS_STATUT, formatReference, LIBELLES_STATUT, type Statut } from "../statuts.js";

interface Props {
  article: Article;
  onMiseAJour: (article: Article) => void;
}

/** Libellé du bouton selon le statut de départ (certains passages ont un sens particulier). */
function libelleAction(de: Statut, vers: Statut): string {
  if (de === "a_expedier" && vers === "en_ligne") return "Annulation par l'acheteur";
  if (de === "envoye" && vers === "a_publier") return "Retour de l'acheteur";
  if (de === "sortie_stock" && vers === "a_publier") return "Annuler la sortie du stock";
  return ACTIONS_STATUT[vers];
}

interface Saisie {
  date: string;
  prix: string;
  montant: string;
  emballage: string;
  /** Autres articles du colis (vente groupée) ou articles renvoyés (retour). */
  selection: string[];
  motif: MotifSortie | "";
  canal: CanalRevente | "";
  prixRevente: string;
  /** Vente : lien de la conversation Vinted avec l'acheteur (issue #48), facultatif. */
  conversation: string;
}

export function BlocStatut({ article, onMiseAJour }: Props) {
  const [choix, setChoix] = useState<Statut | null>(null);
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [enLigne, setEnLigne] = useState<ResumeArticle[]>([]);
  const [vente, setVente] = useState<Vente | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [correction, setCorrection] = useState<{ id: string; date: string } | null>(null);
  const modifier = (m: Partial<Saisie>) => setSaisie((s) => (s === null ? s : { ...s, ...m }));

  async function preparer(vers: Statut) {
    setErreur(null);
    const base: Saisie = {
      date: versChampDateHeure(new Date()),
      prix: centimesVersSaisie(article.prixAffiche),
      montant: "",
      emballage: "",
      selection: [],
      motif: "",
      canal: "",
      prixRevente: "",
      conversation: "",
    };
    try {
      if (vers === "a_expedier") {
        const [reglages, articles] = await Promise.all([
          api.get<ReglagesUtilisateur>("/api/reglages"),
          api.get<ResumeArticle[]>("/api/articles"),
        ]);
        base.emballage = centimesVersSaisie(reglages.emballageDefaut);
        base.montant = centimesVersSaisie(article.prixAffiche);
        setEnLigne(articles.filter((a) => a.statut === "en_ligne" && a.id !== article.id));
      }
      if (article.vente && (article.statut === "envoye" || article.statut === "a_expedier")) {
        setVente(await api.get<Vente>(`/api/ventes/${article.vente.id}`));
        if (vers === "a_publier") base.selection = [article.id];
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      return;
    }
    setSaisie(base);
    setChoix(vers);
  }

  async function confirmer() {
    if (choix === null || saisie === null) return;
    const de = article.statut;
    const date = depuisChampDateHeure(saisie.date);
    if (date === null) return setErreur("Indiquez une date et une heure valides.");
    const venteId = article.vente?.id;
    try {
      if (de === "en_ligne" && choix === "a_expedier") {
        const montant = lireMontant(saisie.montant);
        const emballage = lireMontant(saisie.emballage);
        if (montant === null || montant === "invalide") return setErreur("Indiquez le montant crédité (ex. 12,00).");
        if (emballage === "invalide") return setErreur("Emballage invalide (ex. 0,08).");
        await api.post("/api/ventes", {
          articleIds: [article.id, ...saisie.selection],
          montantCredite: montant,
          emballage,
          date,
          urlConversation: saisie.conversation.trim() || null,
        });
      } else if (venteId && de === "a_expedier" && choix === "envoye") {
        await api.post(`/api/ventes/${venteId}/envoi`, { date });
      } else if (venteId && de === "envoye" && choix === "finalise") {
        await api.post(`/api/ventes/${venteId}/finalisation`, { date });
      } else if (venteId && de === "a_expedier" && choix === "en_ligne") {
        await api.post(`/api/ventes/${venteId}/annulation`, { date });
      } else if (venteId && de === "envoye" && choix === "a_publier") {
        const restants = (vente?.articles ?? []).filter((a) => !a.retourne && !saisie.selection.includes(a.id));
        const montant = lireMontant(saisie.montant);
        if (saisie.selection.length === 0) return setErreur("Cochez les articles renvoyés.");
        if (restants.length > 0 && (montant === null || montant === "invalide")) {
          return setErreur("Indiquez le nouveau montant crédité pour les articles restants.");
        }
        await api.post(`/api/ventes/${venteId}/retour`, {
          articleIds: saisie.selection,
          montantCredite: restants.length > 0 ? montant : null,
          date,
        });
      } else if (choix === "sortie_stock") {
        if (saisie.motif === "") return setErreur("Choisissez le motif.");
        const prixRevente = lireMontant(saisie.prixRevente);
        if (saisie.motif === "revendu" && (prixRevente === null || prixRevente === "invalide" || saisie.canal === "")) {
          return setErreur("Revendu hors Vinted : indiquez le prix de revente et le canal.");
        }
        await api.post(`/api/articles/${article.id}/sortie-stock`, {
          motif: saisie.motif,
          canal: saisie.motif === "revendu" ? saisie.canal : null,
          prixRevente: saisie.motif === "revendu" ? prixRevente : null,
          date,
        });
      } else if (de === "sortie_stock" && choix === "a_publier") {
        await api.post(`/api/articles/${article.id}/annulation-sortie-stock`, { date });
      } else {
        let prixAffiche: number | null = null;
        if (choix === "en_ligne") {
          const montant = lireMontant(saisie.prix);
          if (montant === null || montant === "invalide" || montant <= 0) {
            return setErreur("Indiquez le prix affiché sur Vinted (ex. 12,00).");
          }
          prixAffiche = montant;
        }
        await api.post(`/api/articles/${article.id}/statut`, {
          vers: choix,
          date,
          ...(prixAffiche === null ? {} : { prixAffiche }),
        });
      }
      setChoix(null);
      setSaisie(null);
      setErreur(null);
      onMiseAJour(await api.get<Article>(`/api/articles/${article.id}`));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Changement impossible.");
    }
  }

  const basculer = (id: string) =>
    modifier({
      selection: saisie?.selection.includes(id)
        ? saisie.selection.filter((x) => x !== id)
        : [...(saisie?.selection ?? []), id],
    });
  const tailleColis = article.vente?.nombreArticles ?? 1;

  /** Supprime le dernier changement de statut (issue #50), après confirmation. */
  async function supprimerDernier(de: Statut, vers: Statut) {
    const passage = `${de}>${vers}`;
    const colis = tailleColis > 1;
    let texte = `Supprimer le changement « ${LIBELLES_STATUT[de]} → ${LIBELLES_STATUT[vers]} » ? L'article repasse « ${LIBELLES_STATUT[de]} ».`;
    if (passage === "en_ligne>a_expedier") texte += colis ? " Il sort du colis." : " La vente est supprimée.";
    if (
      (passage === "a_expedier>envoye" || passage === "envoye>finalise" || passage === "a_expedier>en_ligne") &&
      colis
    ) {
      texte += ` Tous les articles du colis (${tailleColis}) sont concernés.`;
    }
    if (!window.confirm(texte)) return;
    let montantCredite: number | null = null;
    if (passage === "en_ligne>a_expedier" && colis) {
      const saisi = window.prompt("Nouveau montant crédité pour les autres articles du colis (€) :");
      if (saisi === null) return;
      const montant = lireMontant(saisi);
      if (montant === null || montant === "invalide") return setErreur("Montant invalide (ex. 12,00).");
      montantCredite = montant;
    }
    try {
      onMiseAJour(await api.post<Article>(`/api/articles/${article.id}/annulation-statut`, { montantCredite }));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
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

      {choix === null || saisie === null ? (
        <div className="actions">
          {article.transitionsPossibles.map((vers) => (
            <button key={vers} type="button" className="bouton" onClick={() => void preparer(vers)}>
              {libelleAction(article.statut, vers)}
            </button>
          ))}
          {article.transitionsPossibles.length === 0 && <p className="secondaire">Aucun changement possible.</p>}
        </div>
      ) : (
        <div className="encadre">
          <p>
            {libelleAction(article.statut, choix)} → <strong>{LIBELLES_STATUT[choix]}</strong>
            {tailleColis > 1 && article.statut !== "en_ligne" && choix !== "sortie_stock" && choix !== "a_publier"
              ? ` (les ${tailleColis} articles du colis)`
              : ""}
          </p>
          <label className="champ">
            <span>Date et heure</span>
            <input type="datetime-local" value={saisie.date} onChange={(e) => modifier({ date: e.target.value })} />
          </label>

          {choix === "en_ligne" && article.statut !== "a_expedier" && (
            <label className="champ">
              <span>Prix affiché sur Vinted (€) *</span>
              <input
                inputMode="decimal"
                value={saisie.prix}
                onChange={(e) => modifier({ prix: e.target.value })}
                placeholder="12,00"
              />
            </label>
          )}

          {choix === "a_expedier" && (
            <>
              <div className="champs-ligne">
                <label className="champ">
                  <span>Montant crédité (€) *</span>
                  <input
                    inputMode="decimal"
                    value={saisie.montant}
                    onChange={(e) => modifier({ montant: e.target.value })}
                  />
                </label>
                <label className="champ">
                  <span>Emballage (€)</span>
                  <input
                    inputMode="decimal"
                    value={saisie.emballage}
                    onChange={(e) => modifier({ emballage: e.target.value })}
                  />
                </label>
              </div>
              <label className="champ">
                <span>Lien de la conversation Vinted (facultatif)</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://www.vinted.fr/inbox/…"
                  value={saisie.conversation}
                  onChange={(e) => modifier({ conversation: e.target.value })}
                />
              </label>
              <p className="secondaire">
                Montant réellement crédité sur le porte-monnaie Vinted. Vente groupée : cochez les autres articles du
                colis (montant total du colis).
              </p>
              {enLigne.length > 0 && (
                <ul className="cases">
                  {enLigne.map((a) => (
                    <li key={a.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={saisie.selection.includes(a.id)}
                          onChange={() => basculer(a.id)}
                        />{" "}
                        {formatReference(a.reference)} {a.nom ?? "(sans nom)"} —{" "}
                        {a.prixAffiche === null ? "—" : formatEuros(a.prixAffiche)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {article.statut === "envoye" && choix === "a_publier" && vente && (
            <>
              <p className="secondaire">Cochez les articles renvoyés. Ils repasseront « À publier ».</p>
              <ul className="cases">
                {vente.articles
                  .filter((a) => !a.retourne)
                  .map((a) => (
                    <li key={a.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={saisie.selection.includes(a.id)}
                          onChange={() => basculer(a.id)}
                        />{" "}
                        {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
                      </label>
                    </li>
                  ))}
              </ul>
              {vente.articles.filter((a) => !a.retourne && !saisie.selection.includes(a.id)).length > 0 && (
                <label className="champ">
                  <span>Nouveau montant crédité pour les articles restants (€) *</span>
                  <input
                    inputMode="decimal"
                    value={saisie.montant}
                    onChange={(e) => modifier({ montant: e.target.value })}
                  />
                </label>
              )}
            </>
          )}

          {choix === "sortie_stock" && (
            <>
              <label className="champ">
                <span>Motif *</span>
                <select value={saisie.motif} onChange={(e) => modifier({ motif: e.target.value as MotifSortie })}>
                  <option value="">Choisir…</option>
                  {Object.entries(LIBELLES_MOTIF).map(([code, libelle]) => (
                    <option key={code} value={code}>
                      {libelle}
                    </option>
                  ))}
                </select>
              </label>
              {saisie.motif === "revendu" && (
                <div className="champs-ligne">
                  <label className="champ">
                    <span>Prix de revente (€) *</span>
                    <input
                      inputMode="decimal"
                      value={saisie.prixRevente}
                      onChange={(e) => modifier({ prixRevente: e.target.value })}
                    />
                  </label>
                  <label className="champ">
                    <span>Canal *</span>
                    <select value={saisie.canal} onChange={(e) => modifier({ canal: e.target.value as CanalRevente })}>
                      <option value="">Choisir…</option>
                      {Object.entries(LIBELLES_CANAL).map(([code, libelle]) => (
                        <option key={code} value={code}>
                          {libelle}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </>
          )}

          <div className="actions">
            <button type="button" className="bouton bouton--principal" onClick={() => void confirmer()}>
              Confirmer
            </button>
            <button
              type="button"
              className="bouton"
              onClick={() => {
                setChoix(null);
                setSaisie(null);
              }}
            >
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
        {[...article.historiqueStatuts].reverse().map((h, i) => (
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
                {i === 0 && h.de !== null && (
                  <button type="button" className="lien" onClick={() => void supprimerDernier(h.de ?? h.vers, h.vers)}>
                    Supprimer
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
