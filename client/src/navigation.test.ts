// Onglet parent actif sur les écrans secondaires (issue #103).
import { describe, expect, it } from "vitest";
import { ongletActif } from "./navigation.js";

describe("ongletActif", () => {
  it("écrans principaux", () => {
    expect(ongletActif("/")).toBe("articles");
    expect(ongletActif("/terrain")).toBe("terrain");
    expect(ongletActif("/tableau")).toBe("tableau");
    expect(ongletActif("/reglages")).toBe("reglages");
  });

  it("écrans secondaires : l'onglet parent", () => {
    expect(ongletActif("/articles/nouveau")).toBe("articles");
    expect(ongletActif("/articles/0b5f1c9e-0000-4000-8000-000000000000")).toBe("articles");
    expect(ongletActif("/ventes/abc")).toBe("articles");
    expect(ongletActif("/sorties/abc")).toBe("terrain");
    expect(ongletActif("/frais")).toBe("tableau");
    expect(ongletActif("/corbeille")).toBe("reglages");
    expect(ongletActif("/publication")).toBe("reglages");
  });

  it("adresse inconnue : aucun onglet", () => {
    expect(ongletActif("/inconnu")).toBeNull();
  });
});
