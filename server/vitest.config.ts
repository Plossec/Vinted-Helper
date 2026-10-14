import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Couverture (#130) : `npm run test:couverture`. Seuils un peu sous le niveau atteint (88 % des lignes au
    // 14/10/2026), à relever au fil des tests ajoutés.
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**", "src/outils/*-cli.ts", "src/base/migrer-cli.ts"],
      thresholds: { lines: 85, statements: 80, functions: 80, branches: 70 },
    },
  },
});
