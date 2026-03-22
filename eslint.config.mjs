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
      // Node / tooling
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

      // 🔒 CRITICAL: never lint Functions bundle output
      "services/functions/lib/**",
      "services/functions/lib/**/*.map",

      // API: esbuild output for workout summary rebuild
      "**/workoutDaySummaryRebuild.bundled.cjs",

      // Never lint generated declaration files
      "**/*.d.ts",

      // Legacy / config files
      "**/.eslintrc.*",
      "**/services/**/.eslintrc.*",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },

  // ─────────────────────────────────────────────
  // Base JS recommended (for config / scripts)
  // ─────────────────────────────────────────────
  js.configs.recommended,

  // ─────────────────────────────────────────────
  // TypeScript rules (source only)
  // ─────────────────────────────────────────────
  ...tseslint.config(
    {
      files: ["**/*.ts", "**/*.tsx"],
      // Extra safety: exclude generated areas even if CLI patterns include them
      ignores: [
        "**/dist/**",
        "**/build/**",
        "**/dist-types/**",
        "**/lib/dist-types/**",
        "**/services/**/dist/**",

        // 🔒 Absolute exclusion of Functions bundle
        "services/functions/lib/**",
        "services/functions/lib/**/*.map",

        "**/*.d.ts",
      ],
    },
    tseslint.configs.recommended,
    tseslint.configs.stylistic
  ),

  // ─────────────────────────────────────────────
  // App/source defaults (Expo / RN globals)
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
  // Server / services TS (Node globals)
  // ─────────────────────────────────────────────
  {
    files: ["services/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ─────────────────────────────────────────────
  // Jest test files
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // JS / CJS / MJS scripts (Node environment)
  // ─────────────────────────────────────────────
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ignores: ["**/workoutDaySummaryRebuild.bundled.cjs"],
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
