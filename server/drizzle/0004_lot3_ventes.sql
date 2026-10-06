CREATE TYPE "public"."canal_revente" AS ENUM('vide_grenier', 'leboncoin', 'main_propre', 'autre');--> statement-breakpoint
CREATE TYPE "public"."motif_sortie" AS ENUM('donne', 'jete', 'revendu', 'garde', 'perdu');--> statement-breakpoint
CREATE TABLE "boost" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"montant" integer NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frais_general" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"date" date NOT NULL,
	"montant" integer NOT NULL,
	"libelle" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reglages" (
	"utilisateur_id" uuid PRIMARY KEY NOT NULL,
	"emballage_defaut" integer DEFAULT 8 NOT NULL,
	"delai_brouillon" integer DEFAULT 3 NOT NULL,
	"delai_dormant" integer DEFAULT 7 NOT NULL,
	"prompt_annonce" text,
	"prompt_etiquette" text
);
--> statement-breakpoint
CREATE TABLE "vente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"montant_credite" integer NOT NULL,
	"emballage" integer NOT NULL,
	"date_vente" timestamp with time zone NOT NULL,
	"date_envoi" timestamp with time zone,
	"date_finalisation" timestamp with time zone,
	"annulee" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vente_article" (
	"vente_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"prix_affiche_au_moment" integer NOT NULL,
	"retourne" boolean DEFAULT false NOT NULL,
	CONSTRAINT "vente_article_vente_id_article_id_pk" PRIMARY KEY("vente_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "motif_sortie" "motif_sortie";--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "canal_revente" "canal_revente";--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "prix_revente" integer;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "date_sortie_stock" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "titre_annonce" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "description_annonce" text;--> statement-breakpoint
ALTER TABLE "boost" ADD CONSTRAINT "boost_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost" ADD CONSTRAINT "boost_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frais_general" ADD CONSTRAINT "frais_general_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglages" ADD CONSTRAINT "reglages_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vente" ADD CONSTRAINT "vente_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vente_article" ADD CONSTRAINT "vente_article_vente_id_vente_id_fk" FOREIGN KEY ("vente_id") REFERENCES "public"."vente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vente_article" ADD CONSTRAINT "vente_article_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boost_article_idx" ON "boost" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "vente_article_article_idx" ON "vente_article" USING btree ("article_id");