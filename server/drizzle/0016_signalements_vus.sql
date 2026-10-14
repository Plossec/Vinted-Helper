CREATE TABLE "signalement_vu" (
	"utilisateur_id" uuid NOT NULL,
	"type" text NOT NULL,
	"article_id" uuid NOT NULL,
	"depuis" date NOT NULL,
	"vu_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signalement_vu_utilisateur_id_type_article_id_pk" PRIMARY KEY("utilisateur_id","type","article_id")
);
--> statement-breakpoint
ALTER TABLE "signalement_vu" ADD CONSTRAINT "signalement_vu_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement_vu" ADD CONSTRAINT "signalement_vu_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;