// Liste des articles (§5.3) : recherche texte (référence en premier), filtres, tris. Les choix restent mémorisés
// le temps de la session (retour depuis une fiche).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api, type Referentiels, type ResumeArticle, type ResumeSortie } from "../api.js";
import { Alertes } from "../composants/Alertes.js";
import { ChoixMultiple } from "../composants/ChoixMultiple.js";
import type { OptionListe } from "../composants/ListeDeroulante.js";
import {
  ecrireModeAffichage,
  lireModeAffichage,
  type ModeAffichage,
  SelecteurAffichage,
  VuesArticles,
} from "../composants/VuesArticles.js";
import { chargerReferentiels } from "../hors-ligne/cache.js";
import { demanderPublication } from "../publication.js";
import { formatDate } from "../outils/dates.js";
import {
  FILTRES_PAR_DEFAUT,
  type Filtres,
  filtrerEtTrier,
  lireFiltres,
  nombreFiltresActifs,
  type Tri,
} from "../outils/recherche.js";
import { LIBELLES_STATUT, type Statut } from "../statuts.js";

const CLE = "vh-liste-articles";
const TRIS: Record<Tri, string> = {
  creation: "Date de saisie",
  achat: "Date d'achat",
  mise_en_ligne: "Date de mise en ligne",
  prix: "Prix affiché",
  anciennete_statut: "Ancienneté dans le statut",
  reference: "Référence",
  nom: "Nom",
  statut: "Statut",
  marque: "Marque",
  categorie: "Catégorie",
  lieu: "Lieu",
  prix_achat: "Prix d'achat",
  benefice: "Bénéfice",
};
const SEPARATEUR = " › ";

interface Etat {
  filtres: Filtres;
  tri: Tri;
  croissant: boolean;
}

const ETAT_INITIAL: Etat = {
  filtres: FILTRES_PAR_DEFAUT,
  tri: "creation",
  croissant: false,
};

