// Tests complémentaires de la fonction de répartition (cas limites et invariants).
import { describe, expect, it } from "vitest";
import { repartir } from "./repartir.js";

const somme = (valeurs: readonly number[]) => valeurs.reduce((a, b) => a + b, 0);

describe("repartir — cas limites", () => {
  it("aucun élément → liste vide", () => {
    expect(repartir(200, [])).toEqual([]);
  });

  it("un seul élément → il reçoit tout le total", () => {
    expect(repartir(1234, [7])).toEqual([1234]);
  });

  it("total nul → toutes les parts à 0", () => {
    expect(repartir(0, [1, 1, 1])).toEqual([0, 0, 0]);
  });

  it("poids tous nuls → bascule en parts égales", () => {
    expect(repartir(1000, [0, 0, 0])).toEqual([333, 333, 334]);
  });

  it("un poids nul parmi d'autres → part nulle pour cet élément (hors dernier)", () => {
    expect(repartir(1000, [0, 500, 500])).toEqual([0, 500, 500]);
  });
});

describe("repartir — arrondi vers le bas, le reste sur le dernier (jamais de part négative)", () => {
  it("5 centimes sur 8 articles → 0 × 7 puis 5", () => {
    expect(repartir(5, Array<number>(8).fill(1))).toEqual([0, 0, 0, 0, 0, 0, 0, 5]);
  });

  it("65 centimes sur 10 articles → 6 × 9 puis 11", () => {
    expect(repartir(65, Array<number>(10).fill(1))).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 11]);
  });

  it("au prorata : 10 centimes selon des poids 1 / 1 / 1 → 3 / 3 / 4", () => {
    expect(repartir(10, [100, 100, 100])).toEqual([3, 3, 4]);
  });

  it("aucune part n'est jamais négative", () => {
    for (let total = 0; total <= 300; total++) {
      for (let nombre = 1; nombre <= 12; nombre++) {
        const parts = repartir(total, Array<number>(nombre).fill(1));
        expect(Math.min(...parts)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("repartir — invariant : la somme des parts vaut toujours exactement le total", () => {
  const cas: [number, number[]][] = [
    [1000, [1, 1, 1]],
    [8, [1, 1, 1]],
    [1200, [900, 600]],
    [999, [123, 456, 789, 1]],
    [1, [1, 1]],
    [130, [1, 1, 1, 1, 1, 1, 1]],
  ];
  it.each(cas)("total %i réparti sur %j", (total, poids) => {
    expect(somme(repartir(total, poids))).toBe(total);
  });
});

describe("repartir — refuse les montants qui ne sont pas des centimes entiers", () => {
  it("total à virgule", () => {
    expect(() => repartir(10.5, [1, 1])).toThrow(/centimes entiers/);
  });

  it("total négatif", () => {
    expect(() => repartir(-100, [1, 1])).toThrow(/positif/);
  });

  it("poids à virgule", () => {
    expect(() => repartir(100, [1.5, 1])).toThrow(/entiers/);
  });

  it("poids négatif", () => {
    expect(() => repartir(100, [-1, 1])).toThrow(/positifs/);
  });
});
