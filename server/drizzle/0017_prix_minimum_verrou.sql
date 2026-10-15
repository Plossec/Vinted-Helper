-- #195 : un article déjà enregistré avec un minimum au-dessus du prix affiché ferait échouer le verrou ; son minimum
-- est ramené au prix affiché (le plus proche de ce qui avait été saisi), puis le verrou est posé.
UPDATE "article" SET "prix_vente_minimum" = "prix_affiche" WHERE "prix_vente_minimum" > "prix_affiche";--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_prix_minimum_inferieur_prix_affiche" CHECK ("article"."prix_vente_minimum" IS NULL OR "article"."prix_affiche" IS NULL OR "article"."prix_vente_minimum" <= "article"."prix_affiche");
