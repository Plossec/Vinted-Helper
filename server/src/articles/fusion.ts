// Fusion de deux articles (#284, ADR-0120) : un doublon est fondu dans l'article gardé, puis mis à la corbeille.
// - Champs : le doublon ne remplit que les champs vides de l'article gardé (rien n'est écrasé).
// - Achat : si l'article gardé n'a ni prix d'achat ni lot, il prend la place du doublon dans son lot (ou son prix).
// - Statut : l'article gardé prend le plus avancé des deux, avec son historique ; deux articles vendus sont refusés.
// - Photos, prix, boosts, ventes, publications et tâches du doublon passent sur l'article gardé.
// Aucun montant n'est calculé ici : les valeurs sont seulement déplacées (les parts restent calculées, jamais stockées).
import { and, eq, inArray, isNull, max, notInArray } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import {
  actionVinted,
  article,
  articlePhoto,
  boost,
  historiquePrix,
  historiqueStatut,
  offreFavori,
  publicationVinted,
  vente,
  venteArticle,
} from "../base/schema.js";
import type { BilanFusion } from "../api/types.js";
import { LIBELLES_STATUT, type Statut } from "../metier/statuts.js";
import { conflit, erreurSaisie } from "../utilitaires/erreurs.js";
import { chargerArticle } from "./service.js";

type Article = typeof article.$inferSelect;

/** Avancement d'un statut : le plus avancé l'emporte à la fusion (à égalité, celui de l'article gardé). */
const RANG: Record<Statut, number> = {
  brouillon: 0,
  en_stock: 0,
  a_publier: 1,
  erreur_publication: 1,
  en_ligne: 2,
  invendu: 2,
  a_recuperer: 3,
  a_expedier: 4,
  envoye: 4,
  finalise: 4,
  sortie_stock: 4,
};

/** Champs repris du doublon quand ils sont vides sur l'article gardé, avec leur libellé pour l'aperçu. */
const CHAMPS = {
  nom: "nom",
  categorie: "catégorie",
  marqueId: "marque",
  gamme: "gamme",
  etat: "état",
  taille: "taille",
  matiere: "matière",
  notes: "notes",
  lieuId: "lieu d'achat",
  sortieId: "sortie",
  dateAchat: "date d'achat",
  prixAffiche: "prix affiché",
  prixVenteMinimum: "prix de vente minimum",
  titreAnnonce: "titre de l'annonce",
  descriptionAnnonce: "description de l'annonce",
  formatColis: "format du colis",
  urlVinted: "lien de l'annonce Vinted",
  urlConversation: "lien de la conversation",
} as const satisfies Partial<Record<keyof Article, string>>;

async function enVente(tx: Transaction, articleId: string): Promise<boolean> {
  const r = await tx
    .select({ venteId: venteArticle.venteId })
    .from(venteArticle)
    .innerJoin(vente, eq(vente.id, venteArticle.venteId))
    .where(and(eq(venteArticle.articleId, articleId), eq(vente.annulee, false)))
    .limit(1);
  return r.length > 0;
}

/**
 * Fusionne `doublonId` dans `gardeId`. `essai` : rien n'est enregistré, seul le bilan est renvoyé (aperçu avant de
 * confirmer). Le doublon part à la corbeille (restaurable 30 jours, sans ses photos ni son historique).
 */
