// Configuration ESLint (format « flat config »).
import js from "@eslint/js";
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
      "@typescript-eslint/ban-ts-comment": "error",
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
    files: ["client/sw-modele.js"],
    languageOptions: { globals: { ...globals.serviceworker, __FICHIERS__: "readonly" } },
  },
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
