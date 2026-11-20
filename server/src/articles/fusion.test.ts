// Fusion de deux articles (#284, ADR-0120).
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { article, boost, historiqueStatut, lotAchat } from "../base/schema.js";
import { completerAnnonce, creerAppDeTest, seConnecter } from "../test/outils.js";

describe("fusion de deux articles", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;
  let lieuId: string;
  let marqueId: string;
  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
    const refs = (await t.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    lieuId = refs.lieux[0]?.id ?? "";
    marqueId = refs.marques[0]?.id ?? "";
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
  const creer = async (ajouts: Record<string, unknown> = {}) => {
    const r = await requete("POST", "/api/articles", {
      nom: "Bottines noires",
      lieuId,
      prixAchat: 300,
      dateAchat: "2026-11-18",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      marqueId,
      etat: "bon_etat",
      ...ajouts,
    });
    expect(r.statusCode, r.body).toBe(201);
    return r.json<{ id: string }>().id;
  };
  const lire = async (id: string) => (await requete("GET", `/api/articles/${id}`)).json<Record<string, unknown>>();
  const fusionner = (doublon: string, garde: string, essai = false) =>
    requete("POST", `/api/articles/${doublon}/fusion`, { gardeId: garde, essai });

  it("aperçu sans effet, puis champs vides remplis, photos et boosts repris, doublon à la corbeille", async () => {
    const garde = await creer({ nom: "Bottines" });
    const doublon = await creer({ taille: "38" });
    await t.base.update(article).set({ marqueId: null }).where(eq(article.id, garde));
    await completerAnnonce(t.base, doublon); // titre, description, couleurs, prix affiché, une photo d'annonce
    await t.base.insert(boost).values({
      utilisateurId: (await lireUtilisateur(doublon)) ?? "",
      articleId: doublon,
      montant: 150,
      date: "2026-11-19",
    });

    const apercu = await fusionner(doublon, garde, true);
    expect(apercu.statusCode, apercu.body).toBe(200);
    expect(apercu.json()).toMatchObject({ photos: 1, statut: null, lot: false, historique: 1 });
    expect(apercu.json<{ champs: string[] }>().champs).toEqual(
      expect.arrayContaining(["marque", "taille", "titre de l'annonce", "prix affiché", "couleurs"]),
    );
    expect(await lire(garde)).toMatchObject({ titreAnnonce: null, photos: [] });

    expect((await fusionner(doublon, garde)).statusCode).toBe(200);
    const fiche = await lire(garde);
    expect(fiche).toMatchObject({
      nom: "Bottines", // rien n'est écrasé
      marqueId,
      taille: "38",
      titreAnnonce: "Titre de test",
      couleurs: ["bleu"],
      prixAffiche: 1000,
    });
    expect(fiche.photos).toHaveLength(1);
    const boosts = await t.base.select().from(boost).where(eq(boost.articleId, garde));
    expect(boosts.map((b) => b.montant)).toEqual([150]);
    expect((await requete("GET", `/api/articles/${doublon}`)).statusCode).toBe(404);
    const corbeille = (await requete("GET", "/api/corbeille")).json<{ id: string }[]>();
    expect(corbeille.map((a) => a.id)).toEqual([doublon]);
  });

  async function lireUtilisateur(id: string) {
    const [a] = await t.base.select({ u: article.utilisateurId }).from(article).where(eq(article.id, id));
    return a?.u;
  }

  it("statut le plus avancé : la vente du doublon passe sur l'article gardé, avec son historique", async () => {
    const garde = await creer();
    const doublon = await creer();
    await requete("POST", `/api/articles/${doublon}/statut`, { vers: "en_ligne", prixAffiche: 900 });
    const v = await requete("POST", "/api/ventes", { articleIds: [doublon], montantCredite: 900 });
    expect(v.statusCode, v.body).toBe(201);
    const venteId = v.json<{ id: string }>().id;

    expect((await fusionner(doublon, garde, true)).json()).toMatchObject({ statut: "À expédier" });
    expect((await fusionner(doublon, garde)).statusCode).toBe(200);
    expect(await lire(garde)).toMatchObject({ statut: "a_expedier", prixAffiche: 900 });
    const vente = (await requete("GET", `/api/ventes/${venteId}`)).json<{ articles: { id: string }[] }>();
    expect(vente.articles.map((a) => a.id)).toEqual([garde]);
    const historique = await t.base.select().from(historiqueStatut).where(eq(historiqueStatut.articleId, garde));
    expect(historique.map((h) => h.vers).sort()).toEqual(["a_expedier", "brouillon", "en_ligne"].sort());
  });

  it("deux articles vendus : refus ; même article : refus", async () => {
    const a = await creer();
    const b = await creer();
    for (const id of [a, b]) {
      await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne", prixAffiche: 900 });
      expect((await requete("POST", "/api/ventes", { articleIds: [id], montantCredite: 900 })).statusCode).toBe(201);
    }
    const r = await fusionner(a, b);
    expect(r.statusCode).toBe(409);
    expect(r.json<{ erreur: string }>().erreur).toMatch(/deux objets différents/);
    expect((await fusionner(a, a)).statusCode).toBe(400);
  });

  it("lot : l'article gardé sans prix d'achat prend la place du doublon dans le lot", async () => {
    const garde = await creer();
    const doublon = await creer();
    const autre = await creer();
    const utilisateurId = (await lireUtilisateur(doublon)) ?? "";
    const lotId = randomUUID();
    await t.base.insert(lotAchat).values({ id: lotId, utilisateurId, prixTotal: 1000 });
    await t.base.update(article).set({ lotId, prixAchat: null }).where(eq(article.id, doublon));
    await t.base.update(article).set({ lotId, prixAchat: null }).where(eq(article.id, autre));
    await t.base.update(article).set({ prixAchat: null }).where(eq(article.id, garde));

    expect((await fusionner(doublon, garde)).json()).toMatchObject({ lot: true });
    expect(await lire(garde)).toMatchObject({ lot: { prixTotal: 1000 }, couts: { prixAchat: 500 } });
    expect(await lire(autre)).toMatchObject({ couts: { prixAchat: 500 } });
  });
});
