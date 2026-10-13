import { describe, expect, it } from "vitest";
import { normaliserPreferenceTheme } from "./theme.js";

describe("normaliserPreferenceTheme", () => {
  it("garde « clair » et « sombre »", () => {
    expect(normaliserPreferenceTheme("clair")).toBe("clair");
    expect(normaliserPreferenceTheme("sombre")).toBe("sombre");
  });

  it("retombe sur « auto » pour toute autre valeur", () => {
    expect(normaliserPreferenceTheme("auto")).toBe("auto");
    expect(normaliserPreferenceTheme(null)).toBe("auto");
    expect(normaliserPreferenceTheme("violet")).toBe("auto");
    expect(normaliserPreferenceTheme(42)).toBe("auto");
  });
});
