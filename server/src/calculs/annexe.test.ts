// Cas chiffrés de l'annexe §11 du cahier des charges.
// RÈGLE : ne jamais modifier un résultat attendu pour faire passer un test.
// Si un cas semble faux, s'arrêter et poser la question à l'utilisateur.
//
// Lot 0 : uniquement les cas qui relèvent de la règle d'arrondi (répartition).
// Les autres cas (bénéfice, indicateurs, statuts…) sont ajoutés avec le lot qui les implémente.
// Tous les montants sont en centimes.
import { describe, expect, it } from "vitest";
import { type ArticlePourBenefice, calculerDetails, type DonneesCalcul } from "./benefice.js";
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

// Lot 3 : bénéfice d'un article (§6.5) à partir des données (lots, sorties, ventes, boosts).
const article = (id: string, reference: number, extra: Partial<ArticlePourBenefice> = {}): ArticlePourBenefice => ({
  id,
  reference,
  sortieId: null,
  lotId: null,
  prixAchat: null,
  statut: "en_ligne",
  motifSortie: null,
  prixRevente: null,
  ...extra,
});
const donnees = (extra: Partial<DonneesCalcul>): DonneesCalcul => ({
  articles: [],
  lots: [],
  sorties: [],
  ventes: [],
  boosts: [],
  ...extra,
});
const vente = (montantCredite: number, lignes: [string, number, boolean?][], extra = {}) => ({
  id: "V",
  montantCredite,
  emballage: 8,
  annulee: false,
  lignes: lignes.map(([articleId, prixAffiche, retourne]) => ({ articleId, prixAffiche, retourne: retourne ?? false })),
  ...extra,
});

