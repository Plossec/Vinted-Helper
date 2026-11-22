// Prix affiché proposé par l'IA (#276) : lu sans calcul à virgule, arrondi au 0,50 € au-dessus, refusé s'il est absurde.
import { describe, expect, it } from "vitest";
import { conseilPrixHistorique, prixPropose } from "./prix-propose.js";

describe("prix proposé par l'IA", () => {
  it("lit un nombre ou un texte en euros (virgule ou point)", () => {
    expect(prixPropose(12)).toBe(1200);
    expect(prixPropose("12,5")).toBe(1250);
    expect(prixPropose("9.90 €")).toBe(1000);
    expect(prixPropose(7.25)).toBe(750);
  });

  it("arrondi vers le haut au 0,50 € (comme les baisses des articles dormants)", () => {
    expect(prixPropose("10,01")).toBe(1050);
    expect(prixPropose("10,50")).toBe(1050);
  });

  it("rien d'utilisable → null (à saisir à la main)", () => {
    expect(prixPropose(null)).toBeNull();
    expect(prixPropose("")).toBeNull();
    expect(prixPropose("gratuit")).toBeNull();
    expect(prixPropose(0)).toBeNull();
    expect(prixPropose(-5)).toBeNull();
    expect(prixPropose(100_001)).toBeNull();
  });
});

describe("conseil de prix historique", () => {
  it("ne conseille rien avant 10 ventes comparables", () => {
    expect(conseilPrixHistorique([900, 1000, 1100], 800)).toBeNull();
  });

  it("retient la médiane arrondie au demi-euro au-dessus", () => {
    const ventes = [800, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300];
    expect(conseilPrixHistorique(ventes, 1000)).toBe(1100);
  });

  it("ne descend jamais sous le prix vente minimum", () => {
    const ventes = [800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250];
    expect(conseilPrixHistorique(ventes, 1200)).toBe(1200);
  });
});
