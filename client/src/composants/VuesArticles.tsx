// Modes d'affichage de la liste des articles (issue #31) : vignettes, liste compacte, mosaïque, détaillé (tableau).
// Le mode choisi est mémorisé sur l'appareil (le téléphone et le PC peuvent avoir chacun le leur).
import { Link, useNavigate } from "react-router";
import { type ResumeArticle, urlVignette } from "../api.js";
import { formatDate } from "../outils/dates.js";
import { formatEuros } from "../outils/montants.js";
import type { Tri } from "../outils/recherche.js";
import { formatReference, LIBELLES_STATUT } from "../statuts.js";

export type ModeAffichage = "vignettes" | "compacte" | "mosaique" | "detaille";

export const MODES_AFFICHAGE: { mode: ModeAffichage; icone: string; libelle: string }[] = [
  { mode: "vignettes", icone: "▤", libelle: "Vignettes" },
  { mode: "compacte", icone: "☰", libelle: "Liste compacte" },
  { mode: "mosaique", icone: "▦", libelle: "Mosaïque" },
  { mode: "detaille", icone: "▥", libelle: "Détaillé" },
];

const CLE_MODE = "vh-affichage-articles";

export function lireModeAffichage(): ModeAffichage {
  try {
    const mode = localStorage.getItem(CLE_MODE);
    return MODES_AFFICHAGE.some((m) => m.mode === mode) ? (mode as ModeAffichage) : "vignettes";
  } catch {
    return "vignettes";
  }
}

export function ecrireModeAffichage(mode: ModeAffichage) {
  try {
    localStorage.setItem(CLE_MODE, mode);
  } catch {
    // Préférence facultative.
  }
}

export function SelecteurAffichage({
  mode,
  onChange,
}: {
  mode: ModeAffichage;
  onChange: (mode: ModeAffichage) => void;
}) {
  return (
    <div className="selecteur-affichage" role="group" aria-label="Affichage">
      {MODES_AFFICHAGE.map((m) => (
        <button
          key={m.mode}
          type="button"
          className="bouton"
          aria-pressed={mode === m.mode}
          aria-label={m.libelle}
          title={m.libelle}
          onClick={() => onChange(m.mode)}
        >
          <span aria-hidden="true">{m.icone}</span>
        </button>
      ))}
    </div>
  );
}

interface Props {
  articles: ResumeArticle[];
  mode: ModeAffichage;
  /** Mode sélection (publication Vinted) : articles cochés, sinon null. */
  selection: Set<string> | null;
  onBasculer: (id: string) => void;
  /** Mode détaillé : libellés et tri par colonne. */
  libelleCategorie: (code: string) => string;
  libelleLieu: (id: string) => string;
  tri: Tri;
  croissant: boolean;
  onTri: (tri: Tri) => void;
}

const prixAffiche = (a: ResumeArticle) => (a.prixAffiche === null ? "—" : formatEuros(a.prixAffiche));

function CaseSelection({ a, props }: { a: ResumeArticle; props: Props }) {
  if (!props.selection) return null;
  return (
    <input
      type="checkbox"
      aria-label={`Sélectionner ${formatReference(a.reference)}`}
      checked={props.selection.has(a.id)}
      onChange={() => props.onBasculer(a.id)}
    />
  );
}

function Vignette({ a, classe = "vignette" }: { a: ResumeArticle; classe?: string }) {
  return a.vignette ? (
    <img className={classe} src={urlVignette(a.vignette)} alt="" loading="lazy" />
  ) : (
    <span className={classe} />
  );
}

export function VuesArticles(props: Props) {
  const { articles, mode, selection } = props;

  if (mode === "detaille") return <Tableau {...props} />;

  if (mode === "mosaique") {
    return (
      <ul className="mosaique">
        {articles.map((a) => (
          <li key={a.id} className="mosaique__case">
            <CaseSelection a={a} props={props} />
            <Link to={`/articles/${a.id}`} className="mosaique__lien">
              <Vignette a={a} classe="mosaique__photo" />
              <span className={`badge badge--${a.statut} mosaique__badge`}>{LIBELLES_STATUT[a.statut]}</span>
              <span className="mosaique__texte">
                <span className="reference">{formatReference(a.reference)}</span>
                <span className="mosaique__prix">{prixAffiche(a)}</span>
              </span>
              <span className="mosaique__nom">{a.nom ?? "(sans nom)"}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={mode === "compacte" ? "liste liste--compacte" : "liste"}>
      {articles.map((a) => (
        <li key={a.id} className={selection ? "carte-selection" : undefined}>
          <CaseSelection a={a} props={props} />
          {mode === "compacte" ? (
            <Link to={`/articles/${a.id}`} className="ligne-article">
              <span className="reference">{formatReference(a.reference)}</span>
              <span className="ligne-article__nom">{a.nom ?? "(sans nom)"}</span>
              <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
              <span className="ligne-article__prix">{prixAffiche(a)}</span>
            </Link>
          ) : (
            <Link to={`/articles/${a.id}`} className="carte-article carte-article--photo">
              <Vignette a={a} />
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
          )}
        </li>
      ))}
    </ul>
  );
}

const COLONNES: { tri: Tri; libelle: string; nombre?: boolean }[] = [
  { tri: "statut", libelle: "Statut" },
  { tri: "marque", libelle: "Marque" },
  { tri: "categorie", libelle: "Catégorie" },
  { tri: "lieu", libelle: "Lieu" },
  { tri: "achat", libelle: "Achat" },
  { tri: "prix_achat", libelle: "Prix d'achat", nombre: true },
  { tri: "prix", libelle: "Prix affiché", nombre: true },
  { tri: "benefice", libelle: "Bénéfice", nombre: true },
];

function Tableau(props: Props) {
  const { articles, tri, croissant, onTri } = props;
  const naviguer = useNavigate();

  const entete = (t: Tri, libelle: string, classe?: string) => (
    <th scope="col" className={classe} aria-sort={tri === t ? (croissant ? "ascending" : "descending") : undefined}>
      <button type="button" className="tableau-articles__tri" onClick={() => onTri(t)}>
        {libelle}
        {tri === t ? (croissant ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="tableau-articles">
      <table>
        <thead>
          <tr>
            {entete("reference", "Article", "tableau-articles__fixe")}
            {COLONNES.map((c) => entete(c.tri, c.libelle, c.nombre ? "nombre" : undefined))}
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} onClick={() => void naviguer(`/articles/${a.id}`)}>
              <th scope="row" className="tableau-articles__fixe">
                <span className="tableau-articles__article">
                  <CaseSelection a={a} props={props} />
                  <Link to={`/articles/${a.id}`} onClick={(e) => e.stopPropagation()}>
                    <span className="reference">{formatReference(a.reference)}</span> {a.nom ?? "(sans nom)"}
                  </Link>
                </span>
              </th>
              <td>
                <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
              </td>
              <td>{a.marque ?? "—"}</td>
              <td>{a.categorie ? props.libelleCategorie(a.categorie) : "—"}</td>
              <td>{a.lieuId ? props.libelleLieu(a.lieuId) : "—"}</td>
              <td>{a.dateAchat ? formatDate(a.dateAchat) : "—"}</td>
              <td className="nombre">{a.prixAchat === null ? "—" : formatEuros(a.prixAchat)}</td>
              <td className="nombre">{prixAffiche(a)}</td>
              <td
                className={`nombre${a.beneficeRealise ? "" : " provisoire"}`}
                title={a.beneficeRealise ? "Bénéfice réalisé" : "Bénéfice provisoire"}
              >
                {a.benefice === null ? "—" : formatEuros(a.benefice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
