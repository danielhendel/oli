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
      "dist-types/**",
      "build/**",
      "web-build/**",
      "coverage/**",
      "services/**/lib/**",
      "**/*.d.ts",
      "**/*.d.ts.map"
    ]
  },

  // Base JS rules
  js.configs.recommended,

  // ✅ Jest test files (JS/TS)
  {
    files: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },

  // ✅ ARCHITECTURE GUARDRAILS (Phase B Step 2)
  // 1) Hard layer boundaries via import restrictions.
  //    - app/** can’t import server runtimes
  //    - services/** can’t import client runtimes
  //    - lib/** stays pure
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // 🚫 Never import generated TS outputs
            "dist-types/*",

            // 🚫 app should never import services directly
            "services/*",

            // 🚫 services should never import app directly
            "app/*"
          ]
        }
      ]
    }
  },

  // 2) app/** restrictions (client-only)
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
            { name: "rate-limiter-flexible", message: "Client code must never import server-only rate limiter." }
          ],
          patterns: [
            "firebase-admin/*",
            "firebase-functions/*",
            "@google-cloud/*"
          ]
        }
      ]
    }
  },

  // 3) services/** restrictions (server-only)
  {
    files: ["services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "expo", message: "Server code must never import Expo runtime." },
            { name: "expo-router", message: "Server code must never import Expo Router." },
            { name: "react-native", message: "Server code must never import react-native." }
          ],
          patterns: [
            "expo/*",
            "expo-router/*",
            "react-native/*",
            "@react-native/*"
          ]
        }
      ]
    }
  },

  // TypeScript + React
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      ...reactHooksPlugin.configs.recommended.rules,

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
];
