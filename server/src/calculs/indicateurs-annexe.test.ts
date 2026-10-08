// Cas chiffrés de l'annexe §11 pour le tableau de bord (§5.9, §6.6).
// RÈGLE : ne jamais modifier un résultat attendu pour faire passer un test.
import { describe, expect, it } from "vitest";
import { type ArticlePourBenefice, calculerDetails } from "./benefice.js";
import {
  analyser,
  type ArticlePourIndicateurs,
  delaisVente,
  type DonneesIndicateurs,
  indicateursParMois,
  rentabilite,
  valeurStock,
  ventesEnCoursParMois,
} from "./indicateurs.js";

interface SpecArticle {
  id: string;
  statut?: string;
  prixAchat?: number;
  lotId?: string;
  sortieId?: string;
  dateAchat?: string;
  prixAffiche?: number;
  estMaison?: boolean;
  categorie?: string;
  motif?: ArticlePourBenefice["motifSortie"];
  prixRevente?: number;
  dateSortieStock?: string;
  misesEnLigne?: string[];
}

interface Spec {
  articles: SpecArticle[];
  sorties?: { id: string; date: string; essence: number }[];
  ventes?: {
    id: string;
    montant: number;
    emballage: number;
    lignes: [string, number, boolean?][];
    vente: string;
    envoi?: string;
    finalisation?: string;
    annulee?: boolean;
  }[];
  boosts?: { articleId: string; montant: number; date: string }[];
  frais?: { date: string; montant: number }[];
}

function construire(spec: Spec) {
  const d: DonneesIndicateurs = {
    calcul: {
      articles: spec.articles.map((a, i): ArticlePourBenefice => ({
        id: a.id,
        reference: i + 1,
        sortieId: a.sortieId ?? null,
        lotId: a.lotId ?? null,
        prixAchat: a.prixAchat ?? 0,
        statut: a.statut ?? "en_ligne",
        motifSortie: a.motif ?? null,
        prixRevente: a.prixRevente ?? null,
      })),
      lots: [],
      sorties: (spec.sorties ?? []).map((s) => ({ id: s.id, montantEssence: s.essence })),
      ventes: (spec.ventes ?? []).map((v) => ({
        id: v.id,
        montantCredite: v.montant,
        emballage: v.emballage,
        annulee: v.annulee ?? false,
        lignes: v.lignes.map(([articleId, prixAffiche, retourne]) => ({
          articleId,
          prixAffiche,
          retourne: !!retourne,
        })),
      })),
      boosts: (spec.boosts ?? []).map((b) => ({ articleId: b.articleId, montant: b.montant })),
    },
    articles: spec.articles.map((a): ArticlePourIndicateurs => ({
      id: a.id,
      statut: a.statut ?? "en_ligne",
      dateAchat: a.dateAchat ?? null,
      prixAffiche: a.prixAffiche ?? null,
      sortieId: a.sortieId ?? null,
      lieuId: a.estMaison ? "maison" : "vide-grenier",
      estMaison: a.estMaison ?? false,
      categorie: a.categorie ?? null,
      marque: null,
      gamme: null,
      misesEnLigne: a.misesEnLigne ?? [],
      dateSortieStock: a.dateSortieStock ?? null,
    })),
    datesSorties: new Map((spec.sorties ?? []).map((s) => [s.id, s.date])),
    datesVentes: new Map(
      (spec.ventes ?? []).map((v) => [
        v.id,
        { vente: v.vente, envoi: v.envoi ?? null, finalisation: v.finalisation ?? null },
      ]),
    ),
    boosts: (spec.boosts ?? []).map((b) => ({ montant: b.montant, date: b.date })),
    frais: spec.frais ?? [],
  };
  return { d, details: calculerDetails(d.calcul) };
}

const mois = (spec: Spec, cle: string) => {
  const { d, details } = construire(spec);
  return indicateursParMois(d, details).get(cle);
};

