// Liste des articles (§5.3) : recherche texte (référence en premier), filtres, tris. Les choix restent mémorisés
// le temps de la session (retour depuis une fiche).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api, type Referentiels, type ResumeArticle, type ResumeSortie, urlVignette } from "../api.js";
import { Alertes } from "../composants/Alertes.js";
import { ListeDeroulante, type OptionListe } from "../composants/ListeDeroulante.js";
import { chargerReferentiels } from "../hors-ligne/cache.js";
import { formatDate } from "../outils/dates.js";
import { formatEuros } from "../outils/montants.js";
import { FILTRES_VIDES, type Filtres, filtrerEtTrier, type Tri } from "../outils/recherche.js";
import { formatReference, LIBELLES_STATUT, type Statut } from "../statuts.js";

const CLE = "vh-liste-articles";
const TRIS: Record<Tri, string> = {
  creation: "Date de saisie",
  achat: "Date d'achat",
  mise_en_ligne: "Date de mise en ligne",
  prix: "Prix affiché",
  anciennete_statut: "Ancienneté dans le statut",
};
const SEPARATEUR = " › ";

interface Etat {
  filtres: Filtres;
  tri: Tri;
  croissant: boolean;
  /** Texte affiché dans les listes déroulantes (catégorie, marque). */
  categorieTexte: string;
  marqueTexte: string;
}

const ETAT_INITIAL: Etat = {
  filtres: FILTRES_VIDES,
  tri: "creation",
  croissant: false,
  categorieTexte: "",
  marqueTexte: "",
};

function lireEtat(): Etat {
  try {
    const brut = sessionStorage.getItem(CLE);
    return brut ? { ...ETAT_INITIAL, ...(JSON.parse(brut) as Partial<Etat>) } : ETAT_INITIAL;
  } catch {
    return ETAT_INITIAL;
  }
}

/** Catégories filtrables : toutes les branches de l'arbre (ex. « Hommes › Vêtements »), pas seulement les feuilles. */
function branchesCategories(refs: Referentiels): OptionListe[] {
  const vues = new Map<string, string[]>();
  for (const c of refs.categories) {
    const morceaux = c.code.split("/");
    for (let i = 1; i <= morceaux.length; i++) {
      const code = morceaux.slice(0, i).join("/");
      if (!vues.has(code)) vues.set(code, c.chemin.slice(0, i));
    }
  }
  return [...vues].map(([code, chemin]) => ({
    cle: code,
    libelle: chemin[chemin.length - 1] ?? code,
    secondaire: chemin.slice(0, -1).join(SEPARATEUR),
    recherche: chemin.join(" "),
  }));
}

