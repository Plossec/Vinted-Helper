ALTER TABLE "action_vinted" ADD COLUMN "manuelle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglages" ADD COLUMN "finalisation_lancement_demande" timestamp with time zone;