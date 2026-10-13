// Bénéfice attendu d'un article vendu non finalisé (issue #105) : prix vendu − coût total, sans toucher au
// bénéfice provisoire du §6.5 (−coût total).
import { describe, expect, it } from "vitest";
import { type ArticlePourBenefice, calculerDetails, type DonneesCalcul } from "./benefice.js";

const article = (id: string, statut: ArticlePourBenefice["statut"], prixAchat = 500): ArticlePourBenefice => ({
  id,
  reference: 1,
  sortieId: null,
  lotId: null,
  prixAchat,
  statut,
  motifSortie: null,
  prixRevente: null,
});
const donnees = (a: ArticlePourBenefice, vendu: boolean): DonneesCalcul => ({
  articles: [a],
  lots: [],
  sorties: [],
  ventes: vendu
    ? [
        {
          id: "V",
          montantCredite: 1500,
          emballage: 8,
          annulee: false,
          lignes: [{ articleId: a.id, prixAffiche: 1500, retourne: false }],
        },
      ]
    : [],
  boosts: [],
});

describe("bénéfice attendu (#105)", () => {
  it("vendu, pas encore finalisé : provisoire −coût total, attendu prix vendu − coût total", () => {
    for (const statut of ["a_expedier", "envoye"] as const) {
      const d = calculerDetails(donnees(article("A", statut), true)).get("A");
      expect(d, statut).toMatchObject({ coutTotal: 508, benefice: -508, realise: false, beneficeAttendu: 992 });
    }
  });

  it("finalisé : le bénéfice est réalisé, plus d'attendu", () => {
    const d = calculerDetails(donnees(article("A", "finalise"), true)).get("A");
    expect(d).toMatchObject({ benefice: 992, realise: true, beneficeAttendu: null });
  });

  it("pas vendu : pas d'attendu", () => {
    const d = calculerDetails(donnees(article("A", "en_ligne"), false)).get("A");
    expect(d).toMatchObject({ benefice: -500, beneficeAttendu: null });
  });
});
