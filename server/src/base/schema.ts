// Schéma de la base de données (Drizzle) — cahier des charges §7.
// Rappels : montants en centimes (entiers) ; dates en UTC ; chaque donnée porte son utilisateur ;
// toute évolution passe par une migration (npm run db:generate), jamais par drizzle-kit push.
// Lot 1 : compte, session, listes de référence, article, historiques.
// Lot 2 : sortie, lot d'achat, photo (terrain / annonce) et lien article ↔ photo.
// Lot 3 : vente (= colis), boost, frais divers, réglages, sortie du stock.
// Publication Vinted (06/10/2026) : couleurs, format du colis, lien de l'annonce, file de publication.
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
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
import { CODES_FORMAT_COLIS } from "../catalogue/couleurs.js";
import { CODES_ETAT } from "../catalogue/etats.js";
import { STATUTS } from "../metier/statuts.js";

const horodatage = (nom: string) => timestamp(nom, { withTimezone: true, mode: "date" });

export const statutArticle = pgEnum("statut_article", STATUTS);
export const typePhoto = pgEnum("type_photo", ["terrain", "annonce"]);
export const formatColis = pgEnum("format_colis", CODES_FORMAT_COLIS);
export const etatPublication = pgEnum("etat_publication", [
  "en_attente",
  "en_cours",
  "publie",
  "essai",
  "erreur",
  "annule",
]);
/** « a_vendre » (#180) : à vendre hors Vinted, l'article reste compté en stock. */
export const motifSortie = pgEnum("motif_sortie", ["donne", "jete", "revendu", "garde", "perdu", "a_vendre"]);
export const canalRevente = pgEnum("canal_revente", ["vide_grenier", "leboncoin", "main_propre", "autre"]);
export const etatArticle = pgEnum("etat_article", CODES_ETAT);
/** Tâches automatisées (#147, ADR-0072) : exécutées seules, ou proposées dans une liste à valider. */
export const modeTache = pgEnum("mode_tache", ["automatique", "manuel"]);
/** Baisse de prix d'un article dormant (#147) : règle du compte. */
export const typeBaisse = pgEnum("type_baisse", ["pourcentage", "montant"]);
/** Baisse de prix d'un article dormant (#147) : réglage de l'article ; « aucune » = ne pas baisser le prix. */
export const reglageBaisse = pgEnum("reglage_baisse", ["compte", "pourcentage", "montant", "aucune"]);
export const typeActionVinted = pgEnum("type_action_vinted", ["baisse", "republication"]);
/** Commande terminée lue sur Vinted (#148) : à valider (manuel), à rattacher à un article, appliquée, refusée. */
export const etatCommandeVinted = pgEnum("etat_commande_vinted", [
  "a_valider",
  "a_rattacher",
  "appliquee",
  "refusee",
  "ignoree",
]);
export const etatActionVinted = pgEnum("etat_action_vinted", [
  "a_valider",
  "en_attente",
  "en_cours",
  "faite",
  "essai",
  "erreur",
  "refusee",
  "annulee",
]);

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
    /** Centimes. Prix de vente minimum accepté (≤ prix affiché, verrouillé par la base : #146, #195). */
    prixVenteMinimum: integer("prix_vente_minimum"),
    /** Tâche « Articles dormants » (#147) : règle de baisse de l'article (« compte » = celle des réglages). */
    baisseRegle: reglageBaisse("baisse_regle").notNull().default("compte"),
    /** Pourcentage entier ou centimes, selon `baisseRegle` (pourcentage / montant) ; sinon vide. */
    baisseValeur: integer("baisse_valeur"),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
    modifieLe: horodatage("modifie_le").notNull().defaultNow(),
    /** Sortie du stock (§5.7) : motif, canal (« revendu », « a_vendre »), prix de revente (centimes) si « revendu », date. */
    motifSortie: motifSortie("motif_sortie"),
    canalRevente: canalRevente("canal_revente"),
    prixRevente: integer("prix_revente"),
    dateSortieStock: horodatage("date_sortie_stock"),
    /** Annonce (§5.2) : titre et description, générés par IA (lot 6) ou saisis. */
    titreAnnonce: text("titre_annonce"),
    /** Codes de couleur (server/src/catalogue/couleurs.ts), 2 au plus. */
    couleurs: text("couleurs")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    formatColis: formatColis("format_colis"),
    /** Lien de l'annonce publiée sur Vinted. */
    urlVinted: text("url_vinted"),
    /** Lien de la conversation Vinted avec l'acheteur, saisi à la vente (issue #48). */
    urlConversation: text("url_conversation"),
    descriptionAnnonce: text("description_annonce"),
    /** Corbeille (lot 4) : date de mise à la corbeille, sinon null. */
    supprimeLe: horodatage("supprime_le"),
  },
  (t) => [
    uniqueIndex("article_reference_unique").on(t.utilisateurId, t.reference),
    index("article_utilisateur_cree_idx").on(t.utilisateurId, t.creeLe),
    index("article_sortie_idx").on(t.sortieId),
    index("article_lot_idx").on(t.lotId),
    // Verrou (#195) : aucun chemin, tâches automatiques comprises, ne peut laisser un minimum au-dessus du prix affiché.
    check(
      "article_prix_minimum_inferieur_prix_affiche",
      sql`${t.prixVenteMinimum} IS NULL OR ${t.prixAffiche} IS NULL OR ${t.prixVenteMinimum} <= ${t.prixAffiche}`,
    ),
  ],
);

