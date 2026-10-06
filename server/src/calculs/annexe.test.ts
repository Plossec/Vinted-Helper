// Cas chiffrés de l'annexe §11 du cahier des charges.
// RÈGLE : ne jamais modifier un résultat attendu pour faire passer un test.
// Si un cas semble faux, s'arrêter et poser la question à l'utilisateur.
//
// Lot 0 : uniquement les cas qui relèvent de la règle d'arrondi (répartition).
// Les autres cas (bénéfice, indicateurs, statuts…) sont ajoutés avec le lot qui les implémente.
// Tous les montants sont en centimes.
import { describe, expect, it } from "vitest";
import { type ArticlePourCout, essenceParArticle, essenceSortiesVides, prixAchatParArticle } from "./couts.js";
import { repartir } from "./repartir.js";

/** Parts égales : N éléments de même poids. */
const egal = (total: number, nombre: number) => repartir(total, Array<number>(nombre).fill(1));

describe("Annexe §11 — règle d'arrondi", () => {
  it("cas 01 — lot de 3 articles pour 10 € → 3,33 / 3,33 / 3,34", () => {
    expect(egal(1000, 3)).toEqual([333, 333, 334]);
  });

  it("cas 02 — lot de 3 articles pour 5 € → 1,66 / 1,66 / 1,68", () => {
    expect(egal(500, 3)).toEqual([166, 166, 168]);
  });

  it("cas 03 — total du lot n°1 corrigé à 12 € → 4,00 / 4,00 / 4,00", () => {
    expect(egal(1200, 3)).toEqual([400, 400, 400]);
  });

  it("cas 04 — essence 2 € sur une sortie de 5 articles → 0,40 € chacun", () => {
    expect(egal(200, 5)).toEqual([40, 40, 40, 40, 40]);
  });

  it("cas 05 — essence 2 € sur 3 articles → 0,66 / 0,66 / 0,68", () => {
    expect(egal(200, 3)).toEqual([66, 66, 68]);
  });

  it("cas 06 — essence 2 € sur 4 articles, puis ajout d'un 5e → 0,50 € puis 0,40 € chacun", () => {
    expect(egal(200, 4)).toEqual([50, 50, 50, 50]);
    expect(egal(200, 5)).toEqual([40, 40, 40, 40, 40]);
  });

  it("cas 09 (répartition) — A affiché 9 €, B affiché 6 €, crédité 12 €, colis 0,08 € → 7,20 / 4,80 et 0,04 / 0,04", () => {
    expect(repartir(1200, [900, 600])).toEqual([720, 480]);
    expect(egal(8, 2)).toEqual([4, 4]);
  });

  it("cas 11 — 3 articles affichés 5 € chacun, crédité 10 € → 3,33 / 3,33 / 3,34", () => {
    expect(repartir(1000, [500, 500, 500])).toEqual([333, 333, 334]);
  });

  it("cas 12 — colis de 3 articles, emballage 0,08 € → 0,02 / 0,02 / 0,04", () => {
    expect(egal(8, 3)).toEqual([2, 2, 4]);
  });

  it("cas 23 — lot de 3 articles pour 10 €, un article supprimé → total conservé : 5,00 / 5,00", () => {
    expect(egal(1000, 2)).toEqual([500, 500]);
  });
});

// Lot 2 : les mêmes cas, calculés à partir des données (lots et sorties), comme dans l'application.
const articles = (nombre: number, extra: Partial<ArticlePourCout>): ArticlePourCout[] =>
  Array.from({ length: nombre }, (_, i) => ({
    id: `a${i + 1}`,
    reference: i + 1,
    sortieId: null,
    lotId: null,
    prixAchat: null,
    ...extra,
  }));
const parts = (m: Map<string, number>) => [...m.values()];

describe("Annexe §11 — lots et essence à partir des données", () => {
  it("cas 01 — lot de 3 articles pour 10 € → 3,33 / 3,33 / 3,34", () => {
    expect(parts(prixAchatParArticle(articles(3, { lotId: "L" }), [{ id: "L", prixTotal: 1000 }]))).toEqual([
      333, 333, 334,
    ]);
  });

  it("cas 02 — lot de 3 articles pour 5 € → 1,66 / 1,66 / 1,68", () => {
    expect(parts(prixAchatParArticle(articles(3, { lotId: "L" }), [{ id: "L", prixTotal: 500 }]))).toEqual([
      166, 166, 168,
    ]);
  });

  it("cas 03 — total du lot n°1 corrigé à 12 € → 4,00 / 4,00 / 4,00", () => {
    expect(parts(prixAchatParArticle(articles(3, { lotId: "L" }), [{ id: "L", prixTotal: 1200 }]))).toEqual([
      400, 400, 400,
    ]);
  });

  it("cas 04 — essence 2 € sur une sortie de 5 articles → 0,40 € chacun", () => {
    expect(parts(essenceParArticle(articles(5, { sortieId: "S" }), [{ id: "S", montantEssence: 200 }]))).toEqual([
      40, 40, 40, 40, 40,
    ]);
  });

  it("cas 05 — essence 2 € sur 3 articles → 0,66 / 0,66 / 0,68", () => {
    expect(parts(essenceParArticle(articles(3, { sortieId: "S" }), [{ id: "S", montantEssence: 200 }]))).toEqual([
      66, 66, 68,
    ]);
  });

  it("cas 06 — essence 2 € sur 4 articles, puis ajout d'un 5e → 0,50 € puis 0,40 € chacun", () => {
    const sorties = [{ id: "S", montantEssence: 200 }];
    expect(parts(essenceParArticle(articles(4, { sortieId: "S" }), sorties))).toEqual([50, 50, 50, 50]);
    expect(parts(essenceParArticle(articles(5, { sortieId: "S" }), sorties))).toEqual([40, 40, 40, 40, 40]);
  });

  it("cas 07 (essence) — sortie avec 1,30 € d'essence et aucun achat → 1,30 € de frais général calculé", () => {
    expect(essenceSortiesVides([], [{ id: "S", montantEssence: 130 }]).get("S")).toBe(130);
  });

  it("cas 23 — lot de 3 articles pour 10 €, un article supprimé → total conservé : 5,00 / 5,00", () => {
    const restants = articles(3, { lotId: "L" }).filter((a) => a.id !== "a2");
    expect(parts(prixAchatParArticle(restants, [{ id: "L", prixTotal: 1000 }]))).toEqual([500, 500]);
  });

  it("cas 24 — sortie du cas 7 puis ajout d'un article oublié → 0 € de frais général, 1,30 € sur l'article", () => {
    const sorties = [{ id: "S", montantEssence: 130 }];
    const un = articles(1, { sortieId: "S" });
    expect(essenceSortiesVides(un, sorties).size).toBe(0);
    expect(essenceParArticle(un, sorties).get("a1")).toBe(130);
  });
});
