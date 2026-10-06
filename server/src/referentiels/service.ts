// Listes de référence — cahier des charges §5.4 (décisions du 05/10/2026) :
// - lieux et marques : listes de l'utilisateur, pré-remplies, complétées à la volée, renommables et fusionnables ;
// - catégories et états : listes fixes calquées sur Vinted (server/src/catalogue), non modifiables.
import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, lieu, marque, sortie } from "../base/schema.js";
import { CATEGORIES } from "../catalogue/categories.js";
import { ETATS } from "../catalogue/etats.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";

export type TypeReferentiel = "lieux" | "marques";
export const TYPES_REFERENTIEL: readonly TypeReferentiel[] = ["lieux", "marques"];

export function estTypeReferentiel(valeur: string): valeur is TypeReferentiel {
  return (TYPES_REFERENTIEL as readonly string[]).includes(valeur);
}

export async function lireReferentiels(base: Base, utilisateurId: string) {
  const [lieux, marques] = await Promise.all([
    base
      .select({ id: lieu.id, nom: lieu.nom, estMaison: lieu.estMaison })
      .from(lieu)
      .where(eq(lieu.utilisateurId, utilisateurId))
      .orderBy(asc(sql`lower(${lieu.nom})`)),
    base
      .select({ id: marque.id, nom: marque.nom })
      .from(marque)
      .where(eq(marque.utilisateurId, utilisateurId))
      .orderBy(asc(sql`lower(${marque.nom})`)),
  ]);
  return { lieux, marques, categories: CATEGORIES, etats: ETATS };
}

/** Ajoute une valeur ; si elle existe déjà (sans tenir compte des majuscules), renvoie l'existante. */
export async function ajouterValeur(base: Base, utilisateurId: string, type: TypeReferentiel, nomBrut: string) {
  const nom = nomBrut.trim();
  if (nom === "") throw erreurSaisie("Le nom ne peut pas être vide.");
  if (nom.length > 100) throw erreurSaisie("Le nom fait 100 caractères au maximum.");

  if (type === "lieux") {
    const [existant] = await base
      .select({ id: lieu.id, nom: lieu.nom, estMaison: lieu.estMaison })
      .from(lieu)
      .where(and(eq(lieu.utilisateurId, utilisateurId), sql`lower(${lieu.nom}) = lower(${nom})`));
    if (existant) return existant;
    const [cree] = await base
      .insert(lieu)
      .values({ utilisateurId, nom })
      .returning({ id: lieu.id, nom: lieu.nom, estMaison: lieu.estMaison });
    return cree;
  }

  const [existant] = await base
    .select({ id: marque.id, nom: marque.nom })
    .from(marque)
    .where(and(eq(marque.utilisateurId, utilisateurId), sql`lower(${marque.nom}) = lower(${nom})`));
  if (existant) return existant;
  const [cree] = await base.insert(marque).values({ utilisateurId, nom }).returning({ id: marque.id, nom: marque.nom });
  return cree;
}

const tableDe = (type: TypeReferentiel) => (type === "lieux" ? lieu : marque);

async function chargerValeur(base: Base, utilisateurId: string, type: TypeReferentiel, id: string) {
  const table = tableDe(type);
  const [v] = await base
    .select({ id: table.id, nom: table.nom })
    .from(table)
    .where(and(eq(table.id, id), eq(table.utilisateurId, utilisateurId)));
  if (!v) throw introuvable(type === "lieux" ? "Lieu" : "Marque");
  return v;
}

/** Valeurs d'une liste avec le nombre d'articles qui les utilisent (écran de gestion, §5.4). */
export async function listerAvecUsage(base: Base, utilisateurId: string, type: TypeReferentiel) {
  const table = tableDe(type);
  // Noms écrits en clair : dans une requête sur une seule table, Drizzle n'écrit pas le nom de la table.
  const usage =
    type === "lieux"
      ? sql<number>`(select count(*)::int from article a where a.lieu_id = lieu.id)`
      : sql<number>`(select count(*)::int from article a where a.marque_id = marque.id)`;
  return base
    .select({
      id: table.id,
      nom: table.nom,
      nombreArticles: usage,
    })
    .from(table)
    .where(eq(table.utilisateurId, utilisateurId))
    .orderBy(asc(sql`lower(${table.nom})`));
}

/** Renomme une valeur : tous les articles concernés affichent le nouveau nom (ils pointent sur la valeur). */
export async function renommer(base: Base, utilisateurId: string, type: TypeReferentiel, id: string, nomBrut: string) {
  const nom = nomBrut.trim();
  if (nom === "") throw erreurSaisie("Le nom ne peut pas être vide.");
  await chargerValeur(base, utilisateurId, type, id);
  const table = tableDe(type);
  const [doublon] = await base
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.utilisateurId, utilisateurId), ne(table.id, id), sql`lower(${table.nom}) = lower(${nom})`));
  if (doublon) throw conflit(`« ${nom} » existe déjà : utilisez plutôt « Fusionner ».`);
  await base.update(table).set({ nom }).where(eq(table.id, id));
}

/**
 * Fusionne `sourceId` dans `cibleId` (ex. « Levis » dans « Levi's ») : les articles (et les sorties, pour un lieu)
 * passent sur la valeur conservée, puis la valeur fusionnée est supprimée.
 */
export async function fusionner(
  base: Base,
  utilisateurId: string,
  type: TypeReferentiel,
  sourceId: string,
  cibleId: string,
) {
  if (sourceId === cibleId) throw erreurSaisie("Choisissez deux valeurs différentes.");
  await chargerValeur(base, utilisateurId, type, sourceId);
  await chargerValeur(base, utilisateurId, type, cibleId);
  await base.transaction(async (tx) => {
    if (type === "lieux") {
      const [source] = await tx.select({ estMaison: lieu.estMaison }).from(lieu).where(eq(lieu.id, sourceId));
      if (source?.estMaison) throw conflit("Le lieu « Maison » ne peut pas être fusionné dans un autre lieu.");
      await tx.update(article).set({ lieuId: cibleId }).where(eq(article.lieuId, sourceId));
      await tx.update(sortie).set({ lieuId: cibleId }).where(eq(sortie.lieuId, sourceId));
      await tx.delete(lieu).where(eq(lieu.id, sourceId));
    } else {
      await tx.update(article).set({ marqueId: cibleId }).where(eq(article.marqueId, sourceId));
      await tx.delete(marque).where(eq(marque.id, sourceId));
    }
  });
}
