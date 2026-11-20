// Corbeille en lot (#286, ADR-0121) : plusieurs articles mis à la corbeille ou restaurés d'un coup ; articles vendus
// laissés de côté.
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

describe("corbeille en lot", () => {
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
  const creer = async () => {
    const r = await requete("POST", "/api/articles", {
      nom: "Pull",
      lieuId,
      prixAchat: 200,
      dateAchat: "2026-11-01",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      marqueId,
      etat: "bon_etat",
    });
    expect(r.statusCode, r.body).toBe(201);
    return r.json<{ id: string; reference: number }>();
  };
  const listeIds = async () => (await requete("GET", "/api/articles")).json<{ id: string }[]>().map((a) => a.id);

  it("met à la corbeille les articles choisis, sauf les vendus ; puis les restaure d'un coup", async () => {
    const [a, b, vendu, autre] = [await creer(), await creer(), await creer(), await creer()];
    await requete("POST", `/api/articles/${vendu.id}/statut`, { vers: "en_ligne", prixAffiche: 900 });
    expect((await requete("POST", "/api/ventes", { articleIds: [vendu.id], montantCredite: 900 })).statusCode).toBe(
      201,
    );

    const r = await requete("POST", "/api/articles/corbeille", { ids: [a.id, b.id, vendu.id, randomUUID()] });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toEqual({ traites: 2, ignores: [vendu.reference] });
    expect((await listeIds()).sort()).toEqual([vendu.id, autre.id].sort());
    const corbeille = (await requete("GET", "/api/corbeille")).json<{ id: string }[]>();
    expect(corbeille.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());

    const restauration = await requete("POST", "/api/corbeille/restauration", { ids: [a.id, b.id] });
    expect(restauration.json()).toEqual({ traites: 2, ignores: [] });
    expect((await listeIds()).sort()).toEqual([a.id, b.id, vendu.id, autre.id].sort());
  });

  it("refus : liste vide ou absente, identifiant invalide", async () => {
    expect((await requete("POST", "/api/articles/corbeille", { ids: [] })).statusCode).toBe(400);
    expect((await requete("POST", "/api/articles/corbeille", {})).statusCode).toBe(400);
    expect((await requete("POST", "/api/corbeille/restauration", { ids: ["pas-un-uuid"] })).statusCode).toBe(400);
  });
});