/** Photo : fichier dans data/photos/<utilisateur>/ ; une photo terrain peut être partagée par les articles d'un lot. */
export const photo = pgTable(
  "photo",
  {
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
  },
  (t) => [index("photo_utilisateur_idx").on(t.utilisateurId)],
);

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
    /** Ordre d'enregistrement : départage les changements de même date. */
    ordre: bigserial("ordre", { mode: "number" }).notNull(),
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

/** Boost Vinted (§5.2) : coût rattaché à l'article. */
export const boost = pgTable(
  "boost",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    /** Centimes. */
    montant: integer("montant").notNull(),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [index("boost_article_idx").on(t.articleId), index("boost_utilisateur_idx").on(t.utilisateurId)],
);

/** Vente (= un colis, §3) : 1 article (vente simple) ou plusieurs (vente groupée). */
export const vente = pgTable(
  "vente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    /** Centimes : montant réellement crédité (nouveau montant après un retour partiel). */
    montantCredite: integer("montant_credite").notNull(),
    /** Centimes : emballage du colis (§6.3). */
    emballage: integer("emballage").notNull(),
    dateVente: horodatage("date_vente").notNull(),
    dateEnvoi: horodatage("date_envoi"),
    dateFinalisation: horodatage("date_finalisation"),
    /** Annulation par l'acheteur ou retour du colis entier : exclue de tous les calculs (§4.4). */
    annulee: boolean("annulee").notNull().default(false),
    creeLe: horodatage("cree_le").notNull().defaultNow(),
  },
  (t) => [index("vente_utilisateur_idx").on(t.utilisateurId)],
);

export const venteArticle = pgTable(
  "vente_article",
  {
    venteId: uuid("vente_id")
      .notNull()
      .references(() => vente.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    /** Centimes : prix affiché au moment de la vente (prorata, §6.4). */
    prixAfficheAuMoment: integer("prix_affiche_au_moment").notNull(),
    /** Renvoyé par l'acheteur (retour partiel). */
    retourne: boolean("retourne").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.venteId, t.articleId] }), index("vente_article_article_idx").on(t.articleId)],
);

/** Frais divers saisis à la main (§5.12) : frais généraux du mois de leur date. */
export const fraisGeneral = pgTable(
  "frais_general",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    /** Centimes. */
    montant: integer("montant").notNull(),
    libelle: text("libelle").notNull(),
  },
  (t) => [index("frais_general_utilisateur_date_idx").on(t.utilisateurId, t.date)],
);

