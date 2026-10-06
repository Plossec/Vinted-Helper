// Réduction des photos (§5.10) au passage Finalisé / Sortie du stock.
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { utilisateur } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

describe("réduction des photos", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; dossier: string; sortieId: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const [u] = await base.base.select({ id: utilisateur.id }).from(utilisateur);
    const refs = (await base.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
    }>();
    const sortieId = randomUUID();
    await base.app.inject({
      method: "POST",
      url: "/api/sorties",
      headers: { cookie },
      payload: { id: sortieId, date: "2026-10-01", lieuId: refs.lieux[0]?.id },
    });
    t = { ...base, cookie, dossier: join(base.dossierPhotos, u?.id ?? ""), sortieId };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });

  async function envoyer(type: "terrain" | "annonce") {
    const id = randomUUID();
    const image = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#884422" } })
      .png()
      .toBuffer();
    await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=${type}`,
      headers: { cookie: t.cookie, "content-type": "image/png" },
      payload: image,
    });
    return id;
  }

  const largeur = async (photoId: string) =>
    (await sharp((await requete("GET", `/api/photos/${photoId}`)).rawPayload).metadata()).width;

  it("sortie du stock : principale et terrain gardées et réduites, autres photos supprimées", async () => {
    const terrain = await envoyer("terrain");
    const [articleId] = [randomUUID()];
    await requete("POST", "/api/achats", {
      id: randomUUID(),
      articleIds: [articleId],
      sortieId: t.sortieId,
      prixTotal: 200,
      photoId: terrain,
      date: "2026-10-01",
    });
    const p1 = await envoyer("annonce");
    const p2 = await envoyer("annonce");
    for (const photoId of [p1, p2]) await requete("POST", `/api/articles/${articleId}/photos`, { photoId });
    const r = await requete("POST", `/api/articles/${articleId}/sortie-stock`, { motif: "donne" });
    expect(r.statusCode, r.body).toBe(200);
    expect(
      r
        .json<{ photos: { id: string }[] }>()
        .photos.map((p) => p.id)
        .sort(),
    ).toEqual([terrain, p1].sort());
    expect(await largeur(p1)).toBe(1600);
    expect(await largeur(terrain)).toBe(1600);
    expect((await requete("GET", `/api/photos/${p2}`)).statusCode).toBe(404);
    expect(readdirSync(t.dossier).some((f) => f.startsWith(p2))).toBe(false);
  });

  it("photo terrain partagée : réduite seulement quand tous les articles du lot sont finalisés ou sortis", async () => {
    const terrain = await envoyer("terrain");
    const ids = [randomUUID(), randomUUID()];
    await requete("POST", "/api/achats", {
      id: randomUUID(),
      articleIds: ids,
      sortieId: t.sortieId,
      prixTotal: 400,
      photoId: terrain,
      date: "2026-10-01",
    });
    await requete("POST", `/api/articles/${ids[0] ?? ""}/sortie-stock`, { motif: "jete" });
    expect(await largeur(terrain)).toBe(3000);
    await requete("POST", `/api/articles/${ids[1] ?? ""}/sortie-stock`, { motif: "jete" });
    expect(await largeur(terrain)).toBe(1600);
  });
});
