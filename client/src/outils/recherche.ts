// Filtres, recherche et tris de la liste des articles (§5.3). Fonctions pures, testées.
import type { ResumeArticle } from "../api.js";
import type { Statut } from "../statuts.js";

export interface Filtres {
  texte: string;
  statut: Statut | "";
  /** Code de catégorie : l'article est retenu s'il est dans cette catégorie ou une sous-catégorie. */
  categorie: string;
  marqueId: string;
  gamme: string;
  lieuId: string;
  sortieId: string;
}

export type Tri = "achat" | "mise_en_ligne" | "prix" | "anciennete_statut" | "creation";

export const FILTRES_VIDES: Filtres = {
  texte: "",
  statut: "",
  categorie: "",
  marqueId: "",
  gamme: "",
  lieuId: "",
  sortieId: "",
};

/** Minuscules sans accents, pour comparer « Levi's » et « levis », « été » et « ete ». */
export const normaliser = (texte: string) => texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Note de pertinence pour la recherche texte : 0 = pas retenu. La référence exacte passe en premier (§8). */
function pertinence(a: ResumeArticle, texte: string, libelleCategorie: (code: string) => string): number {
  const brut = texte.trim().replace(/^#/, "");
  if (brut === "") return 1;
  if (/^\d+$/.test(brut)) {
    if (a.reference === Number(brut)) return 100;
    if (String(a.reference).padStart(4, "0").includes(brut)) return 50;
  }
  const meule = normaliser(
    [a.nom, a.marque, a.gamme, a.taille, a.categorie ? libelleCategorie(a.categorie) : null].filter(Boolean).join(" "),
  );
  return normaliser(brut)
    .split(/\s+/)
    .every((mot) => meule.includes(mot))
    ? 10
    : 0;
}

const horodatage = (iso: string | null) => (iso === null ? null : new Date(iso).getTime());

/** Valeur de tri ; les articles sans valeur vont à la fin. */
function cle(a: ResumeArticle, tri: Tri): number | null {
  switch (tri) {
    case "achat":
      return horodatage(a.dateAchat);
    case "mise_en_ligne":
      return horodatage(a.dateMiseEnLigne);
    case "prix":
      return a.prixAffiche;
    case "anciennete_statut":
      return horodatage(a.dateStatut);
    case "creation":
      return horodatage(a.creeLe);
  }
}

/**
 * Applique les filtres, la recherche et le tri.
 * - `croissant` : du plus petit au plus grand (dates anciennes d'abord). Ancienneté dans le statut : croissant = les
 *   plus anciens dans leur statut d'abord.
 * - Recherche : les meilleurs résultats d'abord (référence exacte en tête), puis le tri choisi.
 */
export function filtrerEtTrier(
  articles: readonly ResumeArticle[],
  f: Filtres,
  tri: Tri,
  croissant: boolean,
  libelleCategorie: (code: string) => string = (code) => code,
): ResumeArticle[] {
  const gamme = normaliser(f.gamme.trim());
  const notes = new Map<string, number>();
  const retenus = articles.filter((a) => {
    if (f.statut && a.statut !== f.statut) return false;
    if (f.categorie && !(a.categorie === f.categorie || a.categorie?.startsWith(`${f.categorie}/`))) return false;
    if (f.marqueId && a.marqueId !== f.marqueId) return false;
    if (gamme && !normaliser(a.gamme ?? "").includes(gamme)) return false;
    if (f.lieuId && a.lieuId !== f.lieuId) return false;
    if (f.sortieId && a.sortieId !== f.sortieId) return false;
    const note = pertinence(a, f.texte, libelleCategorie);
    notes.set(a.id, note);
    return note > 0;
  });
  const sens = croissant ? 1 : -1;
  return retenus.sort((a, b) => {
    const parNote = (notes.get(b.id) ?? 0) - (notes.get(a.id) ?? 0);
    if (parNote !== 0) return parNote;
    const ka = cle(a, tri);
    const kb = cle(b, tri);
    if (ka === null && kb === null) return b.reference - a.reference;
    if (ka === null) return 1;
    if (kb === null) return -1;
    return (ka - kb) * sens || b.reference - a.reference;
  });
}