describe("Annexe §11 — indicateurs du mois", () => {
  it("cas 07 — sortie avec 1,30 € d'essence, aucun achat → frais général 1,30 € ; bénéfice et trésorerie −1,30 €", () => {
    expect(mois({ articles: [], sorties: [{ id: "S", date: "2026-10-03", essence: 130 }] }, "2026-10")).toEqual({
      chiffreAffaires: 0,
      beneficeRealise: -130,
      tresorerie: -130,
      fraisGeneraux: 130,
    });
  });

  it("cas 19 — vendu le 30/09, envoyé le 01/10, finalisé le 04/10 à 9 € → compté en octobre", () => {
    const spec: Spec = {
      articles: [{ id: "A", statut: "finalise", prixAchat: 200, dateAchat: "2026-08-15" }],
      ventes: [
        {
          id: "V",
          montant: 900,
          emballage: 8,
          lignes: [["A", 900]],
          vente: "2026-09-30T18:00:00Z",
          envoi: "2026-10-01T09:00:00Z",
          finalisation: "2026-10-04T09:00:00Z",
        },
      ],
    };
    expect(mois(spec, "2026-10")).toMatchObject({ chiffreAffaires: 900, beneficeRealise: 900 - 200 - 8 });
    expect(mois(spec, "2026-09")).toBeUndefined();
  });

  it("cas 20 — septembre : CA 9,00 € ; bénéfice réalisé 5,52 € ; trésorerie −2,08 €", () => {
    const vingt = ["B1", "B2", "B3", "B4", "B5"].map((id): SpecArticle => ({
      id,
      prixAchat: 200,
      sortieId: "S20",
      dateAchat: "2026-09-20",
    }));
    const spec: Spec = {
      articles: [
        { id: "X", statut: "finalise", prixAchat: 200, sortieId: "SAout", dateAchat: "2026-08-10" },
        ...vingt,
        {
          id: "Y",
          statut: "sortie_stock",
          motif: "donne",
          prixAchat: 100,
          dateAchat: "2026-08-12",
          dateSortieStock: "2026-09-25T10:00:00Z",
        },
      ],
      sorties: [
        { id: "SAout", date: "2026-08-10", essence: 40 },
        { id: "S20", date: "2026-09-20", essence: 100 },
      ],
      ventes: [
        {
          id: "V",
          montant: 900,
          emballage: 8,
          lignes: [["X", 900]],
          vente: "2026-09-01T10:00:00Z",
          envoi: "2026-09-02T10:00:00Z",
          finalisation: "2026-09-04T10:00:00Z",
        },
      ],
    };
    expect(mois(spec, "2026-09")).toMatchObject({ chiffreAffaires: 900, beneficeRealise: 552, tresorerie: -208 });
  });

  it("cas 24 — sortie du cas 7 puis ajout d'un article → frais général 0 €, l'article porte 1,30 €", () => {
    const spec: Spec = {
      articles: [{ id: "A", sortieId: "S", dateAchat: "2026-10-03" }],
      sorties: [{ id: "S", date: "2026-10-03", essence: 130 }],
    };
    expect(mois(spec, "2026-10")?.fraisGeneraux).toBe(0);
    expect(construire(spec).details.get("A")?.essence).toBe(130);
  });

  it("cas 33 — frais divers 3 € le 10/10 ; un article finalisé (6,52 €, 9 € crédités) → bénéfice 3,52 € ; trésorerie 6,00 €", () => {
    const spec: Spec = {
      articles: [{ id: "X", statut: "finalise", prixAchat: 200, sortieId: "S", dateAchat: "2026-09-10" }],
      sorties: [{ id: "S", date: "2026-09-10", essence: 40 }],
      ventes: [
        {
          id: "V",
          montant: 900,
          emballage: 8,
          lignes: [["X", 900]],
          vente: "2026-09-28T10:00:00Z",
          envoi: "2026-09-29T10:00:00Z",
          finalisation: "2026-10-02T10:00:00Z",
        },
      ],
      frais: [{ date: "2026-10-10", montant: 300 }],
    };
    expect(mois(spec, "2026-10")).toMatchObject({ beneficeRealise: 352, tresorerie: 600 });
  });

  it("cas 17 — revendu hors Vinted 5 € → 5 € dans le CA du mois de la sortie du stock", () => {
    const spec: Spec = {
      articles: [
        {
          id: "A",
          statut: "sortie_stock",
          motif: "revendu",
          prixRevente: 500,
          prixAchat: 200,
          dateAchat: "2026-09-01",
          dateSortieStock: "2026-10-05T10:00:00Z",
        },
      ],
    };
    expect(mois(spec, "2026-10")).toMatchObject({ chiffreAffaires: 500, beneficeRealise: 300 });
  });
});

