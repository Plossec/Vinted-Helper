CREATE TABLE "offre_favori" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"personne" text NOT NULL,
	"favori_le" timestamp with time zone NOT NULL,
	"etat" "etat_action_vinted" NOT NULL,
	"prix_avant" integer NOT NULL,
	"prix_offre" integer NOT NULL,
	"essai" boolean DEFAULT true NOT NULL,
	"manuelle" boolean DEFAULT false NOT NULL,
	"message" text,
	"releve" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone NOT NULL,
	"debut_le" timestamp with time zone,
	"fin_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_heure_debut" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_heure_fin" integer DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_essai" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_mode" "mode_tache" DEFAULT 'manuel' NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_delai_jours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_frequence_heures" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_pause" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_plafond" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_dernier_passage" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "favoris_lancement_demande" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "offre_favori" ADD CONSTRAINT "offre_favori_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offre_favori" ADD CONSTRAINT "offre_favori_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offre_favori_article_personne_unique" ON "offre_favori" USING btree ("article_id","personne");--> statement-breakpoint
CREATE INDEX "offre_favori_utilisateur_idx" ON "offre_favori" USING btree ("utilisateur_id","etat");