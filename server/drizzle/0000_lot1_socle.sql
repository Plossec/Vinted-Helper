CREATE TYPE "public"."statut_article" AS ENUM('brouillon', 'a_publier', 'en_ligne', 'a_expedier', 'envoye', 'finalise', 'sortie_stock');--> statement-breakpoint
CREATE TABLE "article" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"reference" integer NOT NULL,
	"nom" text,
	"categorie_id" uuid,
	"marque_id" uuid,
	"gamme_id" uuid,
	"etat_id" uuid,
	"taille" text,
	"matiere" text,
	"notes" text,
	"lieu_id" uuid,
	"prix_achat" integer,
	"date_achat" date,
	"statut" "statut_article" DEFAULT 'brouillon' NOT NULL,
	"prix_affiche" integer,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	"supprime_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categorie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"nom" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"nom" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gamme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"nom" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historique_prix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"prix" integer NOT NULL,
	"date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historique_statut" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"de" "statut_article",
	"vers" "statut_article" NOT NULL,
	"date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lieu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"est_maison" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"nom" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateur" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifiant" text NOT NULL,
	"mot_de_passe_hache" text NOT NULL,
	"dernier_numero_reference" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateur_identifiant_unique" UNIQUE("identifiant")
);
--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_categorie_id_categorie_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categorie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_marque_id_marque_id_fk" FOREIGN KEY ("marque_id") REFERENCES "public"."marque"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_gamme_id_gamme_id_fk" FOREIGN KEY ("gamme_id") REFERENCES "public"."gamme"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_etat_id_etat_id_fk" FOREIGN KEY ("etat_id") REFERENCES "public"."etat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_lieu_id_lieu_id_fk" FOREIGN KEY ("lieu_id") REFERENCES "public"."lieu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorie" ADD CONSTRAINT "categorie_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etat" ADD CONSTRAINT "etat_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gamme" ADD CONSTRAINT "gamme_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_prix" ADD CONSTRAINT "historique_prix_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_prix" ADD CONSTRAINT "historique_prix_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_statut" ADD CONSTRAINT "historique_statut_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_statut" ADD CONSTRAINT "historique_statut_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lieu" ADD CONSTRAINT "lieu_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marque" ADD CONSTRAINT "marque_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_reference_unique" ON "article" USING btree ("utilisateur_id","reference");--> statement-breakpoint
CREATE INDEX "article_utilisateur_cree_idx" ON "article" USING btree ("utilisateur_id","cree_le");--> statement-breakpoint
CREATE UNIQUE INDEX "categorie_nom_unique" ON "categorie" USING btree ("utilisateur_id",lower("nom"));--> statement-breakpoint
CREATE UNIQUE INDEX "etat_nom_unique" ON "etat" USING btree ("utilisateur_id",lower("nom"));--> statement-breakpoint
CREATE UNIQUE INDEX "gamme_nom_unique" ON "gamme" USING btree ("utilisateur_id",lower("nom"));--> statement-breakpoint
CREATE INDEX "historique_prix_article_idx" ON "historique_prix" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "historique_statut_article_idx" ON "historique_statut" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lieu_nom_unique" ON "lieu" USING btree ("utilisateur_id",lower("nom"));--> statement-breakpoint
CREATE UNIQUE INDEX "marque_nom_unique" ON "marque" USING btree ("utilisateur_id",lower("nom"));--> statement-breakpoint
CREATE INDEX "session_utilisateur_idx" ON "session" USING btree ("utilisateur_id");