describe("Annexe §11 — stock, rentabilité, analyse", () => {
  it("cas 18 — acheté 5 € + 0,65 € d'essence, En ligne → valeur du stock 5,65 €", () => {
    const { d, details } = construire({
      articles: [{ id: "A", prixAchat: 500, sortieId: "S" }],
      sorties: [{ id: "S", date: "2026-10-01", essence: 65 }],
    });
    expect(valeurStock(d, details)).toMatchObject({ coutTotal: 565 });
  });

  it("cas 25 — + boost 1,50 €, affiché 12 € → stock 7,15 € au coût total, 12 € au prix affiché", () => {
    const { d, details } = construire({
      articles: [{ id: "A", prixAchat: 500, sortieId: "S", prixAffiche: 1200 }],
      sorties: [{ id: "S", date: "2026-10-01", essence: 65 }],
      boosts: [{ articleId: "A", montant: 150, date: "2026-10-02" }],
    });
    expect(valeurStock(d, details)).toMatchObject({ coutTotal: 715, prixAffiche: 1200 });
  });

  it("cas 31 — sortie de 3 articles à 2 € + 0,90 € ; A finalisé 9 € → réalisé 6,62 € ; provisoire 2,02 € ; 2 restants", () => {
    const { d, details } = construire({
      articles: [
        { id: "A", statut: "finalise", prixAchat: 200, sortieId: "S" },
        { id: "B", prixAchat: 200, sortieId: "S" },
        { id: "C", prixAchat: 200, sortieId: "S" },
      ],
      sorties: [{ id: "S", date: "2026-10-01", essence: 90 }],
      ventes: [{ id: "V", montant: 900, emballage: 8, lignes: [["A", 900]], vente: "2026-10-03T10:00:00Z" }],
    });
    expect(rentabilite(d, details, "sortie").classement).toEqual([
      { cle: "S", realise: 662, provisoire: 202, nombreArticles: 3, restants: 2 },
    ]);
  });

  it("cas 14 — article Maison vendu 5 € → bénéfice 4,92 €, affiché à part dans la rentabilité par lieu", () => {
    const { d, details } = construire({
      articles: [{ id: "A", statut: "finalise", prixAchat: 0, estMaison: true }],
      ventes: [{ id: "V", montant: 500, emballage: 8, lignes: [["A", 500]], vente: "2026-10-03T10:00:00Z" }],
    });
    const r = rentabilite(d, details, "lieu");
    expect(r.classement).toEqual([]);
    expect(r.maison).toMatchObject({ realise: 492 });
  });

  it("cas 29 — J1 coût 4 € vendu 12 €, J2 coût 6 € vendu 9 € → marge moyenne 5,50 € ; 110 %", () => {
    const { d, details } = construire({
      articles: [
        { id: "J1", statut: "finalise", prixAchat: 400, categorie: "hommes/vetements/jeans/jeans-slim" },
        { id: "J2", statut: "finalise", prixAchat: 600, categorie: "hommes/vetements/jeans/jeans-droits" },
      ],
      ventes: [
        { id: "V1", montant: 1200, emballage: 0, lignes: [["J1", 1200]], vente: "2026-10-03T10:00:00Z" },
        { id: "V2", montant: 900, emballage: 0, lignes: [["J2", 900]], vente: "2026-10-04T10:00:00Z" },
      ],
    });
    expect(analyser(d, details, "categorie", 3)).toEqual([
      expect.objectContaining({ cle: "hommes/vetements/jeans", nombreVendus: 2, margeMoyenne: 550, tauxMarge: 1.1 }),
    ]);
  });

  it("cas 30 — acheté le 01/09, en ligne le 10/09, vendu le 15/09 → 5 j et 14 j", () => {
    const article: ArticlePourIndicateurs = {
      id: "A",
      statut: "finalise",
      dateAchat: "2026-09-01",
      prixAffiche: 900,
      sortieId: null,
      lieuId: null,
      estMaison: false,
      categorie: null,
      marque: null,
      gamme: null,
      misesEnLigne: ["2026-09-10T08:00:00Z"],
      dateSortieStock: null,
    };
    expect(delaisVente(article, "2026-09-15T20:00:00Z")).toEqual({ miseEnLigne: 5, achat: 14 });
  });

  it("cas 32 — articles Maison finalisés (0 €, sans essence, emballage 0) vendus 5 € et 3 € → 4,00 € ; taux « — »", () => {
    const { d, details } = construire({
      articles: [
        { id: "A", statut: "finalise", prixAchat: 0, estMaison: true },
        { id: "B", statut: "finalise", prixAchat: 0, estMaison: true },
      ],
      ventes: [
        { id: "V1", montant: 500, emballage: 0, lignes: [["A", 500]], vente: "2026-10-03T10:00:00Z" },
        { id: "V2", montant: 300, emballage: 0, lignes: [["B", 300]], vente: "2026-10-04T10:00:00Z" },
      ],
    });
    expect(analyser(d, details, "marque")).toEqual([
      expect.objectContaining({ nombreVendus: 2, margeMoyenne: 400, tauxMarge: null }),
    ]);
  });
});