/** Réglages de l'utilisateur (§7) ; une ligne par utilisateur, créée à la première modification. */
export const reglages = pgTable(
  "reglages",
  {
    utilisateurId: uuid("utilisateur_id")
      .primaryKey()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    /** Centimes : emballage par défaut d'un colis (0,08 €). */
    emballageDefaut: integer("emballage_defaut").notNull().default(8),
    /** Jours : alerte « brouillon trop ancien » (§5.8). */
    delaiBrouillon: integer("delai_brouillon").notNull().default(3),
    /** Jours : alerte « article dormant » (§5.8). */
    delaiDormant: integer("delai_dormant").notNull().default(7),
    /** Prompts IA modifiables (lot 6) ; null = prompt par défaut. */
    promptAnnonce: text("prompt_annonce"),
    promptEtiquette: text("prompt_etiquette"),
    /** Publication Vinted : format de colis proposé par défaut. */
    formatColisDefaut: formatColis("format_colis_defaut").notNull().default("petit"),
    /** Empreinte SHA-256 du jeton du programme de publication (le jeton lui-même n'est jamais stocké). */
    jetonPublication: text("jeton_publication"),
    /** Dernier contact du programme de publication. */
    programmeVuLe: horodatage("programme_vu_le"),
    // Tâches automatisées (#147, ADR-0072, ADR-0078) : plage horaire (heure de Paris), mode essai commun.
    tachesHeureDebut: integer("taches_heure_debut").notNull().default(8),
    tachesHeureFin: integer("taches_heure_fin").notNull().default(22),
    /** Mode essai : l'extension ouvre les pages Vinted mais ne modifie rien (jusqu'au calibrage). */
    tachesEssai: boolean("taches_essai").notNull().default(true),
    // Tâche « Articles dormants » (#147, ADR-0073).
    dormantsActive: boolean("dormants_active").notNull().default(false),
    dormantsMode: modeTache("dormants_mode").notNull().default("manuel"),
    dormantsBaisseType: typeBaisse("dormants_baisse_type").notNull().default("pourcentage"),
    /** Pourcentage entier (10 = 10 %) ou centimes. */
    dormantsBaisseValeur: integer("dormants_baisse_valeur").notNull().default(10),
    dormantsFrequenceHeures: integer("dormants_frequence_heures").notNull().default(24),
    /** Secondes entre deux baisses, entre deux republications. */
    dormantsPauseBaisse: integer("dormants_pause_baisse").notNull().default(120),
    dormantsPauseRepublication: integer("dormants_pause_republication").notNull().default(600),
    dormantsPlafondBaisses: integer("dormants_plafond_baisses").notNull().default(20),
    dormantsPlafondRepublications: integer("dormants_plafond_republications").notNull().default(10),
    /** Dernier passage de la tâche (planification des actions). */
    dormantsDernierPassage: horodatage("dormants_dernier_passage"),
    // Tâche « Vérification vente finalisée » (#148, ADR-0074) : lecture de « Mes commandes › Ventes » sur Vinted.
    finalisationActive: boolean("finalisation_active").notNull().default(false),
    finalisationMode: modeTache("finalisation_mode").notNull().default("manuel"),
    finalisationFrequenceHeures: integer("finalisation_frequence_heures").notNull().default(24),
    /** Secondes entre deux pages lues sur Vinted. */
    finalisationPause: integer("finalisation_pause").notNull().default(60),
    /** Finalisations faites sans validation, par jour (au-delà : à valider). */
    finalisationPlafond: integer("finalisation_plafond").notNull().default(50),
    /** Dernière lecture des commandes (résultat reçu de l'extension). */
    finalisationDernierPassage: horodatage("finalisation_dernier_passage"),
  },
  // Le programme du PC s'identifie par son jeton à chaque appel (#131).
  (t) => [index("reglages_jeton_publication_idx").on(t.jetonPublication)],
);

