// Prochaine étape d'un article (#98) : chaque statut a un conseil, et le passage mis en avant suit le §4.2.
import { describe, expect, it } from "vitest";
import { etapeSuivante, LIBELLES_STATUT, type Statut } from "./statuts.js";

// Transitions du §4.2 (copie de server/src/metier/statuts.ts) : le passage conseillé doit en faire partie.
const TRANSITIONS: Record<Statut, Statut[]> = {
  brouillon: ["a_publier", "en_ligne", "en_stock", "sortie_stock"],
  en_stock: ["brouillon", "a_publier", "sortie_stock"],
  a_publier: ["en_ligne", "brouillon", "en_stock", "sortie_stock"],
  erreur_publication: ["a_publier", "en_ligne", "brouillon", "sortie_stock"],
  en_ligne: ["a_expedier", "a_publier", "sortie_stock"],
  invendu: ["a_expedier", "en_ligne", "a_publier", "sortie_stock"],
  a_expedier: ["envoye", "en_ligne", "sortie_stock"],
  envoye: ["finalise", "a_recuperer", "sortie_stock"],
  a_recuperer: ["a_publier", "en_ligne", "sortie_stock"],
  finalise: [],
  sortie_stock: ["a_publier"],
};

describe("etapeSuivante", () => {
  it("un conseil pour chaque statut, et un passage autorisé quand il y en a un", () => {
    for (const statut of Object.keys(LIBELLES_STATUT) as Statut[]) {
      const { conseil, vers } = etapeSuivante(statut);
      expect(conseil.length, statut).toBeGreaterThan(0);
      if (vers !== null) expect(TRANSITIONS[statut], statut).toContain(vers);
    }
  });

  it("le circuit habituel : brouillon → à publier → en ligne → vendu → envoyé → finalisé", () => {
    expect(etapeSuivante("brouillon").vers).toBe("a_publier");
    expect(etapeSuivante("a_publier").vers).toBe("en_ligne");
    expect(etapeSuivante("en_ligne").vers).toBe("a_expedier");
    expect(etapeSuivante("a_expedier").vers).toBe("envoye");
    expect(etapeSuivante("envoye").vers).toBe("finalise");
    expect(etapeSuivante("finalise").vers).toBeNull();
  });
});
