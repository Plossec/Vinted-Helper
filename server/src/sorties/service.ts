// Sorties d'achat (§5.1) : création (identifiant généré sur le téléphone), modification, essence, lecture.
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, lieu, sortie } from "../base/schema.js";
import { calculer } from "../couts/service.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";
import { choisirVignette, photosDesArticles } from "../photos/service.js";

export interface DonneesSortie {
  date: string;
  lieuId: string;
  notes: string | null;
}

async function verifierLieu(tx: Base | Transaction, utilisateurId: string, lieuId: string) {
  const [trouve] = await tx
    .select({ id: lieu.id })
    .from(lieu)
    .where(and(eq(lieu.id, lieuId), eq(lieu.utilisateurId, utilisateurId)));
  if (!trouve) throw erreurSaisie("Lieu inconnu.");
}

export async function chargerSortie(tx: Base | Transaction, utilisateurId: string, id: string) {
  const [ligne] = await tx
    .select()
    .from(sortie)
    .where(and(eq(sortie.id, id), eq(sortie.utilisateurId, utilisateurId)));
  if (!ligne) throw introuvable("Sortie");
  return ligne;
}

/** Crée la sortie ; un renvoi du même identifiant (file d'attente du téléphone) ne crée pas de doublon. */
export async function creerSortie(
  base: Base,
  utilisateurId: string,
  id: string,
  donnees: DonneesSortie,
  montantEssence: number,
  maintenant: Date,
): Promise<void> {
  await base.transaction(async (tx) => {
    const [existante] = await tx.select({ utilisateurId: sortie.utilisateurId }).from(sortie).where(eq(sortie.id, id));
    if (existante) {
      if (existante.utilisateurId !== utilisateurId) throw conflit("Identifiant de sortie déjà utilisé.");
      return;
    }
    await verifierLieu(tx, utilisateurId, donnees.lieuId);
    await tx.insert(sortie).values({ id, utilisateurId, ...donnees, montantEssence, creeLe: maintenant });
  });
}

/** Modifie date, lieu et notes ; la date et le lieu sont reportés sur les articles de la sortie. */
export async function modifierSortie(base: Base, utilisateurId: string, id: string, donnees: DonneesSortie) {
  await base.transaction(async (tx) => {
    await chargerSortie(tx, utilisateurId, id);
    await verifierLieu(tx, utilisateurId, donnees.lieuId);
    await tx.update(sortie).set(donnees).where(eq(sortie.id, id));
    await tx
      .update(article)
      .set({ dateAchat: donnees.date, lieuId: donnees.lieuId })
      .where(and(eq(article.sortieId, id), eq(article.utilisateurId, utilisateurId)));
  });
}

/** Saisit l'essence de la sortie (pendant ou après) ; elle est répartie par calcul (§6.2). */
export async function modifierEssence(base: Base, utilisateurId: string, id: string, montantEssence: number) {
  await chargerSortie(base, utilisateurId, id);
  await base.update(sortie).set({ montantEssence }).where(eq(sortie.id, id));
}

export async function listerSorties(base: Base, utilisateurId: string) {
  const nombre = sql<number>`count(${article.id})::int`;
  return base
    .select({
      id: sortie.id,
      date: sortie.date,
      lieuId: sortie.lieuId,
      lieu: lieu.nom,
      montantEssence: sortie.montantEssence,
      notes: sortie.notes,
      nombreArticles: nombre,
    })
    .from(sortie)
    .innerJoin(lieu, eq(lieu.id, sortie.lieuId))
    .leftJoin(article, and(eq(article.sortieId, sortie.id), isNull(article.supprimeLe)))
    .where(eq(sortie.utilisateurId, utilisateurId))
    .groupBy(sortie.id, lieu.nom)
    .orderBy(desc(sortie.date), desc(sortie.creeLe));
}

export async function lireSortie(base: Base, utilisateurId: string, id: string) {
  const s = await chargerSortie(base, utilisateurId, id);
  const [l] = await base.select({ nom: lieu.nom }).from(lieu).where(eq(lieu.id, s.lieuId));
  const articles = await base
    .select({
      id: article.id,
      reference: article.reference,
      nom: article.nom,
      statut: article.statut,
      lotId: article.lotId,
    })
    .from(article)
    .where(and(eq(article.sortieId, id), isNull(article.supprimeLe)))
    .orderBy(article.reference);
  const calculs = await calculer(base, utilisateurId);
  const photos = await photosDesArticles(
    base,
    articles.map((a) => a.id),
  );
  return {
    id: s.id,
    date: s.date,
    lieuId: s.lieuId,
    lieu: l?.nom ?? "",
    montantEssence: s.montantEssence,
    notes: s.notes,
    /** Frais général calculé si la sortie n'a aucun article (§6.2), sinon 0. */
    essenceFraisGeneral: calculs.essenceSortiesVides.get(s.id) ?? 0,
    articles: articles.map((a) => ({
      ...a,
      prixAchat: calculs.details.get(a.id)?.prixAchat ?? 0,
      essence: calculs.details.get(a.id)?.essence ?? 0,
      vignette: choisirVignette(photos.get(a.id) ?? []),
    })),
  };
}
