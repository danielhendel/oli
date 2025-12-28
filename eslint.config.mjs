// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  // ─────────────────────────────────────────────
  // Global ignores (flat config)
  // ─────────────────────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",

      // Expo generated
      "**/.expo/**",

      // Build outputs
      "**/dist/**",
      "**/build/**",
      "**/web-build/**",

      // Repo generated outputs
      "**/dist-types/**",
      "**/lib/dist-types/**",
      "**/services/**/dist/**",
      "**/services/**/lib/**",

      // ✅ Critical: never lint .d.ts (generated / type surface)
      "**/*.d.ts",

      // Legacy ESLint configs should not be lint targets
      "**/.eslintrc.*",
      "**/services/**/.eslintrc.*",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },

  // Base JS recommended (mainly for config scripts if they get linted)
  js.configs.recommended,

  // ─────────────────────────────────────────────
  // TypeScript rules (source only)
  // ─────────────────────────────────────────────
  ...tseslint.config(
    {
      files: ["**/*.ts", "**/*.tsx"],
      // ✅ Extra safety: exclude generated areas even if included by CLI patterns
      ignores: [
        "**/dist/**",
        "**/build/**",
        "**/dist-types/**",
        "**/lib/dist-types/**",
        "**/services/**/dist/**",
        "**/services/**/lib/**",
        "**/*.d.ts",
      ],
    },
    tseslint.configs.recommended,
    tseslint.configs.stylistic
  ),

  // ─────────────────────────────────────────────
  // App/source defaults (Expo/RN uses browser-like globals such as fetch/setTimeout)
  // ─────────────────────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },

  // ─────────────────────────────────────────────
  // Server/services TS: allow node globals like process
  // ─────────────────────────────────────────────
  {
    files: ["services/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Jest test files: allow describe/test/expect (TS + JS)
  {
    files: [
      "**/__tests__/**/*.[jt]s?(x)",
      "**/*.test.[jt]s?(x)",
      "**/*.spec.[jt]s?(x)",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // JS/CJS/MJS config/build scripts: allow require()
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
