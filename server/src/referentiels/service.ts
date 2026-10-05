// Listes de référence (lieux, catégories, marques, gammes, états) — cahier des charges §5.4.
// Lot 1 : lecture et ajout à la volée. Renommage et fusion : lot 4.
import { and, asc, eq, sql } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { categorie, etat, gamme, lieu, marque } from "../base/schema.js";
import { erreurSaisie } from "../outils/erreurs.js";

export const TABLES_REFERENTIEL = { categories: categorie, marques: marque, gammes: gamme, etats: etat } as const;
export type TypeReferentiel = keyof typeof TABLES_REFERENTIEL | "lieux";
export const TYPES_REFERENTIEL: readonly TypeReferentiel[] = ["lieux", "categories", "marques", "gammes", "etats"];

export function estTypeReferentiel(valeur: string): valeur is TypeReferentiel {
  return (TYPES_REFERENTIEL as readonly string[]).includes(valeur);
}

export async function lireReferentiels(base: Base, utilisateurId: string) {
  const lister = (table: (typeof TABLES_REFERENTIEL)[keyof typeof TABLES_REFERENTIEL]) =>
    base
      .select({ id: table.id, nom: table.nom })
      .from(table)
      .where(eq(table.utilisateurId, utilisateurId))
      .orderBy(asc(sql`lower(${table.nom})`));

  const [lieux, categories, marques, gammes, etats] = await Promise.all([
    base
      .select({ id: lieu.id, nom: lieu.nom, estMaison: lieu.estMaison })
      .from(lieu)
      .where(eq(lieu.utilisateurId, utilisateurId))
      .orderBy(asc(sql`lower(${lieu.nom})`)),
    lister(categorie),
    lister(marque),
    lister(gamme),
    lister(etat),
  ]);
  return { lieux, categories, marques, gammes, etats };
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

  const table = TABLES_REFERENTIEL[type];
  const [existant] = await base
    .select({ id: table.id, nom: table.nom })
    .from(table)
    .where(and(eq(table.utilisateurId, utilisateurId), sql`lower(${table.nom}) = lower(${nom})`));
  if (existant) return existant;
  const [cree] = await base.insert(table).values({ utilisateurId, nom }).returning({ id: table.id, nom: table.nom });
  return cree;
}
