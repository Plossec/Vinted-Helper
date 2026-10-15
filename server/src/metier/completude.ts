// Complétude d'un article (#196) : ce qui lui manque pour passer « À publier » et pour la file de publication Vinted.
// Une seule liste de champs pour les deux ; seule la catégorie « Autre » diffère : elle se publie à la main (#177),
// donc elle est admise À publier mais refusée par la publication automatique.
import { CATEGORIE_AUTRE } from "../catalogue/categories.js";

export interface ArticlePourCompletude {
  prixAffiche: number | null;
  titre: string | null;
  description: string | null;
  categorie: string | null;
  /** Marque (nom ou identifiant), null si absente. */
  marque: string | null;
  etat: string | null;
  couleurs: readonly string[];
}

/** Ce qui manque (liste vide = complet). `publicationAutomatique` : refuse aussi la catégorie « Autre ». */
export function manquesArticle(
  a: ArticlePourCompletude,
  nombrePhotosAnnonce: number,
  publicationAutomatique: boolean,
): string[] {
  const m: string[] = [];
  if (nombrePhotosAnnonce === 0) m.push("photos d'annonce");
  if (!a.prixAffiche) m.push("prix affiché");
  if (!a.titre?.trim()) m.push("titre de l'annonce");
  if (!a.description?.trim()) m.push("description de l'annonce");
  if (!a.categorie) m.push("catégorie");
  else if (publicationAutomatique && a.categorie === CATEGORIE_AUTRE)
    m.push("catégorie Vinted (« Autre » : à publier à la main sur Vinted)");
  if (!a.marque) m.push("marque");
  if (!a.etat) m.push("état");
  if (a.couleurs.length === 0) m.push("couleur");
  return m;
}
