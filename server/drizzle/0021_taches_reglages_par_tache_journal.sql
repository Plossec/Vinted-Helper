CREATE TABLE "lecture_commandes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"essai" boolean NOT NULL,
	"manuelle" boolean DEFAULT false NOT NULL,
	"lues" integer DEFAULT 0 NOT NULL,
	"nouvelles" integer DEFAULT 0 NOT NULL,
	"finalisees" integer DEFAULT 0 NOT NULL,
	"a_valider" integer DEFAULT 0 NOT NULL,
	"a_rattacher" integer DEFAULT 0 NOT NULL,
	"erreur" text,
	"releve" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_vinted" ADD COLUMN "releve" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_heure_debut" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_heure_fin" integer DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "dormants_essai" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_heure_debut" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_heure_fin" integer DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_essai" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lecture_commandes" ADD CONSTRAINT "lecture_commandes_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lecture_commandes_utilisateur_idx" ON "lecture_commandes" USING btree ("utilisateur_id","date");--> statement-breakpoint
-- Plage horaire et mode essai propres à chaque tâche (#232, ADR-0105) : les réglages communs sont recopiés dans chaque
-- tâche avant d'être retirés (aucun réglage perdu).
UPDATE "reglages" SET "dormants_heure_debut" = "taches_heure_debut", "dormants_heure_fin" = "taches_heure_fin", "dormants_essai" = "taches_essai", "finalisation_heure_debut" = "taches_heure_debut", "finalisation_heure_fin" = "taches_heure_fin", "finalisation_essai" = "taches_essai";--> statement-breakpoint
ALTER TABLE "reglages" DROP COLUMN "taches_heure_debut";--> statement-breakpoint
ALTER TABLE "reglages" DROP COLUMN "taches_heure_fin";--> statement-breakpoint
ALTER TABLE "reglages" DROP COLUMN "taches_essai";