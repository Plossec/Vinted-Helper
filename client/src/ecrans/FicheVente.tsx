// Détail d'une vente (= colis) : montant crédité, emballage, dates, articles et leur part (§5.6, §6.4).
import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api, type Vente } from "../api.js";
import { formatDateHeure } from "../outils/dates.js";
import { centimesVersSaisie, formatEuros, lireMontant } from "../outils/montants.js";
import { formatReference, LIBELLES_STATUT } from "../statuts.js";

export function FicheVente() {
  const { id } = useParams();
  const [vente, setVente] = useState<Vente | null>(null);
  const [form, setForm] = useState({ montant: "", emballage: "" });
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    api
      .get<Vente>(`/api/ventes/${id ?? ""}`)
      .then((v) => {
        setVente(v);
        setForm({ montant: centimesVersSaisie(v.montantCredite), emballage: centimesVersSaisie(v.emballage) });
      })
      .catch((e: unknown) => setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Erreur" }));
  }, [id]);

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    if (!vente) return;
    const montantCredite = lireMontant(form.montant);
    const emballage = lireMontant(form.emballage);
    if (montantCredite === null || montantCredite === "invalide" || emballage === null || emballage === "invalide") {
      return setMessage({ type: "erreur", texte: "Montants invalides (ex. 12,00 et 0,08)." });
    }
    try {
      setVente(await api.put<Vente>(`/api/ventes/${vente.id}`, { montantCredite, emballage }));
      setMessage({ type: "ok", texte: "Vente enregistrée." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    }
  }

  return (
    <main className="page">
      <Link to="/" className="lien-retour">
        ← Articles
      </Link>
      <h1>Colis</h1>
      {!vente ? (
        <p className={message ? "message message--erreur" : "statut"}>{message?.texte ?? "Chargement…"}</p>
      ) : (
        <>
          {vente.annulee && <p className="message message--erreur">Vente annulée : exclue de tous les calculs.</p>}
          <p className="secondaire">
            Vendu le {formatDateHeure(vente.dateVente)}
            {vente.dateEnvoi ? ` · envoyé le ${formatDateHeure(vente.dateEnvoi)}` : ""}
            {vente.dateFinalisation ? ` · finalisé le ${formatDateHeure(vente.dateFinalisation)}` : ""}
          </p>
          <ul className="liste">
            {vente.articles.map((a) => (
              <li key={a.id}>
                <Link to={`/articles/${a.id}`} className="carte-article">
                  <span className="carte-article__ligne">
                    <span className="reference">{formatReference(a.reference)}</span>
                    <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
                  </span>
                  <span className="carte-article__nom">{a.nom ?? "(sans nom)"}</span>
                  <span className="carte-article__prix">
                    {a.retourne
                      ? "Renvoyé par l'acheteur"
                      : `Affiché ${formatEuros(a.prixAffiche)} → vendu ${a.prixVendu === null ? "—" : formatEuros(a.prixVendu)}, emballage ${formatEuros(a.partEmballage)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!vente.annulee && (
            <form className="formulaire section" onSubmit={(e) => void enregistrer(e)} noValidate>
              <div className="champs-ligne">
                <label className="champ">
                  <span>Montant crédité (€)</span>
                  <input
                    inputMode="decimal"
                    value={form.montant}
                    onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                  />
                </label>
                <label className="champ">
                  <span>Emballage (€)</span>
                  <input
                    inputMode="decimal"
                    value={form.emballage}
                    onChange={(e) => setForm((f) => ({ ...f, emballage: e.target.value }))}
                  />
                </label>
              </div>
              {message && <p className={`message message--${message.type}`}>{message.texte}</p>}
              <button className="bouton bouton--principal" type="submit">
                Corriger les montants
              </button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