function lireEtat(): Etat {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return ETAT_INITIAL;
    const lu = JSON.parse(brut) as Partial<Etat>;
    return { ...ETAT_INITIAL, ...lu, filtres: lireFiltres(lu.filtres) };
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
  const [mode, setMode] = useState<ModeAffichage>(lireModeAffichage);
  /** Mode sélection (filtre « À publier ») : articles cochés pour la publication sur Vinted. */
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

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
        /** Affichage (mode détaillé) : dernier niveau de la catégorie, nom du lieu. */
        categoriesCourtes: new Map(refs.categories.map((c) => [c.code, c.chemin[c.chemin.length - 1] ?? c.code])),
        lieux: new Map(refs.lieux.map((l) => [l.id, l.nom])),
        optionsLieux: refs.lieux.map((l): OptionListe => ({ cle: l.id, libelle: l.nom })),
        optionsSorties: sorties.map((s): OptionListe => ({
          cle: s.id,
          libelle: `${formatDate(s.date)} ${s.lieu}`,
          recherche: `${s.date} ${s.lieu}`,
        })),
      },
    [refs, sorties],
  );

  const resultats = useMemo(
    () =>
      articles &&
      filtrerEtTrier(
        articles,
        etat.filtres,
        etat.tri,
        etat.croissant,
        (code) => options?.libelles.get(code) ?? code,
        (id) => options?.lieux.get(id) ?? "",
      ),
    [articles, etat, options],
  );

  const filtrer = (modif: Partial<Filtres>) => setEtat((e) => ({ ...e, filtres: { ...e.filtres, ...modif } }));
  const nombreFiltres = nombreFiltresActifs(etat.filtres);
  const selectionPossible = etat.filtres.statuts.length === 1 && etat.filtres.statuts[0] === "a_publier";
  const basculerStatut = (statut: Statut) =>
    filtrer({
      statuts: etat.filtres.statuts.includes(statut)
        ? etat.filtres.statuts.filter((x) => x !== statut)
        : [...etat.filtres.statuts, statut],
    });
  const selectionActive = selectionPossible && selection !== null;

  const basculer = (id: string) =>
    setSelection((s) => {
      const suivante = new Set(s);
      if (suivante.has(id)) suivante.delete(id);
      else suivante.add(id);
      return suivante;
    });

  const publier = async () => {
    if (!selection || selection.size === 0) return;
    setEnvoi(true);
    setRetour(null);
    try {
      const r = await demanderPublication([...selection]);
      setRetour(r);
      if (r.ok) setSelection(null);
    } catch (e: unknown) {
      setRetour({ ok: false, texte: e instanceof Error ? e.message : "Envoi impossible." });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <main className={mode === "detaille" || mode === "mosaique" ? "page page--large" : "page"}>
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
        <div className="ligne-affichage">
          <span className="secondaire">Affichage</span>
          <SelecteurAffichage
            mode={mode}
            onChange={(m) => {
              setMode(m);
              ecrireModeAffichage(m);
            }}
          />
        </div>

        {filtresOuverts && options && refs && (
          <div className="encadre">
            <div className="champ">
              <span id="filtre-statuts">Statut {etat.filtres.statuts.length === 0 ? "(tous)" : ""}</span>
              <div className="puces" role="group" aria-labelledby="filtre-statuts">
                {(Object.entries(LIBELLES_STATUT) as [Statut, string][]).map(([code, libelle]) => (
                  <button
                    key={code}
                    type="button"
                    className={`puce${etat.filtres.statuts.includes(code) ? " puce--active" : ""}`}
                    aria-pressed={etat.filtres.statuts.includes(code)}
                    onClick={() => basculerStatut(code)}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            </div>
            <ChoixMultiple
              libelle="Catégorie"
              options={options.categories}
              valeurs={etat.filtres.categories}
              onChange={(categories) => filtrer({ categories })}
            />
            <ChoixMultiple
              libelle="Marque"
              options={options.marques}
              valeurs={etat.filtres.marqueIds}
              onChange={(marqueIds) => filtrer({ marqueIds })}
            />
            <label className="champ">
              <span>Gamme</span>
              <input value={etat.filtres.gamme} onChange={(e) => filtrer({ gamme: e.target.value })} />
            </label>
            <ChoixMultiple
              libelle="Lieu"
              placeholder="Tous"
              options={options.optionsLieux}
              valeurs={etat.filtres.lieuIds}
              onChange={(lieuIds) => filtrer({ lieuIds })}
            />
            <ChoixMultiple
              libelle="Sortie"
              options={options.optionsSorties}
              valeurs={etat.filtres.sortieIds}
              onChange={(sortieIds) => filtrer({ sortieIds })}
            />
            <button
              type="button"
              className="bouton"
              onClick={() => setEtat((s) => ({ ...s, filtres: { ...FILTRES_PAR_DEFAUT, texte: s.filtres.texte } }))}
            >
              Effacer les filtres
            </button>
          </div>
        )}
      </div>

      {erreur && <p className="message message--erreur">{erreur}</p>}
      {resultats === null && !erreur && <p className="statut">Chargement…</p>}
      {selectionPossible && resultats && resultats.length > 0 && (
        <p className="section">
          <button
            type="button"
            className="bouton"
            onClick={() => {
              setRetour(null);
              setSelection((s) => (s ? null : new Set()));
            }}
          >
            {selectionActive ? "Terminer la sélection" : "Sélectionner pour Vinted"}
          </button>
          {selectionActive && (
            <button type="button" className="bouton" onClick={() => setSelection(new Set(resultats.map((a) => a.id)))}>
              Tout cocher
            </button>
          )}
        </p>
      )}
      {retour && (
        <p className={`message message--lignes ${retour.ok ? "message--ok" : "message--erreur"}`}>
          {retour.texte}{" "}
          <Link to="/publication" className="lien">
            Suivre la publication
          </Link>
        </p>
      )}
      {resultats && (
        <p className="secondaire">
          {resultats.length} article{resultats.length > 1 ? "s" : ""}
          {articles && resultats.length !== articles.length ? ` sur ${articles.length}` : ""}
        </p>
      )}
      {resultats && (
        <VuesArticles
          articles={resultats}
          mode={mode}
          selection={selectionActive ? selection : null}
          onBasculer={basculer}
          libelleCategorie={(code) => options?.categoriesCourtes.get(code) ?? code}
          libelleLieu={(id) => options?.lieux.get(id) ?? "—"}
          tri={etat.tri}
          croissant={etat.croissant}
          onTri={(tri) => setEtat((s) => ({ ...s, tri, croissant: s.tri === tri ? !s.croissant : true }))}
        />
      )}
      {selectionActive && (
        <div className="selection-barre">
          <button
            type="button"
            className="bouton bouton--principal"
            disabled={envoi || selection.size === 0}
            onClick={() => void publier()}
          >
            {envoi ? "Envoi…" : `Publier sur Vinted (${selection.size})`}
          </button>
          <button type="button" className="bouton" onClick={() => setSelection(null)}>
            Annuler
          </button>
        </div>
      )}
      <p className="section">
        <Link to="/corbeille" className="lien">
          Corbeille
        </Link>
      </p>
    </main>
  );
}
