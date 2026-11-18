import { describe, expect, it } from "vitest";
import { etatOuverture, formatJournee, type Horaires, lireJournee } from "./horaires.js";

describe("lireJournee", () => {
  it("lit les écritures courantes", () => {
    expect(lireJournee("9h-12h, 14h-19h")).toEqual([
      { debut: "09:00", fin: "12:00" },
      { debut: "14:00", fin: "19:00" },
    ]);
    expect(lireJournee("09:30 - 12:00 / 14h30–19h")).toEqual([
      { debut: "09:30", fin: "12:00" },
      { debut: "14:30", fin: "19:00" },
    ]);
    expect(lireJournee("8 à 20")).toEqual([{ debut: "08:00", fin: "20:00" }]);
    expect(lireJournee("0h-24h")).toEqual([{ debut: "00:00", fin: "24:00" }]);
  });

  it("vide ou « fermé » = jour de fermeture", () => {
    expect(lireJournee("")).toEqual([]);
    expect(lireJournee("Fermé")).toEqual([]);
    expect(lireJournee("fermee")).toEqual([]);
  });

  it("refuse les plages illisibles, inversées ou qui se chevauchent", () => {
    expect(lireJournee("9h")).toBe("invalide");
    expect(lireJournee("12h-9h")).toBe("invalide");
    expect(lireJournee("9h-13h, 12h-18h")).toBe("invalide");
    expect(lireJournee("25h-26h")).toBe("invalide");
    expect(lireJournee("9h60-10h")).toBe("invalide");
  });

  it("s'affiche de nouveau sous une forme relisible", () => {
    const plages = lireJournee("9h-12h, 14h-19h");
    if (plages === "invalide") throw new Error("illisible");
    expect(formatJournee(plages)).toBe("09:00-12:00, 14:00-19:00");
    expect(lireJournee(formatJournee(plages))).toEqual(plages);
    expect(formatJournee([])).toBe("Fermé");
  });
});

describe("etatOuverture (heure de Paris)", () => {
  const semaine: Horaires = [
    [
      { debut: "09:00", fin: "12:00" },
      { debut: "14:00", fin: "19:00" },
    ],
    [{ debut: "09:00", fin: "19:00" }],
    [],
    [],
    [],
    [{ debut: "09:30", fin: "12:30" }],
    [],
  ];
  // 16/11/2026 est un lundi ; Paris = UTC+1 en novembre.
  const lundi = (heureUtc: string) => new Date(`2026-11-16T${heureUtc}:00Z`);

  it("ouvert pendant une plage, avec l'heure de fermeture", () => {
    expect(etatOuverture(semaine, lundi("09:15"))).toEqual({ ouvert: true, texte: "Ouvert — ferme à 12 h" });
  });

  it("fermé entre deux plages : réouverture le jour même", () => {
    expect(etatOuverture(semaine, lundi("12:00"))).toEqual({ ouvert: false, texte: "Fermé — ouvre à 14 h" });
  });

  it("fermé le soir : réouverture le lendemain ou un autre jour", () => {
    expect(etatOuverture(semaine, lundi("19:00")).texte).toBe("Fermé — ouvre demain à 9 h");
    // Mardi soir → samedi 9 h 30.
    expect(etatOuverture(semaine, new Date("2026-11-17T19:00:00Z")).texte).toBe("Fermé — ouvre samedi à 9 h 30");
    // Samedi après-midi → lundi.
    expect(etatOuverture(semaine, new Date("2026-11-21T15:00:00Z")).texte).toBe("Fermé — ouvre lundi à 9 h");
  });

  it("ouvert jusqu'à minuit", () => {
    const toujours: Horaires = Array.from({ length: 7 }, () => [{ debut: "00:00", fin: "24:00" }]);
    expect(etatOuverture(toujours, lundi("22:30")).texte).toBe("Ouvert — ferme à minuit");
  });

  it("aucun horaire saisi", () => {
    expect(
      etatOuverture(
        Array.from({ length: 7 }, () => []),
        lundi("10:00"),
      ).texte,
    ).toBe("Fermé — aucun horaire saisi");
  });
});
