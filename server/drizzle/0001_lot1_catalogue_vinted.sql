-- Lot 1 (05/10/2026) : catégories et états fixes calqués sur Vinted, gamme en texte libre.
-- Ordre volontaire : on crée les nouvelles colonnes et on y recopie les données AVANT de supprimer les anciennes.
-- Conversion des articles existants (décision validée par l'utilisateur) :
--   * gamme : le nom de l'ancienne gamme est recopié en texte ;
--   * état : Bon → Bon état ; Abîmé, Taché, Cassé → Abîmé (« Taché » / « Cassé » ajouté aux notes) ;
--     tout autre état saisi à la main → vide, et son nom ajouté aux notes ;
--   * catégorie : vidée (l'ancienne liste plate ne correspond pas à l'arbre), à rechoisir dans la fiche.
CREATE TYPE "public"."etat_article" AS ENUM('neuf_avec_etiquette', 'neuf_sans_etiquette', 'tres_bon_etat', 'bon_etat', 'satisfaisant', 'abime');--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "categorie" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "gamme" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "etat" "etat_article";--> statement-breakpoint
UPDATE "article" AS a SET "gamme" = g."nom" FROM "gamme" AS g WHERE g."id" = a."gamme_id";--> statement-breakpoint
UPDATE "article" AS a
SET
  "etat" = CASE lower(e."nom")
    WHEN 'bon' THEN 'bon_etat'::"etat_article"
    WHEN 'abîmé' THEN 'abime'::"etat_article"
    WHEN 'abime' THEN 'abime'::"etat_article"
    WHEN 'taché' THEN 'abime'::"etat_article"
    WHEN 'tache' THEN 'abime'::"etat_article"
    WHEN 'cassé' THEN 'abime'::"etat_article"
    WHEN 'casse' THEN 'abime'::"etat_article"
    ELSE NULL
  END,
  "notes" = CASE
    WHEN lower(e."nom") IN ('bon', 'abîmé', 'abime') THEN a."notes"
    ELSE concat_ws(E'\n', a."notes", 'État d''origine : ' || e."nom")
  END
FROM "etat" AS e
WHERE e."id" = a."etat_id";--> statement-breakpoint
ALTER TABLE "article" DROP CONSTRAINT "article_categorie_id_categorie_id_fk";--> statement-breakpoint
ALTER TABLE "article" DROP CONSTRAINT "article_gamme_id_gamme_id_fk";--> statement-breakpoint
ALTER TABLE "article" DROP CONSTRAINT "article_etat_id_etat_id_fk";--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "categorie_id";--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "gamme_id";--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "etat_id";--> statement-breakpoint
DROP TABLE "categorie";--> statement-breakpoint
DROP TABLE "etat";--> statement-breakpoint
DROP TABLE "gamme";
