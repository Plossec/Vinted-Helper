// Écran d'ouverture de l'application installée (#191).
import { describe, expect, it } from "vitest";
import { cheminDemarrage, normaliserDemarrage } from "./demarrage.js";

describe("écran de démarrage", () => {
  it("Terrain par défaut (valeur absente ou inconnue)", () => {
    expect(normaliserDemarrage(null)).toBe("terrain");
    expect(normaliserDemarrage("autre")).toBe("terrain");
    expect(normaliserDemarrage("a-faire")).toBe("a-faire");
  });

  it("adresse de chaque choix", () => {
    expect(cheminDemarrage("terrain")).toBe("/terrain");
    expect(cheminDemarrage("a-faire")).toBe("/");
  });
});
