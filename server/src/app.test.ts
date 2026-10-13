// Tests de la route /api/sante et du contrôle de connexion de toute l'API.
import type { RouteOptions } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerApp, ROUTES_PUBLIQUES } from "./app.js";
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

describe("Contrôle de connexion (issue #118)", () => {
  let base: Awaited<ReturnType<typeof creerBaseDeTest>>;
  beforeAll(async () => {
    base = await creerBaseDeTest();
  });
  afterAll(() => base.fermer());

  const ID = "00000000-0000-4000-8000-000000000000";

  it("toutes les routes de l'API répondent 401 sans connexion, y compris avec une adresse encodée", async () => {
    const routes: { methode: string; url: string }[] = [];
    const app = await creerApp({
      version: "0.0.1",
      base: base.base,
      verifierBase: async () => true,
      dossierPhotos: "/inexistant",
      surRoute: (route: RouteOptions) => {
        if (!route.url.startsWith("/api/") || ROUTES_PUBLIQUES.has(route.url)) return;
        for (const methode of [route.method].flat()) {
          if (methode !== "HEAD") routes.push({ methode, url: route.url.replace(/:[A-Za-z]+/g, ID) });
        }
      },
    });
    expect(routes.length).toBeGreaterThan(40);
    expect(routes).toContainEqual({ methode: "GET", url: "/api/prompts/defaut" });
    for (const { methode, url } of routes) {
      for (const adresse of [url, url.replace("/api/", "/%61pi/"), url.replace("/api/", "/ap%69/")]) {
        const reponse = await app.inject({ method: methode as "GET", url: adresse });
        expect({ methode, adresse, statut: reponse.statusCode }).toEqual({ methode, adresse, statut: 401 });
      }
    }
  });

  it("les routes publiques restent accessibles, même avec une adresse encodée", async () => {
    const app = await creerApp({
      version: "0.0.1",
      base: base.base,
      verifierBase: async () => true,
      dossierPhotos: "/inexistant",
    });
    expect((await app.inject({ method: "GET", url: "/%61pi/sante" })).statusCode).toBe(200);
  });
});
