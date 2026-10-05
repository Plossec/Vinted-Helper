// Tests de la route /api/sante (sans vraie base : la vérification est simulée).
import { describe, expect, it } from "vitest";
import { creerApp } from "./app.js";

describe("GET /api/sante", () => {
  it("indique la version et une base connectée", async () => {
    const app = creerApp({ version: "0.0.1", verifierBase: async () => true });
    const reponse = await app.inject({ method: "GET", url: "/api/sante" });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toEqual({ application: "Vinted Helper", version: "0.0.1", base: "connectée" });
  });

  it("indique une base indisponible quand elle ne répond pas", async () => {
    const app = creerApp({ version: "0.0.1", verifierBase: async () => false });
    const reponse = await app.inject({ method: "GET", url: "/api/sante" });
    expect(reponse.json()).toMatchObject({ base: "indisponible" });
  });
});