export function ListeArticles() {
  const [articles, setArticles] = useState<ResumeArticle[] | null>(null);
  const [refs, setRefs] = useState<Referentiels | null>(null);
  const [sorties, setSorties] = useState<ResumeSortie[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat>(lireEtat);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  useEffect(() => {
    let actif = true;
    api
      .get<ResumeArticle[]>("/api/articles")
      .then((liste) => actif && setArticles(liste))
      .catch((e: unknown) => actif && setErreur(e instanceof Error ? e.message : "Chargement impossible."));
    void chargerReferentiels(() => api.get<Referentiels>("/api/referentiels")).then(
      ({ refs }) => actif && setRefs(refs),
    );
    api
      .get<ResumeSortie[]>("/api/sorties")
      .then((s) => actif && setSorties(s))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE, JSON.stringify(etat));
    } catch {
      // Mémorisation facultative.
    }
  }, [etat]);

  const options = useMemo(
    () =>
      refs && {
        categories: branchesCategories(refs),
        marques: refs.marques.map((m): OptionListe => ({ cle: m.id, libelle: m.nom })),
        libelles: new Map(refs.categories.map((c) => [c.code, c.chemin.join(" ")])),
      },
    [refs],
  );

  const resultats = useMemo(
    () =>
      articles &&
      filtrerEtTrier(articles, etat.filtres, etat.tri, etat.croissant, (code) => options?.libelles.get(code) ?? code),
    [articles, etat, options],
  );

  const filtrer = (modif: Partial<Filtres>) => setEtat((e) => ({ ...e, filtres: { ...e.filtres, ...modif } }));
  const nombreFiltres = Object.entries(etat.filtres).filter(([cle, v]) => cle !== "texte" && v !== "").length;

  return (
    <main className="page">
      <h1>Articles</h1>
      <Alertes />
      <Link to="/articles/nouveau" className="bouton bouton--principal">
        + Nouvel article
      </Link>

      <div className="recherche">
        <input
          type="search"
          aria-label="Rechercher"
          placeholder="Rechercher (nom, marque, n° de référence…)"
          value={etat.filtres.texte}
          onChange={(e) => filtrer({ texte: e.target.value })}
        />
        <div className="champs-ligne champs-ligne--bas">
          <label className="champ">
            <span>Trier par</span>
            <select value={etat.tri} onChange={(e) => setEtat((s) => ({ ...s, tri: e.target.value as Tri }))}>
              {Object.entries(TRIS).map(([code, libelle]) => (
                <option key={code} value={code}>
                  {libelle}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="bouton"
            aria-label={etat.croissant ? "Ordre croissant" : "Ordre décroissant"}
            onClick={() => setEtat((s) => ({ ...s, croissant: !s.croissant }))}
          >
            {etat.croissant ? "↑" : "↓"}
          </button>
          <button
            type="button"
            className="bouton"
            aria-expanded={filtresOuverts}
            onClick={() => setFiltresOuverts((o) => !o)}
          >
            Filtres{nombreFiltres > 0 ? ` (${nombreFiltres})` : ""}
          </button>
        </div>

        {filtresOuverts && options && refs && (
          <div className="encadre">
            <label className="champ">
              <span>Statut</span>
              <select value={etat.filtres.statut} onChange={(e) => filtrer({ statut: e.target.value as Statut | "" })}>
                <option value="">Tous</option>
                {Object.entries(LIBELLES_STATUT).map(([code, libelle]) => (
                  <option key={code} value={code}>
                    {libelle}
                  </option>
                ))}
              </select>
            </label>
            <ListeDeroulante
              libelle="Catégorie"
              texte={etat.categorieTexte}
              onTexte={(texte) =>
                setEtat((s) => ({ ...s, categorieTexte: texte, filtres: { ...s.filtres, categorie: "" } }))
              }
              options={options.categories}
              onChoix={(o) =>
                setEtat((s) => ({
                  ...s,
                  categorieTexte: [o.secondaire, o.libelle].filter(Boolean).join(SEPARATEUR),
                  filtres: { ...s.filtres, categorie: o.cle },
                }))
              }
            />
            <ListeDeroulante
              libelle="Marque"
              texte={etat.marqueTexte}
              onTexte={(texte) =>
                setEtat((s) => ({ ...s, marqueTexte: texte, filtres: { ...s.filtres, marqueId: "" } }))
              }
              options={options.marques}
              onChoix={(o) =>
                setEtat((s) => ({ ...s, marqueTexte: o.libelle, filtres: { ...s.filtres, marqueId: o.cle } }))
              }
            />
            <label className="champ">
              <span>Gamme</span>
              <input value={etat.filtres.gamme} onChange={(e) => filtrer({ gamme: e.target.value })} />
            </label>
            <div className="champs-ligne">
              <label className="champ">
                <span>Lieu</span>
                <select value={etat.filtres.lieuId} onChange={(e) => filtrer({ lieuId: e.target.value })}>
                  <option value="">Tous</option>
                  {refs.lieux.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="champ">
                <span>Sortie</span>
                <select value={etat.filtres.sortieId} onChange={(e) => filtrer({ sortieId: e.target.value })}>
                  <option value="">Toutes</option>
                  {sorties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDate(s.date)} {s.lieu}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className="bouton"
              onClick={() =>
                setEtat((s) => ({
                  ...s,
                  filtres: { ...FILTRES_VIDES, texte: s.filtres.texte },
                  categorieTexte: "",
                  marqueTexte: "",
                }))
              }
            >
              Effacer les filtres
            </button>
          </div>
        )}
      </div>

      {erreur && <p className="message message--erreur">{erreur}</p>}
      {resultats === null && !erreur && <p className="statut">Chargement…</p>}
      {resultats && (
        <p className="secondaire">
          {resultats.length} article{resultats.length > 1 ? "s" : ""}
          {articles && resultats.length !== articles.length ? ` sur ${articles.length}` : ""}
        </p>
      )}
      <ul className="liste">
        {resultats?.map((a) => (
          <li key={a.id}>
            <Link to={`/articles/${a.id}`} className="carte-article carte-article--photo">
              {a.vignette ? (
                <img className="vignette" src={urlVignette(a.vignette)} alt="" loading="lazy" />
              ) : (
                <span className="vignette" />
              )}
              <span className="carte-article__texte">
                <span className="carte-article__ligne">
                  <span className="reference">{formatReference(a.reference)}</span>
                  <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
                </span>
                <span className="carte-article__nom">{a.nom ?? "(sans nom)"}</span>
                <span className="carte-article__prix">
                  {[a.marque, a.prixAffiche === null ? null : formatEuros(a.prixAffiche)].filter(Boolean).join(" · ") ||
                    "Prix affiché : —"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="section">
        <Link to="/corbeille" className="lien">
          Corbeille
        </Link>
      </p>
    </main>
  );
}