/** File de publication sur Vinted : une demande par article, traitée par le programme du PC. */
export const publicationVinted = pgTable(
  "publication_vinted",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    etat: etatPublication("etat").notNull().default("en_attente"),
    /** Mode essai : le formulaire est rempli mais rien n'est publié. */
    essai: boolean("essai").notNull().default(true),
    message: text("message"),
    demandeLe: horodatage("demande_le").notNull(),
    debutLe: horodatage("debut_le"),
    finLe: horodatage("fin_le"),
  },
  (t) => [
    index("publication_vinted_utilisateur_idx").on(t.utilisateurId, t.etat),
    index("publication_vinted_article_idx").on(t.articleId),
  ],
);

/**
 * Actions des tâches automatisées sur Vinted (#147) : baisse de prix ou republication d'un article dormant, à valider
 * (mode manuel), puis exécutées une à une par l'extension. Le résultat (« faite ») met à jour l'article.
 */
export const actionVinted = pgTable(
  "action_vinted",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    type: typeActionVinted("type").notNull(),
    etat: etatActionVinted("etat").notNull(),
    /** Centimes : prix affiché au moment de la planification, et nouveau prix d'une baisse. */
    prixAvant: integer("prix_avant").notNull(),
    prixApres: integer("prix_apres"),
    /** Mode essai : l'extension ouvre les pages mais ne modifie rien. */
    essai: boolean("essai").notNull().default(true),
    message: text("message"),
    /** Republication : lien de la nouvelle annonce. */
    url: text("url"),
    creeLe: horodatage("cree_le").notNull(),
    debutLe: horodatage("debut_le"),
    finLe: horodatage("fin_le"),
  },
  (t) => [
    index("action_vinted_utilisateur_idx").on(t.utilisateurId, t.etat),
    index("action_vinted_article_idx").on(t.articleId),
  ],
);

/**
 * Commandes terminées lues sur Vinted par l'extension (#148) : une ligne par commande, jamais traitée deux fois.
 * Rattachée à une vente de l'application par le lien des annonces (`article.url_vinted`), sinon « à rattacher ».
 */
export const commandeVinted = pgTable(
  "commande_vinted",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    /** Identifiant de la commande sur Vinted. */
    idCommande: text("id_commande").notNull(),
    /** Numéros des annonces Vinted de la commande (le « 123 » de `/items/123-…`). */
    annonces: text("annonces").array().notNull(),
    /** Date de fin de la commande sur Vinted : date de la finalisation dans l'application. */
    dateFin: horodatage("date_fin").notNull(),
    /** Centimes : montant crédité par Vinted, s'il a été lu. */
    montant: integer("montant"),
    etat: etatCommandeVinted("etat").notNull(),
    venteId: uuid("vente_id").references(() => vente.id, { onDelete: "set null" }),
    /** Centimes : montant crédité de la vente avant sa correction par le montant Vinted (alerte « montant corrigé »). */
    montantAvant: integer("montant_avant"),
    /** Alerte « montant corrigé » marquée « Vu ». */
    vu: boolean("vu").notNull().default(false),
    message: text("message"),
    creeLe: horodatage("cree_le").notNull(),
    traiteLe: horodatage("traite_le"),
  },
  (t) => [
    uniqueIndex("commande_vinted_unique").on(t.utilisateurId, t.idCommande),
    index("commande_vinted_etat_idx").on(t.utilisateurId, t.etat),
  ],
);

/**
 * Signalements « Pour info » de l'écran « À faire » marqués « Vu » (#191) : masqués tant que leur date de départ
 * (`depuis`, AAAA-MM-JJ) ne change pas ; une nouvelle date (ex. article de nouveau dormant) les fait réapparaître.
 */
export const signalementVu = pgTable(
  "signalement_vu",
  {
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateur.id, { onDelete: "cascade" }),
    /** Groupe d'alertes : « brouillons » ou « dormants ». */
    type: text("type").notNull(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    depuis: date("depuis", { mode: "string" }).notNull(),
    vuLe: horodatage("vu_le").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.type, t.articleId] })],
);
