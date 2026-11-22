CREATE TYPE "public"."etat_offre_recue" AS ENUM('a_valider', 'en_attente', 'faite', 'signale', 'erreur');--> statement-breakpoint
CREATE TABLE "offre_recue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"offre_id" text NOT NULL,
	"transaction_id" text,
	"offer_request_id" text,
	"prix_offre" integer NOT NULL,
	"depuis" timestamp with time zone NOT NULL,
	"etat" "etat_offre_recue" NOT NULL,
	"prix_contre_offre" integer,
	"message" text,
	"essai" boolean DEFAULT true NOT NULL,
	"manuelle" boolean DEFAULT false NOT NULL,
	"releve" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone NOT NULL,
	"debut_le" timestamp with time zone,
	"fin_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_heure_debut" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_heure_fin" integer DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_essai" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_mode" "mode_tache" DEFAULT 'manuel' NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_delai_jours" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_frequence_heures" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_pause" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_plafond" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "offres_recues_dernier_passage" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "offre_recue" ADD CONSTRAINT "offre_recue_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offre_recue" ADD CONSTRAINT "offre_recue_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offre_recue_article_offre_unique" ON "offre_recue" USING btree ("article_id","offre_id");--> statement-breakpoint
CREATE INDEX "offre_recue_utilisateur_idx" ON "offre_recue" USING btree ("utilisateur_id","etat");