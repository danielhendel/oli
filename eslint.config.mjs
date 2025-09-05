// ESLint v9 flat config for Expo/React Native + TypeScript + Jest
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  // Global settings + env for app code
  {
    settings: { react: { version: 'detect' } },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  // TypeScript/React overrides
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  // ✅ Jest tests override: recognize describe/test/expect, etc.
  {
    files: ['**/__tests__/**/*.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },
  // Turn off rules that conflict with Prettier formatting
  prettier,
  // Ignore noisy folders
  { ignores: ['node_modules', 'dist', 'build', '.expo', '.expo-shared', 'coverage'] }
];
