// Corbeille (§5.11) : un article supprimé reste restaurable 30 jours, exclu de tous les calculs ;
// ensuite suppression définitive avec ses photos propres (la photo terrain partagée suit la règle §5.10).
// La référence n'est jamais réutilisée (le compteur de l'utilisateur ne recule jamais).
import { and, asc, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, articlePhoto } from "../base/schema.js";
import { introuvable } from "../outils/erreurs.js";
import { choisirVignette, photosDesArticles, supprimerSiOrpheline } from "../photos/service.js";
import type { StockagePhotos } from "../photos/stockage.js";

/** Durée de conservation dans la corbeille. */
export const DUREE_CORBEILLE_MS = 30 * 24 * 60 * 60 * 1000;

export async function mettreALaCorbeille(base: Base, utilisateurId: string, id: string, maintenant: Date) {
  const r = await base
    .update(article)
    .set({ supprimeLe: maintenant, modifieLe: maintenant })
    .where(and(eq(article.id, id), eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe)))
    .returning({ id: article.id });
  if (r.length === 0) throw introuvable("Article");
}

export async function restaurer(base: Base, utilisateurId: string, id: string, maintenant: Date) {
  const r = await base
    .update(article)
    .set({ supprimeLe: null, modifieLe: maintenant })
    .where(and(eq(article.id, id), eq(article.utilisateurId, utilisateurId), isNotNull(article.supprimeLe)))
    .returning({ id: article.id });
  if (r.length === 0) throw introuvable("Article dans la corbeille");
}

export async function listerCorbeille(base: Base, utilisateurId: string) {
  const lignes = await base
    .select({ id: article.id, reference: article.reference, nom: article.nom, supprimeLe: article.supprimeLe })
    .from(article)
    .where(and(eq(article.utilisateurId, utilisateurId), isNotNull(article.supprimeLe)))
    .orderBy(desc(article.supprimeLe));
  const photos = await photosDesArticles(
    base,
    lignes.map((a) => a.id),
  );
  return lignes.map((a) => ({
    ...a,
    vignette: choisirVignette(photos.get(a.id) ?? []),
    /** Date de suppression définitive automatique. */
    suppressionLe: new Date((a.supprimeLe?.getTime() ?? 0) + DUREE_CORBEILLE_MS),
  }));
}

/** Supprime définitivement des articles de la corbeille, puis les photos que plus aucun article n'utilise. */
async function supprimerDefinitivement(
  base: Base,
  stockage: StockagePhotos,
  articles: { id: string; utilisateurId: string }[],
) {
  for (const a of articles) {
    const fichiers = await base.transaction(async (tx) => {
      const liens = await tx
        .select({ photoId: articlePhoto.photoId })
        .from(articlePhoto)
        .where(eq(articlePhoto.articleId, a.id))
        .orderBy(asc(articlePhoto.ordre));
      // Historique, liens photo, boosts et lignes de vente partent avec l'article (suppression en cascade).
      await tx.delete(article).where(eq(article.id, a.id));
      const aEffacer = [];
      for (const { photoId } of liens) {
        const supprimee = await supprimerSiOrpheline(tx, photoId);
        if (supprimee) aEffacer.push({ photoId, fichier: supprimee.fichier });
      }
      return aEffacer;
    });
    for (const f of fichiers) await stockage.supprimer(a.utilisateurId, f.photoId, f.fichier);
  }
}

/** Suppression définitive demandée par l'utilisateur (article déjà dans la corbeille). */
export async function viderArticle(base: Base, stockage: StockagePhotos, utilisateurId: string, id: string) {
  const [a] = await base
    .select({ id: article.id, utilisateurId: article.utilisateurId })
    .from(article)
    .where(and(eq(article.id, id), eq(article.utilisateurId, utilisateurId), isNotNull(article.supprimeLe)));
  if (!a) throw introuvable("Article dans la corbeille");
  await supprimerDefinitivement(base, stockage, [a]);
}

/** Purge automatique : articles dans la corbeille depuis plus de 30 jours (tous les utilisateurs). */
export async function purgerCorbeille(base: Base, stockage: StockagePhotos, maintenant: Date): Promise<number> {
  const limite = new Date(maintenant.getTime() - DUREE_CORBEILLE_MS);
  const anciens = await base
    .select({ id: article.id, utilisateurId: article.utilisateurId })
    .from(article)
    .where(lt(article.supprimeLe, limite));
  await supprimerDefinitivement(base, stockage, anciens);
  return anciens.length;
}
