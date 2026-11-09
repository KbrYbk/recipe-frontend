// ESLint (flat config): JS + TypeScript + Astro.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default [
  // ads.js — скрипт рекламы, поведение которого по решению владельца не меняется (как в main).
  { ignores: ["dist/", ".astro/", "node_modules/", "public/", "src/scripts/ads.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Клиентский код: никаких отладочных логов.
    files: ["src/scripts/**", "src/lib/client/**"],
    rules: { "no-console": "error" },
  },
];
