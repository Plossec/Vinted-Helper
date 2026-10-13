// Message d'avertissement des saisies non enregistrées (issue #99).
import { describe, expect, it } from "vitest";
import { messageAbandon } from "./modifications.js";

describe("messageAbandon", () => {
  it("liste les blocs concernés et l'action demandée", () => {
    expect(messageAbandon(["la fiche", "l'annonce"], "quitter la fiche")).toBe(
      "Modifications non enregistrées (la fiche, l'annonce). Quitter la fiche sans les enregistrer ?",
    );
    expect(messageAbandon(["le boost"], "changer de statut")).toBe(
      "Modifications non enregistrées (le boost). Changer de statut sans les enregistrer ?",
    );
  });
});
