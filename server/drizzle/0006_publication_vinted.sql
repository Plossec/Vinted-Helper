CREATE TYPE "public"."etat_publication" AS ENUM('en_attente', 'en_cours', 'publie', 'essai', 'erreur', 'annule');--> statement-breakpoint
CREATE TYPE "public"."format_colis" AS ENUM('petit', 'moyen', 'grand');--> statement-breakpoint
CREATE TABLE "publication_vinted" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"etat" "etat_publication" DEFAULT 'en_attente' NOT NULL,
	"essai" boolean DEFAULT true NOT NULL,
	"message" text,
	"demande_le" timestamp with time zone NOT NULL,
	"debut_le" timestamp with time zone,
	"fin_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "couleurs" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "format_colis" "format_colis";--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "url_vinted" text;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "format_colis_defaut" "format_colis" DEFAULT 'petit' NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "jeton_publication" text;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "programme_vu_le" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "publication_vinted" ADD CONSTRAINT "publication_vinted_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_vinted" ADD CONSTRAINT "publication_vinted_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publication_vinted_utilisateur_idx" ON "publication_vinted" USING btree ("utilisateur_id","etat");