// eslint.config.mjs
// Flat config for Oli monorepo: lint TS in apps + services, ignore mocks/scripts/compiled JS.

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // 1) Global ignores
  {
    ignores: [
      'node_modules',
      'dist',
      // Jest / RN mocks
      'apps/mobile/__mocks__/**',
      // Expo / dev / Node scripts (CJS)
      'apps/mobile/scripts/**',
      // Compiled JS from Firebase functions
      'services/functions/lib/**'
    ]
  },

  // 2) Default TS config for app + services
  {
    files: [
      'apps/mobile/**/*.{ts,tsx,d.ts}',
      'services/api/**/*.{ts,tsx,d.ts}',
      'services/functions/**/*.{ts,tsx,d.ts}'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        jest: true
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Start from JS + TS recommended
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,

      // Oli Great Code Standard basics
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'error'
    }
  },

  // 3) Relaxed rules for Jest setup, tests, shims, and test-only type helpers
  {
    files: [
      'apps/mobile/jest-setup.ts',
      'apps/mobile/**/__tests__/**/*.{ts,tsx}',
      'apps/mobile/types/expo-router-testing.d.ts',
      'apps/mobile/shims/**/*.{ts,tsx}'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off'
    }
  },

  // 4) Boundary files where `any` is temporarily allowed
  {
    files: [
      'apps/mobile/app/(app)/profile/general.tsx',
      'apps/mobile/components/auth/AppleSignInButton.tsx',
      'apps/mobile/hooks/useUserGeneralProfile.ts',
      'apps/mobile/hooks/useUserProfile.ts',
      'apps/mobile/lib/auth/oauth/**/*.{ts,tsx}',
      'apps/mobile/lib/auth/postSignIn.ts',
      'services/api/src/**/*.{ts,tsx}'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
