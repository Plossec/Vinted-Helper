// Limiteur en mémoire (#135) : fenêtre glissante, délai d'attente, purge des clés expirées.
import { describe, expect, it } from "vitest";
import { creerLimiteur } from "./limiteur.js";

describe("creerLimiteur", () => {
  it("bloque au-delà du maximum dans la fenêtre, et donne le délai d'attente", () => {
    const l = creerLimiteur({ max: 2, fenetreMs: 1000 });
    l.noterEchec("a", 0);
    expect(l.estBloque("a", 100)).toBe(false);
    l.noterEchec("a", 200);
    expect(l.estBloque("a", 300)).toBe(true);
    expect(l.attente("a", 300)).toBe(700);
    expect(l.estBloque("a", 1000)).toBe(false);
    expect(l.attente("b", 300)).toBe(0);
  });

  it("purge les clés dont les événements sont tous expirés", () => {
    const l = creerLimiteur({ max: 5, fenetreMs: 1000 });
    l.noterEchec("a", 0);
    l.noterEchec("b", 0);
    expect(l.taille()).toBe(2);
    l.noterEchec("c", 5000);
    expect(l.taille()).toBe(1);
  });
});
