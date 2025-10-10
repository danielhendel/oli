// apps/mobile/eslint.config.cjs

const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  // 🔕 Ignore noise
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '.expo/',
      '.expo-shared/',
      'coverage/',
    ],
  },

  // 🧠 App source: TS + React Hooks
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }, // <-- must live under parserOptions in flat config
      },
      globals: {
        ...globals.es2022,
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // 🧪 Tests & Jest setup
  {
    files: [
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/jest-setup.ts',
      '**/jest.setup.ts',
      '**/jest.config.*',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: { 'no-undef': 'off' },
  },

  // 🧪 Jest mocks
  {
    files: ['**/__mocks__/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: { 'no-undef': 'off' },
  },

  // ⚙️ Node config files at repo root (CommonJS)
  {
    files: [
      '*.config.js',
      '*.config.cjs',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'jest.config.cjs',
      'eslint.config.js',
      'eslint.config.cjs',
      '.eslintrc.js',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: { 'no-console': 'off' },
  },

  // 🛠️ Node CLI/build helpers (your CJS/JS scripts)
  {
    files: ['scripts/**/*.cjs', 'scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node }, // gives process, console, __dirname, module, require, etc.
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off', // tooling scripts often reference Node globals directly
    },
  },
];
