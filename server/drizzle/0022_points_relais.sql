CREATE TYPE "public"."transporteur" AS ENUM('vinted_go', 'mondial_relay', 'la_poste', 'relais_colis');--> statement-breakpoint
CREATE TABLE "point_relais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"transporteur" "transporteur" NOT NULL,
	"nom" text NOT NULL,
	"adresse" text,
	"numero" text,
	"url" text,
	"horaires" jsonb NOT NULL,
	"notes" text,
	"archive" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vente" ADD COLUMN "point_depot_id" uuid;--> statement-breakpoint
ALTER TABLE "vente" ADD COLUMN "point_retrait_id" uuid;--> statement-breakpoint
ALTER TABLE "point_relais" ADD CONSTRAINT "point_relais_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "point_relais_utilisateur_idx" ON "point_relais" USING btree ("utilisateur_id");--> statement-breakpoint
ALTER TABLE "vente" ADD CONSTRAINT "vente_point_depot_id_point_relais_id_fk" FOREIGN KEY ("point_depot_id") REFERENCES "public"."point_relais"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vente" ADD CONSTRAINT "vente_point_retrait_id_point_relais_id_fk" FOREIGN KEY ("point_retrait_id") REFERENCES "public"."point_relais"("id") ON DELETE set null ON UPDATE no action;