describe("Annexe §11 — ventes en cours et chiffres théoriques (issue #85)", () => {
  it("cas 34 — vendu le 28/09 à 12,50 €, envoyé le 01/10, non finalisé → en cours en septembre ; réalisé inchangé", () => {
    const spec: Spec = {
      articles: [{ id: "A", statut: "envoye", prixAchat: 200, dateAchat: "2026-09-10" }],
      ventes: [
        {
          id: "V",
          montant: 1250,
          emballage: 8,
          lignes: [["A", 1250]],
          vente: "2026-09-28T18:00:00Z",
          envoi: "2026-10-01T09:00:00Z",
        },
      ],
    };
    const { d, details } = construire(spec);
    const enCours = ventesEnCoursParMois(d, details);
    expect(enCours.get("2026-09")).toEqual({ chiffreAffaires: 1250, benefice: 1042 });
    expect(enCours.get("2026-10")).toBeUndefined();
    expect(mois(spec, "2026-09")).toMatchObject({ chiffreAffaires: 0, beneficeRealise: 0 });
  });

  it("cas 35 — colis A + B, B renvoyé (9 € pour A) ; C finalisé (4 €), frais 1 € → en cours 9 € / 5,90 € ; théorique 8,90 €", () => {
    const spec: Spec = {
      articles: [
        { id: "A", statut: "envoye", prixAchat: 300, dateAchat: "2026-09-01" },
        { id: "B", statut: "a_recuperer", prixAchat: 200, dateAchat: "2026-09-01" },
        { id: "C", statut: "finalise", prixAchat: 500, dateAchat: "2026-09-01" },
      ],
      ventes: [
        {
          id: "V",
          montant: 900,
          emballage: 10,
          lignes: [
            ["A", 1000],
            ["B", 500, true],
          ],
          vente: "2026-10-02T18:00:00Z",
          envoi: "2026-10-03T09:00:00Z",
        },
        {
          id: "W",
          montant: 900,
          emballage: 0,
          lignes: [["C", 900]],
          vente: "2026-10-04T18:00:00Z",
          envoi: "2026-10-05T09:00:00Z",
          finalisation: "2026-10-06T09:00:00Z",
        },
      ],
      frais: [{ date: "2026-10-10", montant: 100 }],
    };
    const { d, details } = construire(spec);
    const enCours = ventesEnCoursParMois(d, details).get("2026-10");
    expect(enCours).toEqual({ chiffreAffaires: 900, benefice: 590 });
    const realise = mois(spec, "2026-10");
    expect(realise).toMatchObject({ chiffreAffaires: 900, beneficeRealise: 300 });
    expect((realise?.beneficeRealise ?? 0) + (enCours?.benefice ?? 0)).toBe(890);
  });

  it("une vente annulée ou un article Finalisé n'est jamais « en cours »", () => {
    const spec: Spec = {
      articles: [
        { id: "A", statut: "en_ligne", prixAchat: 100 },
        { id: "B", statut: "finalise", prixAchat: 100 },
      ],
      ventes: [
        { id: "V", montant: 500, emballage: 0, lignes: [["A", 500]], vente: "2026-10-02T18:00:00Z", annulee: true },
        {
          id: "W",
          montant: 500,
          emballage: 0,
          lignes: [["B", 500]],
          vente: "2026-10-02T18:00:00Z",
          finalisation: "2026-10-03T18:00:00Z",
        },
      ],
    };
    const { d, details } = construire(spec);
    expect(ventesEnCoursParMois(d, details).size).toBe(0);
  });
});
