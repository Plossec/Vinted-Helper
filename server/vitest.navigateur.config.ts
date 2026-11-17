import { defineConfig } from "vitest/config";

// Tests de l'interface dans Chromium (#243, ADR-0108) : `npm run test:navigateur` à la racine (construit l'interface
// puis lance ces tests). Séparés de `npm test` : ils demandent l'interface construite et un navigateur.
export default defineConfig({
  test: {
    include: ["navigateur/**/*.test.ts"],
    environment: "node",
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
