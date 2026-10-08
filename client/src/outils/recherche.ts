// Filtres, recherche et tris de la liste des articles (§5.3). Fonctions pures, testées.
import type { ResumeArticle } from "../api.js";
import { LIBELLES_STATUT, type Statut } from "../statuts.js";

/** Filtres à choix multiples (issue #30) : une liste vide ne filtre pas. */
export interface Filtres {
  texte: string;
  statuts: Statut[];
  /** Codes de catégorie : l'article est retenu s'il est dans l'une d'elles ou une de leurs sous-catégories. */
  categories: string[];
  marqueIds: string[];
  gamme: string;
  lieuIds: string[];
  sortieIds: string[];
}

export type Tri =
  | "achat"
  | "mise_en_ligne"
  | "prix"
  | "anciennete_statut"
  | "creation"
  | "reference"
  | "nom"
  | "statut"
  | "marque"
  | "categorie"
  | "lieu"
  | "prix_achat"
  | "benefice";

/** Libellés lisibles pour trier sur les colonnes texte (catégorie, lieu). */
export interface Libelles {
  categorie: (code: string) => string;
  lieu: (id: string) => string;
}

const ORDRE_STATUT = Object.keys(LIBELLES_STATUT);

export const FILTRES_VIDES: Filtres = {
  texte: "",
  statuts: [],
  categories: [],
  marqueIds: [],
  gamme: "",
  lieuIds: [],
  sortieIds: [],
};

/** Statuts cochés par défaut : tout sauf Finalisé et Sortie du stock (le stock et les ventes en cours). */
export const STATUTS_PAR_DEFAUT: Statut[] = [
  "brouillon",
  "a_publier",
  "erreur_publication",
  "en_ligne",
  "a_expedier",
  "envoye",
  "a_recuperer",
];

export const FILTRES_PAR_DEFAUT: Filtres = { ...FILTRES_VIDES, statuts: STATUTS_PAR_DEFAUT };

/** Les statuts sont-ils ceux par défaut (le compteur « Filtres (N) » ne les compte pas) ? */
export function statutsParDefaut(statuts: readonly Statut[]): boolean {
  return statuts.length === STATUTS_PAR_DEFAUT.length && STATUTS_PAR_DEFAUT.every((s) => statuts.includes(s));
}

/** Nombre de filtres actifs (hors recherche texte et statuts par défaut). */
export function nombreFiltresActifs(f: Filtres): number {
  return (
    (statutsParDefaut(f.statuts) || f.statuts.length === 0 ? 0 : 1) +
    [f.categories, f.marqueIds, f.lieuIds, f.sortieIds].filter((l) => l.length > 0).length +
    (f.gamme.trim() ? 1 : 0)
  );
}

const estListe = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Relit des filtres mémorisés (format d'une version précédente : filtres par défaut). */
export function lireFiltres(brut: unknown): Filtres {
  if (typeof brut !== "object" || brut === null) return FILTRES_PAR_DEFAUT;
  const f = brut as Record<string, unknown>;
  if (![f.statuts, f.categories, f.marqueIds, f.lieuIds, f.sortieIds].every(estListe)) return FILTRES_PAR_DEFAUT;
  const statuts = (f.statuts as string[]).filter((s): s is Statut => s in LIBELLES_STATUT);
  return {
    texte: typeof f.texte === "string" ? f.texte : "",
    gamme: typeof f.gamme === "string" ? f.gamme : "",
    // Statuts par défaut d'avant le statut Erreur (#72) : on y ajoute Erreur, pour que ces articles restent visibles.
    statuts: statutsParDefaut([...statuts, "erreur_publication"]) ? STATUTS_PAR_DEFAUT : statuts,
    categories: f.categories as string[],
    marqueIds: f.marqueIds as string[],
    lieuIds: f.lieuIds as string[],
    sortieIds: f.sortieIds as string[],
  };
}

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
function cle(a: ResumeArticle, tri: Tri, libelles: Libelles): number | string | null {
  switch (tri) {
    case "reference":
      return a.reference;
    case "nom":
      return a.nom ? normaliser(a.nom) : null;
    case "statut":
      return ORDRE_STATUT.indexOf(a.statut);
    case "marque":
      return a.marque ? normaliser(a.marque) : null;
    case "categorie":
      return a.categorie ? normaliser(libelles.categorie(a.categorie)) : null;
    case "lieu":
      return a.lieuId ? normaliser(libelles.lieu(a.lieuId)) : null;
    case "prix_achat":
      return a.prixAchat;
    case "benefice":
      return a.benefice;
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
  libelleLieu: (id: string) => string = (id) => id,
): ResumeArticle[] {
  const libelles: Libelles = { categorie: libelleCategorie, lieu: libelleLieu };
  const gamme = normaliser(f.gamme.trim());
  const notes = new Map<string, number>();
  const retenus = articles.filter((a) => {
    if (f.statuts.length > 0 && !f.statuts.includes(a.statut)) return false;
    if (
      f.categories.length > 0 &&
      !f.categories.some((c) => a.categorie === c || a.categorie?.startsWith(`${c}/`) === true)
    )
      return false;
    if (f.marqueIds.length > 0 && (a.marqueId === null || !f.marqueIds.includes(a.marqueId))) return false;
    if (gamme && !normaliser(a.gamme ?? "").includes(gamme)) return false;
    if (f.lieuIds.length > 0 && (a.lieuId === null || !f.lieuIds.includes(a.lieuId))) return false;
    if (f.sortieIds.length > 0 && (a.sortieId === null || !f.sortieIds.includes(a.sortieId))) return false;
    const note = pertinence(a, f.texte, libelleCategorie);
    notes.set(a.id, note);
    return note > 0;
  });
  const sens = croissant ? 1 : -1;
  return retenus.sort((a, b) => {
    const parNote = (notes.get(b.id) ?? 0) - (notes.get(a.id) ?? 0);
    if (parNote !== 0) return parNote;
    const ka = cle(a, tri, libelles);
    const kb = cle(b, tri, libelles);
    if (ka === null && kb === null) return b.reference - a.reference;
    if (ka === null) return 1;
    if (kb === null) return -1;
    const ecart =
      typeof ka === "string" || typeof kb === "string" ? String(ka).localeCompare(String(kb), "fr") : ka - kb;
    return ecart * sens || b.reference - a.reference;
  });
}
