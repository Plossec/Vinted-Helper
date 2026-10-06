// Montants de l'article (§5.2, §6.5) : coût total détaillé, prix vendu, bénéfice (réel ou provisoire),
// vente (colis), boosts et historique du prix affiché. Tous les montants viennent du serveur (centimes).
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { api, type Article, LIBELLES_CANAL, LIBELLES_MOTIF } from "../api.js";
import { aujourdhui, formatDate, formatDateHeure } from "../outils/dates.js";
import { formatEuros, lireMontant } from "../outils/montants.js";

export function BlocMontants({ article, onMiseAJour }: { article: Article; onMiseAJour: (a: Article) => void }) {
  const c = article.couts;
  const [boost, setBoost] = useState({ montant: "", date: aujourdhui() });
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouterBoost(evenement: FormEvent) {
    evenement.preventDefault();
    const montant = lireMontant(boost.montant);
    if (montant === null || montant === "invalide" || montant === 0) return setErreur("Montant du boost invalide.");
    try {
      onMiseAJour(await api.post<Article>(`/api/articles/${article.id}/boosts`, { montant, date: boost.date }));
      setBoost({ montant: "", date: aujourdhui() });
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ajout impossible.");
    }
  }

  async function supprimerBoost(id: string) {
    if (!window.confirm("Supprimer ce boost ?")) return;
    await api.delete(`/api/boosts/${id}`);
    onMiseAJour(await api.get<Article>(`/api/articles/${article.id}`));
  }

  return (
    <section className="section">
      <h2>Montants</h2>
      <table className="montants">
        <tbody>
          <tr>
            <td>Prix d'achat{article.lot ? " (part du lot)" : ""}</td>
            <td>{formatEuros(c.prixAchat)}</td>
          </tr>
          <tr>
            <td>Essence</td>
            <td>{formatEuros(c.essence)}</td>
          </tr>
          <tr>
            <td>Emballage</td>
            <td>{formatEuros(c.emballage)}</td>
          </tr>
          <tr>
            <td>Boosts</td>
            <td>{formatEuros(c.boosts)}</td>
          </tr>
          <tr className="montants__total">
            <td>Coût total</td>
            <td>{formatEuros(c.coutTotal)}</td>
          </tr>
          {c.prixVendu !== null && (
            <tr>
              <td>Prix vendu (part du montant crédité)</td>
              <td>{formatEuros(c.prixVendu)}</td>
            </tr>
          )}
          {article.sortieStock?.motif === "revendu" && article.sortieStock.prixRevente !== null && (
            <tr>
              <td>Prix de revente</td>
              <td>{formatEuros(article.sortieStock.prixRevente)}</td>
            </tr>
          )}
          <tr className="montants__total">
            <td>{c.realise ? "Bénéfice" : "Bénéfice provisoire"}</td>
            <td className={c.benefice < 0 ? "negatif" : "positif"}>{formatEuros(c.benefice)}</td>
          </tr>
        </tbody>
      </table>

      {article.vente && (
        <p>
          Vente : {formatEuros(article.vente.montantCredite)} crédités
          {article.vente.nombreArticles > 1 ? ` pour un colis de ${article.vente.nombreArticles} articles` : ""}, vendu
          le {formatDateHeure(article.vente.dateVente)}
          {article.vente.dateEnvoi ? `, envoyé le ${formatDateHeure(article.vente.dateEnvoi)}` : ""}
          {article.vente.dateFinalisation
            ? `, finalisé le ${formatDateHeure(article.vente.dateFinalisation)}`
            : ""}. <Link to={`/ventes/${article.vente.id}`}>Détail du colis</Link>
        </p>
      )}
      {article.sortieStock && (
        <p>
          Sorti du stock : <strong>{LIBELLES_MOTIF[article.sortieStock.motif]}</strong>
          {article.sortieStock.canal ? ` (${LIBELLES_CANAL[article.sortieStock.canal]})` : ""} le{" "}
          {formatDateHeure(article.sortieStock.date)}.
        </p>
      )}

      <h3>Boosts</h3>
      <ul className="historique">
        {article.boosts.map((b) => (
          <li key={b.id}>
            <span>
              {formatEuros(b.montant)} <span className="secondaire">— {formatDate(b.date)}</span>
            </span>
            <button type="button" className="lien" onClick={() => void supprimerBoost(b.id)}>
              Supprimer
            </button>
          </li>
        ))}
      </ul>
      <form className="champs-ligne champs-ligne--bas" onSubmit={(e) => void ajouterBoost(e)} noValidate>
        <label className="champ">
          <span>Boost (€)</span>
          <input
            inputMode="decimal"
            value={boost.montant}
            onChange={(e) => setBoost((b) => ({ ...b, montant: e.target.value }))}
            placeholder="1,50"
          />
        </label>
        <label className="champ">
          <span>Date</span>
          <input type="date" value={boost.date} onChange={(e) => setBoost((b) => ({ ...b, date: e.target.value }))} />
        </label>
        <button type="submit" className="bouton">
          Ajouter
        </button>
      </form>
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}

      {article.historiquePrix.length > 0 && (
        <>
          <h3>Historique du prix affiché</h3>
          <ul className="historique">
            {[...article.historiquePrix].reverse().map((p, i) => (
              <li key={`${p.date}-${i}`}>
                <span>
                  {formatEuros(p.prix)} <span className="secondaire">— {formatDateHeure(p.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
