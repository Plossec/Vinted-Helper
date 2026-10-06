// Route des alertes (§5.8) : lecture des articles et de leurs historiques, puis calcul (metier/alertes).
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { article, historiquePrix, historiqueStatut } from "../base/schema.js";
import { lireReglages } from "../frais/service.js";
import { calculerAlertes } from "../metier/alertes.js";

const SURVEILLES = ["brouillon", "en_ligne", "a_expedier"] as const;

export function routesAlertes(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/alertes", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const articles = await base
      .select({ id: article.id, reference: article.reference, nom: article.nom, statut: article.statut })
      .from(article)
      .where(
        and(
          eq(article.utilisateurId, utilisateurId),
          isNull(article.supprimeLe),
          inArray(article.statut, [...SURVEILLES]),
        ),
      );
    const ids = articles.map((a) => a.id);
    const [historiques, prix] =
      ids.length === 0
        ? [[], []]
        : await Promise.all([
            base
              .select({
                articleId: historiqueStatut.articleId,
                vers: historiqueStatut.vers,
                date: historiqueStatut.date,
              })
              .from(historiqueStatut)
              .where(inArray(historiqueStatut.articleId, ids)),
            base
              .select({ articleId: historiquePrix.articleId, prix: historiquePrix.prix, date: historiquePrix.date })
              .from(historiquePrix)
              .where(inArray(historiquePrix.articleId, ids)),
          ]);
    const reglages = await lireReglages(base, utilisateurId);
    return calculerAlertes(
      articles.map((a) => ({
        ...a,
        historique: historiques
          .filter((h) => h.articleId === a.id)
          .map((h) => ({ vers: h.vers, date: h.date.toISOString() })),
        historiquePrix: prix
          .filter((p) => p.articleId === a.id)
          .map((p) => ({ prix: p.prix, date: p.date.toISOString() })),
      })),
      reglages,
      maintenant(),
    );
  });
}
