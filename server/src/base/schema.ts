// Schéma de la base de données (Drizzle) — cahier des charges §7.
// Rappels : montants en centimes (entiers) ; dates en UTC ; chaque donnée porte son utilisateur ;
// toute évolution passe par une migration (npm run db:generate), jamais par drizzle-kit push.
// Lot 1 : compte, session, listes de référence, article, historiques.
// Lot 2 : sortie, lot d'achat, photo (terrain / annonce) et lien article ↔ photo.
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  primaryKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CODES_ETAT } from "../catalogue/etats.js";
import { STATUTS } from "../metier/statuts.js";

const horodatage = (nom: string) => timestamp(nom, { withTimezone: true, mode: "date" });

export const statutArticle = pgEnum("statut_article", STATUTS);
export const typePhoto = pgEnum("type_photo", ["terrain", "annonce"]);
export const etatArticle = pgEnum("etat_article", CODES_ETAT);

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

/** Marques : liste de départ pré-remplie, complétée à la volée ; nom unique par utilisateur (sans tenir compte des majuscules). */
export const marque = pgTable(
  "marque",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
  },
  (t) => [uniqueIndex("marque_nom_unique").on(t.utilisateurId, sql`lower(${t.nom})`)],
);

/** Sortie d'achat (§3) : identifiant généré sur le téléphone (UUID), pour éviter les doublons au renvoi. */
export const sortie = pgTable(
  "sortie",
  {
    id: uuid("id").primaryKey(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    lieuId: uuid("lieu_id")
      .notNull()
      .references(() => lieu.id),
    /** Centimes. Réparti sur les articles de la sortie (§6.2), jamais stocké par article. */
    montantEssence: integer("montant_essence").notNull().default(0),
    notes: text("notes"),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("sortie_utilisateur_date_idx").on(t.utilisateurId, t.date)],
);

/** Lot d'achat (§3) : prix global ; le nombre d'articles est déduit des articles présents, jamais stocké. */
export const lotAchat = pgTable("lot_achat", {
  id: uuid("id").primaryKey(),
  utilisateurId: uuid("utilisateur_id")
    .notNull()
    .references(() => utilisateur.id, { onDelete: "cascade" }),
  sortieId: uuid("sortie_id").references(() => sortie.id),
  /** Centimes. */
  prixTotal: integer("prix_total").notNull(),
  creeLe: horodatage("cree_le").notNull().defaultNow(),
});

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
    /** Code de catégorie de l'arbre fixe (server/src/catalogue/categories.ts), ex. « hommes/vetements/jeans/jeans-slim ». */
    categorie: text("categorie"),
    marqueId: uuid("marque_id").references(() => marque.id),
    /** Saisie libre (issue #6). */
    gamme: text("gamme"),
    etat: etatArticle("etat"),
    taille: text("taille"),
    matiere: text("matiere"),
    notes: text("notes"),
    lieuId: uuid("lieu_id").references(() => lieu.id),
    sortieId: uuid("sortie_id").references(() => sortie.id),
    /** Lot d'achat : le prix d'achat de l'article est alors calculé (§6.1), prix_achat reste vide. */
    lotId: uuid("lot_id").references(() => lotAchat.id),
    /** Centimes. Saisi pour un article hors lot ; vide pour un article de lot (part calculée). */
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
    index("article_sortie_idx").on(t.sortieId),
    index("article_lot_idx").on(t.lotId),
  ],
);

/** Photo : fichier dans data/photos/<utilisateur>/ ; une photo terrain peut être partagée par les articles d'un lot. */
export const photo = pgTable("photo", {
  id: uuid("id").primaryKey(),
  utilisateurId: uuid("utilisateur_id")
    .notNull()
    .references(() => utilisateur.id, { onDelete: "cascade" }),
  type: typePhoto("type").notNull(),
  /** Nom du fichier (sans dossier), ex. « 3f2a….jpg ». */
  fichier: text("fichier").notNull(),
  /** Réduite à ~1600 px (lot 7, §5.10). */
  estReduite: boolean("est_reduite").notNull().default(false),
  creeLe: horodatage("cree_le").notNull().defaultNow(),
});

export const articlePhoto = pgTable(
  "article_photo",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photo.id, { onDelete: "cascade" }),
    ordre: integer("ordre").notNull().default(0),
    estPrincipale: boolean("est_principale").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.photoId] }), index("article_photo_photo_idx").on(t.photoId)],
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
