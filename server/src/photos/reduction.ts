// Réduction des photos (§5.10) au passage en Finalisé ou en Sortie du stock :
// on garde la photo principale et la photo terrain, réduites (~1600 px) ; les autres photos sont supprimées.
// Photo terrain partagée (lot) : réduite seulement quand TOUS les articles qui l'utilisent sont Finalisés ou Sortis
// du stock ; supprimée seulement quand plus aucun article ne l'utilise.
import { and, eq, isNull } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, articlePhoto, photo } from "../base/schema.js";
import { photosDesArticles, supprimerSiOrpheline } from "./service.js";
import type { StockagePhotos } from "./stockage.js";

const FINAUX = new Set(["finalise", "sortie_stock"]);

export async function reduirePhotosArticle(
  base: Base,
  stockage: StockagePhotos,
  utilisateurId: string,
  articleId: string,
): Promise<void> {
  const [a] = await base
    .select({ statut: article.statut })
    .from(article)
    .where(and(eq(article.id, articleId), eq(article.utilisateurId, utilisateurId)));
  if (!a || !FINAUX.has(a.statut)) return;
  const photos = (await photosDesArticles(base, [articleId])).get(articleId) ?? [];
  const annonces = photos.filter((p) => p.type === "annonce");
  const principale = annonces.find((p) => p.estPrincipale) ?? annonces[0];

  // 1. Photos d'annonce autres que la principale : retirées, fichier effacé si plus personne ne l'utilise.
  for (const p of annonces) {
    if (p.id === principale?.id) continue;
    const fichier = await base.transaction(async (tx) => {
      await tx.delete(articlePhoto).where(and(eq(articlePhoto.articleId, articleId), eq(articlePhoto.photoId, p.id)));
      return supprimerSiOrpheline(tx, p.id);
    });
    if (fichier) await stockage.supprimer(utilisateurId, p.id, fichier.fichier);
  }

  // 2. Photos gardées : réduites si tous les articles qui les utilisent sont Finalisés ou Sortis du stock.
  const gardees = [...(principale ? [principale] : []), ...photos.filter((p) => p.type === "terrain")];
  for (const p of gardees) {
    const [ligne] = await base
      .select({ fichier: photo.fichier, estReduite: photo.estReduite })
      .from(photo)
      .where(eq(photo.id, p.id));
    if (!ligne || ligne.estReduite) continue;
    const utilisateurs = await base
      .select({ statut: article.statut })
      .from(articlePhoto)
      .innerJoin(article, eq(article.id, articlePhoto.articleId))
      .where(and(eq(articlePhoto.photoId, p.id), isNull(article.supprimeLe)));
    if (!utilisateurs.every((u) => FINAUX.has(u.statut))) continue;
    const nouveau = await stockage.reduire(utilisateurId, p.id, ligne.fichier);
    await base.update(photo).set({ fichier: nouveau, estReduite: true }).where(eq(photo.id, p.id));
  }
}

/** Réduit les photos de plusieurs articles (ex. tout un colis finalisé) ; une erreur n'empêche pas les autres. */
export async function reduirePhotos(
  base: Base,
  stockage: StockagePhotos,
  utilisateurId: string,
  articleIds: string[],
  journal: (message: string) => void = console.error,
) {
  for (const id of articleIds) {
    try {
      await reduirePhotosArticle(base, stockage, utilisateurId, id);
    } catch (erreur) {
      journal(
        `Réduction des photos de l'article ${id} impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
      );
    }
  }
}
