CREATE TYPE "public"."etat_commande_vinted" AS ENUM('a_valider', 'a_rattacher', 'appliquee', 'refusee', 'ignoree');--> statement-breakpoint
CREATE TABLE "commande_vinted" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"id_commande" text NOT NULL,
	"annonces" text[] NOT NULL,
	"date_fin" timestamp with time zone NOT NULL,
	"montant" integer,
	"etat" "etat_commande_vinted" NOT NULL,
	"vente_id" uuid,
	"montant_avant" integer,
	"vu" boolean DEFAULT false NOT NULL,
	"message" text,
	"cree_le" timestamp with time zone NOT NULL,
	"traite_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_mode" "mode_tache" DEFAULT 'manuel' NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_frequence_heures" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_pause" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_plafond" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_dernier_passage" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commande_vinted" ADD CONSTRAINT "commande_vinted_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande_vinted" ADD CONSTRAINT "commande_vinted_vente_id_vente_id_fk" FOREIGN KEY ("vente_id") REFERENCES "public"."vente"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commande_vinted_unique" ON "commande_vinted" USING btree ("utilisateur_id","id_commande");--> statement-breakpoint
CREATE INDEX "commande_vinted_etat_idx" ON "commande_vinted" USING btree ("utilisateur_id","etat");