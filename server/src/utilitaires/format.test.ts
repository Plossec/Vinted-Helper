import { describe, expect, it } from "vitest";
import { centimesVersSaisie } from "./format.js";

describe("centimesVersSaisie", () => {
  it("centimes → « euros,centimes » sur deux chiffres", () => {
    expect(centimesVersSaisie(1250)).toBe("12,50");
    expect(centimesVersSaisie(5)).toBe("0,05");
    expect(centimesVersSaisie(0)).toBe("0,00");
  });
});
