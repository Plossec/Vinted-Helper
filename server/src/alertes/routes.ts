// Route des alertes (§5.8) : lecture des articles et de leurs historiques, puis calcul (metier/alertes).
// Écran « À faire » (#191) : les alertes « Pour info » marquées « Vu » sont retirées, les ventes à expédier données ;
// les articles À publier incomplets sont signalés avec ce qui leur manque (#196).
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { article, historiquePrix, historiqueStatut, signalementVu, vente, venteArticle } from "../base/schema.js";
import { manquesArticle } from "../metier/completude.js";
import { lireReglages } from "../frais/service.js";
import { calculerAlertes, GROUPES_VU, type GroupeVu, masquerVus } from "../metier/alertes.js";
import { erreurSaisie, introuvable } from "../outils/erreurs.js";
import { photosDesArticles } from "../photos/service.js";
import { nombresCommandes } from "../taches/finalisation.js";
import { annulerActionsPerimees, nombreAValider } from "../taches/service.js";

const SURVEILLES = [
  "brouillon",
  "a_publier",
  "en_ligne",
  "invendu",
  "a_expedier",
  "a_recuperer",
  "erreur_publication",
] as const;

export function routesAlertes(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/alertes", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const articles = await base
      .select({
        id: article.id,
        reference: article.reference,
        nom: article.nom,
        statut: article.statut,
        urlConversation: article.urlConversation,
        prixAffiche: article.prixAffiche,
        titre: article.titreAnnonce,
        description: article.descriptionAnnonce,
        categorie: article.categorie,
        marque: article.marqueId,
        etat: article.etat,
        couleurs: article.couleurs,
      })
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
    // Articles À publier : ce qui manque à leur annonce (#196).
    const photos = await photosDesArticles(
      base,
      articles.filter((a) => a.statut === "a_publier").map((a) => a.id),
    );
    const reglages = await lireReglages(base, utilisateurId);
    const vus = await base
      .select({ type: signalementVu.type, articleId: signalementVu.articleId, depuis: signalementVu.depuis })
      .from(signalementVu)
      .where(eq(signalementVu.utilisateurId, utilisateurId));
    const calculees = calculerAlertes(
      articles.map((a) => ({
        ...a,
        historique: historiques
          .filter((h) => h.articleId === a.id)
          .map((h) => ({ vers: h.vers, date: h.date.toISOString() })),
        historiquePrix: prix
          .filter((p) => p.articleId === a.id)
          .map((p) => ({ prix: p.prix, date: p.date.toISOString() })),
        manques:
          a.statut === "a_publier"
            ? manquesArticle(a, (photos.get(a.id) ?? []).filter((p) => p.type === "annonce").length, false)
            : [],
      })),
      reglages,
      maintenant(),
    );
    const alertes = masquerVus(calculees, vus);
    // Articles à expédier : leur vente (bouton « Envoyé » de l'écran À faire, #191).
    const aExpedierIds = alertes.aExpedier.map((a) => a.id);
    const ventes =
      aExpedierIds.length === 0
        ? []
        : await base
            .select({ articleId: venteArticle.articleId, venteId: venteArticle.venteId })
            .from(venteArticle)
            .innerJoin(vente, eq(vente.id, venteArticle.venteId))
            .where(
              and(
                inArray(venteArticle.articleId, aExpedierIds),
                eq(venteArticle.retourne, false),
                eq(vente.annulee, false),
                eq(vente.utilisateurId, utilisateurId),
              ),
            );
    const venteDe = new Map(ventes.map((v) => [v.articleId, v.venteId]));
    // Articles à expédier : lien de la conversation Vinted avec l'acheteur (issue #48).
    const conversations = new Map(articles.map((a) => [a.id, a.urlConversation]));
    // Tâches automatisées en mode manuel (#147) : actions prévues à valider.
    await annulerActionsPerimees(base, utilisateurId, maintenant());
    return {
      ...alertes,
      aValider: await nombreAValider(base, utilisateurId),
      /** Tâche « Vérification vente finalisée » (#148) : commandes à valider, à rattacher, montants corrigés. */
      commandes: await nombresCommandes(base, utilisateurId),
      aExpedier: alertes.aExpedier.map((a) => ({
        ...a,
        urlConversation: conversations.get(a.id) ?? null,
        venteId: venteDe.get(a.id) ?? null,
      })),
      aRecuperer: alertes.aRecuperer.map((a) => ({ ...a, urlConversation: conversations.get(a.id) ?? null })),
    };
  });
  // « Vu » d'une alerte « Pour info » (#191) : masquée tant que sa date de départ ne change pas.
  app.post("/api/alertes/vu", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const corps = (requete.body ?? {}) as Record<string, unknown>;
    const { type, articleId, depuis } = corps;
    if (typeof type !== "string" || !(GROUPES_VU as readonly string[]).includes(type)) {
      throw erreurSaisie("Seules les alertes « Pour info » peuvent être marquées « Vu ».");
    }
    if (typeof depuis !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(depuis))
      throw erreurSaisie("Date de l'alerte invalide.");
    if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)) throw introuvable("Article");
    const trouve = await base
      .select({ id: article.id })
      .from(article)
      .where(and(eq(article.id, articleId), eq(article.utilisateurId, utilisateurId)));
    if (trouve.length === 0) throw introuvable("Article");
    const valeurs = { utilisateurId, type: type as GroupeVu, articleId, depuis, vuLe: maintenant() };
    await base
      .insert(signalementVu)
      .values(valeurs)
      .onConflictDoUpdate({
        target: [signalementVu.utilisateurId, signalementVu.type, signalementVu.articleId],
        set: { depuis, vuLe: valeurs.vuLe },
      });
    return { ok: true };
  });
}
