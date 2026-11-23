ALTER TABLE "point_relais" ADD COLUMN "vinted_go_id" text;--> statement-breakpoint
ALTER TABLE "point_relais" ADD COLUMN "vinted_go_statut" text;--> statement-breakpoint
ALTER TABLE "point_relais" ADD COLUMN "vinted_go_capacite" jsonb;--> statement-breakpoint
ALTER TABLE "point_relais" ADD COLUMN "vinted_go_releve_le" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "point_relais" ADD COLUMN "vinted_go_releve_demande_le" timestamp with time zone;