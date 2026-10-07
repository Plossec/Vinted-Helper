// Photos (§5.2, §5.10) : photo terrain (partagée par les articles d'un lot) et photos d'annonce.
import { and, asc, desc, eq, inArray, isNull, max } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, articlePhoto, photo } from "../base/schema.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";
import type { StockagePhotos } from "./stockage.js";

export type TypePhoto = "terrain" | "annonce";

export interface PhotoArticle {
  id: string;
  type: TypePhoto;
  ordre: number;
  estPrincipale: boolean;
}

/** Enregistre une photo envoyée (identifiant généré sur le téléphone) ; un renvoi ne crée pas de doublon. */
export async function enregistrerPhoto(
  base: Base,
  stockage: StockagePhotos,
  utilisateurId: string,
  id: string,
  type: TypePhoto,
  contenu: Buffer,
  maintenant: Date,
): Promise<void> {
  const [existante] = await base.select({ utilisateurId: photo.utilisateurId }).from(photo).where(eq(photo.id, id));
  if (existante) {
    if (existante.utilisateurId !== utilisateurId) throw conflit("Identifiant de photo déjà utilisé.");
    return;
  }
  const fichier = await stockage.enregistrer(utilisateurId, id, contenu);
  await base.insert(photo).values({ id, utilisateurId, type, fichier, creeLe: maintenant }).onConflictDoNothing();
}

export async function lirePhoto(base: Base, utilisateurId: string, id: string) {
  const [ligne] = await base
    .select({ fichier: photo.fichier })
    .from(photo)
    .where(and(eq(photo.id, id), eq(photo.utilisateurId, utilisateurId)));
  if (!ligne) throw introuvable("Photo");
  return ligne;
}

/** Fait pivoter une photo d'un quart de tour, définitivement (issue #35) ; elle change pour tous ses articles. */
export async function pivoterPhoto(
  base: Base,
  stockage: StockagePhotos,
  utilisateurId: string,
  id: string,
  angle: 90 | -90,
): Promise<void> {
  const { fichier } = await lirePhoto(base, utilisateurId, id);
  const nouveau = await stockage.pivoter(utilisateurId, id, fichier, angle);
  if (nouveau !== fichier) await base.update(photo).set({ fichier: nouveau }).where(eq(photo.id, id));
}

export async function verifierPhoto(tx: Base | Transaction, utilisateurId: string, photoId: string) {
  const [ligne] = await tx
    .select({ type: photo.type })
    .from(photo)
    .where(and(eq(photo.id, photoId), eq(photo.utilisateurId, utilisateurId)));
  if (!ligne) throw erreurSaisie("Photo inconnue : elle n'a pas encore été reçue.");
  return ligne;
}

/** Ajoute la photo en dernière position ; la première photo d'annonce devient la photo principale. */
export async function lierPhoto(tx: Base | Transaction, articleId: string, photoId: string, type: TypePhoto) {
  const [dernier] = await tx
    .select({ ordre: max(articlePhoto.ordre) })
    .from(articlePhoto)
    .where(eq(articlePhoto.articleId, articleId));
  let estPrincipale = false;
  if (type === "annonce") {
    const [principale] = await tx
      .select({ id: articlePhoto.photoId })
      .from(articlePhoto)
      .where(and(eq(articlePhoto.articleId, articleId), eq(articlePhoto.estPrincipale, true)));
    estPrincipale = !principale;
  }
  await tx
    .insert(articlePhoto)
    .values({ articleId, photoId, ordre: (dernier?.ordre ?? -1) + 1, estPrincipale })
    .onConflictDoNothing();
}

/** Photos de plusieurs articles : photo terrain d'abord, puis photos d'annonce dans l'ordre choisi. */
export async function photosDesArticles(base: Base | Transaction, articleIds: string[]) {
  const resultat = new Map<string, PhotoArticle[]>(articleIds.map((id) => [id, []]));
  if (articleIds.length === 0) return resultat;
  const lignes = await base
    .select({
      articleId: articlePhoto.articleId,
      id: photo.id,
      type: photo.type,
      ordre: articlePhoto.ordre,
      estPrincipale: articlePhoto.estPrincipale,
    })
    .from(articlePhoto)
    .innerJoin(photo, eq(photo.id, articlePhoto.photoId))
    .where(inArray(articlePhoto.articleId, articleIds))
    .orderBy(desc(photo.type), asc(articlePhoto.ordre));
  for (const { articleId, ...p } of lignes) resultat.get(articleId)?.push(p);
  return resultat;
}

