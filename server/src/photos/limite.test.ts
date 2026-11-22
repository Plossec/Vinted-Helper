// Limite du nombre de demandes de photos (#303, alerte CodeQL « Missing rate limiting ») : 429 au-delà du plafond par
// minute, par utilisateur.
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { LIMITE_PHOTOS_PAR_MINUTE } from "./routes.js";

describe("limite des demandes de photos", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;
  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
  });
  afterEach(async () => {
    await t.fermer();
  });

  it(`${LIMITE_PHOTOS_PAR_MINUTE} demandes par minute au plus, puis 429 avec un message en français`, async () => {
    const id = randomUUID();
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#336699" } })
      .jpeg()
      .toBuffer();
    const envoi = await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=annonce`,
      headers: { cookie, "content-type": "image/jpeg" },
      payload: image,
    });
    expect(envoi.statusCode, envoi.body).toBe(200);
    const lire = () => t.app.inject({ method: "GET", url: `/api/photos/${id}/vignette`, headers: { cookie } });
    for (let i = 0; i < LIMITE_PHOTOS_PAR_MINUTE; i++) {
      const r = await lire();
      if (r.statusCode !== 200) throw new Error(`Demande ${i + 1} refusée trop tôt : ${r.statusCode}`);
    }
    const refus = await lire();
    expect(refus.statusCode).toBe(429);
    expect(refus.json()).toEqual({ erreur: "Trop de demandes de photos : réessayez dans une minute." });
    // Une demande anonyme est refusée avant, par le contrôle de connexion.
    expect((await t.app.inject({ method: "GET", url: `/api/photos/${id}` })).statusCode).toBe(401);
  }, 60_000);
});
