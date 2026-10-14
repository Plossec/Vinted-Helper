// Listes de référence (lieux, marques) : renommage, fusion et nombre d'articles (#130 : module jusqu'ici non testé).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

type Valeur = { id: string; nom: string; estMaison?: boolean; nombreArticles?: number };

describe("listes de référence", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    t = { ...base, cookie: await seConnecter(base.app) };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const refs = async () => (await requete("GET", "/api/referentiels")).json<{ lieux: Valeur[]; marques: Valeur[] }>();
  const ajouter = async (type: "lieux" | "marques", nom: string) =>
    (await requete("POST", `/api/referentiels/${type}`, { nom })).json<Valeur>();
  const creerArticle = async (lieuId: string, marqueId: string) =>
    requete("POST", "/api/articles", {
      nom: "Jean",
      lieuId,
      prixAchat: 300,
      dateAchat: "2026-10-04",
      categorie: "hommes/vetements/jeans/jeans-droits",
      marqueId,
      etat: "bon_etat",
    });

  it("renommer : le nouveau nom s'affiche ; un nom déjà pris est refusé (proposer la fusion)", async () => {
    const levis = await ajouter("marques", "Levis");
    expect((await requete("PUT", `/api/referentiels/marques/${levis.id}`, { nom: "Levi's 501" })).statusCode).toBe(200);
    expect((await refs()).marques.some((m) => m.nom === "Levi's 501")).toBe(true);
    const doublon = await requete("PUT", `/api/referentiels/marques/${levis.id}`, { nom: "levi's" });
    expect(doublon.statusCode).toBe(409);
    expect(doublon.json<{ erreur: string }>().erreur).toMatch(/Fusionner/);
    expect((await requete("PUT", `/api/referentiels/marques/${levis.id}`, { nom: "  " })).statusCode).toBe(400);
  });

  it("fusionner deux marques : les articles passent sur la marque conservée, l'autre disparaît", async () => {
    const r = await refs();
    const lieuId = r.lieux.find((l) => !l.estMaison)?.id ?? "";
    const levis = await ajouter("marques", "Levis");
    const cible = r.marques.find((m) => m.nom === "Levi's")?.id ?? "";
    expect((await creerArticle(lieuId, levis.id)).statusCode).toBe(201);
    const fusion = await requete("POST", `/api/referentiels/marques/${levis.id}/fusion`, { cibleId: cible });
    expect(fusion.statusCode).toBe(200);
    const usage = (await requete("GET", "/api/referentiels/marques")).json<Valeur[]>();
    expect(usage.some((m) => m.id === levis.id)).toBe(false);
    expect(usage.find((m) => m.id === cible)?.nombreArticles).toBe(1);
  });

  it("fusionner des lieux : articles déplacés ; le lieu « Maison » ne se fusionne pas ; deux valeurs distinctes", async () => {
    const r = await refs();
    const maison = r.lieux.find((l) => l.estMaison)?.id ?? "";
    const autre = r.lieux.find((l) => !l.estMaison)?.id ?? "";
    const marqueId = r.marques[0]?.id ?? "";
    const brocante = await ajouter("lieux", "Brocante du dimanche");
    await creerArticle(brocante.id, marqueId);
    expect(
      (await requete("POST", `/api/referentiels/lieux/${brocante.id}/fusion`, { cibleId: autre })).statusCode,
    ).toBe(200);
    expect(
      (await requete("GET", "/api/referentiels/lieux")).json<Valeur[]>().find((l) => l.id === autre)?.nombreArticles,
    ).toBe(1);
    const refusMaison = await requete("POST", `/api/referentiels/lieux/${maison}/fusion`, { cibleId: autre });
    expect(refusMaison.statusCode).toBe(409);
    expect((await requete("POST", `/api/referentiels/lieux/${autre}/fusion`, { cibleId: autre })).statusCode).toBe(400);
  });

  it("liste inconnue : 404", async () => {
    expect((await requete("POST", "/api/referentiels/couleurs", { nom: "Rouge" })).statusCode).toBe(404);
  });
});
