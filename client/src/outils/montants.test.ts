import { describe, expect, it } from "vitest";
import { centimesVersSaisie, formatEuros, lireMontant } from "./montants.js";

// Intl utilise des espaces insécables : on les normalise pour comparer.
const normaliser = (texte: string) => texte.replace(/[\u00a0\u202f]/g, " ");

describe("formatEuros", () => {
  it.each([
    [333, "3,33 €"],
    [0, "0,00 €"],
    [120000, "1 200,00 €"],
  ])("%i centimes → %s", (centimes, attendu) => {
    expect(normaliser(formatEuros(centimes))).toBe(attendu);
  });
});

describe("lireMontant : virgule ou point acceptés, résultat en centimes entiers", () => {
  it.each([
    ["3,50", 350],
    ["3.50", 350],
    ["3,5", 350],
    ["3", 300],
    ["0,08", 8],
    [" 12,00 € ", 1200],
    ["1 200,00", 120000],
    ["0,1", 10],
  ])("« %s » → %i", (saisie, attendu) => {
    expect(lireMontant(saisie)).toBe(attendu);
  });

  it("champ vide → null", () => {
    expect(lireMontant("  ")).toBeNull();
  });

  it.each(["abc", "3,505", "-2", "3,,5", "1e3"])("« %s » → invalide", (saisie) => {
    expect(lireMontant(saisie)).toBe("invalide");
  });
});

describe("centimesVersSaisie", () => {
  it.each([
    [350, "3,50"],
    [8, "0,08"],
    [1200, "12,00"],
  ])("%i → « %s »", (centimes, attendu) => {
    expect(centimesVersSaisie(centimes)).toBe(attendu);
  });

  it("null → champ vide", () => {
    expect(centimesVersSaisie(null)).toBe("");
  });
});
