// Migration 0001 : conversion des articles saisis avant l'arbre des catégories et les états Vinted.
// On applique la migration 0000, on insère des articles « à l'ancienne », puis on applique la 0001.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dossier = resolve(import.meta.dirname, "..", "..", "drizzle");
// Une base PGlite neuve et plusieurs migrations peuvent dépasser les 5 à 10 s par défaut quand toute la suite
// tourne en parallèle (échec intermittent constaté le 14/10/2026) : délai élargi pour ces tests.
const DELAI = 30_000;
const appliquer = async (client: PGlite, fichier: string) => {
  for (const instruction of readFileSync(resolve(dossier, fichier), "utf8").split("--> statement-breakpoint")) {
    if (instruction.trim()) await client.exec(instruction);
  }
};

describe("migration 0001 — conversion des données existantes", () => {
  const client = new PGlite();
  let articles: {
    nom: string;
    categorie: string | null;
    etat: string | null;
    gamme: string | null;
    notes: string | null;
  }[];

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
      await client.query<(typeof articles)[number]>(
        "SELECT nom, categorie, etat, gamme, notes FROM article ORDER BY reference",
      )
    ).rows;
  }, DELAI);
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

describe("migration 0002 — marques de départ ajoutées aux comptes existants", { timeout: DELAI }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("ajoute uniquement les marques manquantes, sans doublon (majuscules ignorées)", async () => {
    await appliquer(client, "0000_lot1_socle.sql");
    await appliquer(client, "0001_lot1_catalogue_vinted.sql");
    await client.exec(`
      INSERT INTO utilisateur (id, identifiant, mot_de_passe_hache) VALUES ('00000000-0000-4000-8000-000000000001', 'u', 'x');
      INSERT INTO marque (utilisateur_id, nom) VALUES
        ('00000000-0000-4000-8000-000000000001', 'LEVI''S'),
        ('00000000-0000-4000-8000-000000000001', 'Ma marque à moi');
    `);
    await appliquer(client, "0002_lot1_marques_vinted.sql");
    const { MARQUES_INITIALES } = await import("../catalogue/marques.js");
    const lignes = (await client.query<{ nom: string }>("SELECT nom FROM marque")).rows.map((l) => l.nom);
    expect(lignes).toHaveLength(MARQUES_INITIALES.length + 1); // + « Ma marque à moi »
    expect(lignes.filter((n) => n.toLowerCase() === "levi's")).toEqual(["LEVI'S"]);
    expect(lignes).toContain("Sans marque");
    expect(lignes).toContain("Tape à l'œil");
  });
});

describe("migration 0012 — Hommes › Sweats et pulls aligné sur Vinted (#176)", { timeout: DELAI }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("reprend les articles classés sous un ancien libellé, sans toucher aux autres", async () => {
    const fichiers = readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const fichier of fichiers.filter((f) => f < "0012")) await appliquer(client, fichier);
    const prefixe = "hommes/vetements/sweats-et-pulls/";
    await client.exec(`
      INSERT INTO utilisateur (id, identifiant, mot_de_passe_hache) VALUES ('00000000-0000-4000-8000-000000000001', 'u', 'x');
      INSERT INTO article (utilisateur_id, reference, categorie) VALUES
        ('00000000-0000-4000-8000-000000000001', 1, '${prefixe}pulls-col-v'),
        ('00000000-0000-4000-8000-000000000001', 2, '${prefixe}gilets'),
        ('00000000-0000-4000-8000-000000000001', 3, '${prefixe}sweats'),
        ('00000000-0000-4000-8000-000000000001', 4, 'femmes/vetements/pulls-et-gilets/pulls-col-v');
    `);
    await appliquer(client, "0012_categories_sweats_hommes.sql");
    const lignes = (await client.query<{ categorie: string }>("SELECT categorie FROM article ORDER BY reference")).rows;
    expect(lignes.map((l) => l.categorie)).toEqual([
      `${prefixe}sweats-a-col-v`,
      `${prefixe}cardigans`,
      `${prefixe}sweats`,
      "femmes/vetements/pulls-et-gilets/pulls-col-v",
    ]);
    // Chaque code d'arrivée existe dans l'arbre des catégories.
    const { CATEGORIES } = await import("../catalogue/categories.js");
    const codes = new Set(CATEGORIES.map((c) => c.code));
    for (const code of readFileSync(resolve(dossier, "0012_categories_sweats_hommes.sql"), "utf8").matchAll(
      /SET "categorie" = '([^']+)'/g,
    ))
      expect(codes.has(code[1] ?? "")).toBe(true);
  });
});

