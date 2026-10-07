// Import de l'ancien tableur : données fictives (le vrai fichier n'est jamais versionné).
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { amorcerCompte } from "../base/amorcage.js";
import type { Base } from "../base/connexion.js";
import { article, lieu, marque, sortie, utilisateur, vente } from "../base/schema.js";
import { calculer } from "../couts/service.js";
import { creerBaseDeTest } from "../test/outils.js";
import { importerTableur, lireDonneesImport } from "./tableur.js";

const FICHIER = {
  source: "tableur de test",
  sorties: [
    { cle: "S1", date: "2026-09-20", lieu: "Vide grenier", essence: 0 },
    { cle: "S2", date: "2026-09-27", lieu: "Braderie", essence: 200 },
  ],
  achats: [
    { sortie: "S1", date: "2026-09-20", prixTotal: 1000, articles: [1, 2, 3] },
    { sortie: "S2", date: "2026-09-27", prixTotal: 400, articles: [4] },
    { sortie: "S2", date: "2026-09-27", prixTotal: 200, articles: [5] },
    { sortie: null, date: "2026-09-27", prixTotal: 0, articles: [6] },
  ],
  articles: [
    { cle: 1, nom: "Polo A", gamme: "Polo", marque: "Lacoste", lieu: "Vide grenier", dateAchat: "2026-09-20" },
    {
      cle: 2,
      nom: "Polo B",
      gamme: "Polo",
      marque: "Marque inconnue",
      lieu: "Vide grenier",
      dateAchat: "2026-09-20",
      enLigne: { date: "2026-09-21", prixAffiche: 900 },
    },
    {
      cle: 3,
      nom: "Polo C",
      gamme: null,
      marque: null,
      lieu: "Vide grenier",
      dateAchat: "2026-09-20",
      prixEstime: 800,
    },
    {
      cle: 4,
      nom: "Chino A",
      gamme: "Chino",
      marque: null,
      lieu: "Braderie",
      dateAchat: "2026-09-27",
      enLigne: { date: "2026-09-28", prixAffiche: 900 },
    },
    {
      cle: 5,
      nom: "Chino B",
      gamme: "Chino",
      marque: null,
      lieu: "Braderie",
      dateAchat: "2026-09-27",
      enLigne: { date: "2026-09-28", prixAffiche: 900 },
    },
    {
      cle: 6,
      nom: "Jeu",
      gamme: null,
      marque: null,
      lieu: "Maison",
      dateAchat: "2026-09-27",
      enLigne: { date: "2026-09-27", prixAffiche: 500 },
    },
  ],
  ventes: [
    { articles: [2], montant: 900, emballage: 8, date: "2026-09-25", statutFinal: "finalise" },
    { articles: [4, 5], montant: 1500, emballage: 8, date: "2026-10-05", statutFinal: "envoye" },
  ],
};

describe("import du tableur", () => {
  let t: Awaited<ReturnType<typeof creerBaseDeTest>>;
  let utilisateurId: string;
  const maintenant = new Date("2026-10-07T12:00:00.000Z");

  beforeEach(async () => {
    t = await creerBaseDeTest();
    await amorcerCompte(t.base, () => ({ identifiant: "essai", motDePasse: "mot-de-passe-essai" }));
    const [u] = await t.base.select({ id: utilisateur.id }).from(utilisateur);
    utilisateurId = u?.id ?? "";
  });
  afterEach(async () => {
    await t.fermer();
  });

  const importer = (base: Base = t.base) =>
    importerTableur(base, utilisateurId, lireDonneesImport(FICHIER), maintenant);

  it("crée sorties, lots, mises en ligne et ventes avec les fonctions de l'application", async () => {
    expect(await importer()).toEqual({ articles: 6, sorties: 2, lots: 1, ventes: 2, enLigne: 1, brouillons: 2 });

    const articles = await t.base.select().from(article).orderBy(article.reference);
    expect(articles.map((a) => [a.reference, a.nom, a.statut])).toEqual([
      [1, "Polo A", "brouillon"],
      [2, "Polo B", "finalise"],
      [3, "Polo C", "brouillon"],
      [4, "Chino A", "envoye"],
      [5, "Chino B", "envoye"],
      [6, "Jeu", "en_ligne"],
    ]);
    const [polo, , poloC, , , jeu] = articles;
    expect(polo).toMatchObject({ gamme: "Polo", prixAchat: null, dateAchat: "2026-09-20" });
    expect(polo?.notes).toContain("Importé du tableur « tableur de test »");
    expect(poloC?.notes).toContain("Prix estimé : 8,00");
    expect(jeu).toMatchObject({ prixAchat: 0, sortieId: null, prixAffiche: 500 });

    // Marques et lieux : existants réutilisés, inconnus ajoutés à la liste.
    const [lacoste] = await t.base.select().from(marque).where(eq(marque.nom, "Lacoste"));
    expect(polo?.marqueId).toBe(lacoste?.id);
    expect(await t.base.select().from(marque).where(eq(marque.nom, "Marque inconnue"))).toHaveLength(1);
    expect(await t.base.select().from(lieu).where(eq(lieu.nom, "Braderie"))).toHaveLength(1);
    expect(await t.base.select().from(sortie)).toHaveLength(2);

    // Parts calculées par l'application : lot 10 € sur 3 articles, essence 2 € sur 2 articles, vente groupée.
    const { details } = await calculer(t.base, utilisateurId);
    const d = (i: number) => details.get(articles[i]?.id ?? "");
    expect([d(0)?.prixAchat, d(1)?.prixAchat, d(2)?.prixAchat]).toEqual([333, 333, 334]);
    expect([d(3)?.essence, d(4)?.essence]).toEqual([100, 100]);
    expect([d(3)?.prixVendu, d(4)?.prixVendu]).toEqual([750, 750]);
    expect(d(1)).toMatchObject({ prixVendu: 900, emballage: 8, realise: true, benefice: 900 - 333 - 8 });

    const [venteGroupee] = await t.base.select().from(vente).where(eq(vente.montantCredite, 1500));
    expect(venteGroupee?.dateEnvoi).not.toBeNull();
    expect(venteGroupee?.dateFinalisation).toBeNull();
  });

  it("refuse un second import du même tableur", async () => {
    await importer();
    await expect(importer()).rejects.toThrow("déjà été importé");
  });

  it("n'enregistre rien si une étape échoue (transaction)", async () => {
    const fichier = structuredClone(FICHIER);
    fichier.ventes[0] = { ...fichier.ventes[0], date: "2026-12-25" } as (typeof fichier.ventes)[0]; // dans le futur
    await expect(
      t.base.transaction((tx) => importerTableur(tx, utilisateurId, lireDonneesImport(fichier), maintenant)),
    ).rejects.toThrow();
    expect(await t.base.select().from(article)).toHaveLength(0);
    expect(await t.base.select().from(sortie)).toHaveLength(0);
  });

  it("refuse un fichier incohérent avant toute écriture", () => {
    expect(() => lireDonneesImport({ ...FICHIER, ventes: [{ ...FICHIER.ventes[0], articles: [1] }] })).toThrow(
      "vendu sans mise en ligne",
    );
    expect(() => lireDonneesImport({ ...FICHIER, achats: FICHIER.achats.slice(1) })).toThrow("un et un seul achat");
  });
});
