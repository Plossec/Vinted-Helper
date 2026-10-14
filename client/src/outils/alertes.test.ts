// Écran « À faire » (#191) : sections par urgence.
import { describe, expect, it } from "vitest";
import { type AlertesServeur, nombreAlertes, sectionsAFaire } from "./alertes.js";

const alerte = (id: string) => ({ id, reference: 1, nom: null, depuis: "2026-10-05", jours: 3 });

describe("sections de l'écran À faire", () => {
  it("Urgent, puis À traiter, puis Pour info ; sections vides omises", () => {
    const alertes: AlertesServeur = {
      brouillons: [alerte("B")],
      dormants: [alerte("D")],
      aExpedier: [alerte("E")],
      aRecuperer: [alerte("R")],
      erreursPublication: [alerte("X")],
    };
    expect(sectionsAFaire(alertes).map((s) => [s.titre, s.lignes.map((l) => `${l.type}:${l.id}`)])).toEqual([
      ["Urgent", ["erreursPublication:X"]],
      ["À traiter", ["aExpedier:E", "aRecuperer:R"]],
      ["Pour info", ["dormants:D", "brouillons:B"]],
    ]);
    expect(nombreAlertes(alertes)).toBe(5);
  });

  it("rien à faire : aucune section", () => {
    expect(sectionsAFaire({ brouillons: [], dormants: [], aExpedier: [] })).toEqual([]);
  });
});
