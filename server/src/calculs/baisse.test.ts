// Tâche « Articles dormants » (#147, ADR-0073) : nouveau prix d'un article dormant, ou republication.
import { describe, expect, it } from "vitest";
import { actionDormant, regleApplicable } from "./baisse.js";

const pourcent = (valeur: number) => ({ type: "pourcentage" as const, valeur });
const montant = (valeur: number) => ({ type: "montant" as const, valeur });

describe("prix d'un article dormant", () => {
  it("11 € − 10 % = 9,90 € → arrondi vers le haut au 0,50 € : 10 €", () => {
    expect(actionDormant(1100, pourcent(10), 500)).toEqual({ type: "baisse", prix: 1000 });
  });

  it("arrondi qui redonne le prix actuel : baisse de 0,50 € (10 € − 2 % = 9,80 € → 10 € → 9,50 €)", () => {
    expect(actionDormant(1000, pourcent(2), 500)).toEqual({ type: "baisse", prix: 950 });
  });

  it("jamais sous le prix vente minimum : 10 € − 10 % = 9 €, minimum 9,80 € → 9,80 €", () => {
    expect(actionDormant(1000, pourcent(10), 980)).toEqual({ type: "baisse", prix: 980 });
  });

  it("montant fixe : 10 € − 1,20 € = 8,80 € → 9 €", () => {
    expect(actionDormant(1000, montant(120), 500)).toEqual({ type: "baisse", prix: 900 });
  });

  it("prix déjà au minimum → republication, le prix n'est pas touché", () => {
    expect(actionDormant(980, pourcent(10), 980)).toEqual({ type: "republication" });
  });

  it("sans prix vente minimum → republication seulement", () => {
    expect(actionDormant(1000, pourcent(10), null)).toEqual({ type: "republication" });
  });

  it("« ne pas baisser le prix » → republication seulement", () => {
    expect(actionDormant(1000, null, 500)).toEqual({ type: "republication" });
  });

  it("un prix entier ou le minimum : jamais à zéro", () => {
    expect(actionDormant(50, pourcent(90), 0)).toEqual({ type: "republication" });
  });

  it("refuse un montant à virgule", () => {
    expect(() => actionDormant(10.5, pourcent(10), 500)).toThrow();
  });
});

describe("règle de baisse applicable", () => {
  const compte = pourcent(10);
  it("« selon le réglage du compte » → règle du compte", () => {
    expect(regleApplicable({ regle: "compte", valeur: null }, compte)).toEqual(compte);
  });
  it("règle de l'article : elle prime", () => {
    expect(regleApplicable({ regle: "montant", valeur: 200 }, compte)).toEqual(montant(200));
    expect(regleApplicable({ regle: "pourcentage", valeur: 5 }, compte)).toEqual(pourcent(5));
  });
  it("« ne pas baisser » → aucune règle", () => {
    expect(regleApplicable({ regle: "aucune", valeur: null }, compte)).toBeNull();
  });
  it("règle de l'article sans valeur → règle du compte", () => {
    expect(regleApplicable({ regle: "montant", valeur: null }, compte)).toEqual(compte);
  });
});
