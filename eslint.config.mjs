// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/.expo/**",
      "**/dist/**",
      "**/build/**",
      "**/web-build/**",
      "**/dist-types/**",
      "**/lib/dist-types/**",
      "**/services/**/dist/**",
      "services/functions/lib/**",
      "services/functions/lib/**/*.map",
      "**/*.d.ts",
      "**/.eslintrc.*",
      "**/services/**/.eslintrc.*",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },

  js.configs.recommended,

  ...tseslint.config(
    {
      files: ["**/*.ts", "**/*.tsx"],
      ignores: [
        "**/dist/**",
        "**/build/**",
        "**/dist-types/**",
        "**/lib/dist-types/**",
        "**/services/**/dist/**",
        "services/functions/lib/**",
        "services/functions/lib/**/*.map",
        "**/*.d.ts",
      ],
    },
    tseslint.configs.recommended,
    tseslint.configs.stylistic
  ),

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
  // Sprint 4 — Client Firestore Lockdown
  // ─────────────────────────────────────────────
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "firebase/firestore",
              message: "Client Firestore is forbidden. Use the Cloud Run API boundary (lib/api/*).",
            },
            {
              name: "firebase/firestore/lite",
              message: "Client Firestore is forbidden. Use the Cloud Run API boundary (lib/api/*).",
            },
            {
              name: "@firebase/firestore",
              message: "Client Firestore is forbidden. Use the Cloud Run API boundary (lib/api/*).",
            },
          ],
          patterns: [
            {
              group: ["firebase/firestore/*", "@firebase/firestore/*"],
              message: "Client Firestore is forbidden. Use the Cloud Run API boundary (lib/api/*).",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["services/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/*.test.[jt]s?(x)", "**/*.spec.[jt]s?(x)"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

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
