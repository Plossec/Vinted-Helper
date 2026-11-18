// Validation des dates et heures reçues par l'API (issue #134).
import { describe, expect, it } from "vitest";
import { horodatageFacultatif } from "./validation.js";

describe("horodatageFacultatif", () => {
  it("accepte une date ISO, avec ou sans heure et fuseau", () => {
    expect(horodatageFacultatif("2026-10-05T14:30:00.000Z", "Date")?.toISOString()).toBe("2026-10-05T14:30:00.000Z");
    expect(horodatageFacultatif("2026-10-05T16:30:00+02:00", "Date")?.toISOString()).toBe("2026-10-05T14:30:00.000Z");
    expect(horodatageFacultatif("2026-10-05", "Date")?.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("vide → aucune date", () => {
    expect(horodatageFacultatif(undefined, "Date")).toBeNull();
    expect(horodatageFacultatif("", "Date")).toBeNull();
  });

  it("refuse ce que new Date() accepte mais qui n'est pas une date précise", () => {
    for (const valeur of ["2026", "5 oct. 2026", "10/05/2026", "2026-13-45T00:00:00Z", 1_760_000_000_000]) {
      expect(() => horodatageFacultatif(valeur, "Date"), String(valeur)).toThrow("Date : date invalide.");
    }
  });
});
