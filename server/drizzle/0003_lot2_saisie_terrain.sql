CREATE TYPE "public"."type_photo" AS ENUM('terrain', 'annonce');--> statement-breakpoint
CREATE TABLE "article_photo" (
	"article_id" uuid NOT NULL,
	"photo_id" uuid NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"est_principale" boolean DEFAULT false NOT NULL,
	CONSTRAINT "article_photo_article_id_photo_id_pk" PRIMARY KEY("article_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "lot_achat" (
	"id" uuid PRIMARY KEY NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"sortie_id" uuid,
	"prix_total" integer NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"type" "type_photo" NOT NULL,
	"fichier" text NOT NULL,
	"est_reduite" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie" (
	"id" uuid PRIMARY KEY NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"date" date NOT NULL,
	"lieu_id" uuid NOT NULL,
	"montant_essence" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "sortie_id" uuid;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "lot_id" uuid;--> statement-breakpoint
ALTER TABLE "article_photo" ADD CONSTRAINT "article_photo_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_photo" ADD CONSTRAINT "article_photo_photo_id_photo_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_achat" ADD CONSTRAINT "lot_achat_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_achat" ADD CONSTRAINT "lot_achat_sortie_id_sortie_id_fk" FOREIGN KEY ("sortie_id") REFERENCES "public"."sortie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo" ADD CONSTRAINT "photo_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie" ADD CONSTRAINT "sortie_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie" ADD CONSTRAINT "sortie_lieu_id_lieu_id_fk" FOREIGN KEY ("lieu_id") REFERENCES "public"."lieu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_photo_photo_idx" ON "article_photo" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "sortie_utilisateur_date_idx" ON "sortie" USING btree ("utilisateur_id","date");--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_sortie_id_sortie_id_fk" FOREIGN KEY ("sortie_id") REFERENCES "public"."sortie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_lot_id_lot_achat_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lot_achat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_sortie_idx" ON "article" USING btree ("sortie_id");--> statement-breakpoint
CREATE INDEX "article_lot_idx" ON "article" USING btree ("lot_id");