describe("migration 0015 — arbre des catégories recopié de Vinted (#177)", { timeout: DELAI }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("reprend chaque article vers une catégorie du nouvel arbre, « Autre » hors des rayons retenus", async () => {
    const fichiers = readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const fichier of fichiers.filter((f) => f < "0015")) await appliquer(client, fichier);
    const avant = [
      "femmes/vetements/pulls-et-gilets/pulls-col-v", // renommée
      "femmes/vetements/robes/robes-longues", // inchangée
      "hommes/vetements/sweats-et-pulls/sweats", // inchangée (relevé #176)
      "sport/football", // feuille devenue un rayon
      "divertissement/jeux-de-societe-et-puzzles/puzzles", // rayon déplacé
      "divertissement/livres/romans", // rayon non retenu
      "maison/decoration/vases", // rayon non retenu
    ];
    await client.exec(`
      INSERT INTO utilisateur (id, identifiant, mot_de_passe_hache) VALUES ('00000000-0000-4000-8000-000000000001', 'u', 'x');
      INSERT INTO article (utilisateur_id, reference, categorie) VALUES
        ${avant.map((c, i) => `('00000000-0000-4000-8000-000000000001', ${i + 1}, '${c}')`).join(",\n")},
        ('00000000-0000-4000-8000-000000000001', ${avant.length + 1}, NULL);
    `);
    await appliquer(client, "0015_categories_vinted.sql");
    const lignes = (
      await client.query<{ categorie: string | null }>("SELECT categorie FROM article ORDER BY reference")
    ).rows;
    expect(lignes.map((l) => l.categorie)).toEqual([
      "femmes/vetements/sweats-et-sweats-a-capuche/sweats/pulls-col-v",
      "femmes/vetements/robes/robes-longues",
      "hommes/vetements/sweats-et-pulls/sweats",
      "sport/sports-d-equipe/football/autres-accessoires-de-football",
      "loisirs-et-collections/puzzles",
      "autre",
      "autre",
      null,
    ]);
    // Chaque code d'arrivée existe dans l'arbre des catégories.
    const { CATEGORIES } = await import("../catalogue/categories.js");
    const codes = new Set(CATEGORIES.map((c) => c.code));
    for (const code of readFileSync(resolve(dossier, "0015_categories_vinted.sql"), "utf8").matchAll(/THEN '([^']+)'/g))
      expect(codes.has(code[1] ?? "")).toBe(true);
  });
});

describe("migration 0017 — verrou prix vente minimum ≤ prix affiché (#195)", { timeout: DELAI }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("ramène un minimum trop haut au prix affiché, puis refuse tout nouveau minimum au-dessus", async () => {
    const fichiers = readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const fichier of fichiers.filter((f) => f < "0017")) await appliquer(client, fichier);
    await client.exec(`
      INSERT INTO utilisateur (id, identifiant, mot_de_passe_hache) VALUES ('00000000-0000-4000-8000-000000000001', 'u', 'x');
      INSERT INTO article (utilisateur_id, reference, prix_affiche, prix_vente_minimum) VALUES
        ('00000000-0000-4000-8000-000000000001', 1, 1000, 1200),
        ('00000000-0000-4000-8000-000000000001', 2, 1000, 800),
        ('00000000-0000-4000-8000-000000000001', 3, NULL, 800),
        ('00000000-0000-4000-8000-000000000001', 4, 1000, NULL);
    `);
    await appliquer(client, "0017_prix_minimum_verrou.sql");
    const lignes = (
      await client.query<{ prix_vente_minimum: number | null }>(
        "SELECT prix_vente_minimum FROM article ORDER BY reference",
      )
    ).rows;
    expect(lignes.map((l) => l.prix_vente_minimum)).toEqual([1000, 800, 800, null]);
    await expect(client.exec("UPDATE article SET prix_affiche = 700 WHERE reference = 2")).rejects.toThrow(
      /article_prix_minimum_inferieur_prix_affiche/,
    );
    await expect(client.exec("UPDATE article SET prix_affiche = 800 WHERE reference = 2")).resolves.toBeDefined();
  });
});

describe("migration 0021 — plage horaire et mode essai propres à chaque tâche (#232)", { timeout: DELAI }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("recopie les réglages communs dans chaque tâche, puis les retire", async () => {
    const fichiers = readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const fichier of fichiers.filter((f) => f < "0021")) await appliquer(client, fichier);
    await client.exec(`
      INSERT INTO utilisateur (id, identifiant, mot_de_passe_hache) VALUES
        ('00000000-0000-4000-8000-000000000001', 'u', 'x'), ('00000000-0000-4000-8000-000000000002', 'v', 'x');
      INSERT INTO reglages (utilisateur_id, taches_heure_debut, taches_heure_fin, taches_essai) VALUES
        ('00000000-0000-4000-8000-000000000001', 9, 20, false), ('00000000-0000-4000-8000-000000000002', 8, 22, true);
    `);
    await appliquer(client, "0021_taches_reglages_par_tache_journal.sql");
    const lignes = (
      await client.query(
        `SELECT dormants_heure_debut, dormants_heure_fin, dormants_essai,
                finalisation_heure_debut, finalisation_heure_fin, finalisation_essai
         FROM reglages ORDER BY utilisateur_id`,
      )
    ).rows;
    expect(lignes).toEqual([
      {
        dormants_heure_debut: 9,
        dormants_heure_fin: 20,
        dormants_essai: false,
        finalisation_heure_debut: 9,
        finalisation_heure_fin: 20,
        finalisation_essai: false,
      },
      {
        dormants_heure_debut: 8,
        dormants_heure_fin: 22,
        dormants_essai: true,
        finalisation_heure_debut: 8,
        finalisation_heure_fin: 22,
        finalisation_essai: true,
      },
    ]);
    const colonnes = await client.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'reglages'",
    );
    expect(colonnes.rows.map((c) => c.column_name)).not.toContain("taches_essai");
  });
});
