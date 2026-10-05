// Saisie terrain (§5.1) : « + Achat » → 1 article (prix saisi) ou un lot de N articles (prix total réparti, §6.1),
// tous en Brouillon, rattachés à la sortie et à son lieu, partageant la même photo terrain.
// Les identifiants viennent du téléphone (file d'attente hors réseau) : un renvoi ne crée jamais de doublon.
import { and, eq, inArray } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, historiqueStatut, lieu, lotAchat } from "../base/schema.js";
import { prochaineReference } from "../articles/service.js";
import { conflit, erreurSaisie } from "../outils/erreurs.js";
import { lierPhoto, verifierPhoto } from "../photos/service.js";
import { chargerSortie } from "../sorties/service.js";

/** Garde-fou : nombre d'articles maximal pour un seul achat. */
export const NOMBRE_MAX_ARTICLES = 50;

export interface DemandeAchat {
  /** Identifiant de l'achat ; devient l'identifiant du lot quand il y a plusieurs articles. */
  id: string;
  /** Un identifiant par article à créer (généré sur le téléphone). */
  articleIds: string[];
  /** Sortie en cours ; null pour un article Maison. */
  sortieId: string | null;
  /** Centimes : prix de l'article seul ou prix total du lot. Ignoré (0) pour un article Maison. */
  prixTotal: number;
  photoId: string | null;
  /** Date d'achat (AAAA-MM-JJ) si l'achat n'a pas de sortie (article Maison). */
  date: string;
}

export async function creerAchat(
  base: Base,
  utilisateurId: string,
  demande: DemandeAchat,
  maintenant: Date,
): Promise<string[]> {
  const nombre = demande.articleIds.length;
  if (nombre < 1 || nombre > NOMBRE_MAX_ARTICLES) {
    throw erreurSaisie(`Nombre d'articles : entre 1 et ${NOMBRE_MAX_ARTICLES}.`);
  }
  if (new Set(demande.articleIds).size !== nombre) throw erreurSaisie("Identifiants d'articles en double.");

  return base.transaction(async (tx) => {
    const existants = await tx
      .select({ id: article.id, utilisateurId: article.utilisateurId })
      .from(article)
      .where(inArray(article.id, demande.articleIds));
    if (existants.length > 0) {
      // Renvoi d'un achat déjà reçu.
      if (existants.some((a) => a.utilisateurId !== utilisateurId))
        throw conflit("Identifiant d'article déjà utilisé.");
      return demande.articleIds;
    }

    let lieuId: string;
    let dateAchat: string;
    if (demande.sortieId !== null) {
      const s = await chargerSortie(tx, utilisateurId, demande.sortieId);
      lieuId = s.lieuId;
      dateAchat = s.date;
    } else {
      // Article Maison (§5.1) : sans sortie, lieu « Maison », prix d'achat 0 €.
      const [maison] = await tx
        .select({ id: lieu.id })
        .from(lieu)
        .where(and(eq(lieu.utilisateurId, utilisateurId), eq(lieu.estMaison, true)))
        .limit(1);
      if (!maison) throw erreurSaisie("Aucun lieu « Maison » : ajoutez-le dans les listes.");
      lieuId = maison.id;
      dateAchat = demande.date;
    }
    const estMaison = demande.sortieId === null;
    if (demande.photoId !== null) await verifierPhoto(tx, utilisateurId, demande.photoId);

    const enLot = nombre > 1 && !estMaison;
    if (enLot) {
      await tx.insert(lotAchat).values({
        id: demande.id,
        utilisateurId,
        sortieId: demande.sortieId,
        prixTotal: demande.prixTotal,
        creeLe: maintenant,
      });
    }

    for (const id of demande.articleIds) {
      const reference = await prochaineReference(tx, utilisateurId);
      await tx.insert(article).values({
        id,
        utilisateurId,
        reference,
        lieuId,
        sortieId: demande.sortieId,
        lotId: enLot ? demande.id : null,
        prixAchat: estMaison ? 0 : enLot ? null : demande.prixTotal,
        dateAchat,
        statut: "brouillon",
        creeLe: maintenant,
        modifieLe: maintenant,
      });
      await tx
        .insert(historiqueStatut)
        .values({ utilisateurId, articleId: id, de: null, vers: "brouillon", date: maintenant });
      if (demande.photoId !== null) await lierPhoto(tx, id, demande.photoId, "terrain");
    }
    return demande.articleIds;
  });
}

/** Corrige le prix total d'un lot : il est réparti à nouveau sur les articles présents (§6.1, cas 3). */
export async function modifierPrixLot(base: Base, utilisateurId: string, lotId: string, prixTotal: number) {
  const resultat = await base
    .update(lotAchat)
    .set({ prixTotal })
    .where(and(eq(lotAchat.id, lotId), eq(lotAchat.utilisateurId, utilisateurId)))
    .returning({ id: lotAchat.id });
  if (resultat.length === 0) throw erreurSaisie("Lot inconnu.");
}
