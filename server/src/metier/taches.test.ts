// Tâche « Articles dormants » (#147) : moment du passage et actions prévues.
import { describe, expect, it } from "vitest";
import { type CandidatDormant, passageDu, planifierDormants, prochainPassage } from "./taches.js";

describe("passage de la tâche", () => {
  const base = { active: true, heureDebut: 8, heureFin: 22, frequenceHeures: 24, dernierPassage: null };
  it("dans la plage horaire de Paris seulement (8 h – 22 h)", () => {
    expect(passageDu(base, new Date("2026-10-15T06:30:00Z"))).toBe(true); // 8 h 30 à Paris
    expect(passageDu(base, new Date("2026-10-15T05:30:00Z"))).toBe(false); // 7 h 30
    expect(passageDu(base, new Date("2026-10-15T20:00:00Z"))).toBe(false); // 22 h
  });
  it("désactivée : jamais ; fréquence : pas avant 24 h après le dernier passage", () => {
    const midi = new Date("2026-10-15T10:00:00Z");
    expect(passageDu({ ...base, active: false }, midi)).toBe(false);
    expect(passageDu({ ...base, dernierPassage: new Date("2026-10-14T11:00:00Z") }, midi)).toBe(false);
    expect(passageDu({ ...base, dernierPassage: new Date("2026-10-14T10:00:00Z") }, midi)).toBe(true);
  });
});

describe("prochain passage (#232)", () => {
  const base = { active: true, heureDebut: 8, heureFin: 22, frequenceHeures: 24, dernierPassage: null };
  const midi = new Date("2026-10-15T10:00:00Z");
  it("désactivée : aucun ; jamais passée, dans la plage : maintenant", () => {
    expect(prochainPassage({ ...base, active: false }, midi)).toBeNull();
    expect(prochainPassage(base, midi)).toEqual(midi);
  });
  it("à sa fréquence après le dernier passage, ramené au début de la plage horaire de Paris", () => {
    const hier = new Date("2026-10-14T10:00:00Z");
    expect(prochainPassage({ ...base, dernierPassage: new Date("2026-10-15T08:00:00Z") }, midi)).toEqual(
      new Date("2026-10-16T08:00:00Z"),
    );
    expect(prochainPassage({ ...base, dernierPassage: hier }, midi)).toEqual(midi); // déjà dû
    // 12 h après un passage à 12 h : minuit à Paris, hors plage → 8 h le lendemain.
    expect(prochainPassage({ ...base, frequenceHeures: 12, dernierPassage: midi }, midi)).toEqual(
      new Date("2026-10-16T06:00:00Z"),
    );
    // Dû la nuit (2 h à Paris) : 8 h le matin.
    expect(prochainPassage(base, new Date("2026-10-15T00:00:00Z"))).toEqual(new Date("2026-10-15T06:00:00Z"));
  });
});

describe("actions prévues", () => {
  const candidat = (id: string, extra: Partial<CandidatDormant> = {}): CandidatDormant => ({
    id,
    prixAffiche: 1100,
    prixVenteMinimum: 500,
    baisseRegle: "compte",
    baisseValeur: null,
    urlVinted: "https://www.vinted.fr/items/1",
    republications: 0,
    actionEnCours: false,
    ...extra,
  });
  const reglage = {
    regleCompte: { type: "pourcentage" as const, valeur: 10 },
    plafondRepublications: 10,
    dejaAujourdhui: 0,
  };

  it("republication avec baisse selon la règle du compte (ADR-0113)", () => {
    const r = planifierDormants([candidat("A")], reglage);
    expect(r.actions).toEqual([{ articleId: "A", type: "republication", prixAvant: 1100, prixApres: 1000 }]);
    expect(r.invendus).toEqual([]);
  });

  it("déjà au minimum, sans minimum ou « ne pas baisser » → rien (l'article reste dormant)", () => {
    const r = planifierDormants(
      [
        candidat("B", { prixAffiche: 500 }),
        candidat("C", { prixVenteMinimum: null }),
        candidat("D", { baisseRegle: "aucune" }),
      ],
      reglage,
    );
    expect(r).toEqual({ actions: [], invendus: [] });
  });

  it("3 republications sans vente → Invendu ; action déjà prévue ou annonce sans lien → rien", () => {
    const r = planifierDormants(
      [
        candidat("A", { republications: 3 }),
        candidat("B", { actionEnCours: true }),
        candidat("C", { urlVinted: null }),
      ],
      reglage,
    );
    expect(r).toEqual({ actions: [], invendus: ["A"] });
  });

  it("plafond du jour : les republications de trop attendent le passage suivant", () => {
    const r = planifierDormants([candidat("A"), candidat("B"), candidat("C")], {
      ...reglage,
      plafondRepublications: 2,
      dejaAujourdhui: 1,
    });
    expect(r.actions.map((a) => a.articleId)).toEqual(["A"]);
  });
});
