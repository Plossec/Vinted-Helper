// Listes de référence — cahier des charges §5.4 (décisions du 05/10/2026) :
// - lieux et marques : listes de l'utilisateur, pré-remplies, complétées à la volée (renommage et fusion : lot 4) ;
// - catégories et états : listes fixes calquées sur Vinted (server/src/catalogue), non modifiables.
import { and, asc, eq, sql } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { lieu, marque } from "../base/schema.js";
import { CATEGORIES } from "../catalogue/categories.js";
import { ETATS } from "../catalogue/etats.js";
import { erreurSaisie } from "../outils/erreurs.js";

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
