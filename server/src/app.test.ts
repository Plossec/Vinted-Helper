// Tests de la route /api/sante.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerApp } from "./app.js";
import { creerBaseDeTest } from "./test/outils.js";

describe("GET /api/sante (accessible sans connexion)", () => {
  let base: Awaited<ReturnType<typeof creerBaseDeTest>>;
  beforeAll(async () => {
    base = await creerBaseDeTest();
  });
  afterAll(() => base.fermer());

  it("indique la version et une base connectée", async () => {
    const app = await creerApp({
      version: "0.0.1",
      base: base.base,
      verifierBase: async () => true,
      dossierPhotos: "/inexistant",
    });
    const reponse = await app.inject({ method: "GET", url: "/api/sante" });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toEqual({ application: "Vinted Helper", version: "0.0.1", base: "connectée" });
  });

  it("indique une base indisponible quand elle ne répond pas", async () => {
    const app = await creerApp({
      version: "0.0.1",
      base: base.base,
      verifierBase: async () => false,
      dossierPhotos: "/inexistant",
    });
    const reponse = await app.inject({ method: "GET", url: "/api/sante" });
    expect(reponse.json()).toMatchObject({ base: "indisponible" });
  });
});
