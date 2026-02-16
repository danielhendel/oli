// ESLint v9 flat config for Expo/React Native + TypeScript + Jest

import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  // React version detection
  { settings: { react: { version: "detect" } } },

  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "web-build/**",
      "ios/**",
      "android/**",
      ".expo/**",
      ".expo-shared/**",
      "coverage/**",
      ".artifacts/**",
      "expo-env.d.ts",
      "services/api/dist/**",
    ],
  },

  js.configs.recommended,
  react.configs.flat.recommended,

  // App + RN + TS defaults
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
      // App code can run in both RN (browser-like) and Node (metro, tooling), so include both.
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
    plugins: { "@typescript-eslint": tsPlugin, "react-hooks": hooks },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...hooks.configs["recommended-latest"].rules,

      // RN / modern React
      "react/react-in-jsx-scope": "off",

      // Unified unused vars handling (args, vars, and caught errors)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Cloud Run server code (also catch services/api) — Node globals; stricter TS any guard
  {
    files: ["cloudrun/src/**/*.ts", "services/api/src/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.es2021 } },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Tests: relax rules (includes Cloud Run tests)
  {
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/*.test.[jt]s?(x)", "tests/setup/jest-setup.ts"],
    languageOptions: { globals: { ...globals.jest, ...globals.node, ...globals.es2021 } },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Node scripts (seeders, tooling)
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: { globals: { ...globals.node, ...globals.es2021 } },
    rules: { "no-console": "off" },
  },

  // Keep Prettier last to resolve formatting conflicts
  prettier,
];
