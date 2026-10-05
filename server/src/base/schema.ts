// Schéma de la base de données (Drizzle) — cahier des charges §7.
// Rappels : montants en centimes (entiers) ; dates en UTC ; chaque donnée porte son utilisateur ;
// toute évolution passe par une migration (npm run db:generate), jamais par drizzle-kit push.
// Lot 1 : compte, session, listes de référence, article, historiques. Les tables des lots suivants
// (sortie, lot d'achat, photo, vente…) seront ajoutées par de nouvelles migrations.
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { STATUTS } from "../metier/statuts.js";

const horodatage = (nom: string) => timestamp(nom, { withTimezone: true, mode: "date" });

export const statutArticle = pgEnum("statut_article", STATUTS);

export const utilisateur = pgTable("utilisateur", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifiant: text("identifiant").notNull().unique(),
  motDePasseHache: text("mot_de_passe_hache").notNull(),
  dernierNumeroReference: integer("dernier_numero_reference").notNull().default(0),
  creeLe: horodatage("cree_le").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    /** Empreinte SHA-256 du jeton du cookie (le jeton lui-même n'est jamais stocké). */
    id: text("id").primaryKey(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    expireLe: horodatage("expire_le").notNull(),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("session_utilisateur_idx").on(t.utilisateurId)],
);

/** Liste de référence : nom unique par utilisateur, sans tenir compte des majuscules. */
function tableReferentiel(nomTable: string) {
  return pgTable(
    nomTable,
    {
      id: uuid("id").primaryKey().defaultRandom(),
      utilisateurId: uuid("utilisateur_id")
        .notNull()
        .references(() => utilisateur.id, { onDelete: "cascade" }),
      nom: text("nom").notNull(),
    },
    (t) => [uniqueIndex(`${nomTable}_nom_unique`).on(t.utilisateurId, sql`lower(${t.nom})`)],
  );
}

export const lieu = pgTable(
  "lieu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
    estMaison: boolean("est_maison").notNull().default(false),
  },
  (t) => [uniqueIndex("lieu_nom_unique").on(t.utilisateurId, sql`lower(${t.nom})`)],
);

export const categorie = tableReferentiel("categorie");
export const marque = tableReferentiel("marque");
export const gamme = tableReferentiel("gamme");
export const etat = tableReferentiel("etat");

export const article = pgTable(
  "article",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    /** Numéro court (#0127), par utilisateur, attribué par le serveur, jamais réutilisé. */
    reference: integer("reference").notNull(),
    nom: text("nom"),
    categorieId: uuid("categorie_id").references(() => categorie.id),
    marqueId: uuid("marque_id").references(() => marque.id),
    gammeId: uuid("gamme_id").references(() => gamme.id),
    etatId: uuid("etat_id").references(() => etat.id),
    taille: text("taille"),
    matiere: text("matiere"),
    notes: text("notes"),
    lieuId: uuid("lieu_id").references(() => lieu.id),
    /** Centimes. */
    prixAchat: integer("prix_achat"),
    dateAchat: date("date_achat", { mode: "string" }),
    statut: statutArticle("statut").notNull().default("brouillon"),
    /** Centimes. Prix actuel de l'annonce ; l'historique est dans historique_prix. */
    prixAffiche: integer("prix_affiche"),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
    modifieLe: horodatage("modifie_le").notNull().defaultNow(),
    /** Corbeille (lot 4) : date de mise à la corbeille, sinon null. */
    supprimeLe: horodatage("supprime_le"),
  },
  (t) => [
    uniqueIndex("article_reference_unique").on(t.utilisateurId, t.reference),
    index("article_utilisateur_cree_idx").on(t.utilisateurId, t.creeLe),
  ],
);

export const historiqueStatut = pgTable(
  "historique_statut",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    /** null pour la création de l'article. */
    de: statutArticle("de"),
    vers: statutArticle("vers").notNull(),
    date: horodatage("date").notNull(),
  },
  (t) => [index("historique_statut_article_idx").on(t.articleId)],
);

export const historiquePrix = pgTable(
  "historique_prix",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    /** Centimes. */
    prix: integer("prix").notNull(),
    date: horodatage("date").notNull(),
  },
  (t) => [index("historique_prix_article_idx").on(t.articleId)],
);
