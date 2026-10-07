// Rotation des photos (issue #35) et revalidation du cache des images.
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

describe("rotation des photos", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;

  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
  });
  afterEach(async () => {
    await t.fermer();
  });

  async function envoyerPhoto(format: "jpeg" | "png" = "jpeg") {
    const id = randomUUID();
    const image = sharp({ create: { width: 64, height: 48, channels: 3, background: "#0b7a75" } });
    const r = await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=annonce`,
      headers: { cookie, "content-type": `image/${format}` },
      payload: await (format === "png" ? image.png() : image.jpeg()).toBuffer(),
    });
    expect(r.statusCode).toBe(200);
    return id;
  }

  const lire = (url: string, entetes: Record<string, string> = {}) =>
    t.app.inject({ method: "GET", url, headers: { cookie, ...entetes } });
  const pivoter = (id: string, sens: string) =>
    t.app.inject({ method: "POST", url: `/api/photos/${id}/rotation`, headers: { cookie }, payload: { sens } });
  const dimensions = async (url: string) => {
    const { width, height } = await sharp((await lire(url)).rawPayload).metadata();
    return [width, height];
  };

  it("tourne la photo et sa vignette d'un quart de tour, dans les deux sens", async () => {
    const id = await envoyerPhoto();
    expect(await dimensions(`/api/photos/${id}`)).toEqual([64, 48]);

    expect((await pivoter(id, "droite")).statusCode).toBe(200);
    expect(await dimensions(`/api/photos/${id}`)).toEqual([48, 64]);
    const vignette = await sharp((await lire(`/api/photos/${id}/vignette`)).rawPayload).metadata();
    expect(vignette.format).toBe("webp");

    await pivoter(id, "gauche");
    expect(await dimensions(`/api/photos/${id}`)).toEqual([64, 48]);
  });

  it("tient compte de l'orientation enregistrée par l'appareil photo (EXIF)", async () => {
    const id = randomUUID();
    // Image stockée 64×48 mais marquée « à tourner de 90° » (orientation 6) : elle s'affiche en 48×64.
    const contenu = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#0b7a75" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=annonce`,
      headers: { cookie, "content-type": "image/jpeg" },
      payload: contenu,
    });
    await pivoter(id, "droite");
    expect(await dimensions(`/api/photos/${id}`)).toEqual([64, 48]);
    const vignette = await sharp((await lire(`/api/photos/${id}/vignette`)).rawPayload).metadata();
    expect([vignette.width, vignette.height]).toEqual([400, 400]);
  });

  it("une photo PNG devient un JPEG tourné", async () => {
    const id = await envoyerPhoto("png");
    await pivoter(id, "droite");
    const r = await lire(`/api/photos/${id}`);
    expect(r.headers["content-type"]).toBe("image/jpeg");
    expect(await dimensions(`/api/photos/${id}`)).toEqual([48, 64]);
  });

  it("le navigateur revérifie l'image : 304 tant qu'elle n'a pas changé", async () => {
    const id = await envoyerPhoto();
    const premiere = await lire(`/api/photos/${id}`);
    expect(premiere.headers["cache-control"]).toBe("private, no-cache");
    const empreinte = String(premiere.headers.etag);
    expect((await lire(`/api/photos/${id}`, { "if-none-match": empreinte })).statusCode).toBe(304);
  });

  it("refuse un sens inconnu ou la photo d'un autre", async () => {
    const id = await envoyerPhoto();
    expect((await pivoter(id, "haut")).statusCode).toBe(400);
    expect((await pivoter(randomUUID(), "droite")).statusCode).toBe(404);
  });
});
