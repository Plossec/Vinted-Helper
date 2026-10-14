// Configuration ESLint (format « flat config »).
import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "data/**", "sauvegardes/**", "server/drizzle/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Garde-fou CLAUDE.md : pas de contournement des erreurs.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Aucun commentaire de contournement, même décrit (#115) : @ts-expect-error compris.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true, "ts-check": false },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: ["server/**/*.ts", "scripts/**/*.mjs", ".claude/hooks/**/*.mjs", "*.js", "*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["scripts/**/*.mjs", ".claude/hooks/**/*.mjs", "outils/**/*.mjs"],
    rules: { "no-console": "off" },
  },
  {
    // Programme de publication : Node, avec du code exécuté dans la page (page.evaluate).
    files: ["outils/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Extension Chrome de publication : scripts classiques (partage de SELECTEURS), pages, service worker.
    files: ["outils/extension-vinted/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, ...globals.serviceworker, ...globals.webextensions },
    },
  },
  {
    files: ["client/sw-modele.js"],
    languageOptions: { globals: { ...globals.serviceworker, __FICHIERS__: "readonly" } },
  },
  {
    // Aucun test sauté ni isolé (#115) : .skip, .only, .todo, fit, xit…
    files: ["**/*.test.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
    },
  },
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
