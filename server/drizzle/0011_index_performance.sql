CREATE INDEX "boost_utilisateur_idx" ON "boost" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE INDEX "frais_general_utilisateur_date_idx" ON "frais_general" USING btree ("utilisateur_id","date");--> statement-breakpoint
CREATE INDEX "photo_utilisateur_idx" ON "photo" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE INDEX "publication_vinted_article_idx" ON "publication_vinted" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "reglages_jeton_publication_idx" ON "reglages" USING btree ("jeton_publication");--> statement-breakpoint
CREATE INDEX "vente_utilisateur_idx" ON "vente" USING btree ("utilisateur_id");