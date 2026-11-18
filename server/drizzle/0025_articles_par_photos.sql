CREATE TYPE "public"."etat_analyse_ia" AS ENUM('en_attente', 'faite', 'echec');--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "analyse_ia" "etat_analyse_ia";--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "analyse_essais" integer DEFAULT 0 NOT NULL;