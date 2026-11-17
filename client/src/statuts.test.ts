// Prochaine étape d'un article (#98) : chaque statut a un conseil, et le passage mis en avant suit le §4.2.
import { describe, expect, it } from "vitest";
import { transitionsProposees } from "../../server/src/metier/statuts.js";
import { etapeSuivante, LIBELLES_STATUT, type Statut } from "./statuts.js";

// Transitions du §4.2 : lues dans le serveur, source unique (#244), plus de copie à tenir à jour ici.
const TRANSITIONS = Object.fromEntries(
  (Object.keys(LIBELLES_STATUT) as Statut[]).map((s) => [s, transitionsProposees(s)]),
) as Record<Statut, Statut[]>;

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
