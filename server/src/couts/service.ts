// Lecture des données nécessaires aux calculs, puis appel du module de calcul (aucun calcul d'argent ici).
import { and, eq, isNull } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, boost, lotAchat, sortie, vente, venteArticle } from "../base/schema.js";
import { calculerDetails, type DetailArticle, type DonneesCalcul } from "../calculs/benefice.js";
import { essenceSortiesVides } from "../calculs/couts.js";

/** Données de calcul de l'utilisateur (articles hors corbeille). */
export async function chargerDonneesCalcul(base: Base | Transaction, utilisateurId: string): Promise<DonneesCalcul> {
  const [articles, lots, sorties, ventes, lignes, boosts] = await Promise.all([
    base
      .select({
        id: article.id,
        reference: article.reference,
        sortieId: article.sortieId,
        lotId: article.lotId,
        prixAchat: article.prixAchat,
        statut: article.statut,
        motifSortie: article.motifSortie,
        prixRevente: article.prixRevente,
      })
      .from(article)
      .where(and(eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe))),
    base
      .select({ id: lotAchat.id, prixTotal: lotAchat.prixTotal })
      .from(lotAchat)
      .where(eq(lotAchat.utilisateurId, utilisateurId)),
    base
      .select({ id: sortie.id, montantEssence: sortie.montantEssence })
      .from(sortie)
      .where(eq(sortie.utilisateurId, utilisateurId)),
    base
      .select({
        id: vente.id,
        montantCredite: vente.montantCredite,
        emballage: vente.emballage,
        annulee: vente.annulee,
      })
      .from(vente)
      .where(eq(vente.utilisateurId, utilisateurId)),
    base
      .select({
        venteId: venteArticle.venteId,
        articleId: venteArticle.articleId,
        prixAffiche: venteArticle.prixAfficheAuMoment,
        retourne: venteArticle.retourne,
      })
      .from(venteArticle)
      .innerJoin(vente, eq(vente.id, venteArticle.venteId))
      .where(eq(vente.utilisateurId, utilisateurId)),
    base
      .select({ articleId: boost.articleId, montant: boost.montant })
      .from(boost)
      .where(eq(boost.utilisateurId, utilisateurId)),
  ]);
  // Un article à la corbeille ne compte plus dans la vente (ses parts vont aux articles restants).
  const vivants = new Set(articles.map((a) => a.id));
  return {
    articles,
    lots,
    sorties,
    ventes: ventes.map((v) => ({
      ...v,
      lignes: lignes.filter((l) => l.venteId === v.id && vivants.has(l.articleId)),
    })),
    boosts: boosts.filter((b) => vivants.has(b.articleId)),
  };
}

export interface Calculs {
  details: Map<string, DetailArticle>;
  /** Essence des sorties sans article (frais généraux calculés, §6.2). */
  essenceSortiesVides: Map<string, number>;
}

/** Calcule tous les montants des articles de l'utilisateur. */
export async function calculer(base: Base | Transaction, utilisateurId: string): Promise<Calculs> {
  const donnees = await chargerDonneesCalcul(base, utilisateurId);
  return {
    details: calculerDetails(donnees),
    essenceSortiesVides: essenceSortiesVides(donnees.articles, donnees.sorties),
  };
}
