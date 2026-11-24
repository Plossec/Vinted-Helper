// Fusion d'un doublon dans un autre article (#284, ADR-0120) : choisir l'article à garder (nom ou référence), voir ce
// qui sera repris, confirmer. L'article gardé reçoit les champs vides, photos, ventes et historique ; ce doublon part
// à la corbeille.
import { useEffect, useState } from "react";
import { api, type BilanFusion, type ResumeArticle } from "../api.js";
import { formatReference, LIBELLES_STATUT } from "../statuts.js";
import { normaliser } from "./ListeDeroulante.js";

/** Résultats affichés au plus pendant la recherche. */
const RESULTATS_MAX = 8;

function resumeBilan(b: BilanFusion): string[] {
  const lignes: string[] = [];
  if (b.champs.length > 0) lignes.push(`Informations reprises : ${b.champs.join(", ")}.`);
  if (b.photos > 0) lignes.push(`${b.photos} photo(s) ajoutée(s) après les siennes.`);
  if (b.lot) lignes.push("Il prend la place de ce doublon dans son lot d'achat.");
  if (b.statut) lignes.push(`Son statut devient « ${b.statut} » (avec l'historique, la vente et le lien Vinted).`);
  if (b.historique > 0)
    lignes.push(`${b.historique} élément(s) d'historique rattaché(s) (prix, boosts, ventes, publications, offres).`);
  if (lignes.length === 0) lignes.push("Rien à reprendre : l'article gardé est déjà complet.");
  return lignes;
}

export function FusionArticle({
  articleId,
  onFusion,
}: {
  articleId: string;
  /** Appelée avec l'identifiant de l'article gardé, une fois la fusion faite. */
  onFusion: (gardeId: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [articles, setArticles] = useState<ResumeArticle[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [choisi, setChoisi] = useState<ResumeArticle | null>(null);
  const [bilan, setBilan] = useState<BilanFusion | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!ouvert || articles !== null) return;
    api
      .get<ResumeArticle[]>("/api/articles")
      .then(setArticles)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Liste des articles indisponible."));
  }, [ouvert, articles]);

  async function choisir(a: ResumeArticle) {
    setErreur(null);
    setChoisi(a);
    setBilan(null);
    try {
      setBilan(await api.post<BilanFusion>(`/api/articles/${articleId}/fusion`, { gardeId: a.id, essai: true }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Fusion impossible.");
    }
  }

  async function fusionner() {
    if (!choisi) return;
    setEnCours(true);
    setErreur(null);
    try {
      await api.post<BilanFusion>(`/api/articles/${articleId}/fusion`, { gardeId: choisi.id, essai: false });
      onFusion(choisi.id);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Fusion impossible.");
      setEnCours(false);
    }
  }

  if (!ouvert)
    return (
      <button type="button" className="bouton" onClick={() => setOuvert(true)}>
        Fusionner avec un autre article
      </button>
    );

  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  const resultats =
    mots.length === 0
      ? []
      : (articles ?? [])
          .filter((a) => a.id !== articleId)
          .filter((a) => {
            const cible = normaliser(`${formatReference(a.reference)} ${a.reference} ${a.nom ?? ""} ${a.marque ?? ""}`);
            return mots.every((m) => cible.includes(m));
          })
          .slice(0, RESULTATS_MAX);

  return (
    <div className="formulaire">
      <h3>Fusionner avec un autre article</h3>
      <p className="secondaire">
        Cet article est un doublon ? Choisissez l'article à garder : il reprend ce qui lui manque (rien n'est écrasé),
        les photos, la vente et l'historique. Cet article part ensuite à la corbeille.
      </p>
      {choisi === null ? (
        <>
          <label className="champ">
            <span>Article à garder (nom ou référence)</span>
            <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          {articles === null && !erreur && <p className="secondaire">Chargement…</p>}
          {mots.length > 0 && articles !== null && resultats.length === 0 && (
            <p className="secondaire">Aucun article trouvé.</p>
          )}
          <ul className="sommaire">
            {resultats.map((a) => (
              <li key={a.id}>
                <button type="button" className="sommaire__lien sommaire__bouton" onClick={() => void choisir(a)}>
                  <span className="sommaire__texte">
                    <span className="sommaire__titre">
                      {formatReference(a.reference)} — {a.nom ?? "Sans nom"}
                    </span>
                    <span className="sommaire__detail">{LIBELLES_STATUT[a.statut]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>
            Article gardé :{" "}
            <strong>
              {formatReference(choisi.reference)} — {choisi.nom ?? "Sans nom"}
            </strong>
          </p>
          {bilan && (
            <ul>
              {resumeBilan(bilan).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      <p className="actions">
        {choisi && bilan && (
          <button
            type="button"
            className="bouton bouton--principal"
            disabled={enCours}
            onClick={() => void fusionner()}
          >
            Fusionner et mettre ce doublon à la corbeille
          </button>
        )}
        {choisi && (
          <button type="button" className="bouton" disabled={enCours} onClick={() => setChoisi(null)}>
            Autre article
          </button>
        )}
        <button
          type="button"
          className="bouton"
          disabled={enCours}
          onClick={() => {
            setOuvert(false);
            setChoisi(null);
            setRecherche("");
            setErreur(null);
          }}
        >
          Annuler
        </button>
      </p>
    </div>
  );
}
