// L'annexe docs/categories-vinted.md doit refléter categories.ts (#133).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentCategories } from "./doc-categories.js";

describe("annexe des catégories", () => {
  it("à jour avec categories.ts (sinon : npm run doc:categories -w server)", () => {
    const fichier = readFileSync(new URL("../../../docs/categories-vinted.md", import.meta.url), "utf8");
    expect(fichier).toBe(documentCategories());
  });
});
