// eslint.config.mjs — ESLint v9 Flat Config

import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  // Ignore generated, native, legacy, and build output
  {
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "archive/**",
      "android/**",
      "ios/**",
      "dist/**",
      "build/**",
      "web-build/**",
      "coverage/**",
      "services/**/lib/**",
      "**/*.d.ts"
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // ✅ Jest test files (JS/TS)
  {
    files: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // TypeScript + React
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      ...reactHooksPlugin.configs.recommended.rules,

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
