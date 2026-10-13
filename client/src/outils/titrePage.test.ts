// Titre d'onglet par écran (#132).
import { describe, expect, it } from "vitest";
import { titreDocument } from "./titrePage.js";

describe("titreDocument", () => {
  it("titre de l'écran suivi du nom de l'application", () => {
    expect(titreDocument("Tableau de bord")).toBe("Tableau de bord — Vinted Helper");
    expect(titreDocument("  #0012   Robe\n Sézane ")).toBe("#0012 Robe Sézane — Vinted Helper");
  });

  it("sans titre : le nom de l'application seul", () => {
    expect(titreDocument(null)).toBe("Vinted Helper");
    expect(titreDocument("   ")).toBe("Vinted Helper");
  });
});
