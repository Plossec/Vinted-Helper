// Conservation des données liées aux acheteurs (issue #216) : le lien de la conversation Vinted et les commandes lues
// sur Vinted sont effacés 6 mois après la finalisation (choix de l'utilisateur). La vente et ses montants restent.
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, commandeVinted, vente, venteArticle } from "../base/schema.js";

export const MOIS_CONSERVATION = 6;

/** Date avant laquelle une vente finalisée (ou une commande Vinted terminée) ne garde plus ses données d'acheteur. */
export function limiteConservation(maintenant: Date): Date {
  const limite = new Date(maintenant);
  limite.setUTCMonth(limite.getUTCMonth() - MOIS_CONSERVATION);
  return limite;
}

/** Efface les liens de conversation et les commandes Vinted plus anciens que la durée de conservation (purge du jour). */
export async function purgerDonneesAcheteurs(
  base: Base,
  maintenant: Date,
): Promise<{ conversations: number; commandes: number }> {
  const limite = limiteConservation(maintenant);
  const anciennes = base
    .select({ id: venteArticle.articleId })
    .from(venteArticle)
    .innerJoin(vente, eq(vente.id, venteArticle.venteId))
    .where(and(eq(vente.annulee, false), eq(venteArticle.retourne, false), lt(vente.dateFinalisation, limite)));
  const conversations = await base
    .update(article)
    .set({ urlConversation: null })
    .where(and(isNotNull(article.urlConversation), inArray(article.id, anciennes)))
    .returning({ id: article.id });
  const commandes = await base
    .delete(commandeVinted)
    .where(lt(commandeVinted.dateFin, limite))
    .returning({ id: commandeVinted.id });
  return { conversations: conversations.length, commandes: commandes.length };
}