/** Photo à afficher en vignette : la principale, sinon la première photo d'annonce, sinon la photo terrain. */
export function choisirVignette(photos: readonly PhotoArticle[]): string | null {
  const principale = photos.find((p) => p.estPrincipale);
  const annonce = photos.find((p) => p.type === "annonce");
  const terrain = photos.find((p) => p.type === "terrain");
  return (principale ?? annonce ?? terrain)?.id ?? null;
}

async function chargerArticleActif(tx: Base | Transaction, utilisateurId: string, articleId: string) {
  const [a] = await tx
    .select({ id: article.id })
    .from(article)
    .where(and(eq(article.id, articleId), eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe)));
  if (!a) throw introuvable("Article");
}

export async function ajouterPhotoArticle(base: Base, utilisateurId: string, articleId: string, photoId: string) {
  await base.transaction(async (tx) => {
    await chargerArticleActif(tx, utilisateurId, articleId);
    const { type } = await verifierPhoto(tx, utilisateurId, photoId);
    await lierPhoto(tx, articleId, photoId, type);
  });
}

/** Réordonne les photos d'annonce et choisit la principale. */
export async function ordonnerPhotos(
  base: Base,
  utilisateurId: string,
  articleId: string,
  ordre: string[],
  principale: string | null,
) {
  await base.transaction(async (tx) => {
    await chargerArticleActif(tx, utilisateurId, articleId);
    const actuelles = (await photosDesArticles(tx, [articleId])).get(articleId) ?? [];
    const annonces = new Set(actuelles.filter((p) => p.type === "annonce").map((p) => p.id));
    if (ordre.length !== annonces.size || !ordre.every((id) => annonces.has(id))) {
      throw erreurSaisie("L'ordre doit contenir toutes les photos d'annonce de l'article.");
    }
    if (principale !== null && !annonces.has(principale)) throw erreurSaisie("Photo principale inconnue.");
    for (const [i, id] of ordre.entries()) {
      await tx
        .update(articlePhoto)
        .set({ ordre: i, estPrincipale: id === principale })
        .where(and(eq(articlePhoto.articleId, articleId), eq(articlePhoto.photoId, id)));
    }
  });
}

/**
 * Retire une photo de l'article. Le fichier n'est supprimé que si plus aucun article ne l'utilise
 * (photo terrain partagée d'un lot, §5.10).
 */
export async function retirerPhoto(
  base: Base,
  stockage: StockagePhotos,
  utilisateurId: string,
  articleId: string,
  photoId: string,
) {
  const aSupprimer = await base.transaction(async (tx) => {
    await chargerArticleActif(tx, utilisateurId, articleId);
    const retirees = await tx
      .delete(articlePhoto)
      .where(and(eq(articlePhoto.articleId, articleId), eq(articlePhoto.photoId, photoId)))
      .returning({ estPrincipale: articlePhoto.estPrincipale });
    if (retirees.length === 0) throw introuvable("Photo");
    if (retirees[0]?.estPrincipale) {
      // La photo d'annonce suivante devient principale.
      const [suivante] = await tx
        .select({ photoId: articlePhoto.photoId })
        .from(articlePhoto)
        .innerJoin(photo, eq(photo.id, articlePhoto.photoId))
        .where(and(eq(articlePhoto.articleId, articleId), eq(photo.type, "annonce")))
        .orderBy(asc(articlePhoto.ordre))
        .limit(1);
      if (suivante) {
        await tx
          .update(articlePhoto)
          .set({ estPrincipale: true })
          .where(and(eq(articlePhoto.articleId, articleId), eq(articlePhoto.photoId, suivante.photoId)));
      }
    }
    return supprimerSiOrpheline(tx, photoId);
  });
  if (aSupprimer) await stockage.supprimer(utilisateurId, photoId, aSupprimer.fichier);
}

/** Supprime la ligne de la photo si plus aucun article ne l'utilise ; renvoie le fichier à effacer. */
export async function supprimerSiOrpheline(tx: Base | Transaction, photoId: string) {
  const [encore] = await tx
    .select({ articleId: articlePhoto.articleId })
    .from(articlePhoto)
    .where(eq(articlePhoto.photoId, photoId))
    .limit(1);
  if (encore) return null;
  const [supprimee] = await tx.delete(photo).where(eq(photo.id, photoId)).returning({ fichier: photo.fichier });
  return supprimee ?? null;
}
