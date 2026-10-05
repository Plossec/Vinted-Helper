// Migration 0001 : conversion des articles saisis avant l'arbre des catégories et les états Vinted.
// On applique la migration 0000, on insère des articles « à l'ancienne », puis on applique la 0001.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dossier = resolve(import.meta.dirname, "..", "..", "drizzle");
const appliquer = async (client: PGlite, fichier: string) => {
  for (const instruction of readFileSync(resolve(dossier, fichier), "utf8").split("--> statement-breakpoint")) {
    if (instruction.trim()) await client.exec(instruction);
  }
};

describe("migration 0001 — conversion des données existantes", () => {
  const client = new PGlite();
  let articles: { nom: string; categorie: string | null; etat: string | null; gamme: string | null; notes: string | null }[];

  beforeAll(async () => {
    await appliquer(client, "0000_lot1_socle.sql");
    await client.exec(`
      INSERT INTO utilisateur (id, identifiant, mot_de_passe_hache) VALUES ('00000000-0000-4000-8000-000000000001', 'u', 'x');
      INSERT INTO categorie (id, utilisateur_id, nom) VALUES ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', 'Jean');
      INSERT INTO gamme (id, utilisateur_id, nom) VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Foot');
      INSERT INTO etat (id, utilisateur_id, nom) VALUES
        ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-000000000001', 'Bon'),
        ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-000000000001', 'Abîmé'),
        ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-000000000001', 'Taché'),
        ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-000000000001', 'Comme neuf');
      INSERT INTO article (utilisateur_id, reference, nom, categorie_id, gamme_id, etat_id, notes) VALUES
        ('00000000-0000-4000-8000-000000000001', 1, 'A', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000e1', NULL),
        ('00000000-0000-4000-8000-000000000001', 2, 'B', NULL, NULL, '00000000-0000-4000-8000-0000000000e2', 'note'),
        ('00000000-0000-4000-8000-000000000001', 3, 'C', NULL, NULL, '00000000-0000-4000-8000-0000000000e3', 'trou manche'),
        ('00000000-0000-4000-8000-000000000001', 4, 'D', NULL, NULL, '00000000-0000-4000-8000-0000000000e4', NULL),
        ('00000000-0000-4000-8000-000000000001', 5, 'E', NULL, NULL, NULL, NULL);
    `);
    await appliquer(client, "0001_lot1_catalogue_vinted.sql");
    articles = (
      await client.query<(typeof articles)[number]>("SELECT nom, categorie, etat, gamme, notes FROM article ORDER BY reference")
    ).rows;
  });
  afterAll(() => client.close());

  it("gamme recopiée en texte, catégorie vidée", () => {
    expect(articles[0]).toMatchObject({ nom: "A", gamme: "Foot", categorie: null, etat: "bon_etat", notes: null });
  });

  it("Abîmé → Abîmé, notes inchangées", () => {
    expect(articles[1]).toMatchObject({ etat: "abime", notes: "note" });
  });

  it("Taché → Abîmé, « Taché » ajouté aux notes existantes", () => {
    expect(articles[2]).toMatchObject({ etat: "abime", notes: "trou manche\nÉtat d'origine : Taché" });
  });

  it("état saisi à la main → vide, son nom ajouté aux notes", () => {
    expect(articles[3]).toMatchObject({ etat: null, notes: "État d'origine : Comme neuf" });
  });

  it("article sans état ni gamme : inchangé", () => {
    expect(articles[4]).toMatchObject({ etat: null, gamme: null, notes: null });
  });

  it("les anciennes tables ont disparu", async () => {
    const tables = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    expect(tables.rows.map((t) => t.table_name)).not.toEqual(expect.arrayContaining(["categorie"]));
    expect(tables.rows.map((t) => t.table_name)).not.toContain("gamme");
    expect(tables.rows.map((t) => t.table_name)).not.toContain("etat");
  });
});
