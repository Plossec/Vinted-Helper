import { describe, expect, it } from "vitest";
import { messageErreur } from "./erreurs.js";

describe("messageErreur", () => {
  it("reprend le message du serveur, sinon le code HTTP", () => {
    expect(messageErreur({ erreur: "Article introuvable." }, 404)).toBe("Article introuvable.");
    expect(messageErreur(null, 500)).toBe("Erreur 500");
    expect(messageErreur({ erreur: 12 }, 400)).toBe("Erreur 400");
    expect(messageErreur("texte", 502)).toBe("Erreur 502");
  });
});
