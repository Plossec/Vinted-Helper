// Cache des alertes (#131) : un appel par période de 30 s, vidé après une modification.
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api.js";
import { chargerAlertes } from "./alertesCache.js";

const vide = { brouillons: [], dormants: [], aExpedier: [] };

describe("chargerAlertes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("réutilise la réponse pendant 30 s, puis redemande ; une modification vide le cache", async () => {
    const appels: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        appels.push(url);
        return Promise.resolve(new Response(JSON.stringify(vide), { status: 200 }));
      }),
    );
    await chargerAlertes(1_000);
    await chargerAlertes(20_000);
    expect(appels.filter((u) => u === "/api/alertes")).toHaveLength(1);
    await chargerAlertes(31_001);
    expect(appels.filter((u) => u === "/api/alertes")).toHaveLength(2);
    await api.post("/api/frais", {});
    await chargerAlertes(31_002);
    expect(appels.filter((u) => u === "/api/alertes")).toHaveLength(3);
  });
});
