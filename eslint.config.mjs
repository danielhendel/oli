// eslint.config.mjs — ESLint v9 Flat Config

import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  // ---------------------------------------------------------------------------
  // 0) Ignore generated, native, legacy, and build output (CRITICAL)
  // ---------------------------------------------------------------------------
  {
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "archive/**",
      "**/android/**",
      "**/ios/**",
      "**/dist/**",
      "**/dist-types/**",
      "**/build/**",
      "**/web-build/**",
      "**/coverage/**",
      "services/**/lib/**",
      "**/*.d.ts",
      "**/*.d.ts.map",
    ],
  },

  // ---------------------------------------------------------------------------
  // 1) Base JS rules
  // ---------------------------------------------------------------------------
  js.configs.recommended,

  // ---------------------------------------------------------------------------
  // 2) Node-only config files (babel / metro / config scripts)
  // ---------------------------------------------------------------------------
  {
    files: ["babel.config.js", "metro.config.js", "*.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // 3) Jest test files
  // ---------------------------------------------------------------------------
  {
    files: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // 4) ARCHITECTURE GUARDRAILS
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // 🚫 Never import generated TS outputs
            "dist-types/*",

            // 🚫 app must not import server code
            "services/*",

            // 🚫 services must not import app code
            "app/*",
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 5) Client-only restrictions (app/** + lib/**)
  // ---------------------------------------------------------------------------
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "firebase-admin", message: "Client code must never import firebase-admin." },
            { name: "firebase-functions", message: "Client code must never import firebase-functions." },
            { name: "express", message: "Client code must never import express." },
            { name: "cors", message: "Client code must never import cors." },
            { name: "@google-cloud/pubsub", message: "Client code must never import @google-cloud/pubsub." },
            { name: "rate-limiter-flexible", message: "Client code must never import server-only rate limiter." },
          ],
          patterns: [
            "firebase-admin/*",
            "firebase-functions/*",
            "@google-cloud/*",
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 6) Server-only restrictions (services/**)
  // ---------------------------------------------------------------------------
  {
    files: ["services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "expo", message: "Server code must never import Expo runtime." },
            { name: "expo-router", message: "Server code must never import Expo Router." },
            { name: "react-native", message: "Server code must never import react-native." },
          ],
          patterns: [
            "expo/*",
            "expo-router/*",
            "react-native/*",
            "@react-native/*",
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 7) TypeScript + React (JSX enabled where appropriate)
  // ---------------------------------------------------------------------------
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

      // React (new JSX transform)
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      // Hooks
      ...reactHooksPlugin.configs.recommended.rules,

      // Clean unused vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
