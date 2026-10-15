CREATE TYPE "public"."etat_action_vinted" AS ENUM('a_valider', 'en_attente', 'en_cours', 'faite', 'essai', 'erreur', 'refusee', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."mode_tache" AS ENUM('automatique', 'manuel');--> statement-breakpoint
CREATE TYPE "public"."reglage_baisse" AS ENUM('compte', 'pourcentage', 'montant', 'aucune');--> statement-breakpoint
CREATE TYPE "public"."type_action_vinted" AS ENUM('baisse', 'republication');--> statement-breakpoint
CREATE TYPE "public"."type_baisse" AS ENUM('pourcentage', 'montant');--> statement-breakpoint
ALTER TYPE "public"."statut_article" ADD VALUE 'invendu' BEFORE 'a_expedier';--> statement-breakpoint
CREATE TABLE "action_vinted" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"type" "type_action_vinted" NOT NULL,
	"etat" "etat_action_vinted" NOT NULL,
	"prix_avant" integer NOT NULL,
	"prix_apres" integer,
	"essai" boolean DEFAULT true NOT NULL,
	"message" text,
	"url" text,
	"cree_le" timestamp with time zone NOT NULL,
	"debut_le" timestamp with time zone,
	"fin_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "baisse_regle" "reglage_baisse" DEFAULT 'compte' NOT NULL;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "baisse_valeur" integer;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "taches_heure_debut" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "taches_heure_fin" integer DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "taches_essai" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_mode" "mode_tache" DEFAULT 'manuel' NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_baisse_type" "type_baisse" DEFAULT 'pourcentage' NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_baisse_valeur" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_frequence_heures" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_pause_baisse" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_pause_republication" integer DEFAULT 600 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_plafond_baisses" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_plafond_republications" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_dernier_passage" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "action_vinted" ADD CONSTRAINT "action_vinted_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_vinted" ADD CONSTRAINT "action_vinted_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_vinted_utilisateur_idx" ON "action_vinted" USING btree ("utilisateur_id","etat");--> statement-breakpoint
CREATE INDEX "action_vinted_article_idx" ON "action_vinted" USING btree ("article_id");