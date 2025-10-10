// ESLint v9 flat config for Expo/React Native + TypeScript + Jest

import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  // Ignore common build artefacts and metadata across the repo
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.expo-shared/**',
      '**/coverage/**'
    ]
  },

  // Base JS recommendations
  js.configs.recommended,

  // TypeScript + React rules applied across the repo
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // TS recommended (flat-merged)
      ...tsPlugin.configs.recommended.rules,

      // React + Hooks recommended (flat-merged)
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Modern React (no need to import React in scope)
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // Hygiene
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },

  // ✅ Node/CommonJS tooling files (allow module/require/__dirname)
  {
    files: [
      '**/*.config.{js,cjs,mjs}',
      '**/babel.config.js',
      '**/metro.config.js',
      '**/jest.config.js',
      '**/.eslintrc.js'
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node }
    },
    rules: {
      // These files are config scripts; allow CommonJS
      'no-undef': 'off'
    }
  },

  // ✅ Jest globals for tests + allow require() in tests
  {
    files: ['**/__tests__/**/*.[jt]s?(x)', '**/*.{test,spec}.[jt]s?(x)'],
    languageOptions: {
      globals: { ...globals.jest }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },

  // Disable rules that conflict with Prettier formatting
  prettier
];
