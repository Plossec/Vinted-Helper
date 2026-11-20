// Corbeille (§5.11) : un article supprimé reste restaurable 30 jours, exclu de tous les calculs ;
// ensuite suppression définitive avec ses photos propres (la photo terrain partagée suit la règle §5.10).
// La référence n'est jamais réutilisée (le compteur de l'utilisateur ne recule jamais).
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, notInArray } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, articlePhoto } from "../base/schema.js";
import type { BilanCorbeille } from "../api/types.js";
import { STATUTS_VENDUS } from "../metier/statuts.js";
import { erreurSaisie, introuvable } from "../utilitaires/erreurs.js";
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

/** Plus d'articles d'un coup : au-delà, la demande est refusée. */
export const ARTICLES_MAX_LOT = 500;

function verifierIds(ids: readonly string[]) {
  if (ids.length === 0) throw erreurSaisie("Aucun article choisi.");
  if (ids.length > ARTICLES_MAX_LOT) throw erreurSaisie(`${ARTICLES_MAX_LOT} articles au plus à la fois.`);
}

/**
 * Corbeille en lot (#286, ADR-0121) : les articles choisis vont à la corbeille, sauf les articles vendus (À expédier,
 * Envoyé, À récupérer, Finalisé), ignorés et renvoyés avec leur référence. Les articles inconnus sont ignorés.
 */
export async function mettreALaCorbeilleEnLot(
  base: Base,
  utilisateurId: string,
  ids: readonly string[],
  maintenant: Date,
): Promise<BilanCorbeille> {
  verifierIds(ids);
  return base.transaction(async (tx) => {
    const choisis = and(
      eq(article.utilisateurId, utilisateurId),
      inArray(article.id, [...ids]),
      isNull(article.supprimeLe),
    );
    const vendus = await tx
      .select({ reference: article.reference })
      .from(article)
      .where(and(choisis, inArray(article.statut, [...STATUTS_VENDUS])))
      .orderBy(asc(article.reference));
    const r = await tx
      .update(article)
      .set({ supprimeLe: maintenant, modifieLe: maintenant })
      .where(and(choisis, notInArray(article.statut, [...STATUTS_VENDUS])))
      .returning({ id: article.id });
    return { traites: r.length, ignores: vendus.map((v) => v.reference) };
  });
}

/** Restauration en lot (#286) : les articles choisis sortent de la corbeille. */
export async function restaurerEnLot(
  base: Base,
  utilisateurId: string,
  ids: readonly string[],
  maintenant: Date,
): Promise<BilanCorbeille> {
  verifierIds(ids);
  const r = await base
    .update(article)
    .set({ supprimeLe: null, modifieLe: maintenant })
    .where(and(eq(article.utilisateurId, utilisateurId), inArray(article.id, [...ids]), isNotNull(article.supprimeLe)))
    .returning({ id: article.id });
  return { traites: r.length, ignores: [] };
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
  // `supprimeLe` est toujours renseigné ici (filtre de la requête) ; le test le rend visible au typage (#244).
  return lignes.flatMap(({ supprimeLe, ...a }) =>
    supprimeLe === null
      ? []
      : [
          {
            ...a,
            supprimeLe,
            vignette: choisirVignette(photos.get(a.id) ?? []),
            /** Date de suppression définitive automatique. */
            suppressionLe: new Date(supprimeLe.getTime() + DUREE_CORBEILLE_MS),
          },
        ],
  );
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
