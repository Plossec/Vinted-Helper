// Tâche « Articles dormants » (#147, ADR-0073, ADR-0113) : prix de la republication avec baisse, ou rien.
import { describe, expect, it } from "vitest";
import { prixRepublication, regleApplicable } from "./baisse.js";

const pourcent = (valeur: number) => ({ type: "pourcentage" as const, valeur });
const montant = (valeur: number) => ({ type: "montant" as const, valeur });

describe("prix d'un article dormant", () => {
  it("11 € − 10 % = 9,90 € → arrondi vers le haut au 0,50 € : 10 €", () => {
    expect(prixRepublication(1100, pourcent(10), 500)).toBe(1000);
  });

  it("arrondi qui redonne le prix actuel : baisse de 0,50 € (10 € − 2 % = 9,80 € → 10 € → 9,50 €)", () => {
    expect(prixRepublication(1000, pourcent(2), 500)).toBe(950);
  });

  it("jamais sous le prix vente minimum : 10 € − 10 % = 9 €, minimum 9,80 € → 9,80 €", () => {
    expect(prixRepublication(1000, pourcent(10), 980)).toBe(980);
  });

  it("montant fixe : 10 € − 1,20 € = 8,80 € → 9 €", () => {
    expect(prixRepublication(1000, montant(120), 500)).toBe(900);
  });

  it("prix déjà au minimum → rien (ni baisse ni republication)", () => {
    expect(prixRepublication(980, pourcent(10), 980)).toBeNull();
  });

  it("sans prix vente minimum → rien (pas de plancher connu)", () => {
    expect(prixRepublication(1000, pourcent(10), null)).toBeNull();
  });

  it("« ne pas baisser le prix » → rien", () => {
    expect(prixRepublication(1000, null, 500)).toBeNull();
  });

  it("jamais à zéro : sinon rien", () => {
    expect(prixRepublication(50, pourcent(90), 0)).toBeNull();
  });

  it("refuse un montant à virgule", () => {
    expect(() => prixRepublication(10.5, pourcent(10), 500)).toThrow();
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