describe("Annexe §11 — bénéfice d'un article", () => {
  it("cas 08 — article du lot n°1 (3,33 €), essence 0,40 €, vendu seul 9 €, emballage 0,08 € → 5,19 €", () => {
    // Lot n°1 : 3 articles pour 10 € (le premier reçoit 3,33 €) ; sortie : 5 articles et 2 € d'essence.
    const articles = [
      article("A", 1, { lotId: "L", sortieId: "S", statut: "finalise" }),
      article("B", 2, { lotId: "L", sortieId: "S" }),
      article("C", 3, { lotId: "L", sortieId: "S" }),
      article("D", 4, { sortieId: "S", prixAchat: 100 }),
      article("E", 5, { sortieId: "S", prixAchat: 100 }),
    ];
    const d = calculerDetails(
      donnees({
        articles,
        lots: [{ id: "L", prixTotal: 1000 }],
        sorties: [{ id: "S", montantEssence: 200 }],
        ventes: [vente(900, [["A", 900]])],
      }),
    ).get("A");
    expect(d).toMatchObject({
      prixAchat: 333,
      essence: 40,
      emballage: 8,
      prixVendu: 900,
      benefice: 519,
      realise: true,
    });
  });

  it("cas 09 — A affiché 9 €, B affiché 6 €, crédité 12 €, colis 0,08 € → A 7,20 / 0,04 ; B 4,80 / 0,04", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { statut: "finalise" }), article("B", 2, { statut: "finalise" })],
        ventes: [
          vente(1200, [
            ["A", 900],
            ["B", 600],
          ]),
        ],
      }),
    );
    expect(d.get("A")).toMatchObject({ prixVendu: 720, emballage: 4 });
    expect(d.get("B")).toMatchObject({ prixVendu: 480, emballage: 4 });
  });

  it("cas 10 — suite du cas 9 : A acheté 2 € + 0,40 € ; B acheté 1 € + 0,40 € → bénéfice A 4,76 € ; B 3,36 €", () => {
    const sortie = { id: "S", montantEssence: 80 };
    const d = calculerDetails(
      donnees({
        articles: [
          article("A", 1, { statut: "finalise", prixAchat: 200, sortieId: "S" }),
          article("B", 2, { statut: "finalise", prixAchat: 100, sortieId: "S" }),
        ],
        sorties: [sortie],
        ventes: [
          vente(1200, [
            ["A", 900],
            ["B", 600],
          ]),
        ],
      }),
    );
    expect(d.get("A")?.benefice).toBe(476);
    expect(d.get("B")?.benefice).toBe(336);
  });

  it("cas 13 — acheté 4 €, sans essence, boost 1,50 €, vendu 10 €, emballage 0,08 € → 4,42 €", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { statut: "finalise", prixAchat: 400 })],
        ventes: [vente(1000, [["A", 1000]])],
        boosts: [{ articleId: "A", montant: 150 }],
      }),
    );
    expect(d.get("A")?.benefice).toBe(442);
  });

  it("cas 14 — article Maison (0 €, sans sortie), vendu 5 €, emballage 0,08 € → 4,92 €", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { statut: "finalise", prixAchat: 0 })],
        ventes: [vente(500, [["A", 500]])],
      }),
    );
    expect(d.get("A")?.benefice).toBe(492);
  });

  it.each([
    ["15", "donne"],
    ["16", "garde"],
  ] as const)("cas %s — acheté 3,75 € + 0,65 € d'essence, sorti du stock (%s) → −4,40 € (perte)", (_cas, motif) => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { statut: "sortie_stock", motifSortie: motif, prixAchat: 375, sortieId: "S" })],
        sorties: [{ id: "S", montantEssence: 65 }],
      }),
    );
    expect(d.get("A")).toMatchObject({ benefice: -440, realise: true, emballage: 0 });
  });

  it("cas 17 — acheté 2 € + 0,40 €, revendu hors Vinted 5 € → 2,60 €", () => {
    const d = calculerDetails(
      donnees({
        articles: [
          article("A", 1, {
            statut: "sortie_stock",
            motifSortie: "revendu",
            prixRevente: 500,
            prixAchat: 200,
            sortieId: "S",
          }),
        ],
        sorties: [{ id: "S", montantEssence: 40 }],
      }),
    );
    expect(d.get("A")).toMatchObject({ benefice: 260, realise: true });
  });

  it("cas 18 — acheté 5 € + 0,65 €, toujours En ligne → bénéfice provisoire −5,65 € ; coût total 5,65 €", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { prixAchat: 500, sortieId: "S" })],
        sorties: [{ id: "S", montantEssence: 65 }],
      }),
    );
    expect(d.get("A")).toMatchObject({ benefice: -565, realise: false, coutTotal: 565 });
  });

  it("cas 22 — article À expédier dont l'acheteur annule → la vente annulée est exclue de tous les calculs", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { prixAchat: 200 })],
        ventes: [vente(900, [["A", 900]], { annulee: true })],
      }),
    );
    expect(d.get("A")).toMatchObject({ prixVendu: null, emballage: 0, venteId: null, coutTotal: 200 });
  });

  it("cas 25 — acheté 5 € + 0,65 € + boost 1,50 €, En ligne → coût total 7,15 €", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { prixAchat: 500, sortieId: "S" })],
        sorties: [{ id: "S", montantEssence: 65 }],
        boosts: [{ articleId: "A", montant: 150 }],
      }),
    );
    expect(d.get("A")?.coutTotal).toBe(715);
  });

  it("cas 26 — suite des cas 9-10, retour de B, nouveau montant 7,20 € → A : 7,20 €, emballage 0,08 €, bénéfice 4,72 €", () => {
    const d = calculerDetails(
      donnees({
        articles: [
          article("A", 1, { statut: "finalise", prixAchat: 200, sortieId: "S" }),
          article("B", 2, { statut: "a_publier", prixAchat: 100, sortieId: "S" }),
        ],
        sorties: [{ id: "S", montantEssence: 80 }],
        ventes: [
          vente(720, [
            ["A", 900],
            ["B", 600, true],
          ]),
        ],
      }),
    );
    expect(d.get("A")).toMatchObject({ prixVendu: 720, emballage: 8, benefice: 472 });
    expect(d.get("B")).toMatchObject({ prixVendu: null, emballage: 0, venteId: null });
  });

  it("cas 27 — colis de 2 articles Envoyé, retour du colis entier → vente annulée, plus aucun montant de vente", () => {
    const d = calculerDetails(
      donnees({
        articles: [article("A", 1, { statut: "a_publier" }), article("B", 2, { statut: "a_publier" })],
        ventes: [
          vente(
            1200,
            [
              ["A", 900],
              ["B", 600],
            ],
            { annulee: true },
          ),
        ],
      }),
    );
    for (const id of ["A", "B"]) expect(d.get(id)).toMatchObject({ prixVendu: null, emballage: 0 });
  });
});
