// Lecture des données nécessaires aux calculs de coûts, puis appel du module de calcul (aucun calcul ici).
import { and, eq, isNull } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, lotAchat, sortie } from "../base/schema.js";
import { essenceParArticle, essenceSortiesVides, prixAchatParArticle } from "../calculs/couts.js";

export interface CoutsAchat {
  /** Prix d'achat de chaque article (centimes), part de lot comprise. */
  prixAchat: Map<string, number>;
  /** Part d'essence de chaque article (centimes). */
  essence: Map<string, number>;
  /** Essence des sorties sans article (frais généraux calculés). */
  essenceSortiesVides: Map<string, number>;
}

/** Calcule les coûts d'achat de tous les articles de l'utilisateur (hors corbeille). */
export async function calculerCoutsAchat(base: Base | Transaction, utilisateurId: string): Promise<CoutsAchat> {
  const [articles, lots, sorties] = await Promise.all([
    base
      .select({
        id: article.id,
        reference: article.reference,
        sortieId: article.sortieId,
        lotId: article.lotId,
        prixAchat: article.prixAchat,
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
  ]);
  return {
    prixAchat: prixAchatParArticle(articles, lots),
    essence: essenceParArticle(articles, sorties),
    essenceSortiesVides: essenceSortiesVides(articles, sorties),
  };
}
