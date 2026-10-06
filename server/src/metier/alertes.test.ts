// Alertes (§5.8) — cas 21 et 28 de l'annexe §11.
import { describe, expect, it } from "vitest";
import { type ArticlePourAlertes, calculerAlertes } from "./alertes.js";

const DELAIS = { delaiBrouillon: 3, delaiDormant: 7 };
const article = (extra: Partial<ArticlePourAlertes>): ArticlePourAlertes => ({
  id: "A",
  reference: 1,
  nom: null,
  statut: "brouillon",
  historique: [],
  historiquePrix: [],
  ...extra,
});
const le = (jour: string, heure = "10:00") => new Date(`${jour}T${heure}:00+02:00`);

describe("Annexe §11 — alertes", () => {
  it("cas 28 — Brouillon créé le 01/10 → alerte brouillon le 04/10 (3 jours ou plus)", () => {
    const a = article({ historique: [{ vers: "brouillon", date: le("2026-10-01").toISOString() }] });
    expect(calculerAlertes([a], DELAIS, le("2026-10-03", "23:59")).brouillons).toEqual([]);
    expect(calculerAlertes([a], DELAIS, le("2026-10-04", "00:01")).brouillons).toEqual([
      { id: "A", reference: 1, nom: null, depuis: "2026-10-01", jours: 3 },
    ]);
  });

  it("cas 21 — En ligne le 01/10 à 9 €, baissé à 7 € le 05/10 → alerte dormant le 12/10", () => {
    const a = article({
      statut: "en_ligne",
      historique: [
        { vers: "brouillon", date: le("2026-09-28").toISOString() },
        { vers: "en_ligne", date: le("2026-10-01").toISOString() },
      ],
      historiquePrix: [
        { prix: 900, date: le("2026-10-01").toISOString() },
        { prix: 700, date: le("2026-10-05").toISOString() },
      ],
    });
    expect(calculerAlertes([a], DELAIS, le("2026-10-11")).dormants).toEqual([]);
    expect(calculerAlertes([a], DELAIS, le("2026-10-12")).dormants).toEqual([
      { id: "A", reference: 1, nom: null, depuis: "2026-10-05", jours: 7 },
    ]);
  });
});

describe("alertes — autres règles", () => {
  it("une hausse de prix ne relance pas le décompte ; sans baisse, il part de la mise en ligne", () => {
    const a = article({
      statut: "en_ligne",
      historique: [{ vers: "en_ligne", date: le("2026-10-01").toISOString() }],
      historiquePrix: [
        { prix: 700, date: le("2026-10-01").toISOString() },
        { prix: 900, date: le("2026-10-05").toISOString() },
      ],
    });
    expect(calculerAlertes([a], DELAIS, le("2026-10-08")).dormants[0]?.depuis).toBe("2026-10-01");
  });

  it("tout article À expédier est signalé ; délais modifiables", () => {
    const expedier = article({
      statut: "a_expedier",
      historique: [{ vers: "a_expedier", date: le("2026-10-05").toISOString() }],
    });
    const brouillon = article({
      id: "B",
      reference: 2,
      historique: [{ vers: "brouillon", date: le("2026-10-04").toISOString() }],
    });
    const r = calculerAlertes([expedier, brouillon], { delaiBrouillon: 1, delaiDormant: 7 }, le("2026-10-05"));
    expect(r.aExpedier.map((x) => x.id)).toEqual(["A"]);
    expect(r.brouillons.map((x) => x.id)).toEqual(["B"]);
  });
});
