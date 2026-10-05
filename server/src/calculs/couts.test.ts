// Prix d'achat des lots (§6.1) et essence des sorties (§6.2), y compris l'ordre « dernier = reste ».
import { describe, expect, it } from "vitest";
import { type ArticlePourCout, essenceParArticle, essenceSortiesVides, prixAchatParArticle } from "./couts.js";

const art = (reference: number, extra: Partial<ArticlePourCout> = {}): ArticlePourCout => ({
  id: `a${reference}`,
  reference,
  sortieId: null,
  lotId: null,
  prixAchat: null,
  ...extra,
});
const valeurs = (m: Map<string, number>, ids: string[]) => ids.map((id) => m.get(id));

describe("prixAchatParArticle", () => {
  it("article seul : prix saisi ; absent → 0", () => {
    const m = prixAchatParArticle([art(1, { prixAchat: 250 }), art(2)], []);
    expect(valeurs(m, ["a1", "a2"])).toEqual([250, 0]);
  });

  it("lot : le prix saisi sur un article du lot est ignoré, le reste va à la plus grande référence", () => {
    const articles = [art(7, { lotId: "L" }), art(5, { lotId: "L", prixAchat: 999 }), art(6, { lotId: "L" })];
    const m = prixAchatParArticle(articles, [{ id: "L", prixTotal: 1000 }]);
    expect(valeurs(m, ["a5", "a6", "a7"])).toEqual([333, 333, 334]);
  });

  it("deux lots indépendants", () => {
    const articles = [art(1, { lotId: "A" }), art(2, { lotId: "A" }), art(3, { lotId: "B" })];
    const m = prixAchatParArticle(articles, [
      { id: "A", prixTotal: 1500 },
      { id: "B", prixTotal: 200 },
    ]);
    expect(valeurs(m, ["a1", "a2", "a3"])).toEqual([750, 750, 200]);
  });
});

describe("essenceParArticle", () => {
  it("article sans sortie (Maison) → 0", () => {
    expect(essenceParArticle([art(1)], []).get("a1")).toBe(0);
  });

  it("chaque sortie est répartie sur ses propres articles", () => {
    const articles = [art(1, { sortieId: "S1" }), art(2, { sortieId: "S1" }), art(3, { sortieId: "S2" })];
    const m = essenceParArticle(articles, [
      { id: "S1", montantEssence: 101 },
      { id: "S2", montantEssence: 50 },
    ]);
    expect(valeurs(m, ["a1", "a2", "a3"])).toEqual([50, 51, 50]);
  });
});

describe("essenceSortiesVides", () => {
  it("seules les sorties sans article sont comptées", () => {
    const m = essenceSortiesVides(
      [art(1, { sortieId: "S1" })],
      [
        { id: "S1", montantEssence: 200 },
        { id: "S2", montantEssence: 130 },
      ],
    );
    expect([...m]).toEqual([["S2", 130]]);
  });
});
