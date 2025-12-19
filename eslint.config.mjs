// eslint.config.mjs (ESLint v9 Flat Config)
import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  // 1) Ignore generated, native, legacy, and build output folders
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
      "**/*.d.ts" // generated typings frequently break basic JS parsing unless TS parser is applied everywhere
    ],
  },

  // 2) Base JS rules
  js.configs.recommended,

  // 3) TypeScript + React (applies to .ts/.tsx)
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
      // TS recommended (non-typechecked)
      ...tsPlugin.configs.recommended.rules,

      // React / RN
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      // Hooks rules (important)
      ...reactHooksPlugin.configs.recommended.rules,

      // Practical TS hygiene
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
