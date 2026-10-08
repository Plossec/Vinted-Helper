// Tableau de bord (issue #88) : détail de la trésorerie et stock par statut. Hors annexe §11 : les cas chiffrés de
// l'annexe restent dans indicateurs-annexe.test.ts et ne sont pas modifiés.
import { describe, expect, it } from "vitest";
import { calculerDetails, type DonneesCalcul } from "./benefice.js";
import {
  type ArticlePourIndicateurs,
  type DonneesIndicateurs,
  indicateursEtTresorerieParMois,
  stockParStatut,
} from "./indicateurs.js";

const article = (
  id: string,
  statut: string,
  prixAffiche: number | null,
  dateAchat: string,
): ArticlePourIndicateurs => ({
  id,
  statut,
  dateAchat,
  prixAffiche,
  sortieId: "S",
  lieuId: "L",
  estMaison: false,
  categorie: null,
  marque: null,
  gamme: null,
  misesEnLigne: [],
  dateSortieStock: null,
});

/** A (2 €) finalisé 9 € en octobre, B (3 €) En ligne à 12 € ; sortie de 0,60 € ; boost 0,50 € ; frais 1 €. */
function donnees(): DonneesIndicateurs {
  const calcul: DonneesCalcul = {
    articles: [
      {
        id: "A",
        reference: 1,
        sortieId: "S",
        lotId: null,
        prixAchat: 200,
        statut: "finalise",
        motifSortie: null,
        prixRevente: null,
      },
      {
        id: "B",
        reference: 2,
        sortieId: "S",
        lotId: null,
        prixAchat: 300,
        statut: "en_ligne",
        motifSortie: null,
        prixRevente: null,
      },
    ],
    lots: [],
    sorties: [{ id: "S", montantEssence: 60 }],
    ventes: [
      {
        id: "V",
        montantCredite: 900,
        emballage: 8,
        annulee: false,
        lignes: [{ articleId: "A", prixAffiche: 900, retourne: false }],
      },
    ],
    boosts: [{ articleId: "B", montant: 50 }],
  };
  return {
    calcul,
    articles: [article("A", "finalise", 900, "2026-09-20"), article("B", "en_ligne", 1200, "2026-09-20")],
    datesSorties: new Map([["S", "2026-09-20"]]),
    datesVentes: new Map([
      ["V", { vente: "2026-10-01T10:00:00Z", envoi: "2026-10-02T10:00:00Z", finalisation: "2026-10-05T10:00:00Z" }],
    ]),
    boosts: [{ montant: 50, date: "2026-10-03" }],
    frais: [{ date: "2026-10-10", montant: 100 }],
  };
}

describe("tableau de bord — détail de la trésorerie (#88)", () => {
  it("chaque mois, la trésorerie est la somme de ses postes", () => {
    const d = donnees();
    const { mois, postes } = indicateursEtTresorerieParMois(d, calculerDetails(d.calcul));
    expect(postes.get("2026-09")).toEqual({
      encaisse: 0,
      achats: 500,
      essence: 60,
      emballages: 0,
      boosts: 0,
      fraisDivers: 0,
    });
    expect(mois.get("2026-09")?.tresorerie).toBe(-560);
    expect(postes.get("2026-10")).toEqual({
      encaisse: 900,
      achats: 0,
      essence: 0,
      emballages: 8,
      boosts: 50,
      fraisDivers: 100,
    });
    expect(mois.get("2026-10")?.tresorerie).toBe(742);
  });
});

describe("tableau de bord — stock par statut (#88)", () => {
  it("coût total, prix affiché et nombre de chaque statut", () => {
    const d = donnees();
    expect(stockParStatut(d, calculerDetails(d.calcul))).toEqual({
      // A : 2 € + 0,30 € d'essence + 0,08 € d'emballage ; B : 3 € + 0,30 € + 0,50 € de boost.
      finalise: { nombre: 1, coutTotal: 238, prixAffiche: 900 },
      en_ligne: { nombre: 1, coutTotal: 380, prixAffiche: 1200 },
    });
  });
});
