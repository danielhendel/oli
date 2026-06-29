import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.config(tseslint.configs.recommended, tseslint.configs.stylistic),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
    },
  },
  {
    files: ["**/__tests__/**/*.ts", "**/*.test.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