export async function fusionnerArticles(
  base: Base,
  utilisateurId: string,
  doublonId: string,
  gardeId: string,
  maintenant: Date,
  essai: boolean,
): Promise<BilanFusion> {
  if (doublonId === gardeId) throw erreurSaisie("Choisissez un autre article que celui-ci.");
  return base.transaction(async (tx) => {
    const doublon = await chargerArticle(tx, utilisateurId, doublonId);
    const garde = await chargerArticle(tx, utilisateurId, gardeId);
    const [doublonVendu, gardeVendu] = [await enVente(tx, doublon.id), await enVente(tx, garde.id)];
    if (doublonVendu && gardeVendu)
      throw conflit("Les deux articles sont vendus, chacun dans une vente : ce sont deux objets différents.");

    // Champs vides de l'article gardé, remplis par le doublon.
    const maj: Partial<Article> = {};
    const champs: string[] = [];
    for (const [cle, libelle] of Object.entries(CHAMPS) as [keyof typeof CHAMPS, string][]) {
      if (garde[cle] === null && doublon[cle] !== null) {
        Object.assign(maj, { [cle]: doublon[cle] });
        champs.push(libelle);
      }
    }
    // Verrou #195 : jamais un minimum au-dessus du prix affiché.
    const prixAffiche = maj.prixAffiche ?? garde.prixAffiche;
    const minimum = maj.prixVenteMinimum ?? garde.prixVenteMinimum;
    if (minimum != null && prixAffiche != null && minimum > prixAffiche) {
      // On renonce à la valeur reprise (minimum, sinon prix affiché) : celle de l'article gardé reste.
      if (maj.prixVenteMinimum !== undefined) {
        delete maj.prixVenteMinimum;
        champs.splice(champs.indexOf(CHAMPS.prixVenteMinimum), 1);
      } else if (maj.prixAffiche !== undefined) {
        delete maj.prixAffiche;
        champs.splice(champs.indexOf(CHAMPS.prixAffiche), 1);
      }
    }
    if (garde.couleurs.length === 0 && doublon.couleurs.length > 0) {
      maj.couleurs = doublon.couleurs;
      champs.push("couleurs");
    }
    if (garde.baisseRegle === "compte" && doublon.baisseRegle !== "compte") {
      maj.baisseRegle = doublon.baisseRegle;
      maj.baisseValeur = doublon.baisseValeur;
      champs.push("règle de baisse");
    }

    // Achat : place dans le lot du doublon, ou son prix d'achat.
    let lot = false;
    if (garde.prixAchat === null && garde.lotId === null) {
      if (doublon.lotId !== null) {
        maj.lotId = doublon.lotId;
        lot = true;
      } else if (doublon.prixAchat !== null) {
        maj.prixAchat = doublon.prixAchat;
        champs.push("prix d'achat");
      }
    }

    // Statut : le plus avancé ; une vente du doublon l'emporte toujours (sinon elle serait perdue).
    const statutDuDoublon = doublonVendu || RANG[doublon.statut] > RANG[garde.statut];
    if (statutDuDoublon) {
      Object.assign(maj, {
        statut: doublon.statut,
        motifSortie: doublon.motifSortie,
        canalRevente: doublon.canalRevente,
        prixRevente: doublon.prixRevente,
        dateSortieStock: doublon.dateSortieStock,
      });
    }

    // Photos du doublon absentes de l'article gardé, ajoutées après les siennes.
    const photosGarde = await tx
      .select({ photoId: articlePhoto.photoId })
      .from(articlePhoto)
      .where(eq(articlePhoto.articleId, garde.id));
    const dejaLa = photosGarde.map((p) => p.photoId);
    const photosDoublon = await tx
      .select()
      .from(articlePhoto)
      .where(
        and(
          eq(articlePhoto.articleId, doublon.id),
          ...(dejaLa.length > 0 ? [notInArray(articlePhoto.photoId, dejaLa)] : []),
        ),
      )
      .orderBy(articlePhoto.ordre);

    // Historique rattaché : compté pour l'aperçu.
    const prix = await tx
      .select({ id: historiquePrix.id })
      .from(historiquePrix)
      .where(eq(historiquePrix.articleId, doublon.id));
    const boosts = await tx.select({ id: boost.id }).from(boost).where(eq(boost.articleId, doublon.id));
    const publications = await tx
      .select({ id: publicationVinted.id })
      .from(publicationVinted)
      .where(eq(publicationVinted.articleId, doublon.id));
    const actions = await tx
      .select({ id: actionVinted.id })
      .from(actionVinted)
      .where(eq(actionVinted.articleId, doublon.id));
    const personnesGarde = (
      await tx.select({ personne: offreFavori.personne }).from(offreFavori).where(eq(offreFavori.articleId, garde.id))
    ).map((o) => o.personne);
    const offres = await tx
      .select({ id: offreFavori.id })
      .from(offreFavori)
      .where(
        and(
          eq(offreFavori.articleId, doublon.id),
          ...(personnesGarde.length > 0 ? [notInArray(offreFavori.personne, personnesGarde)] : []),
        ),
      );
    const ventesGarde = (
      await tx.select({ venteId: venteArticle.venteId }).from(venteArticle).where(eq(venteArticle.articleId, garde.id))
    ).map((v) => v.venteId);
    const ventes = await tx
      .select({ venteId: venteArticle.venteId })
      .from(venteArticle)
      .where(
        and(
          eq(venteArticle.articleId, doublon.id),
          ...(ventesGarde.length > 0 ? [notInArray(venteArticle.venteId, ventesGarde)] : []),
        ),
      );
    const historique =
      prix.length + boosts.length + publications.length + actions.length + offres.length + ventes.length;

    const bilan: BilanFusion = {
      champs,
      photos: photosDoublon.length,
      statut: statutDuDoublon ? LIBELLES_STATUT[doublon.statut] : null,
      lot,
      historique,
    };
    if (essai) return bilan;

    // Enregistrement.
    if (photosDoublon.length > 0) {
      const [m] = await tx
        .select({ ordre: max(articlePhoto.ordre) })
        .from(articlePhoto)
        .where(eq(articlePhoto.articleId, garde.id));
      const depart = (m?.ordre ?? -1) + 1;
      const sansPrincipale = dejaLa.length > 0;
      for (const [i, p] of photosDoublon.entries()) {
        await tx
          .update(articlePhoto)
          .set({
            articleId: garde.id,
            ordre: depart + i,
            estPrincipale: sansPrincipale ? false : p.estPrincipale,
          })
          .where(and(eq(articlePhoto.articleId, doublon.id), eq(articlePhoto.photoId, p.photoId)));
      }
    }
    const versGarde = <T extends { id: string }>(r: T[]) => r.map((x) => x.id);
    if (prix.length > 0)
      await tx
        .update(historiquePrix)
        .set({ articleId: garde.id })
        .where(inArray(historiquePrix.id, versGarde(prix)));
    if (boosts.length > 0)
      await tx
        .update(boost)
        .set({ articleId: garde.id })
        .where(inArray(boost.id, versGarde(boosts)));
    if (publications.length > 0)
      await tx
        .update(publicationVinted)
        .set({ articleId: garde.id })
        .where(inArray(publicationVinted.id, versGarde(publications)));
    if (actions.length > 0)
      await tx
        .update(actionVinted)
        .set({ articleId: garde.id })
        .where(inArray(actionVinted.id, versGarde(actions)));
    if (offres.length > 0)
      await tx
        .update(offreFavori)
        .set({ articleId: garde.id })
        .where(inArray(offreFavori.id, versGarde(offres)));
    if (ventes.length > 0)
      await tx
        .update(venteArticle)
        .set({ articleId: garde.id })
        .where(
          and(
            eq(venteArticle.articleId, doublon.id),
            inArray(
              venteArticle.venteId,
              ventes.map((v) => v.venteId),
            ),
          ),
        );
    if (statutDuDoublon) {
      // Les historiques de statut s'échangent : l'article gardé reprend celui qui correspond à son nouveau statut.
      const deGarde = await tx
        .select({ id: historiqueStatut.id })
        .from(historiqueStatut)
        .where(eq(historiqueStatut.articleId, garde.id));
      const duDoublon = await tx
        .select({ id: historiqueStatut.id })
        .from(historiqueStatut)
        .where(eq(historiqueStatut.articleId, doublon.id));
      if (duDoublon.length > 0)
        await tx
          .update(historiqueStatut)
          .set({ articleId: garde.id })
          .where(inArray(historiqueStatut.id, versGarde(duDoublon)));
      if (deGarde.length > 0)
        await tx
          .update(historiqueStatut)
          .set({ articleId: doublon.id })
          .where(inArray(historiqueStatut.id, versGarde(deGarde)));
    }
    await tx
      .update(article)
      .set({ ...maj, modifieLe: maintenant })
      .where(eq(article.id, garde.id));
    // Le doublon quitte son lot s'il a cédé sa place, puis part à la corbeille.
    await tx
      .update(article)
      .set({ ...(lot ? { lotId: null } : {}), supprimeLe: maintenant, modifieLe: maintenant })
      .where(and(eq(article.id, doublon.id), isNull(article.supprimeLe)));
    return bilan;
  });
}
