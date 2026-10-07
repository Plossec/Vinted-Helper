// Ventes (= colis) et statuts liés — cahier des charges §4.2, §4.3, §5.6, §5.7.
// Les montants (prix vendu, emballage) ne sont jamais stockés par article : ils sont calculés (§6.3, §6.4).
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, historiqueStatut, reglages, vente, venteArticle } from "../base/schema.js";
import { chargerArticle, verifierDate } from "../articles/service.js";
import { calculer } from "../couts/service.js";
import type { MotifSortie } from "../calculs/benefice.js";
import { STATUTS_COLIS, type Statut, verifierTransition } from "../metier/statuts.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";

/** Emballage par défaut d'un colis : 0,08 € (§5.6), modifiable dans les Réglages. */
export const EMBALLAGE_DEFAUT = 8;

export async function emballageParDefaut(tx: Base | Transaction, utilisateurId: string): Promise<number> {
  const [r] = await tx
    .select({ emballage: reglages.emballageDefaut })
    .from(reglages)
    .where(eq(reglages.utilisateurId, utilisateurId));
  return r?.emballage ?? EMBALLAGE_DEFAUT;
}

/** Fait passer des articles au statut `vers` (vérifie le §4.2) et l'inscrit dans leur historique. */
async function passer(
  tx: Transaction,
  utilisateurId: string,
  articles: { id: string; statut: Statut; prixAffiche: number | null }[],
  vers: Statut,
  date: Date,
  maintenant: Date,
  autres: Partial<typeof article.$inferInsert> = {},
) {
  for (const a of articles) {
    const verification = verifierTransition(a.statut, vers, a);
    if (!verification.ok) throw conflit(verification.raison);
    await tx
      .update(article)
      .set({ statut: vers, modifieLe: maintenant, ...autres })
      .where(eq(article.id, a.id));
    await tx.insert(historiqueStatut).values({ utilisateurId, articleId: a.id, de: a.statut, vers, date });
  }
}

async function chargerVente(tx: Base | Transaction, utilisateurId: string, id: string) {
  const [v] = await tx
    .select()
    .from(vente)
    .where(and(eq(vente.id, id), eq(vente.utilisateurId, utilisateurId)));
  if (!v) throw introuvable("Vente");
  if (v.annulee) throw conflit("Cette vente est annulée.");
  const lignes = await tx
    .select({
      id: article.id,
      statut: article.statut,
      prixAffiche: article.prixAffiche,
      retourne: venteArticle.retourne,
    })
    .from(venteArticle)
    .innerJoin(article, eq(article.id, venteArticle.articleId))
    .where(and(eq(venteArticle.venteId, id), isNull(article.supprimeLe)));
  return { vente: v, lignes, actifs: lignes.filter((l) => !l.retourne) };
}

export interface DemandeVente {
  articleIds: string[];
  montantCredite: number;
  /** null : emballage par défaut des Réglages. */
  emballage: number | null;
  dateVente: Date;
  /** Lien de la conversation Vinted avec l'acheteur (issue #48), enregistré sur chaque article du colis. */
  urlConversation?: string | null;
}

/** En ligne → À expédier : crée la vente (= un colis) avec 1 ou plusieurs articles (§5.6). */
export async function creerVente(base: Base, utilisateurId: string, d: DemandeVente, maintenant: Date) {
  verifierDate(d.dateVente, maintenant);
  if (d.articleIds.length === 0) throw erreurSaisie("Choisissez au moins un article.");
  if (new Set(d.articleIds).size !== d.articleIds.length) throw erreurSaisie("Article en double dans la vente.");
  return base.transaction(async (tx) => {
    const articles = [];
    for (const id of d.articleIds) {
      const a = await chargerArticle(tx, utilisateurId, id);
      if (a.statut !== "en_ligne")
        throw conflit(`L'article #${String(a.reference).padStart(4, "0")} n'est pas En ligne.`);
      articles.push(a);
    }
    const emballage = d.emballage ?? (await emballageParDefaut(tx, utilisateurId));
    const [v] = await tx
      .insert(vente)
      .values({
        utilisateurId,
        montantCredite: d.montantCredite,
        emballage,
        dateVente: d.dateVente,
        creeLe: maintenant,
      })
      .returning({ id: vente.id });
    if (!v) throw new Error("Création de la vente impossible.");
    await tx
      .insert(venteArticle)
      .values(articles.map((a) => ({ venteId: v.id, articleId: a.id, prixAfficheAuMoment: a.prixAffiche ?? 0 })));
    await passer(
      tx,
      utilisateurId,
      articles,
      "a_expedier",
      d.dateVente,
      maintenant,
      d.urlConversation ? { urlConversation: d.urlConversation } : {},
    );
    return v.id;
  });
}

/** Envoyé / Finalisé : appliqué à tout le colis en même temps, avec la même date (§4.3). */
export async function avancerVente(
  base: Base,
  utilisateurId: string,
  venteId: string,
  vers: "envoye" | "finalise",
  date: Date,
  maintenant: Date,
) {
  verifierDate(date, maintenant);
  await base.transaction(async (tx) => {
    const { actifs } = await chargerVente(tx, utilisateurId, venteId);
    await passer(tx, utilisateurId, actifs, vers, date, maintenant);
    await tx
      .update(vente)
      .set(vers === "envoye" ? { dateEnvoi: date } : { dateFinalisation: date })
      .where(eq(vente.id, venteId));
  });
}

