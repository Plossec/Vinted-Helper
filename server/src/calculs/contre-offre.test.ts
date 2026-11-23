import { describe, expect, it } from "vitest";
import { contreOffreMiChemin } from "./contre-offre.js";

describe("contre-offre à mi-chemin (ADR-0076)", () => {
  it("milieu entre l'offre et le prix affiché, arrondi vers le haut au 0,50 €", () => {
    expect(contreOffreMiChemin(600, 1100, 500)).toBe(850);
    expect(contreOffreMiChemin(610, 1100, 500)).toBe(900);
  });

  it("jamais sous le prix vente minimum", () => {
    expect(contreOffreMiChemin(100, 900, 800)).toBe(800);
  });

  it("jamais au-dessus du prix affiché", () => {
    expect(contreOffreMiChemin(1090, 1100, 500)).toBe(1100);
  });
});
