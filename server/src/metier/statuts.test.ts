// Règles de statut — cahier des charges §4.2. Le tableau attendu est recopié du cahier,
// indépendamment du code, pour vérifier les 49 combinaisons (7 statuts × 7 statuts).
import { describe, expect, it } from "vitest";
import { estTransitionSimple, STATUTS, type Statut, transitionAutorisee, verifierTransition } from "./statuts.js";

const ATTENDU: Record<Statut, Statut[]> = {
  brouillon: ["a_publier", "en_ligne", "sortie_stock"],
  a_publier: ["en_ligne", "brouillon", "sortie_stock"],
  en_ligne: ["a_expedier", "a_publier", "sortie_stock"],
  a_expedier: ["envoye", "en_ligne", "sortie_stock"],
  envoye: ["finalise", "a_publier", "sortie_stock"],
  finalise: [],
  sortie_stock: ["a_publier"],
};

describe("§4.2 — transitions autorisées (49 combinaisons)", () => {
  const combinaisons = STATUTS.flatMap((de) => STATUTS.map((vers) => [de, vers] as const));

  it("couvre bien les 7 statuts du cahier des charges", () => {
    expect([...STATUTS].sort()).toEqual(Object.keys(ATTENDU).sort());
    expect(combinaisons).toHaveLength(49);
  });

  it.each(combinaisons)("%s → %s", (de, vers) => {
    expect(transitionAutorisee(de, vers)).toBe(ATTENDU[de].includes(vers));
  });

  it("un article Finalisé ne peut plus changer de statut", () => {
    for (const vers of STATUTS) expect(transitionAutorisee("finalise", vers)).toBe(false);
  });
});

describe("§4.2 — passage En ligne : prix affiché obligatoire", () => {
  it("refusé sans prix affiché", () => {
    expect(verifierTransition("brouillon", "en_ligne", { prixAffiche: null })).toEqual({
      ok: false,
      raison: "Indiquez le prix affiché sur Vinted avant de passer l'article En ligne.",
    });
  });

  it("refusé avec un prix affiché nul", () => {
    expect(verifierTransition("a_publier", "en_ligne", { prixAffiche: 0 }).ok).toBe(false);
  });

  it("accepté avec un prix affiché", () => {
    expect(verifierTransition("brouillon", "en_ligne", { prixAffiche: 900 })).toEqual({ ok: true });
  });

  it("le prix n'est pas exigé pour les autres passages", () => {
    expect(verifierTransition("brouillon", "a_publier", { prixAffiche: null })).toEqual({ ok: true });
  });
});

describe("verifierTransition — messages en français", () => {
  it("transition interdite", () => {
    expect(verifierTransition("finalise", "en_ligne", { prixAffiche: 900 })).toEqual({
      ok: false,
      raison: "Passage impossible de « Finalisé » à « En ligne ».",
    });
  });

  it("même statut", () => {
    expect(verifierTransition("brouillon", "brouillon", { prixAffiche: null }).ok).toBe(false);
  });
});

describe("Lot 3 — passages simples et passages avec leur propre action", () => {
  it("le changement simple ne concerne que Brouillon, À publier et En ligne", () => {
    expect(estTransitionSimple("brouillon", "en_ligne")).toBe(true);
    expect(estTransitionSimple("en_ligne", "a_publier")).toBe(true);
    expect(estTransitionSimple("en_ligne", "a_expedier")).toBe(false); // vente
    expect(estTransitionSimple("envoye", "a_publier")).toBe(false); // retour du colis
    expect(estTransitionSimple("brouillon", "sortie_stock")).toBe(false); // sortie du stock
    expect(estTransitionSimple("sortie_stock", "a_publier")).toBe(false); // annulation de la sortie
  });
});