/** Annulation par l'acheteur (À expédier → En ligne) : la vente est annulée et sort de tous les calculs (§4.3). */
export async function annulerVente(base: Base, utilisateurId: string, venteId: string, date: Date, maintenant: Date) {
  verifierDate(date, maintenant);
  await base.transaction(async (tx) => {
    const { actifs } = await chargerVente(tx, utilisateurId, venteId);
    await passer(tx, utilisateurId, actifs, "en_ligne", date, maintenant);
    await tx.update(vente).set({ annulee: true }).where(eq(vente.id, venteId));
  });
}

/**
 * Retour (Envoyé → À publier) : les articles renvoyés repassent À publier.
 * - Tous les articles du colis : retour du colis entier, la vente est annulée.
 * - Une partie : retour partiel, l'utilisateur saisit le nouveau montant crédité pour les articles restants (§6.4).
 */
export async function retourVente(
  base: Base,
  utilisateurId: string,
  venteId: string,
  d: { articleIds: string[]; montantCredite: number | null; date: Date },
  maintenant: Date,
) {
  verifierDate(d.date, maintenant);
  if (d.articleIds.length === 0) throw erreurSaisie("Choisissez les articles renvoyés.");
  await base.transaction(async (tx) => {
    const { actifs } = await chargerVente(tx, utilisateurId, venteId);
    const renvoyes = actifs.filter((a) => d.articleIds.includes(a.id));
    if (renvoyes.length !== new Set(d.articleIds).size) throw erreurSaisie("Article absent du colis.");
    await passer(tx, utilisateurId, renvoyes, "a_publier", d.date, maintenant);
    if (renvoyes.length === actifs.length) {
      await tx.update(vente).set({ annulee: true }).where(eq(vente.id, venteId));
      return;
    }
    if (d.montantCredite === null)
      throw erreurSaisie("Indiquez le nouveau montant crédité pour les articles restants.");
    await tx.update(vente).set({ montantCredite: d.montantCredite }).where(eq(vente.id, venteId));
    await tx
      .update(venteArticle)
      .set({ retourne: true })
      .where(and(eq(venteArticle.venteId, venteId), inArray(venteArticle.articleId, d.articleIds)));
  });
}

/** Corrige le montant crédité, l'emballage ou la date de vente. */
export async function modifierVente(
  base: Base,
  utilisateurId: string,
  venteId: string,
  d: { montantCredite: number; emballage: number },
) {
  await chargerVente(base, utilisateurId, venteId);
  await base.update(vente).set(d).where(eq(vente.id, venteId));
}

export async function lireVente(base: Base, utilisateurId: string, venteId: string) {
  const [v] = await base
    .select()
    .from(vente)
    .where(and(eq(vente.id, venteId), eq(vente.utilisateurId, utilisateurId)));
  if (!v) throw introuvable("Vente");
  const lignes = await base
    .select({
      id: article.id,
      reference: article.reference,
      nom: article.nom,
      statut: article.statut,
      prixAffiche: venteArticle.prixAfficheAuMoment,
      retourne: venteArticle.retourne,
    })
    .from(venteArticle)
    .innerJoin(article, eq(article.id, venteArticle.articleId))
    .where(and(eq(venteArticle.venteId, venteId), isNull(article.supprimeLe)))
    .orderBy(article.reference);
  const { details } = await calculer(base, utilisateurId);
  return {
    id: v.id,
    montantCredite: v.montantCredite,
    emballage: v.emballage,
    dateVente: v.dateVente,
    dateEnvoi: v.dateEnvoi,
    dateFinalisation: v.dateFinalisation,
    annulee: v.annulee,
    articles: lignes.map((l) => {
      const d = details.get(l.id);
      const actif = !v.annulee && !l.retourne;
      return { ...l, prixVendu: actif ? (d?.prixVendu ?? null) : null, partEmballage: actif ? (d?.emballage ?? 0) : 0 };
    }),
  };
}

export interface DemandeSortieStock {
  motif: MotifSortie;
  canal: "vide_grenier" | "leboncoin" | "main_propre" | "autre" | null;
  prixRevente: number | null;
  date: Date;
}

/** Sortie du stock (§5.7) : motif obligatoire ; « Revendu hors Vinted » demande le prix et le canal. */
export async function sortirDuStock(
  base: Base,
  utilisateurId: string,
  articleId: string,
  d: DemandeSortieStock,
  maintenant: Date,
) {
  verifierDate(d.date, maintenant);
  const revendu = d.motif === "revendu";
  if (revendu && (d.prixRevente === null || d.canal === null)) {
    throw erreurSaisie("Revendu hors Vinted : indiquez le prix de revente et le canal.");
  }
  await base.transaction(async (tx) => {
    const a = await chargerArticle(tx, utilisateurId, articleId);
    if (STATUTS_COLIS.has(a.statut)) {
      throw conflit("Article dans un colis en cours : annulez la vente ou enregistrez un retour d'abord.");
    }
    await passer(tx, utilisateurId, [a], "sortie_stock", d.date, maintenant, {
      motifSortie: d.motif,
      canalRevente: revendu ? d.canal : null,
      prixRevente: revendu ? d.prixRevente : null,
      dateSortieStock: d.date,
    });
  });
}

/** Annulation de la sortie du stock (Sortie du stock → À publier). */
export async function annulerSortieStock(
  base: Base,
  utilisateurId: string,
  articleId: string,
  date: Date,
  maintenant: Date,
) {
  verifierDate(date, maintenant);
  await base.transaction(async (tx) => {
    const a = await chargerArticle(tx, utilisateurId, articleId);
    if (a.statut !== "sortie_stock") throw conflit("Cet article n'est pas sorti du stock.");
    await passer(tx, utilisateurId, [a], "a_publier", date, maintenant, {
      motifSortie: null,
      canalRevente: null,
      prixRevente: null,
      dateSortieStock: null,
    });
  });
}
